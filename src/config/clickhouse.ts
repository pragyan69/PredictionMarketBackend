// src/config/clickhouse.ts

import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { env } from "./env";

class ClickHouseManager {
  private client: ClickHouseClient | null = null;

  async connect(): Promise<void> {
    try {
      this.client = createClient({
        host: `http://${env.clickhouse.host}:8123`,
        username: env.clickhouse.username,
        password: env.clickhouse.password,
        database: env.clickhouse.database,
      });

      // Verify connection
      await this.client.ping();
      console.log("✅ ClickHouse connected successfully");
    } catch (error) {
      console.error("❌ Failed to connect to ClickHouse:", error);
      throw error;
    }
  }

  getClient(): ClickHouseClient {
    if (!this.client) {
      throw new Error("ClickHouse client not initialized. Call clickhouse.connect() first.");
    }
    return this.client;
  }

  /**
   * Typed query helper.
   * IMPORTANT: result.json() already returns an array for JSONEachRow,
   * but TypeScript sometimes can't infer it properly. So we cast.
   */
  async query<T = any>(sql: string, query_params?: Record<string, any>): Promise<T[]> {
    const result = await this.getClient().query({
      query: sql,
      format: "JSONEachRow",
      ...(query_params ? { query_params } : {}),
    });

    // Fix TS: force cast to array of T
    const rows = (await result.json()) as unknown as T[];
    return rows;
  }

  async insert(table: string, data: any[]): Promise<void> {
    if (!data || data.length === 0) return;

    await this.getClient().insert({
      table: `${env.clickhouse.database}.${table}`,
      values: data,
      format: "JSONEachRow",
    });
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      console.log("ClickHouse disconnected");
    }
  }
}

/**
 * Singleton manager
 */
export const clickhouse = new ClickHouseManager();

/**
 * ✅ Exported ping helper for health checks
 * This is what your health.routes.ts should import.
 */
export async function pingClickHouse(): Promise<boolean> {
  try {
    // if connect() hasn't been called, this will throw -> return false
    const client = clickhouse.getClient();
    await client.ping();
    return true;
  } catch {
    return false;
  }
}
