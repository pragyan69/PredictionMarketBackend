// src/modules/dflow/services/database.init.ts

import { createClient, ClickHouseClient } from '@clickhouse/client';
import { env } from '../../../config/env';

class DFlowDatabaseInit {
  private client: ClickHouseClient | null = null;
  private initialized = false;
  private readonly protocol = 'dflow';

  async getClient(): Promise<ClickHouseClient> {
    if (!this.client) {
      this.client = createClient({
        host: `http://${env.clickhouse.host}:8123`,
        username: env.clickhouse.username,
        password: env.clickhouse.password,
        database: 'prediction_market',
      });
    }
    return this.client;
  }

  async initialize(): Promise<void> {
    if (this.initialized) {
      console.log('✅ DFlow database already initialized');
      return;
    }

    console.log('🔧 Initializing DFlow database tables...');
    const client = await this.getClient();

    // Create database if not exists
    await client.query({
      query: `CREATE DATABASE IF NOT EXISTS prediction_market`,
    });

    // Tables are shared with Polymarket/Kalshi - just verify they exist
    // The schema is created by polymarket/kalshi modules
    // DFlow uses protocol='dflow' to distinguish its data

    console.log('✅ DFlow database ready (using shared prediction_market schema)');
    this.initialized = true;
  }

  async insert(table: string, data: any[]): Promise<void> {
    if (data.length === 0) return;

    const client = await this.getClient();

    // Add protocol field to all records
    const enrichedData = data.map(record => ({
      ...record,
      protocol: this.protocol,
    }));

    await client.insert({
      table: `prediction_market.${table}`,
      values: enrichedData,
      format: 'JSONEachRow',
    });
  }

  async query<T>(sql: string): Promise<T[]> {
    const client = await this.getClient();
    const result = await client.query({
      query: sql,
      format: 'JSONEachRow',
    });
    return result.json();
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.initialized = false;
    }
  }
}

export const dflowDb = new DFlowDatabaseInit();
