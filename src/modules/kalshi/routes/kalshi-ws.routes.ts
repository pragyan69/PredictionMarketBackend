// src/modules/kalshi/routes/kalshi-ws.routes.ts

import { Router } from 'express';
import {
  connectKalshiWs,
  disconnectKalshiWs,
  getKalshiWsStatus,
  subscribeToKalshiChannels,
  subscribeToActiveKalshiMarkets,
  subscribeToKalshiLifecycle,
  getKalshiOrderbook,
} from '../controllers/kalshi-ws.controller';

const router = Router();

// POST /api/kalshi/ws/connect - Connect to WebSocket
router.post('/connect', connectKalshiWs);

// POST /api/kalshi/ws/disconnect - Disconnect from WebSocket
router.post('/disconnect', disconnectKalshiWs);

// GET /api/kalshi/ws/status - Get WebSocket status
router.get('/status', getKalshiWsStatus);

// POST /api/kalshi/ws/subscribe - Subscribe to channels
router.post('/subscribe', subscribeToKalshiChannels);

// POST /api/kalshi/ws/subscribe-active - Subscribe to all active markets
router.post('/subscribe-active', subscribeToActiveKalshiMarkets);

// POST /api/kalshi/ws/subscribe-lifecycle - Subscribe to lifecycle events
router.post('/subscribe-lifecycle', subscribeToKalshiLifecycle);

// GET /api/kalshi/ws/orderbook/:ticker - Get orderbook for a market
router.get('/orderbook/:ticker', getKalshiOrderbook);

export default router;
