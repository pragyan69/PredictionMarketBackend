// src/modules/polymarket/services/trading.service.ts

import { v4 as uuidv4 } from 'uuid';
import { clickhouse } from '../../../config/clickhouse';
import { polymarketTradingClient } from '../clients/trading.client';
import { buildOrderStruct, signOrder } from '../utils/orderSigner';
import { PolymarketCredentials } from '../../auth/types/auth.types';
import {
  CreateOrderParams,
  OrderType,
  SignedOrder,
  UnifiedOrderRequest,
  UnifiedOrderResponse,
  OpenOrder,
  CancelResponse,
  SignatureType,
} from '../types/trading.types';

export class PolymarketTradingService {
  /**
   * Map unified time_in_force to Polymarket OrderType
   */
  private mapTimeInForce(tif: string): OrderType {
    switch (tif) {
      case 'gtc':
        return 'GTC';
      case 'gtd':
        return 'GTD';
      case 'fok':
        return 'FOK';
      case 'ioc':
        return 'FAK';
      default:
        return 'GTC';
    }
  }

  /**
   * Create and post an order
   */
  async createOrder(
    request: UnifiedOrderRequest,
    credentials: PolymarketCredentials,
    walletAddress: string,
    privateKey?: string
  ): Promise<UnifiedOrderResponse> {
    const clientOrderId = uuidv4();

    // Map unified request to Polymarket params
    const orderParams: CreateOrderParams = {
      tokenId: request.market_id,
      price: request.price,
      size: request.quantity,
      side: request.action === 'buy' ? 'BUY' : 'SELL',
      expiration: request.expiration_ts,
    };

    // Build order struct
    const orderStruct = buildOrderStruct(
      orderParams,
      credentials.funderAddress || walletAddress,
      walletAddress,
      credentials.signatureType as SignatureType
    );

    // Sign order (requires private key)
    // Note: In production, this should be done client-side
    let signedOrder: SignedOrder;
    if (privateKey) {
      signedOrder = await signOrder(orderStruct, privateKey);
    } else {
      // If no private key, we expect the order to be pre-signed
      // This is a placeholder - in real implementation, signing happens client-side
      throw new Error(
        'Order signing requires private key. In production, orders should be signed client-side.'
      );
    }

    // Post order
    const orderType = this.mapTimeInForce(request.time_in_force);
    const response = await polymarketTradingClient.postOrder(
      signedOrder,
      orderType,
      credentials
    );

    if (!response.success) {
      throw new Error(response.errorMsg || 'Failed to create order');
    }

    // Save to database
    const orderId = uuidv4();
    await this.saveOrder({
      id: orderId,
      platform: 'polymarket',
      external_id: response.orderID || '',
      client_order_id: clientOrderId,
      user_wallet: walletAddress,
      market_id: request.market_id,
      side: request.side,
      action: request.action,
      order_type: request.order_type,
      time_in_force: request.time_in_force,
      price: request.price,
      quantity: request.quantity,
      filled_quantity: 0,
      remaining_quantity: request.quantity,
      status: response.status || 'live',
      raw_request: JSON.stringify(request),
      raw_response: JSON.stringify(response),
    });

    return {
      id: orderId,
      external_id: response.orderID || '',
      platform: 'polymarket',
      status: response.status || 'live',
      market_id: request.market_id,
      side: request.side,
      action: request.action,
      price: request.price,
      quantity: request.quantity,
      filled_quantity: 0,
      remaining_quantity: request.quantity,
      order_type: request.order_type,
      time_in_force: request.time_in_force,
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Get order by ID
   */
  async getOrder(
    orderId: string,
    credentials: PolymarketCredentials
  ): Promise<OpenOrder | null> {
    return polymarketTradingClient.getOrder(orderId, credentials);
  }

  /**
   * Get open orders
   */
  async getOpenOrders(
    credentials: PolymarketCredentials,
    params?: { market?: string; asset_id?: string }
  ): Promise<OpenOrder[]> {
    return polymarketTradingClient.getOpenOrders(credentials, params);
  }

  /**
   * Cancel order
   */
  async cancelOrder(
    orderId: string,
    credentials: PolymarketCredentials,
    walletAddress: string
  ): Promise<CancelResponse> {
    const result = await polymarketTradingClient.cancelOrder(orderId, credentials);

    // Update order status in database
    if (result.canceled.includes(orderId)) {
      await this.updateOrderStatus(orderId, 'cancelled', walletAddress);
    }

    return result;
  }

  /**
   * Cancel all orders
   */
  async cancelAllOrders(
    credentials: PolymarketCredentials,
    walletAddress: string
  ): Promise<CancelResponse> {
    const result = await polymarketTradingClient.cancelAllOrders(credentials);

    // Update order statuses in database
    for (const orderId of result.canceled) {
      await this.updateOrderStatus(orderId, 'cancelled', walletAddress);
    }

    return result;
  }

  /**
   * Cancel orders for a market
   */
  async cancelMarketOrders(
    credentials: PolymarketCredentials,
    walletAddress: string,
    params: { market?: string; asset_id?: string }
  ): Promise<CancelResponse> {
    const result = await polymarketTradingClient.cancelMarketOrders(credentials, params);

    // Update order statuses in database
    for (const orderId of result.canceled) {
      await this.updateOrderStatus(orderId, 'cancelled', walletAddress);
    }

    return result;
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
      WHERE platform = 'polymarket'
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
          market_name: '', // Could be populated from market data
          side: order.side,
          action: order.action,
          order_type: order.order_type,
          time_in_force: order.time_in_force,
          price: order.price,
          quantity: order.quantity,
          filled_quantity: order.filled_quantity,
          remaining_quantity: order.remaining_quantity,
          status: order.status,
          fees_paid: 0,
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
    // Get existing order
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

    // Insert updated row (ReplacingMergeTree will merge)
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

export const polymarketTradingService = new PolymarketTradingService();
