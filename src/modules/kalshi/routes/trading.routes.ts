// src/modules/kalshi/routes/trading.routes.ts

import { Router } from 'express';
import { kalshiTradingController } from '../controllers/trading.controller';
import { requireAuth, requireKalshiAuth } from '../../auth/auth.middleware';

export const kalshiTradingRouter = Router();

// All trading routes require authentication
kalshiTradingRouter.use(requireAuth);

// Create order
kalshiTradingRouter.post(
  '/orders',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.createOrder(req, res)
);

// Get orders
kalshiTradingRouter.get(
  '/orders',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.getOrders(req, res)
);

// Get single order
kalshiTradingRouter.get(
  '/orders/:id',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.getOrder(req, res)
);

// Cancel single order
kalshiTradingRouter.delete(
  '/orders/:id',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.cancelOrder(req, res)
);

// Batch cancel orders
kalshiTradingRouter.post(
  '/orders/batch-cancel',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.batchCancelOrders(req, res)
);

// Get positions
kalshiTradingRouter.get(
  '/positions',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.getPositions(req, res)
);

// Get balance
kalshiTradingRouter.get(
  '/balance',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.getBalance(req, res)
);

// Get queue positions
kalshiTradingRouter.get(
  '/queue-positions',
  requireKalshiAuth,
  (req, res) => kalshiTradingController.getQueuePositions(req, res)
);
