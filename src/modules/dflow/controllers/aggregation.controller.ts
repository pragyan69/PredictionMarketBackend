// src/modules/dflow/controllers/aggregation.controller.ts

import { Request, Response } from 'express';
import { dflowAggregationPipeline } from '../services/aggregation.pipeline';

/**
 * Start DFlow aggregation pipeline
 * POST /api/dflow/aggregation/start
 */
export const startDFlowAggregationPipeline = async (req: Request, res: Response) => {
  try {
    const config = req.body || {};

    console.log('🚀 Starting DFlow aggregation pipeline via API...');
    const runId = await dflowAggregationPipeline.start(config);

    return res.json({
      success: true,
      data: {
        runId,
        message: 'DFlow aggregation pipeline started',
      },
    });
  } catch (error: any) {
    console.error('❌ Failed to start DFlow pipeline:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to start DFlow aggregation pipeline',
    });
  }
};

/**
 * Get DFlow aggregation pipeline status
 * GET /api/dflow/aggregation/status
 */
export const getDFlowAggregationPipelineStatus = async (_req: Request, res: Response) => {
  try {
    const status = dflowAggregationPipeline.getStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('❌ Failed to get DFlow pipeline status:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to get DFlow pipeline status',
    });
  }
};
