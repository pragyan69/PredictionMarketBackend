// src/modules/portfolio/portfolio.service.ts

import { clickhouse } from '../../config/clickhouse';
import { kalshiTradingService } from '../kalshi/services/trading.service';
import { AuthContext } from '../auth/types/auth.types';
import {
  UnifiedPortfolioSummary,
  UnifiedPosition,
  UnifiedBalance,
  Platform,
} from '../unified/types/orders.types';

export class PortfolioService {
  /**
   * Get portfolio summary
   */
  async getPortfolioSummary(auth: AuthContext): Promise<UnifiedPortfolioSummary> {
    const summary: UnifiedPortfolioSummary = {
      total_value: 0,
      unrealized_pnl: 0,
      realized_pnl: 0,
      open_orders_count: 0,
      positions_count: 0,
      polymarket: {
        connected: !!auth.polymarket,
      },
      kalshi: {
        connected: !!auth.kalshi,
      },
    };

    // Get Kalshi data if connected
    if (auth.kalshi) {
      try {
        const [balance, positions] = await Promise.all([
          kalshiTradingService.getBalance(auth.kalshi),
          kalshiTradingService.getPositions(auth.kalshi),
        ]);

        summary.kalshi.balance = parseFloat(balance.balance_dollars);
        summary.kalshi.positions_count = positions.positions.length;
        summary.total_value += summary.kalshi.balance;
        summary.positions_count += positions.positions.length;

        // Calculate PnL from positions
        for (const pos of positions.positions) {
          summary.realized_pnl += parseFloat(pos.realized_pnl_dollars);
        }
      } catch (error) {
        console.error('Error fetching Kalshi portfolio:', error);
      }
    }

    // Get open orders count from database
    const ordersResult = await clickhouse.getClient().query({
      query: `
        SELECT count() as count
        FROM mimiq_orders
        WHERE user_wallet = {walletAddress:String}
          AND status IN ('live', 'resting', 'pending')
      `,
      query_params: { walletAddress: auth.walletAddress.toLowerCase() },
      format: 'JSONEachRow',
    });

    const ordersRows = await ordersResult.json<any[]>();
    if (ordersRows.length > 0) {
      summary.open_orders_count = parseInt(ordersRows[0].count);
    }

    return summary;
  }

  /**
   * Get positions across all platforms
   */
  async getPositions(
    auth: AuthContext,
    params?: {
      platform?: Platform;
    }
  ): Promise<UnifiedPosition[]> {
    const positions: UnifiedPosition[] = [];

    // Get Kalshi positions
    if (auth.kalshi && (!params?.platform || params.platform === 'kalshi')) {
      try {
        const kalshiPositions = await kalshiTradingService.getPositions(auth.kalshi);

        for (const pos of kalshiPositions.positions) {
          positions.push({
            id: `kalshi-${pos.ticker}`,
            platform: 'kalshi',
            market_id: pos.ticker,
            side: pos.position > 0 ? 'yes' : 'no',
            quantity: Math.abs(pos.position),
            average_price: pos.position_cost / Math.abs(pos.position) / 100,
            realized_pnl: parseFloat(pos.realized_pnl_dollars),
          });
        }
      } catch (error) {
        console.error('Error fetching Kalshi positions:', error);
      }
    }

    // Note: Polymarket positions would require additional API calls
    // which depend on on-chain data and the relayer

    return positions;
  }

  /**
   * Get trade history
   */
  async getTradeHistory(
    walletAddress: string,
    params?: {
      platform?: Platform;
      from?: number;
      to?: number;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let query = `
      SELECT *
      FROM mimiq_orders
      WHERE user_wallet = {walletAddress:String}
        AND status IN ('filled', 'partially_filled')
    `;

    const queryParams: any = { walletAddress: walletAddress.toLowerCase() };

    if (params?.platform) {
      query += ` AND platform = {platform:String}`;
      queryParams.platform = params.platform;
    }

    if (params?.from) {
      query += ` AND created_at >= toDateTime({from:UInt64})`;
      queryParams.from = Math.floor(params.from / 1000);
    }

    if (params?.to) {
      query += ` AND created_at <= toDateTime({to:UInt64})`;
      queryParams.to = Math.floor(params.to / 1000);
    }

    query += ` ORDER BY created_at DESC`;

    if (params?.limit) {
      query += ` LIMIT {limit:UInt32}`;
      queryParams.limit = params.limit;
    } else {
      query += ` LIMIT 100`;
    }

    if (params?.offset) {
      query += ` OFFSET {offset:UInt32}`;
      queryParams.offset = params.offset;
    }

    const result = await clickhouse.getClient().query({
      query,
      query_params: queryParams,
      format: 'JSONEachRow',
    });

    return result.json();
  }

  /**
   * Get balances across all platforms
   */
  async getBalances(auth: AuthContext): Promise<UnifiedBalance[]> {
    const balances: UnifiedBalance[] = [];

    // Get Kalshi balance
    if (auth.kalshi) {
      try {
        const balance = await kalshiTradingService.getBalance(auth.kalshi);
        balances.push({
          platform: 'kalshi',
          currency: 'USD',
          available: balance.balance / 100, // Convert cents to dollars
          total: balance.balance / 100,
        });
      } catch (error) {
        console.error('Error fetching Kalshi balance:', error);
      }
    }

    // Note: Polymarket balance would require on-chain queries
    // for USDCe balance on Polygon

    return balances;
  }
}

export const portfolioService = new PortfolioService();
