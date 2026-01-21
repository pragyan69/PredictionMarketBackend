// src/modules/kalshi/routes/database.routes.ts

import { Router } from 'express';
import {
  getKalshiMarketsFromDb,
  getKalshiMarketByIdFromDb,
  getKalshiMarketByTickerFromDb,
  getKalshiEventsFromDb,
  getKalshiEventByIdFromDb,
  getKalshiTradesFromDb,
  getKalshiDbStats,
} from '../controllers/database.controller';

const router = Router();

// Markets endpoints
router.get('/markets', getKalshiMarketsFromDb);
router.get('/markets/:id', getKalshiMarketByIdFromDb);
router.get('/markets/ticker/:ticker', getKalshiMarketByTickerFromDb);

// Events endpoints
router.get('/events', getKalshiEventsFromDb);
router.get('/events/:id', getKalshiEventByIdFromDb);

// Trades endpoint
router.get('/trades', getKalshiTradesFromDb);

// Stats endpoint
router.get('/stats', getKalshiDbStats);

export default router;
