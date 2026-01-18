// src/modules/kalshi/routes/aggregation.routes.ts

import { Router } from 'express';
import {
  startKalshiAggregationPipeline,
  getKalshiAggregationPipelineStatus,
  debugTestKalshiApi,
} from '../controllers/aggregation.controller';

const router = Router();

// POST /api/kalshi/aggregation/start - Start the aggregation pipeline
router.post('/start', startKalshiAggregationPipeline);

// GET /api/kalshi/aggregation/status - Get pipeline status
router.get('/status', getKalshiAggregationPipelineStatus);

// GET /api/kalshi/aggregation/debug/:api - Debug individual APIs
router.get('/debug/:api', debugTestKalshiApi);

export default router;
