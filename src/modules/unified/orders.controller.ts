// src/modules/unified/orders.controller.ts

import { Request, Response } from 'express';
import { unifiedOrdersService } from './orders.service';
import { UnifiedCreateOrderRequest, Platform } from './types/orders.types';

export class UnifiedOrdersController {
  /**
   * POST /orders
   * Create a new order (routes to appropriate platform)
   */
  async createOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const orderRequest: UnifiedCreateOrderRequest = {
        platform: req.body.platform,
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
        private_key: req.body.private_key,
      };

      // Validate platform
      if (!orderRequest.platform || !['polymarket', 'kalshi'].includes(orderRequest.platform)) {
        res.status(400).json({
          success: false,
          error: 'platform must be "polymarket" or "kalshi"',
        });
        return;
      }

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

      // Check platform credentials
      if (orderRequest.platform === 'polymarket' && !req.auth.polymarket) {
        res.status(403).json({
          success: false,
          error: 'Polymarket credentials not configured',
        });
        return;
      }

      if (orderRequest.platform === 'kalshi' && !req.auth.kalshi) {
        res.status(403).json({
          success: false,
          error: 'Kalshi credentials not configured',
        });
        return;
      }

      const result = await unifiedOrdersService.createOrder(orderRequest, req.auth);

      res.status(201).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Create unified order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create order',
      });
    }
  }

  /**
   * GET /orders
   * Get all user orders
   */
  async getOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { platform, status, market_id, limit, offset } = req.query;

      const orders = await unifiedOrdersService.getOrders(req.auth.walletAddress, {
        platform: platform as Platform,
        status: status as string,
        market_id: market_id as string,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        success: true,
        data: orders,
      });
    } catch (error: any) {
      console.error('Get unified orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get orders',
      });
    }
  }

  /**
   * GET /orders/:id
   * Get single order
   */
  async getOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;

      const order = await unifiedOrdersService.getOrder(id, req.auth);

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
      console.error('Get unified order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get order',
      });
    }
  }

  /**
   * DELETE /orders/:id
   * Cancel single order
   */
  async cancelOrder(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { id } = req.params;
      const { platform } = req.query;

      if (!platform || !['polymarket', 'kalshi'].includes(platform as string)) {
        res.status(400).json({
          success: false,
          error: 'platform query parameter required (polymarket or kalshi)',
        });
        return;
      }

      const result = await unifiedOrdersService.cancelOrder(
        id,
        platform as Platform,
        req.auth
      );

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel unified order error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel order',
      });
    }
  }

  /**
   * DELETE /orders
   * Cancel multiple orders
   */
  async cancelOrders(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { order_ids, platform } = req.body;

      if (!order_ids || !Array.isArray(order_ids)) {
        res.status(400).json({
          success: false,
          error: 'order_ids array is required',
        });
        return;
      }

      if (!platform || !['polymarket', 'kalshi'].includes(platform)) {
        res.status(400).json({
          success: false,
          error: 'platform is required (polymarket or kalshi)',
        });
        return;
      }

      const result = await unifiedOrdersService.cancelOrders(
        order_ids,
        platform as Platform,
        req.auth
      );

      res.json({
        success: result.success,
        data: result,
      });
    } catch (error: any) {
      console.error('Cancel unified orders error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to cancel orders',
      });
    }
  }
}

export const unifiedOrdersController = new UnifiedOrdersController();
