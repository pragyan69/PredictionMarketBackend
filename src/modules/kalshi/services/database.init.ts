// src/modules/kalshi/services/database.init.ts

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { env } from '../../../config/env';

const DATABASE_NAME = 'prediction_market';

// Unified schema for all prediction market protocols (Kalshi, Polymarket, etc.)
const SCHEMA_STATEMENTS = [
  // Create database
  `CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`,

  // Unified Events table - stores events from all protocols
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.events (
    id String,
    slug String,
    title String,
    description String,
    category String,
    series_ticker String,
    start_date DateTime64(3),
    end_date Nullable(DateTime64(3)),
    created_at DateTime64(3),
    market_count UInt32,
    total_volume Float64,
    total_liquidity Float64,
    active_markets UInt32,
    closed_markets UInt32,
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, id)`,

  // Unified Markets table - stores markets from all protocols
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.markets (
    id String,
    event_id String,
    slug String,
    question String,
    description String,
    condition_id String,
    market_type String,
    outcomes Array(String),
    outcome_prices Array(Float64),
    clob_token_ids Array(String),
    best_bid Float64,
    best_ask Float64,
    mid_price Float64,
    spread Float64,
    orderbook_bid_depth Float64,
    orderbook_ask_depth Float64,
    volume Float64,
    liquidity Float64,
    volume_24h Float64,
    trades_24h UInt32,
    unique_traders_24h UInt32,
    active UInt8,
    closed UInt8,
    start_date DateTime64(3),
    end_date DateTime64(3),
    created_at DateTime64(3),
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, id)`,

  // Unified Trades table - stores trades from all protocols
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.trades (
    id String,
    market_id String,
    condition_id String,
    asset String,
    user_address String,
    side String,
    price Float64,
    size Float64,
    timestamp DateTime64(3),
    transaction_hash String,
    outcome String,
    outcome_index UInt32,
    title String,
    slug String,
    event_slug String,
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, condition_id, timestamp, id)`,

  // Unified Traders table - stores trader data from all protocols
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.traders (
    user_address String,
    rank UInt32,
    total_pnl Float64,
    total_volume Float64,
    markets_traded UInt32,
    win_rate Float64,
    avg_position_size Float64,
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, user_address)`,

  // Unified Trader Positions table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.trader_positions (
    user_address String,
    market_id String,
    asset_id String,
    size Float64,
    entry_price Float64,
    current_price Float64,
    pnl Float64,
    position_updated_at DateTime64(3),
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, user_address, market_id, asset_id)`,

  // Unified Pipeline Runs table - tracks pipeline execution for all protocols
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.pipeline_runs (
    id String,
    protocol LowCardinality(String),
    status String,
    started_at DateTime64(3),
    completed_at Nullable(DateTime64(3)),
    events_fetched UInt32 DEFAULT 0,
    markets_fetched UInt32 DEFAULT 0,
    trades_fetched UInt32 DEFAULT 0,
    traders_fetched UInt32 DEFAULT 0,
    positions_fetched UInt32 DEFAULT 0,
    error_message String DEFAULT ''
  ) ENGINE = MergeTree()
  ORDER BY (protocol, started_at, id)`,

  // Orderbook snapshots table - for real-time orderbook data
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.orderbook_snapshots (
    market_id String,
    ticker String,
    best_bid Float64,
    best_ask Float64,
    mid_price Float64,
    spread Float64,
    bid_depth Float64,
    ask_depth Float64,
    bid_levels Array(Tuple(Float64, Float64)),
    ask_levels Array(Tuple(Float64, Float64)),
    protocol LowCardinality(String),
    timestamp DateTime64(3),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, market_id, timestamp)`,

  // Candlesticks table - for historical OHLCV data
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.candlesticks (
    market_id String,
    ticker String,
    period_interval UInt16,
    end_period_ts UInt64,
    open_price Float64,
    high_price Float64,
    low_price Float64,
    close_price Float64,
    volume Float64,
    open_interest Float64,
    protocol LowCardinality(String),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (protocol, market_id, period_interval, end_period_ts)`,
];

class KalshiDatabaseInit {
  private client: ClickHouseClient | null = null;
  private initialized = false;

  /**
   * Get the database name used for prediction market aggregation
   */
  getDatabaseName(): string {
    return DATABASE_NAME;
  }

  /**
   * Initialize the database and tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ Kalshi database already initialized');
      return;
    }

    console.log('🔧 Initializing Kalshi/Prediction Market database...');

    try {
      // Create client without database (to create database first)
      this.client = createClient({
        host: `http://${env.clickhouse.host}:8123`,
        username: env.clickhouse.username,
        password: env.clickhouse.password,
      });

      // Verify connection
      await this.client.ping();
      console.log('✅ Connected to ClickHouse');

      // Execute each schema statement
      for (const statement of SCHEMA_STATEMENTS) {
        await this.executeStatement(statement);
      }

      this.initialized = true;
      console.log(`✅ Prediction Market database "${DATABASE_NAME}" initialized successfully`);

    } catch (error) {
      console.error('❌ Failed to initialize Prediction Market database:', error);
      throw error;
    }
  }

  /**
   * Execute a single SQL statement
   */
  private async executeStatement(sql: string): Promise<void> {
    if (!this.client) {
      throw new Error('ClickHouse client not initialized');
    }

    try {
      await this.client.command({ query: sql });

      // Log which object was created
      const match = sql.match(/CREATE\s+(DATABASE|TABLE)\s+IF\s+NOT\s+EXISTS\s+(\S+)/i);
      if (match) {
        console.log(`  ✅ Created ${match[1].toLowerCase()}: ${match[2]}`);
      }
    } catch (error: any) {
      console.error(`❌ Failed to execute: ${sql.substring(0, 50)}...`);
      throw error;
    }
  }

  /**
   * Format a Date object to ClickHouse DateTime64 compatible string
   */
  private formatDateForClickHouse(date: Date | null | undefined): string | null {
    if (!date) return null;
    // ClickHouse DateTime64 expects format: YYYY-MM-DD HH:MM:SS.sss
    return date.toISOString().replace('T', ' ').replace('Z', '');
  }

  /**
   * Recursively process data to convert Date objects to ClickHouse format
   */
  private processDataForInsert(data: any[]): any[] {
    return data.map(row => {
      const processed: any = {};
      for (const [key, value] of Object.entries(row)) {
        if (value instanceof Date) {
          processed[key] = this.formatDateForClickHouse(value);
        } else if (value === null || value === undefined) {
          processed[key] = null;
        } else {
          processed[key] = value;
        }
      }
      return processed;
    });
  }

  /**
   * Insert data into a table
   */
  async insert(table: string, data: any[]): Promise<void> {
    if (!data || data.length === 0) return;

    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('ClickHouse client not initialized');
    }

    // Process data to convert Date objects to ClickHouse format
    const processedData = this.processDataForInsert(data);

    await this.client.insert({
      table: `${DATABASE_NAME}.${table}`,
      values: processedData,
      format: 'JSONEachRow',
    });
  }

  /**
   * Query data from the database
   */
  async query<T = any>(sql: string): Promise<T[]> {
    if (!this.initialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('ClickHouse client not initialized');
    }

    const result = await this.client.query({
      query: sql,
      format: 'JSONEachRow',
    });

    return (await result.json()) as unknown as T[];
  }

  /**
   * Close the connection
   */
  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.initialized = false;
      console.log('Kalshi database connection closed');
    }
  }
}

export const kalshiDb = new KalshiDatabaseInit();
