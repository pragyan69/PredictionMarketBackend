// src/modules/unified/orders.service.ts

import { clickhouse } from '../../config/clickhouse';
import { polymarketTradingService } from '../polymarket/services/trading.service';
import { kalshiTradingService } from '../kalshi/services/trading.service';
import { AuthContext } from '../auth/types/auth.types';
import {
  UnifiedCreateOrderRequest,
  UnifiedOrderResponse,
  UnifiedCancelResponse,
  Platform,
} from './types/orders.types';

export class UnifiedOrdersService {
  /**
   * Create an order on the appropriate platform
   */
  async createOrder(
    request: UnifiedCreateOrderRequest,
    auth: AuthContext
  ): Promise<UnifiedOrderResponse> {
    switch (request.platform) {
      case 'polymarket':
        if (!auth.polymarket) {
          throw new Error('Polymarket credentials not configured');
        }
        const polyResult = await polymarketTradingService.createOrder(
          {
            market_id: request.market_id,
            side: request.side,
            action: request.action,
            price: request.price,
            quantity: request.quantity,
            order_type: request.order_type,
            time_in_force: request.time_in_force,
            expiration_ts: request.expiration_ts,
          },
          auth.polymarket,
          auth.walletAddress,
          request.private_key
        );
        return polyResult;

      case 'kalshi':
        if (!auth.kalshi) {
          throw new Error('Kalshi credentials not configured');
        }
        const kalshiResult = await kalshiTradingService.createOrder(
          {
            market_id: request.market_id,
            side: request.side,
            action: request.action,
            price: request.price,
            quantity: request.quantity,
            order_type: request.order_type,
            time_in_force: request.time_in_force,
            expiration_ts: request.expiration_ts,
            post_only: request.post_only,
            reduce_only: request.reduce_only,
          },
          auth.kalshi,
          auth.walletAddress
        );
        return kalshiResult;

      default:
        throw new Error(`Unknown platform: ${request.platform}`);
    }
  }

  /**
   * Get all orders from database
   */
  async getOrders(
    walletAddress: string,
    params?: {
      platform?: Platform;
      status?: string;
      market_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<UnifiedOrderResponse[]> {
    let query = `
      SELECT *
      FROM mimiq_orders
      WHERE user_wallet = {walletAddress:String}
    `;

    const queryParams: any = { walletAddress: walletAddress.toLowerCase() };

    if (params?.platform) {
      query += ` AND platform = {platform:String}`;
      queryParams.platform = params.platform;
    }

    if (params?.status) {
      query += ` AND status = {status:String}`;
      queryParams.status = params.status;
    }

    if (params?.market_id) {
      query += ` AND market_id = {marketId:String}`;
      queryParams.marketId = params.market_id;
    }

    query += ` ORDER BY created_at DESC`;

    if (params?.limit) {
      query += ` LIMIT {limit:UInt32}`;
      queryParams.limit = params.limit;
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

    const rows = await result.json<any[]>();
    return rows.map((row: any) => this.mapDbRowToUnifiedOrder(row));
  }

  /**
   * Get single order
   */
  async getOrder(
    orderId: string,
    auth: AuthContext
  ): Promise<UnifiedOrderResponse | null> {
    // First check our database
    const result = await clickhouse.getClient().query({
      query: `
        SELECT *
        FROM mimiq_orders
        WHERE (id = {orderId:String} OR external_id = {orderId:String})
          AND user_wallet = {walletAddress:String}
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      query_params: {
        orderId,
        walletAddress: auth.walletAddress.toLowerCase(),
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<any[]>();
    if (rows.length === 0) {
      return null;
    }

    return this.mapDbRowToUnifiedOrder(rows[0]);
  }

  /**
   * Cancel an order
   */
  async cancelOrder(
    orderId: string,
    platform: Platform,
    auth: AuthContext
  ): Promise<UnifiedCancelResponse> {
    try {
      switch (platform) {
        case 'polymarket':
          if (!auth.polymarket) {
            throw new Error('Polymarket credentials not configured');
          }
          const polyResult = await polymarketTradingService.cancelOrder(
            orderId,
            auth.polymarket,
            auth.walletAddress
          );
          return {
            success: polyResult.canceled.length > 0,
            canceled_ids: polyResult.canceled,
            failed_ids: polyResult.not_canceled,
          };

        case 'kalshi':
          if (!auth.kalshi) {
            throw new Error('Kalshi credentials not configured');
          }
          const kalshiResult = await kalshiTradingService.cancelOrder(
            orderId,
            auth.kalshi,
            auth.walletAddress
          );
          return {
            success: kalshiResult.status === 'canceled',
            canceled_ids: [kalshiResult.order_id],
            failed_ids: {},
          };

        default:
          throw new Error(`Unknown platform: ${platform}`);
      }
    } catch (error: any) {
      return {
        success: false,
        canceled_ids: [],
        failed_ids: { [orderId]: error.message },
      };
    }
  }

  /**
   * Cancel multiple orders
   */
  async cancelOrders(
    orderIds: string[],
    platform: Platform,
    auth: AuthContext
  ): Promise<UnifiedCancelResponse> {
    const canceled: string[] = [];
    const failed: { [id: string]: string } = {};

    // For Kalshi, use batch cancel if possible
    if (platform === 'kalshi' && auth.kalshi && orderIds.length <= 20) {
      try {
        const result = await kalshiTradingService.batchCancelOrders(
          orderIds,
          auth.kalshi,
          auth.walletAddress
        );
        for (const order of result) {
          if (order.status === 'canceled') {
            canceled.push(order.order_id);
          } else {
            failed[order.order_id] = `Status: ${order.status}`;
          }
        }
        return { success: canceled.length > 0, canceled_ids: canceled, failed_ids: failed };
      } catch (error: any) {
        // Fall back to individual cancels
      }
    }

    // Cancel individually
    for (const orderId of orderIds) {
      const result = await this.cancelOrder(orderId, platform, auth);
      canceled.push(...result.canceled_ids);
      Object.assign(failed, result.failed_ids);
    }

    return {
      success: canceled.length > 0,
      canceled_ids: canceled,
      failed_ids: failed,
    };
  }

  /**
   * Map database row to unified order response
   */
  private mapDbRowToUnifiedOrder(row: any): UnifiedOrderResponse {
    return {
      id: row.id,
      external_id: row.external_id,
      platform: row.platform,
      status: row.status,
      market_id: row.market_id,
      market_name: row.market_name,
      side: row.side,
      action: row.action,
      price: parseFloat(row.price),
      quantity: parseFloat(row.quantity),
      filled_quantity: parseFloat(row.filled_quantity),
      remaining_quantity: parseFloat(row.remaining_quantity),
      order_type: row.order_type,
      time_in_force: row.time_in_force,
      fees: parseFloat(row.fees_paid || 0),
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  }
}

export const unifiedOrdersService = new UnifiedOrdersService();
