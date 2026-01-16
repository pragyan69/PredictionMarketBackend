// src/modules/polymarket/routes/aggregation.routes.ts

import { Router } from 'express';
import {
  startAggregationPipeline,
  getAggregationPipelineStatus,
} from '../controllers/aggregation.controller';

const router = Router();

// POST /api/polymarket/aggregation/start
router.post('/start', startAggregationPipeline);

// GET /api/polymarket/aggregation/status
router.get('/status', getAggregationPipelineStatus);

export default router;
