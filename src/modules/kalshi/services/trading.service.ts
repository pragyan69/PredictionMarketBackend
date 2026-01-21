// src/modules/kalshi/services/trading.service.ts

import { v4 as uuidv4 } from 'uuid';
import { clickhouse } from '../../../config/clickhouse';
import { kalshiTradingClient } from '../clients/trading.client';
import { KalshiCredentials } from '../../auth/types/auth.types';
import {
  KalshiCreateOrderRequest,
  KalshiOrder,
  KalshiTimeInForce,
  UnifiedKalshiOrderRequest,
  UnifiedKalshiOrderResponse,
} from '../types/trading.types';

export class KalshiTradingService {
  /**
   * Map unified time_in_force to Kalshi TimeInForce
   */
  private mapTimeInForce(tif: string): KalshiTimeInForce | undefined {
    switch (tif) {
      case 'gtc':
        return 'good_till_canceled';
      case 'fok':
        return 'fill_or_kill';
      case 'ioc':
        return 'immediate_or_cancel';
      case 'gtd':
        // GTD uses expiration_ts instead of time_in_force
        return undefined;
      default:
        return 'good_till_canceled';
    }
  }

  /**
   * Convert price (0.01-0.99) to cents (1-99)
   */
  private priceToCents(price: number): number {
    return Math.round(price * 100);
  }

  /**
   * Convert cents (1-99) to price (0.01-0.99)
   */
  private centsToPrice(cents: number): number {
    return cents / 100;
  }

  /**
   * Create and post an order
   */
  async createOrder(
    request: UnifiedKalshiOrderRequest,
    credentials: KalshiCredentials,
    walletAddress: string
  ): Promise<UnifiedKalshiOrderResponse> {
    const clientOrderId = uuidv4();

    // Build Kalshi order request
    const kalshiRequest: KalshiCreateOrderRequest = {
      ticker: request.market_id,
      side: request.side,
      action: request.action,
      type: request.order_type,
      count: Math.round(request.quantity),
      client_order_id: clientOrderId,
      post_only: request.post_only,
      reduce_only: request.reduce_only,
    };

    // Set price based on side
    if (request.side === 'yes') {
      kalshiRequest.yes_price = this.priceToCents(request.price);
    } else {
      kalshiRequest.no_price = this.priceToCents(request.price);
    }

    // Set time in force
    const tif = this.mapTimeInForce(request.time_in_force);
    if (tif) {
      kalshiRequest.time_in_force = tif;
    }

    // Set expiration for GTD orders
    if (request.time_in_force === 'gtd' && request.expiration_ts) {
      kalshiRequest.expiration_ts = request.expiration_ts;
    }

    // Create order
    const response = await kalshiTradingClient.createOrder(kalshiRequest, credentials);
    const order = response.order;

    // Save to database
    const orderId = uuidv4();
    await this.saveOrder({
      id: orderId,
      platform: 'kalshi',
      external_id: order.order_id,
      client_order_id: clientOrderId,
      user_wallet: walletAddress,
      market_id: request.market_id,
      side: request.side,
      action: request.action,
      order_type: request.order_type,
      time_in_force: request.time_in_force,
      price: request.price,
      quantity: request.quantity,
      filled_quantity: order.fill_count,
      remaining_quantity: order.remaining_count,
      status: order.status,
      fees: order.taker_fees + order.maker_fees,
      raw_request: JSON.stringify(request),
      raw_response: JSON.stringify(response),
    });

    return this.mapOrderToUnified(orderId, order, request);
  }

