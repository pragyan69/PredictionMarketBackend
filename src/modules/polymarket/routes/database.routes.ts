// src/modules/polymarket/routes/database.routes.ts

import { Router } from 'express';
import {
  getMarketsFromDb,
  getMarketByIdFromDb,
  getMarketByConditionIdFromDb,
  getEventsFromDb,
  getEventByIdFromDb,
  getLeaderboardFromDb,
  getTradesFromDb,
  getDbStats,
} from '../controllers/database.controller';

const router = Router();

// Markets endpoints
router.get('/markets', getMarketsFromDb);
router.get('/markets/:id', getMarketByIdFromDb);
router.get('/markets/condition/:conditionId', getMarketByConditionIdFromDb);

// Events endpoints
router.get('/events', getEventsFromDb);
router.get('/events/:id', getEventByIdFromDb);

// Leaderboard endpoint
router.get('/leaderboard', getLeaderboardFromDb);

// Trades endpoint
router.get('/trades', getTradesFromDb);

// Stats endpoint
router.get('/stats', getDbStats);

export default router;
