// src/modules/polymarket/services/database.service.ts
// Uses unified prediction_market database with protocol field

import { polymarketDb } from './database.init';

// Unified record types with protocol field
export interface MarketRecord {
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

export interface EventRecord {
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

export interface TraderRecord {
  user_address: string;
  rank: number;
  total_pnl: number;
  total_volume: number;
  markets_traded: number;
  win_rate: number;
  avg_position_size: number;
  protocol: string;
  fetched_at: string;
}

export interface TradeRecord {
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

// Backward compatibility aliases
export type PolymarketMarketRecord = MarketRecord;
export type PolymarketEventRecord = EventRecord;
export type PolymarketTraderRecord = TraderRecord;
export type PolymarketTradeRecord = TradeRecord;

class PolymarketDatabaseService {
  private databaseName = 'prediction_market';
  private protocol = 'polymarket';

  private async safeQuery<T>(sql: string, defaultValue: T[] = []): Promise<T[]> {
    try {
      return await polymarketDb.query<T>(sql);
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
    protocol?: string; // Optional: filter by protocol, defaults to 'polymarket'
  } = {}): Promise<MarketRecord[]> {
    const { status = 'active', limit = 50, offset = 0, search, eventId, protocol } = params;

    // Protocol filter: include records with matching protocol OR empty/null protocol (for backward compatibility)
    let whereClause = `(protocol = '${protocol || this.protocol}' OR protocol = '' OR protocol IS NULL)`;
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
    console.log('[PolymarketDbService] getMarkets SQL:', sql);
    const results = await this.safeQuery<MarketRecord>(sql);
    console.log('[PolymarketDbService] getMarkets results:', results.length);
    return results;
  }

  async getMarketById(id: string, protocol?: string): Promise<MarketRecord | null> {
    const p = protocol || this.protocol;
    const sql = `SELECT * FROM ${this.databaseName}.markets WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL) AND id = '${id}' LIMIT 1`;
    const results = await this.safeQuery<MarketRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getMarketByConditionId(conditionId: string, protocol?: string): Promise<MarketRecord | null> {
    const p = protocol || this.protocol;
    const sql = `SELECT * FROM ${this.databaseName}.markets WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL) AND condition_id = '${conditionId}' LIMIT 1`;
    const results = await this.safeQuery<MarketRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getMarketCount(status?: 'active' | 'closed' | 'all', protocol?: string): Promise<number> {
    const p = protocol || this.protocol;
    let whereClause = `(protocol = '${p}' OR protocol = '' OR protocol IS NULL)`;
    if (status === 'active') whereClause += ' AND active = 1 AND closed = 0';
    else if (status === 'closed') whereClause += ' AND closed = 1';

    const sql = `SELECT count() as count FROM ${this.databaseName}.markets WHERE ${whereClause}`;
    const results = await this.safeQuery<{ count: string }>(sql);
    return results.length > 0 ? parseInt(results[0].count, 10) : 0;
  }

  async getEvents(params: { limit?: number; offset?: number; search?: string; protocol?: string } = {}): Promise<EventRecord[]> {
    const { limit = 50, offset = 0, search, protocol } = params;
    const p = protocol || this.protocol;
    let whereClause = `(protocol = '${p}' OR protocol = '' OR protocol IS NULL)`;
    if (search) whereClause += ` AND (title ILIKE '%${search}%' OR slug ILIKE '%${search}%')`;

    const sql = `
      SELECT * FROM ${this.databaseName}.events
      WHERE ${whereClause}
      ORDER BY total_volume DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return this.safeQuery<EventRecord>(sql);
  }

  async getEventById(id: string, protocol?: string): Promise<EventRecord | null> {
    const p = protocol || this.protocol;
    const sql = `SELECT * FROM ${this.databaseName}.events WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL) AND id = '${id}' LIMIT 1`;
    const results = await this.safeQuery<EventRecord>(sql);
    return results.length > 0 ? results[0] : null;
  }

  async getLeaderboard(params: { limit?: number; offset?: number; protocol?: string } = {}): Promise<TraderRecord[]> {
    const { limit = 100, offset = 0, protocol } = params;
    const p = protocol || this.protocol;
    const sql = `SELECT * FROM ${this.databaseName}.traders WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL) ORDER BY rank ASC LIMIT ${limit} OFFSET ${offset}`;
    return this.safeQuery<TraderRecord>(sql);
  }

  async getTrades(params: { marketId?: string; conditionId?: string; userAddress?: string; limit?: number; offset?: number; protocol?: string } = {}): Promise<TradeRecord[]> {
    const { marketId, conditionId, userAddress, limit = 100, offset = 0, protocol } = params;
    const p = protocol || this.protocol;
    let whereClause = `(protocol = '${p}' OR protocol = '' OR protocol IS NULL)`;
    if (marketId) whereClause += ` AND market_id = '${marketId}'`;
    if (conditionId) whereClause += ` AND condition_id = '${conditionId}'`;
    if (userAddress) whereClause += ` AND user_address = '${userAddress}'`;

    const sql = `SELECT * FROM ${this.databaseName}.trades WHERE ${whereClause} ORDER BY timestamp DESC LIMIT ${limit} OFFSET ${offset}`;
    return this.safeQuery<TradeRecord>(sql);
  }

  async getStats(protocol?: string): Promise<{ totalMarkets: number; activeMarkets: number; totalEvents: number; totalTrades: number; totalTraders: number; lastUpdated: string | null; protocol: string }> {
    const p = protocol || this.protocol;
    try {
      const [marketsCount, activeMarketsCount, eventsCount, tradesCount, tradersCount, lastRun] = await Promise.all([
        this.getMarketCount('all', p),
        this.getMarketCount('active', p),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.events WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL)`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.trades WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL)`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.traders WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL)`),
        this.safeQuery<{ completed_at: string }>(`SELECT completed_at FROM ${this.databaseName}.pipeline_runs WHERE (protocol = '${p}' OR protocol = '' OR protocol IS NULL) AND status = 'completed' ORDER BY completed_at DESC LIMIT 1`),
      ]);

