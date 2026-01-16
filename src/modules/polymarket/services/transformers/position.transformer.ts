// src/modules/polymarket/services/transformers/position.transformer.ts

import { PositionEntry, EnrichedPosition } from '../../types/aggregation.types';

export class PositionTransformer {
  /**
   * Transform position entries for multiple traders into enriched position records
   */
  transform(positionsMap: Map<string, PositionEntry[]>): EnrichedPosition[] {
    const now = new Date();
    const enrichedPositions: EnrichedPosition[] = [];

    for (const [userAddress, positions] of positionsMap) {
      for (const position of positions) {
        const enriched = this.transformSinglePosition(userAddress, position, now);
        if (enriched) {
          enrichedPositions.push(enriched);
        }
      }
    }

    return enrichedPositions;
  }

  /**
   * Transform a single position entry
   */
  private transformSinglePosition(
    userAddress: string,
    position: PositionEntry,
    fetchedAt: Date
  ): EnrichedPosition | null {
    const marketId = position.marketId || position.market_id;
    const assetId = position.assetId || position.asset_id;

    // Skip positions without required identifiers
    if (!marketId && !assetId) {
      return null;
    }

    const size = this.parseNumber(position.size ?? position.amount);
    // Skip zero-size positions
    if (size === 0) {
      return null;
    }

    const entryPrice = this.parseNumber(
      position.entryPrice ?? position.entry_price ?? position.avgPrice ?? position.avg_price
    );
    const currentPrice = this.parseNumber(position.currentPrice ?? position.current_price);
    const pnl = this.parseNumber(position.pnl ?? position.profit);

    const updatedAt = this.parseDate(position.updatedAt ?? position.updated_at);

    return {
      user_address: userAddress.toLowerCase(),
      market_id: marketId || '',
      asset_id: assetId || '',
      size,
      entry_price: entryPrice,
      current_price: currentPrice,
      pnl,
      position_updated_at: updatedAt,
      fetched_at: fetchedAt,
    };
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

  /**
   * Parse date string to Date object
   */
  private parseDate(dateStr: string | undefined): Date {
    if (!dateStr) return new Date();

    try {
      const date = new Date(dateStr);
      return isNaN(date.getTime()) ? new Date() : date;
    } catch {
      return new Date();
    }
  }
}

export const positionTransformer = new PositionTransformer();
