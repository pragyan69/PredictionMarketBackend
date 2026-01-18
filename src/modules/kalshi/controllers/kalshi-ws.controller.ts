// src/modules/kalshi/controllers/kalshi-ws.controller.ts

import { Request, Response } from 'express';
import { kalshiWsService } from '../services/kalshi-ws.service';

/**
 * Connect to Kalshi WebSocket
 * POST /api/kalshi/ws/connect
 */
export const connectKalshiWs = async (_req: Request, res: Response) => {
  try {
    kalshiWsService.connect();

    return res.json({
      success: true,
      message: 'Kalshi WebSocket connection initiated',
    });
  } catch (error: any) {
    console.error('❌ Failed to connect to Kalshi WebSocket:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to connect to Kalshi WebSocket',
    });
  }
};

/**
 * Disconnect from Kalshi WebSocket
 * POST /api/kalshi/ws/disconnect
 */
export const disconnectKalshiWs = async (_req: Request, res: Response) => {
  try {
    kalshiWsService.disconnect();

    return res.json({
      success: true,
      message: 'Kalshi WebSocket disconnected',
    });
  } catch (error: any) {
    console.error('❌ Failed to disconnect from Kalshi WebSocket:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to disconnect from Kalshi WebSocket',
    });
  }
};

/**
 * Get Kalshi WebSocket status
 * GET /api/kalshi/ws/status
 */
export const getKalshiWsStatus = async (_req: Request, res: Response) => {
  try {
    const status = kalshiWsService.getStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('❌ Failed to get Kalshi WebSocket status:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get Kalshi WebSocket status',
    });
  }
};

/**
 * Subscribe to channels for specific markets
 * POST /api/kalshi/ws/subscribe
 *
 * Body: {
 *   channels: ['orderbook_delta', 'ticker', 'trade'],
 *   marketTickers: ['TICKER1', 'TICKER2']
 * }
 */
export const subscribeToKalshiChannels = async (req: Request, res: Response) => {
  try {
    const { channels, marketTickers } = req.body;

    if (!channels || !Array.isArray(channels) || channels.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'channels array is required',
      });
    }

    kalshiWsService.subscribe(channels, marketTickers);

    return res.json({
      success: true,
      message: `Subscribed to channels: ${channels.join(', ')}`,
    });
  } catch (error: any) {
    console.error('❌ Failed to subscribe to Kalshi channels:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to subscribe to Kalshi channels',
    });
  }
};

/**
 * Subscribe to all active markets from database
 * POST /api/kalshi/ws/subscribe-active
 */
export const subscribeToActiveKalshiMarkets = async (_req: Request, res: Response) => {
  try {
    await kalshiWsService.subscribeToActiveMarkets();

    return res.json({
      success: true,
      message: 'Subscribed to active Kalshi markets',
    });
  } catch (error: any) {
    console.error('❌ Failed to subscribe to active Kalshi markets:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to subscribe to active Kalshi markets',
    });
  }
};

/**
 * Subscribe to lifecycle events (market and event lifecycle)
 * POST /api/kalshi/ws/subscribe-lifecycle
 */
export const subscribeToKalshiLifecycle = async (_req: Request, res: Response) => {
  try {
    kalshiWsService.subscribeToLifecycleEvents();

    return res.json({
      success: true,
      message: 'Subscribed to Kalshi lifecycle events',
    });
  } catch (error: any) {
    console.error('❌ Failed to subscribe to Kalshi lifecycle:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to subscribe to Kalshi lifecycle events',
    });
  }
};

/**
 * Get orderbook summary for a market
 * GET /api/kalshi/ws/orderbook/:ticker
 */
export const getKalshiOrderbook = async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    if (!ticker) {
      return res.status(400).json({
        success: false,
        error: 'ticker parameter is required',
      });
    }

    const orderbook = kalshiWsService.getOrderbookSummary(ticker);

    if (!orderbook) {
      return res.status(404).json({
        success: false,
        error: `No orderbook data available for ${ticker}. Subscribe to the market first.`,
      });
    }

    return res.json({
      success: true,
      data: orderbook,
    });
  } catch (error: any) {
    console.error('❌ Failed to get Kalshi orderbook:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to get Kalshi orderbook',
    });
  }
};
