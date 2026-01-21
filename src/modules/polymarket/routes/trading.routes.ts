// src/modules/polymarket/routes/trading.routes.ts

import { Router } from 'express';
import { polymarketTradingController } from '../controllers/trading.controller';
import { requireAuth, requirePolymarketAuth } from '../../auth/auth.middleware';

export const polymarketTradingRouter = Router();

// All trading routes require authentication
polymarketTradingRouter.use(requireAuth);

// Create order
polymarketTradingRouter.post(
  '/orders',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.createOrder(req, res)
);

// Get orders
polymarketTradingRouter.get(
  '/orders',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.getOrders(req, res)
);

// Get single order
polymarketTradingRouter.get(
  '/orders/:id',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.getOrder(req, res)
);

// Cancel single order
polymarketTradingRouter.delete(
  '/orders/:id',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.cancelOrder(req, res)
);

// Cancel all orders
polymarketTradingRouter.delete(
  '/orders',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.cancelAllOrders(req, res)
);

// Cancel orders for a market
polymarketTradingRouter.delete(
  '/orders/market/:marketId',
  requirePolymarketAuth,
  (req, res) => polymarketTradingController.cancelMarketOrders(req, res)
);
