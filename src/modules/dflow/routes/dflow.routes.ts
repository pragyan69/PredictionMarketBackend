// src/modules/dflow/routes/dflow.routes.ts

import { Router } from 'express';
import * as dflowController from '../controllers/dflow.controller';
import aggregationRoutes from './aggregation.routes';

const router = Router();

// Aggregation pipeline routes
router.use('/aggregation', aggregationRoutes);

// ==================== METADATA ROUTES (Public) ====================

// Events
router.get('/events', dflowController.getEvents);
router.get('/events/:id', dflowController.getEventById);

// Markets
router.get('/markets', dflowController.getMarkets);
router.get('/markets/search', dflowController.searchMarkets);
router.get('/markets/:id', dflowController.getMarketById);
router.get('/markets/:id/mints', dflowController.getMarketMints);
router.get('/markets/ticker/:ticker', dflowController.getMarketByTicker);

// Orderbook
router.get('/orderbook/:ticker', dflowController.getOrderbook);

// Trades
router.get('/trades', dflowController.getTrades);

// ==================== TRADING ROUTES ====================

// Quote
router.post('/quote', dflowController.getQuote);

// Swap
router.post('/swap', dflowController.createSwap);
router.post('/swap-instructions', dflowController.getSwapInstructions);

// Unified trade endpoint (convenience)
router.post('/trade', dflowController.executeTrade);
router.post('/trade/quote', dflowController.getTradeQuote);

// ==================== UTILITY ROUTES ====================

router.get('/health', dflowController.healthCheck);

export default router;
