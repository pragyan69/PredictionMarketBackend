// src/modules/polymarket/routes/aggregation.routes.ts

import { Router } from 'express';
import {
  startAggregationPipeline,
  getAggregationPipelineStatus,
  debugTestApi,
} from '../controllers/aggregation.controller';

const router = Router();

// POST /api/polymarket/aggregation/start
router.post('/start', startAggregationPipeline);

// GET /api/polymarket/aggregation/status
router.get('/status', getAggregationPipelineStatus);

// GET /api/polymarket/aggregation/debug/:api
// Test individual APIs: gamma-events, gamma-markets, data-leaderboard, data-trades, clob-book
router.get('/debug/:api', debugTestApi);

export default router;
