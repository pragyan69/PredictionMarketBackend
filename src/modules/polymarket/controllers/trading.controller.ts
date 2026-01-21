// src/modules/polymarket/controllers/trading.controller.ts

import { Request, Response } from 'express';
import { polymarketTradingService } from '../services/trading.service';
import { UnifiedOrderRequest } from '../types/trading.types';

export class PolymarketTradingController {
  /**
   * POST /polymarket/orders
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const orderRequest: UnifiedOrderRequest = {
        market_id: req.body.market_id,
        side: req.body.side,
        action: req.body.action,
        price: req.body.price,
        quantity: req.body.quantity,
        order_type: req.body.order_type || 'limit',
        time_in_force: req.body.time_in_force || 'gtc',
        expiration_ts: req.body.expiration_ts,
      };

      // Validate required fields
      if (!orderRequest.market_id || !orderRequest.side || !orderRequest.action) {
        res.status(400).json({
          success: false,
          error: 'market_id, side, and action are required',
        });
        return;
      }

      if (!orderRequest.price || !orderRequest.quantity) {
        res.status(400).json({
          success: false,
          error: 'price and quantity are required',
        });
        return;
      }

      // Validate price range
      if (orderRequest.price < 0.01 || orderRequest.price > 0.99) {
        res.status(400).json({
          success: false,
          error: 'Price must be between 0.01 and 0.99',
        });
        return;
      }

      // Note: In production, order signing should happen client-side
      // The private key should not be passed to the backend
      const privateKey = req.body.private_key;

      const result = await polymarketTradingService.createOrder(
        orderRequest,
        req.auth.polymarket,
        req.auth.walletAddress,
        privateKey
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Create Polymarket order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create order',
      });
    }
  }

  /**
   * GET /polymarket/orders
   * Get user's orders
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const { market, asset_id, status, limit, offset } = req.query;

      // Get orders from Polymarket CLOB
      const openOrders = await polymarketTradingService.getOpenOrders(
        req.auth.polymarket,
        {
          market: market as string,
          asset_id: asset_id as string,
        }
      );

      // Also get from our database for history
      const dbOrders = await polymarketTradingService.getUserOrders(
        req.auth.walletAddress,
        {
          status: status as string,
          market_id: market as string,
          limit: limit ? parseInt(limit as string) : 50,
          offset: offset ? parseInt(offset as string) : 0,
        }
      );

      res.json({
        success: true,
        data: {
          open_orders: openOrders,
          order_history: dbOrders,
        },
      });
    } catch (error: any) {
      console.error('Get Polymarket orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get orders',
      });
    }
  }

  /**
   * GET /polymarket/orders/:id
   * Get a single order
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const { id } = req.params;

      const order = await polymarketTradingService.getOrder(id, req.auth.polymarket);

      if (!order) {
        res.status(404).json({
          success: false,
          error: 'Order not found',
        });
        return;
      }

      res.json({
        success: true,
        data: order,
      });
    } catch (error: any) {
      console.error('Get Polymarket order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get order',
      });
    }
  }

  /**
   * DELETE /polymarket/orders/:id
   * Cancel a single order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const { id } = req.params;

      const result = await polymarketTradingService.cancelOrder(
        id,
        req.auth.polymarket,
        req.auth.walletAddress
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel Polymarket order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel order',
      });
    }
  }

  /**
   * DELETE /polymarket/orders
   * Cancel all orders
   */
  async cancelAllOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const result = await polymarketTradingService.cancelAllOrders(
        req.auth.polymarket,
        req.auth.walletAddress
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel all Polymarket orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel orders',
      });
    }
  }

  /**
   * DELETE /polymarket/orders/market/:marketId
   * Cancel all orders for a market
   */
  async cancelMarketOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      const { marketId } = req.params;
      const { asset_id } = req.query;

      const result = await polymarketTradingService.cancelMarketOrders(
        req.auth.polymarket,
        req.auth.walletAddress,
        {
          market: marketId,
          asset_id: asset_id as string,
        }
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel Polymarket market orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel orders',
      });
    }
  }
}

export const polymarketTradingController = new PolymarketTradingController();
