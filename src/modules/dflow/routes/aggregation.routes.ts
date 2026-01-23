// src/modules/dflow/routes/aggregation.routes.ts

import { Router } from 'express';
import {
  startDFlowAggregationPipeline,
  getDFlowAggregationPipelineStatus,
} from '../controllers/aggregation.controller';

const router = Router();

// Start aggregation pipeline
router.post('/start', startDFlowAggregationPipeline);

// Get pipeline status
router.get('/status', getDFlowAggregationPipelineStatus);

export default router;
