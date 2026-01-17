// src/modules/polymarket/services/fetchers/trader.fetcher.ts

import { dataClient } from '../../clients/data.client';
import { LeaderboardEntry, PositionEntry } from '../../types/aggregation.types';

export class TraderFetcher {
  private readonly PAGE_SIZE = 100;
  private readonly CONCURRENT_POSITION_FETCHES = 5;
  private readonly DELAY_BETWEEN_BATCHES = 200; // ms

  /**
   * Fetch leaderboard data (top traders)
   * If limit is 0, fetch all traders using pagination
   */
  async fetchLeaderboard(limit: number = 0): Promise<LeaderboardEntry[]> {
    console.log(`📥 Fetching leaderboard${limit > 0 ? ` (top ${limit})` : ' (all)'}...`);
    console.log(`   🔗 URL: ${dataClient.baseUrl}/v1/leaderboard`);

    const traders: LeaderboardEntry[] = [];
    let offset = 0;

    try {
      if (limit > 0) {
        // Fetch only up to the specified limit
        console.log(`   📊 DEBUG: Requesting limit=${limit}, offset=0`);
        const response = await dataClient.getLeaderboard({ limit, offset: 0 });

        // Debug: Verify actual data
        console.log(`   📊 DEBUG: Raw response type: ${typeof response}`);
        console.log(`   📊 DEBUG: Is array: ${Array.isArray(response)}`);
        console.log(`   📊 DEBUG: Length: ${response?.length ?? 'undefined'}`);

        if (response && Array.isArray(response) && response.length > 0) {
          console.log(`   📊 DEBUG: First trader sample:`, JSON.stringify(response[0], null, 2).substring(0, 500));
        } else {
          console.log(`   ⚠️ DEBUG: No traders returned or empty array`);
        }

        const entries = this.normalizeLeaderboardResponse(response);
        traders.push(...entries);
      } else {
        // Fetch all traders using pagination
        let hasMore = true;

        while (hasMore) {
          const response = await dataClient.getLeaderboard({
            limit: this.PAGE_SIZE,
            offset
          });

          const entries = this.normalizeLeaderboardResponse(response);

          if (entries.length === 0) {
            hasMore = false;
          } else {
            traders.push(...entries);
            offset += this.PAGE_SIZE;

            console.log(`  Fetched ${traders.length} traders...`);

            // Add delay between pages
            await this.delay(200);
          }
        }
      }

      // Add rank if not present
      traders.forEach((trader, index) => {
        if (trader.rank === undefined) {
          trader.rank = index + 1;
        }
      });

      console.log(`✅ Fetched ${traders.length} traders from leaderboard`);
      return traders;
    } catch (error) {
      console.error('❌ Failed to fetch leaderboard:', error);
      throw error;
    }
  }

  /**
   * Fetch positions for multiple traders
   */
  async fetchPositionsForTraders(
    traderAddresses: string[],
    onProgress?: (count: number) => void
  ): Promise<Map<string, PositionEntry[]>> {
    console.log(`📥 Fetching positions for ${traderAddresses.length} traders...`);

    const positionsMap = new Map<string, PositionEntry[]>();
    let processed = 0;

    // Process with concurrency limit
    for (let i = 0; i < traderAddresses.length; i += this.CONCURRENT_POSITION_FETCHES) {
      const batch = traderAddresses.slice(i, i + this.CONCURRENT_POSITION_FETCHES);

      const results = await Promise.allSettled(
        batch.map(async (address) => {
          try {
            const positions = await dataClient.getCurrentPositions(address);
            return { address, positions };
          } catch (error) {
            console.warn(`⚠️ Failed to fetch positions for ${address}:`, error);
            return { address, positions: null };
          }
        })
      );

      for (const result of results) {
        if (result.status === 'fulfilled' && result.value.positions) {
          const { address, positions } = result.value;
          const normalized = this.normalizePositionsResponse(positions);
          if (normalized.length > 0) {
            positionsMap.set(address, normalized);
          }
        }
        processed++;
      }

      if (onProgress) {
        onProgress(processed);
      }

      // Delay between batches
      if (i + this.CONCURRENT_POSITION_FETCHES < traderAddresses.length) {
        await this.delay(this.DELAY_BETWEEN_BATCHES);
      }
    }

    console.log(`✅ Fetched positions for ${positionsMap.size} traders`);
    return positionsMap;
  }

