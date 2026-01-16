// src/modules/polymarket/services/transformers/trader.transformer.ts

import { LeaderboardEntry, EnrichedTrader } from '../../types/aggregation.types';

export class TraderTransformer {
  /**
   * Transform leaderboard entries into enriched trader records
   */
  transform(traders: LeaderboardEntry[]): EnrichedTrader[] {
    const now = new Date();

    return traders
      .filter(trader => trader.address) // Filter out invalid entries
      .map((trader, index) => ({
        user_address: trader.address.toLowerCase(),
        rank: trader.rank ?? (index + 1),
        total_pnl: this.parseNumber(trader.pnl ?? trader.profit),
        total_volume: this.parseNumber(trader.volume),
        markets_traded: this.parseNumber(trader.marketsTraded ?? trader.markets_traded),
        win_rate: this.parseNumber(trader.winRate ?? trader.win_rate),
        avg_position_size: this.parseNumber(trader.avgPositionSize ?? trader.avg_position_size),
        fetched_at: now,
      }));
  }

  /**
   * Parse various numeric formats to number
   */
  private parseNumber(value: any): number {
    if (value === null || value === undefined) return 0;
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
      const parsed = parseFloat(value);
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  }
}

export const traderTransformer = new TraderTransformer();