  /**
   * Map Kalshi order to unified response
   */
  private mapOrderToUnified(
    internalId: string,
    order: KalshiOrder,
    request?: UnifiedKalshiOrderRequest
  ): UnifiedKalshiOrderResponse {
    return {
      id: internalId,
      external_id: order.order_id,
      platform: 'kalshi',
      status: order.status,
      market_id: order.ticker,
      side: order.side,
      action: order.action,
      price: this.centsToPrice(order.side === 'yes' ? order.yes_price : order.no_price),
      quantity: order.initial_count,
      filled_quantity: order.fill_count,
      remaining_quantity: order.remaining_count,
      order_type: order.type,
      time_in_force: request?.time_in_force || 'gtc',
      fees: order.taker_fees + order.maker_fees,
      queue_position: order.queue_position,
      created_at: order.created_time,
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(
    orderId: string,
    credentials: KalshiCredentials
  ): Promise<KalshiOrder | null> {
    const response = await kalshiTradingClient.getOrder(orderId, credentials);
    return response?.order || null;
  }

  /**
   * Get orders
   */
  async getOrders(
    credentials: KalshiCredentials,
    params?: {
      ticker?: string;
      status?: string;
      limit?: number;
      cursor?: string;
    }
  ): Promise<KalshiOrder[]> {
    const response = await kalshiTradingClient.getOrders(credentials, params);
    return response.orders || [];
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    credentials: KalshiCredentials,
    walletAddress: string
  ): Promise<KalshiOrder> {
    const response = await kalshiTradingClient.cancelOrder(orderId, credentials);

    // Update order status in database
    await this.updateOrderStatus(orderId, 'cancelled', walletAddress);

    return response.order;
  }

  /**
   * Batch cancel orders
   */
  async batchCancelOrders(
    orderIds: string[],
    credentials: KalshiCredentials,
    walletAddress: string
  ): Promise<KalshiOrder[]> {
    const response = await kalshiTradingClient.batchCancelOrders(orderIds, credentials);

    // Update order statuses in database
    for (const order of response.orders) {
      await this.updateOrderStatus(order.order_id, 'cancelled', walletAddress);
    }

    return response.orders;
  }

  /**
   * Get queue positions
   */
  async getQueuePositions(credentials: KalshiCredentials) {
    return kalshiTradingClient.getQueuePositions(credentials);
  }

  /**
   * Get balance
   */
  async getBalance(credentials: KalshiCredentials) {
    return kalshiTradingClient.getBalance(credentials);
  }

  /**
   * Get positions
   */
  async getPositions(
    credentials: KalshiCredentials,
    params?: {
      ticker?: string;
      limit?: number;
    }
  ) {
    return kalshiTradingClient.getPositions(credentials, params);
  }

  /**
   * Get user's orders from database
   */
  async getUserOrders(
    walletAddress: string,
    params?: {
      status?: string;
      market_id?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<any[]> {
    let query = `
      SELECT *
      FROM mimiq_orders
      WHERE platform = 'kalshi'
        AND user_wallet = {walletAddress:String}
    `;

    const queryParams: any = { walletAddress: walletAddress.toLowerCase() };

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

    return result.json();
  }

  /**
   * Save order to database
   */
  private async saveOrder(order: {
    id: string;
    platform: string;
    external_id: string;
    client_order_id: string;
    user_wallet: string;
    market_id: string;
    side: string;
    action: string;
    order_type: string;
    time_in_force: string;
    price: number;
    quantity: number;
    filled_quantity: number;
    remaining_quantity: number;
    status: string;
    fees: number;
    raw_request: string;
    raw_response: string;
  }): Promise<void> {
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    await clickhouse.getClient().insert({
      table: 'mimiq_orders',
      values: [
        {
          id: order.id,
          platform: order.platform,
          external_id: order.external_id,
          client_order_id: order.client_order_id,
          user_wallet: order.user_wallet.toLowerCase(),
          market_id: order.market_id,
          market_name: '',
          side: order.side,
          action: order.action,
          order_type: order.order_type,
          time_in_force: order.time_in_force,
          price: order.price,
          quantity: order.quantity,
          filled_quantity: order.filled_quantity,
          remaining_quantity: order.remaining_quantity,
          status: order.status,
          fees_paid: order.fees,
          expiration_ts: null,
          created_at: now,
          updated_at: now,
          filled_at: null,
          raw_request: order.raw_request,
          raw_response: order.raw_response,
          error_message: '',
        },
      ],
      format: 'JSONEachRow',
    });
  }

  /**
   * Update order status in database
   */
  private async updateOrderStatus(
    externalId: string,
    status: string,
    walletAddress: string
  ): Promise<void> {
    const result = await clickhouse.getClient().query({
      query: `
        SELECT *
        FROM mimiq_orders
        WHERE external_id = {externalId:String}
          AND user_wallet = {walletAddress:String}
        ORDER BY updated_at DESC
        LIMIT 1
      `,
      query_params: {
        externalId,
        walletAddress: walletAddress.toLowerCase(),
      },
      format: 'JSONEachRow',
    });

    const rows = await result.json<any[]>();
    if (rows.length === 0) return;

    const order = rows[0];
    const now = new Date().toISOString().replace('T', ' ').replace('Z', '');

    await clickhouse.getClient().insert({
      table: 'mimiq_orders',
      values: [
        {
          ...order,
          status,
          updated_at: now,
        },
      ],
      format: 'JSONEachRow',
    });
  }
}

export const kalshiTradingService = new KalshiTradingService();