  /**
   * Normalize leaderboard response to consistent format
   * Actual API returns: rank (string), proxyWallet, userName, vol, pnl, profileImage, xUsername, verifiedBadge
   */
  private normalizeLeaderboardResponse(response: any): LeaderboardEntry[] {
    if (!response) return [];

    // Response is an array directly from /v1/leaderboard
    const entries = Array.isArray(response) ? response : (response.data || response.traders || []);

    return entries.map((entry: any) => ({
      // Map proxyWallet to address (our internal field name)
      address: entry.proxyWallet || entry.address || entry.user_address || entry.userAddress || entry.wallet || '',
      rank: parseInt(entry.rank || '0', 10) || undefined,
      profit: entry.pnl || entry.profit,
      pnl: entry.pnl || entry.profit,
      // vol is the volume field from API
      volume: typeof entry.vol === 'number' ? entry.vol : parseFloat(entry.vol || entry.volume || entry.total_volume || entry.totalVolume || '0'),
      marketsTraded: entry.marketsTraded || entry.markets_traded,
      markets_traded: entry.markets_traded || entry.marketsTraded,
      winRate: entry.winRate || entry.win_rate,
      win_rate: entry.win_rate || entry.winRate,
      avgPositionSize: entry.avgPositionSize || entry.avg_position_size,
      avg_position_size: entry.avg_position_size || entry.avgPositionSize,
      // Additional fields from API
      userName: entry.userName,
      profileImage: entry.profileImage,
      xUsername: entry.xUsername,
      verifiedBadge: entry.verifiedBadge,
    }));
  }

  /**
   * Normalize positions response to consistent format
   * Actual API returns: proxyWallet, asset, conditionId, size, avgPrice, initialValue, currentValue,
   * cashPnl, percentPnl, totalBought, realizedPnl, percentRealizedPnl, curPrice, redeemable,
   * mergeable, title, slug, icon, eventSlug, outcome, outcomeIndex, etc.
   */
  private normalizePositionsResponse(response: any): PositionEntry[] {
    if (!response) return [];

    // Response is an array directly from /positions
    const positions = Array.isArray(response) ? response : (response.data || response.positions || []);

    return positions.map((pos: any) => ({
      // Map conditionId to marketId (our internal field name)
      marketId: pos.conditionId || pos.marketId || pos.market_id || pos.condition_id,
      market_id: pos.conditionId || pos.market_id || pos.marketId,
      assetId: pos.asset || pos.assetId || pos.asset_id || pos.tokenId || pos.token_id,
      asset_id: pos.asset || pos.asset_id || pos.assetId,
      // Size is a number from API
      size: typeof pos.size === 'number' ? pos.size : parseFloat(pos.size || pos.amount || pos.quantity || '0'),
      amount: typeof pos.size === 'number' ? pos.size : parseFloat(pos.amount || pos.size || '0'),
      // avgPrice is the entry price
      entryPrice: typeof pos.avgPrice === 'number' ? pos.avgPrice : parseFloat(pos.avgPrice || pos.entryPrice || pos.entry_price || pos.avg_price || '0'),
      entry_price: typeof pos.avgPrice === 'number' ? pos.avgPrice : parseFloat(pos.entry_price || pos.avgPrice || pos.entryPrice || '0'),
      avgPrice: typeof pos.avgPrice === 'number' ? pos.avgPrice : parseFloat(pos.avgPrice || pos.avg_price || pos.entryPrice || '0'),
      // curPrice is the current price
      currentPrice: typeof pos.curPrice === 'number' ? pos.curPrice : parseFloat(pos.curPrice || pos.currentPrice || pos.current_price || '0'),
      current_price: typeof pos.curPrice === 'number' ? pos.curPrice : parseFloat(pos.current_price || pos.curPrice || pos.currentPrice || '0'),
      // cashPnl is the PnL
      pnl: typeof pos.cashPnl === 'number' ? pos.cashPnl : parseFloat(pos.cashPnl || pos.pnl || pos.profit || pos.unrealizedPnl || '0'),
      profit: typeof pos.cashPnl === 'number' ? pos.cashPnl : parseFloat(pos.profit || pos.cashPnl || pos.pnl || '0'),
      updatedAt: pos.updatedAt || pos.updated_at,
      updated_at: pos.updated_at || pos.updatedAt,
      // Additional fields from API
      title: pos.title,
      slug: pos.slug,
      outcome: pos.outcome,
      outcomeIndex: pos.outcomeIndex,
    }));
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

export const traderFetcher = new TraderFetcher();
