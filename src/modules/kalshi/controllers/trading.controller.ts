// src/modules/kalshi/controllers/trading.controller.ts

import { Request, Response } from 'express';
import { kalshiTradingService } from '../services/trading.service';
import { UnifiedKalshiOrderRequest } from '../types/trading.types';

export class KalshiTradingController {
  /**
   * POST /kalshi/orders
   * Create a new order
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const orderRequest: UnifiedKalshiOrderRequest = {
        market_id: req.body.market_id,
        side: req.body.side,
        action: req.body.action,
        price: req.body.price,
        quantity: req.body.quantity,
        order_type: req.body.order_type || 'limit',
        time_in_force: req.body.time_in_force || 'gtc',
        expiration_ts: req.body.expiration_ts,
        post_only: req.body.post_only,
        reduce_only: req.body.reduce_only,
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

      const result = await kalshiTradingService.createOrder(
        orderRequest,
        req.auth.kalshi,
        req.auth.walletAddress
      );

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Create Kalshi order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create order',
      });
    }
  }

  /**
   * GET /kalshi/orders
   * Get user's orders
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const { ticker, status, limit, cursor } = req.query;

      // Get orders from Kalshi
      const orders = await kalshiTradingService.getOrders(req.auth.kalshi, {
        ticker: ticker as string,
        status: status as string,
        limit: limit ? parseInt(limit as string) : undefined,
        cursor: cursor as string,
      });

      // Also get from our database for history
      const dbOrders = await kalshiTradingService.getUserOrders(req.auth.walletAddress, {
        status: status as string,
        market_id: ticker as string,
        limit: limit ? parseInt(limit as string) : 50,
      });

      res.json({
        success: true,
        data: {
          orders,
          order_history: dbOrders,
        },
      });
    } catch (error: any) {
      console.error('Get Kalshi orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get orders',
      });
    }
  }

  /**
   * GET /kalshi/orders/:id
   * Get a single order
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const { id } = req.params;

      const order = await kalshiTradingService.getOrder(id, req.auth.kalshi);

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
      console.error('Get Kalshi order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get order',
      });
    }
  }

  /**
   * DELETE /kalshi/orders/:id
   * Cancel a single order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const { id } = req.params;

      const result = await kalshiTradingService.cancelOrder(
        id,
        req.auth.kalshi,
        req.auth.walletAddress
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel Kalshi order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel order',
      });
    }
  }

  /**
   * POST /kalshi/orders/batch-cancel
   * Batch cancel orders (up to 20)
   */
  async batchCancelOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const { order_ids } = req.body;

      if (!order_ids || !Array.isArray(order_ids)) {
        res.status(400).json({
          success: false,
          error: 'order_ids array is required',
        });
        return;
      }

      if (order_ids.length > 20) {
        res.status(400).json({
          success: false,
          error: 'Cannot cancel more than 20 orders at once',
        });
        return;
      }

      const result = await kalshiTradingService.batchCancelOrders(
        order_ids,
        req.auth.kalshi,
        req.auth.walletAddress
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Batch cancel Kalshi orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel orders',
      });
    }
  }

  /**
   * GET /kalshi/positions
   * Get user's positions
   */
  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const { ticker, limit } = req.query;

      const result = await kalshiTradingService.getPositions(req.auth.kalshi, {
        ticker: ticker as string,
        limit: limit ? parseInt(limit as string) : undefined,
      });

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get Kalshi positions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get positions',
      });
    }
  }

  /**
   * GET /kalshi/balance
   * Get user's balance
   */
  async getBalance(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const result = await kalshiTradingService.getBalance(req.auth.kalshi);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get Kalshi balance error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get balance',
      });
    }
  }

  /**
   * GET /kalshi/queue-positions
   * Get queue positions for resting orders
   */
  async getQueuePositions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth?.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const result = await kalshiTradingService.getQueuePositions(req.auth.kalshi);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Get Kalshi queue positions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get queue positions',
      });
    }
  }
}

export const kalshiTradingController = new KalshiTradingController();
