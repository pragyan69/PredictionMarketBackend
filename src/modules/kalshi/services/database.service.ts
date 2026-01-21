// src/modules/kalshi/services/database.service.ts

import { kalshiDb } from './database.init';

export interface KalshiMarketRecord {
  id: string;
  event_id: string;
  slug: string;
  question: string;
  description: string;
  condition_id: string;
  market_type: string;
  outcomes: string[];
  outcome_prices: number[];
  clob_token_ids: string[];
  best_bid: number;
  best_ask: number;
  mid_price: number;
  spread: number;
  orderbook_bid_depth: number;
  orderbook_ask_depth: number;
  volume: number;
  liquidity: number;
  volume_24h: number;
  trades_24h: number;
  unique_traders_24h: number;
  active: number;
  closed: number;
  start_date: string;
  end_date: string;
  created_at: string;
  protocol: string;
  fetched_at: string;
}

export interface KalshiEventRecord {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: string;
  series_ticker: string;
  start_date: string;
  end_date: string;
  created_at: string;
  market_count: number;
  total_volume: number;
  total_liquidity: number;
  active_markets: number;
  closed_markets: number;
  protocol: string;
  fetched_at: string;
}

export interface KalshiTradeRecord {
  id: string;
  market_id: string;
  condition_id: string;
  asset: string;
  user_address: string;
  side: string;
  price: number;
  size: number;
  timestamp: string;
  transaction_hash: string;
  outcome: string;
  outcome_index: number;
  title: string;
  slug: string;
  event_slug: string;
  protocol: string;
  fetched_at: string;
}

class KalshiDatabaseService {
  private databaseName = 'prediction_market';
  private protocol = 'kalshi';

  private async safeQuery<T>(sql: string, defaultValue: T[] = []): Promise<T[]> {
    try {
      return await kalshiDb.query<T>(sql);
    } catch (error: any) {
      // If table doesn't exist or database not initialized, return empty array
      if (error?.message?.includes('UNKNOWN_TABLE') || error?.message?.includes('UNKNOWN_DATABASE')) {
        console.warn('Database/table not found. Run aggregation pipeline first.');
        return defaultValue;
      }
      throw error;
    }
  }

  async getMarkets(params: {
    status?: 'active' | 'closed' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
    eventId?: string;
  } = {}): Promise<KalshiMarketRecord[]> {
    const { status = 'active', limit = 50, offset = 0, search, eventId } = params;

    // Protocol filter with backward compatibility for empty/null protocol
    let whereClause = `(protocol = '${this.protocol}' OR protocol = '' OR protocol IS NULL)`;
    if (status === 'active') {
      whereClause += ' AND active = 1 AND closed = 0';
    } else if (status === 'closed') {
      whereClause += ' AND closed = 1';
    }
    if (search) {
      whereClause += ` AND (question ILIKE '%${search}%' OR slug ILIKE '%${search}%')`;
    }
    if (eventId) {
      whereClause += ` AND event_id = '${eventId}'`;
    }

    const sql = `
      SELECT * FROM ${this.databaseName}.markets
      WHERE ${whereClause}
      ORDER BY volume DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    console.log('[KalshiDbService] getMarkets SQL:', sql);
    const results = await this.safeQuery<KalshiMarketRecord>(sql);
    console.log('[KalshiDbService] getMarkets results:', results.length);
    return results;
  }

  async getMarketById(id: string): Promise<KalshiMarketRecord | null> {
    const sql = `SELECT * FROM ${this.databaseName}.markets WHERE id = '${id}' AND protocol = '${this.protocol}' LIMIT 1`;
    const results = await this.safeQuery<KalshiMarketRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getMarketByTicker(ticker: string): Promise<KalshiMarketRecord | null> {
    const sql = `SELECT * FROM ${this.databaseName}.markets WHERE slug = '${ticker}' AND protocol = '${this.protocol}' LIMIT 1`;
    const results = await this.safeQuery<KalshiMarketRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getMarketCount(status?: 'active' | 'closed' | 'all'): Promise<number> {
    let whereClause = `protocol = '${this.protocol}'`;
    if (status === 'active') whereClause += ' AND active = 1 AND closed = 0';
    else if (status === 'closed') whereClause += ' AND closed = 1';

    const sql = `SELECT count() as count FROM ${this.databaseName}.markets WHERE ${whereClause}`;
    const results = await this.safeQuery<{ count: string }>(sql);
    return results.length > 0 ? parseInt(results[0].count, 10) : 0;
  }

  async getEvents(params: { limit?: number; offset?: number; search?: string } = {}): Promise<KalshiEventRecord[]> {
    const { limit = 50, offset = 0, search } = params;
    let whereClause = `protocol = '${this.protocol}'`;
    if (search) whereClause += ` AND (title ILIKE '%${search}%' OR slug ILIKE '%${search}%')`;

    const sql = `
      SELECT * FROM ${this.databaseName}.events
      WHERE ${whereClause}
      ORDER BY total_volume DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return this.safeQuery<KalshiEventRecord>(sql);
  }

  async getEventById(id: string): Promise<KalshiEventRecord | null> {
    const sql = `SELECT * FROM ${this.databaseName}.events WHERE id = '${id}' AND protocol = '${this.protocol}' LIMIT 1`;
    const results = await this.safeQuery<KalshiEventRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getTrades(params: { marketId?: string; ticker?: string; limit?: number; offset?: number } = {}): Promise<KalshiTradeRecord[]> {
    const { marketId, ticker, limit = 100, offset = 0 } = params;
    let whereClause = `protocol = '${this.protocol}'`;
    if (marketId) whereClause += ` AND market_id = '${marketId}'`;
    if (ticker) whereClause += ` AND slug = '${ticker}'`;

    const sql = `SELECT * FROM ${this.databaseName}.trades WHERE ${whereClause} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
    return this.safeQuery<KalshiTradeRecord>(sql);
  }

  async getStats(): Promise<{ totalMarkets: number; activeMarkets: number; totalEvents: number; totalTrades: number; lastUpdated: string | null }> {
    try {
      const [marketsCount, activeMarketsCount, eventsCount, tradesCount, lastRun] = await Promise.all([
        this.getMarketCount('all'),
        this.getMarketCount('active'),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.events WHERE protocol = '${this.protocol}'`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.trades WHERE protocol = '${this.protocol}'`),
        this.safeQuery<{ completed_at: string }>(`SELECT completed_at FROM ${this.databaseName}.pipeline_runs WHERE protocol = '${this.protocol}' AND status = 'completed' ORDER BY completed_at DESC LIMIT 1`),
      ]);

      return {
        totalMarkets: marketsCount,
        activeMarkets: activeMarketsCount,
        totalEvents: eventsCount.length > 0 ? parseInt(eventsCount[0].count, 10) : 0,
        totalTrades: tradesCount.length > 0 ? parseInt(tradesCount[0].count, 10) : 0,
        lastUpdated: lastRun.length > 0 ? lastRun[0].completed_at : null,
      };
    } catch {
      return { totalMarkets: 0, activeMarkets: 0, totalEvents: 0, totalTrades: 0, lastUpdated: null };
    }
  }
}

export const kalshiDbService = new KalshiDatabaseService();
