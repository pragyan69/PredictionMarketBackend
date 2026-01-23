// src/modules/dflow/services/database.service.ts

import { dflowDb } from './database.init';

export class DFlowDatabaseService {
  private readonly protocol = 'dflow';

  /**
   * Get DFlow markets from database
   */
  async getMarkets(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<any[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    let whereClause = `WHERE protocol = '${this.protocol}'`;

    if (params?.status === 'active') {
      whereClause += ' AND active = 1';
    } else if (params?.status === 'closed') {
      whereClause += ' AND closed = 1';
    }

    if (params?.search) {
      const search = params.search.replace(/'/g, "''");
      whereClause += ` AND (question ILIKE '%${search}%' OR description ILIKE '%${search}%')`;
    }

    const sql = `
      SELECT *
      FROM prediction_market.markets
      ${whereClause}
      ORDER BY volume DESC, fetched_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return dflowDb.query(sql);
  }

  /**
   * Get single DFlow market by ID
   */
  async getMarketById(id: string): Promise<any | null> {
    const sql = `
      SELECT *
      FROM prediction_market.markets
      WHERE protocol = '${this.protocol}' AND id = '${id}'
      LIMIT 1
    `;

    const results = await dflowDb.query(sql);
    return results[0] || null;
  }

  /**
   * Get DFlow events from database
   */
  async getEvents(params?: {
    limit?: number;
    offset?: number;
    search?: string;
  }): Promise<any[]> {
    const limit = params?.limit || 50;
    const offset = params?.offset || 0;

    let whereClause = `WHERE protocol = '${this.protocol}'`;

    if (params?.search) {
      const search = params.search.replace(/'/g, "''");
      whereClause += ` AND (title ILIKE '%${search}%' OR description ILIKE '%${search}%')`;
    }

    const sql = `
      SELECT *
      FROM prediction_market.events
      ${whereClause}
      ORDER BY total_volume DESC, fetched_at DESC
      LIMIT ${limit}
      OFFSET ${offset}
    `;

    return dflowDb.query(sql);
  }

  /**
   * Get single DFlow event by ID
   */
  async getEventById(id: string): Promise<any | null> {
    const sql = `
      SELECT *
      FROM prediction_market.events
      WHERE protocol = '${this.protocol}' AND id = '${id}'
      LIMIT 1
    `;

    const results = await dflowDb.query(sql);
    return results[0] || null;
  }

  /**
   * Get DFlow trades from database
   */
  async getTrades(params?: {
    market_id?: string;
    limit?: number;
  }): Promise<any[]> {
    const limit = params?.limit || 100;

    let whereClause = `WHERE protocol = '${this.protocol}'`;

    if (params?.market_id) {
      whereClause += ` AND market_id = '${params.market_id}'`;
    }

    const sql = `
      SELECT *
      FROM prediction_market.trades
      ${whereClause}
      ORDER BY timestamp DESC
      LIMIT ${limit}
    `;

    return dflowDb.query(sql);
  }

  /**
   * Get DFlow stats
   */
  async getStats(): Promise<any> {
    const [marketsResult, eventsResult, tradesResult] = await Promise.all([
      dflowDb.query(`SELECT count() as count FROM prediction_market.markets WHERE protocol = '${this.protocol}'`),
      dflowDb.query(`SELECT count() as count FROM prediction_market.events WHERE protocol = '${this.protocol}'`),
      dflowDb.query(`SELECT count() as count FROM prediction_market.trades WHERE protocol = '${this.protocol}'`),
    ]);

    return {
      markets: (marketsResult[0] as any)?.count || 0,
      events: (eventsResult[0] as any)?.count || 0,
      trades: (tradesResult[0] as any)?.count || 0,
    };
  }
}

export const dflowDatabaseService = new DFlowDatabaseService();
