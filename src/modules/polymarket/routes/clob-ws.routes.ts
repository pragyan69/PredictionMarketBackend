// src/modules/polymarket/routes/clob-ws.routes.ts

import { Router } from 'express';
import {
  startCLOBWebSocket,
  stopCLOBWebSocket,
  getCLOBWebSocketStatus,
  subscribeToAssets,
  subscribeToActiveMarkets,
} from '../controllers/clob-ws.controller';

const router = Router();

// POST /api/polymarket/ws/start - Start WebSocket connection
// Body: { subscribeToActive?: boolean } - optionally subscribe to all active markets
router.post('/start', startCLOBWebSocket);

// POST /api/polymarket/ws/stop - Stop WebSocket connection
router.post('/stop', stopCLOBWebSocket);

// GET /api/polymarket/ws/status - Get WebSocket status and stats
router.get('/status', getCLOBWebSocketStatus);

// POST /api/polymarket/ws/subscribe - Subscribe to specific asset IDs
// Body: { assetIds: string[] }
router.post('/subscribe', subscribeToAssets);

// POST /api/polymarket/ws/subscribe-active - Subscribe to all active markets from database
router.post('/subscribe-active', subscribeToActiveMarkets);

export default router;
