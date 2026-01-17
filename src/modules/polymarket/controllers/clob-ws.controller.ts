// src/modules/polymarket/controllers/clob-ws.controller.ts

import { Request, Response } from 'express';
import { clobWsService } from '../services/clob-ws.service';

/**
 * Start CLOB WebSocket connection
 * POST /api/polymarket/ws/start
 */
export const startCLOBWebSocket = async (req: Request, res: Response) => {
  try {
    clobWsService.connect();

    // Optionally subscribe to active markets from database
    if (req.body.subscribeToActive) {
      await clobWsService.subscribeToActiveMarkets();
    }

    res.json({
      success: true,
      message: 'CLOB WebSocket started',
      status: clobWsService.getStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};

/**
 * Stop CLOB WebSocket connection
 * POST /api/polymarket/ws/stop
 */
export const stopCLOBWebSocket = (_req: Request, res: Response) => {
  clobWsService.disconnect();
  res.json({
    success: true,
    message: 'CLOB WebSocket stopped',
    status: clobWsService.getStatus(),
  });
};

/**
 * Get WebSocket status
 * GET /api/polymarket/ws/status
 */
export const getCLOBWebSocketStatus = (_req: Request, res: Response) => {
  res.json({
    success: true,
    data: clobWsService.getStatus(),
  });
};

/**
 * Subscribe to specific asset IDs
 * POST /api/polymarket/ws/subscribe
 * Body: { assetIds: string[] }
 */
export const subscribeToAssets = (req: Request, res: Response) => {
  const { assetIds } = req.body;

  if (!assetIds || !Array.isArray(assetIds) || assetIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'assetIds array is required',
    });
  }

  clobWsService.subscribeToMoreAssets(assetIds);

  res.json({
    success: true,
    message: `Subscribed to ${assetIds.length} assets`,
    status: clobWsService.getStatus(),
  });
};

/**
 * Subscribe to all active markets from database
 * POST /api/polymarket/ws/subscribe-active
 */
export const subscribeToActiveMarkets = async (_req: Request, res: Response) => {
  try {
    await clobWsService.subscribeToActiveMarkets();
    res.json({
      success: true,
      message: 'Subscribed to active markets',
      status: clobWsService.getStatus(),
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
};