      return {
        totalMarkets: marketsCount,
        activeMarkets: activeMarketsCount,
        totalEvents: eventsCount.length > 0 ? parseInt(eventsCount[0].count, 10) : 0,
        totalTrades: tradesCount.length > 0 ? parseInt(tradesCount[0].count, 10) : 0,
        totalTraders: tradersCount.length > 0 ? parseInt(tradersCount[0].count, 10) : 0,
        lastUpdated: lastRun.length > 0 ? lastRun[0].completed_at : null,
        protocol: p,
      };
    } catch {
      return { totalMarkets: 0, activeMarkets: 0, totalEvents: 0, totalTrades: 0, totalTraders: 0, lastUpdated: null, protocol: p };
    }
  }

  // Get markets from all protocols
  async getAllMarketsAcrossProtocols(params: {
    status?: 'active' | 'closed' | 'all';
    limit?: number;
    offset?: number;
    search?: string;
  } = {}): Promise<MarketRecord[]> {
    const { status = 'active', limit = 50, offset = 0, search } = params;

    let whereClause = '1=1';
    if (status === 'active') {
      whereClause += ' AND active = 1 AND closed = 0';
    } else if (status === 'closed') {
      whereClause += ' AND closed = 1';
    }
    if (search) {
      whereClause += ` AND (question ILIKE '%${search}%' OR slug ILIKE '%${search}%')`;
    }

    const sql = `
      SELECT * FROM ${this.databaseName}.markets
      WHERE ${whereClause}
      ORDER BY volume DESC
      LIMIT ${limit} OFFSET ${offset}
    `;
    return this.safeQuery<MarketRecord>(sql);
  }

  // Get combined stats for all protocols
  async getCombinedStats(): Promise<{ totalMarkets: number; activeMarkets: number; totalEvents: number; totalTrades: number; totalTraders: number; protocols: string[] }> {
    try {
      const [marketsCount, activeMarketsCount, eventsCount, tradesCount, tradersCount, protocols] = await Promise.all([
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.markets`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.markets WHERE active = 1 AND closed = 0`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.events`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.trades`),
        this.safeQuery<{ count: string }>(`SELECT count() as count FROM ${this.databaseName}.traders`),
        this.safeQuery<{ protocol: string }>(`SELECT DISTINCT protocol FROM ${this.databaseName}.markets`),
      ]);

      return {
        totalMarkets: marketsCount.length > 0 ? parseInt(marketsCount[0].count, 10) : 0,
        activeMarkets: activeMarketsCount.length > 0 ? parseInt(activeMarketsCount[0].count, 10) : 0,
        totalEvents: eventsCount.length > 0 ? parseInt(eventsCount[0].count, 10) : 0,
        totalTrades: tradesCount.length > 0 ? parseInt(tradesCount[0].count, 10) : 0,
        totalTraders: tradersCount.length > 0 ? parseInt(tradersCount[0].count, 10) : 0,
        protocols: protocols.map(p => p.protocol),
      };
    } catch {
      return { totalMarkets: 0, activeMarkets: 0, totalEvents: 0, totalTrades: 0, totalTraders: 0, protocols: [] };
    }
  }
}

export const polymarketDbService = new PolymarketDatabaseService();
