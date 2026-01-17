// src/modules/polymarket/services/database.init.ts

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { env } from '../../../config/env';

const DATABASE_NAME = 'polymarket_aggregation';

const SCHEMA_STATEMENTS = [
  // Create database
  `CREATE DATABASE IF NOT EXISTS ${DATABASE_NAME}`,

  // Events table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_events (
    id String,
    slug String,
    title String,
    description String,
    start_date DateTime64(3),
    end_date DateTime64(3),
    created_at DateTime64(3),
    market_count UInt32,
    total_volume Float64,
    total_liquidity Float64,
    active_markets UInt32,
    closed_markets UInt32,
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (id)`,

  // Markets table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_markets (
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
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (id)`,

  // Traders table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_traders (
    user_address String,
    rank UInt32,
    total_pnl Float64,
    total_volume Float64,
    markets_traded UInt32,
    win_rate Float64,
    avg_position_size Float64,
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (user_address)`,

  // Trader positions table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_trader_positions (
    user_address String,
    market_id String,
    asset_id String,
    size Float64,
    entry_price Float64,
    current_price Float64,
    pnl Float64,
    position_updated_at DateTime64(3),
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (user_address, market_id, asset_id)`,

  // Trades table - stores all trade transactions
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_trades (
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
    fetched_at DateTime64(3) DEFAULT now64(3)
  ) ENGINE = ReplacingMergeTree(fetched_at)
  ORDER BY (condition_id, timestamp, transaction_hash)`,

  // Pipeline runs table
  `CREATE TABLE IF NOT EXISTS ${DATABASE_NAME}.polymarket_pipeline_runs (
    id String,
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
  ORDER BY (started_at, id)`,
];

class PolymarketDatabaseInit {
  private client: ClickHouseClient | null = null;
  private initialized = false;

  /**
   * Get the database name used for polymarket aggregation
   */
  getDatabaseName(): string {
    return DATABASE_NAME;
  }

  /**
   * Initialize the database and tables
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ Polymarket database already initialized');
      return;
    }

    console.log('🔧 Initializing Polymarket aggregation database...');

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
      console.log(`✅ Polymarket database "${DATABASE_NAME}" initialized successfully`);

    } catch (error) {
      console.error('❌ Failed to initialize Polymarket database:', error);
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
      console.log('Polymarket database connection closed');
    }
  }
}

export const polymarketDb = new PolymarketDatabaseInit();
