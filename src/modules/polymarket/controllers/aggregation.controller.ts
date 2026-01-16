// src/modules/polymarket/controllers/aggregation.controller.ts

import { Request, Response } from 'express';
import { aggregationPipeline } from '../services/aggregation.pipeline';
import { PipelineConfig } from '../types/aggregation.types';

/**
 * Start the aggregation pipeline
 * POST /api/polymarket/aggregation/start
 */
export const startAggregationPipeline = async (req: Request, res: Response) => {
  try {
    // Parse optional config from request body
    const config: Partial<PipelineConfig> = {};

    if (req.body.topTradersLimit !== undefined) {
      config.topTradersLimit = Number(req.body.topTradersLimit);
    }
    if (req.body.enableOrderbookFetch !== undefined) {
      config.enableOrderbookFetch = Boolean(req.body.enableOrderbookFetch);
    }
    if (req.body.enableMarketActivity !== undefined) {
      config.enableMarketActivity = Boolean(req.body.enableMarketActivity);
    }
    if (req.body.enableTraderPositions !== undefined) {
      config.enableTraderPositions = Boolean(req.body.enableTraderPositions);
    }

    console.log('🚀 Starting aggregation pipeline with config:', config);

    const runId = await aggregationPipeline.start(config);

    return res.json({
      success: true,
      runId,
      message: 'Pipeline started successfully. Use GET /status to monitor progress.',
    });
  } catch (error: any) {
    console.error('❌ Failed to start aggregation pipeline:', error?.message || error);

    // Check if pipeline is already running
    if (error?.message?.includes('already running')) {
      return res.status(409).json({
        success: false,
        error: 'Pipeline is already running',
        status: aggregationPipeline.getStatus(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to start aggregation pipeline',
    });
  }
};

/**
 * Get current pipeline status
 * GET /api/polymarket/aggregation/status
 */
export const getAggregationPipelineStatus = async (_req: Request, res: Response) => {
  try {
    const status = aggregationPipeline.getStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('❌ Failed to get pipeline status:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get pipeline status',
    });
  }
};
