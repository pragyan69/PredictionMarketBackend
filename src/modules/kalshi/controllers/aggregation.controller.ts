// src/modules/kalshi/controllers/aggregation.controller.ts

import { Request, Response } from 'express';
import { kalshiAggregationPipeline } from '../services/aggregation.pipeline';
import { KalshiPipelineConfig } from '../types/aggregation.types';
import { kalshiClient } from '../clients/kalshi.client';

/**
 * Start the Kalshi aggregation pipeline
 * POST /api/kalshi/aggregation/start
 */
export const startKalshiAggregationPipeline = async (req: Request, res: Response) => {
  try {
    // Parse optional config from request body
    const config: Partial<KalshiPipelineConfig> = {};

    // Test mode: 'quick', 'moderate', or 'production'
    // quick: 5 events, 10 markets, 50 trades (fast API verification)
    // moderate: 50 events, 100 markets, 1000 trades (sample data)
    // production: unlimited (full data fetch)
    if (req.body.testMode !== undefined) {
      config.testMode = req.body.testMode as 'quick' | 'moderate' | 'production';
    }

    if (req.body.topTradersLimit !== undefined) {
      config.topTradersLimit = Number(req.body.topTradersLimit);
    }
    if (req.body.enableOrderbookFetch !== undefined) {
      config.enableOrderbookFetch = Boolean(req.body.enableOrderbookFetch);
    }
    if (req.body.enableCandlestickFetch !== undefined) {
      config.enableCandlestickFetch = Boolean(req.body.enableCandlestickFetch);
    }
    if (req.body.maxEvents !== undefined) {
      config.maxEvents = Number(req.body.maxEvents);
    }
    if (req.body.maxMarkets !== undefined) {
      config.maxMarkets = Number(req.body.maxMarkets);
    }

    console.log('🚀 Starting Kalshi aggregation pipeline with config:', config);

    const runId = await kalshiAggregationPipeline.start(config);

    return res.json({
      success: true,
      runId,
      message: 'Kalshi Pipeline started successfully. Use GET /status to monitor progress.',
    });
  } catch (error: any) {
    console.error('❌ Failed to start Kalshi aggregation pipeline:', error?.message || error);

    // Check if pipeline is already running
    if (error?.message?.includes('already running')) {
      return res.status(409).json({
        success: false,
        error: 'Kalshi Pipeline is already running',
        status: kalshiAggregationPipeline.getStatus(),
      });
    }

    return res.status(500).json({
      success: false,
      error: error?.message || 'Failed to start Kalshi aggregation pipeline',
    });
  }
};

/**
 * Get current Kalshi pipeline status
 * GET /api/kalshi/aggregation/status
 */
export const getKalshiAggregationPipelineStatus = async (_req: Request, res: Response) => {
  try {
    const status = kalshiAggregationPipeline.getStatus();

    return res.json({
      success: true,
      data: status,
    });
  } catch (error: any) {
    console.error('❌ Failed to get Kalshi pipeline status:', error?.message || error);

    return res.status(500).json({
      success: false,
      error: 'Failed to get Kalshi pipeline status',
    });
  }
};

/**
 * Debug endpoint to test individual Kalshi APIs
 * GET /api/kalshi/aggregation/debug/:api
 *
 * Available APIs: events, markets, event, market
 */
export const debugTestKalshiApi = async (req: Request, res: Response) => {
  const { api } = req.params;
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log(`🔧 DEBUG: Testing Kalshi API - ${api}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    let result: any = null;
    let debugInfo: any = {};

    switch (api) {
      case 'events': {
        console.log(`📡 Calling: ${kalshiClient.baseUrl}/events`);
        const response = await kalshiClient.getEvents({ limit: 20, status: 'open' });
        debugInfo = {
          url: `${kalshiClient.baseUrl}/events?limit=20&status=open`,
          responseType: typeof response,
          count: response.events?.length ?? 0,
          cursor: response.cursor,
          sample: response.events?.slice(0, 2) || null,
        };
        result = { count: response.events.length, firstTwo: response.events.slice(0, 2) };
        break;
      }

      case 'markets': {
        console.log(`📡 Calling: ${kalshiClient.baseUrl}/markets`);
        const response = await kalshiClient.getMarkets({ limit: 20, status: 'open' });
        debugInfo = {
          url: `${kalshiClient.baseUrl}/markets?limit=20&status=open`,
          responseType: typeof response,
          count: response.markets?.length ?? 0,
          cursor: response.cursor,
          sample: response.markets?.slice(0, 2) || null,
        };
        result = { count: response.markets.length, firstTwo: response.markets.slice(0, 2) };
        break;
      }

      case 'event': {
        // First get an event ticker
        const eventsResponse = await kalshiClient.getEvents({ limit: 1, status: 'open' });
        if (eventsResponse.events.length === 0) {
          throw new Error('No events found');
        }
        const eventTicker = eventsResponse.events[0].event_ticker;

        console.log(`📡 Calling: ${kalshiClient.baseUrl}/events/${eventTicker}`);
        const response = await kalshiClient.getEvent(eventTicker, true);
        debugInfo = {
          url: `${kalshiClient.baseUrl}/events/${eventTicker}`,
          eventTicker,
          responseType: typeof response,
          hasEvent: !!response.event,
          marketCount: response.markets?.length ?? 0,
        };
        result = { event: response.event, marketCount: response.markets?.length ?? 0 };
        break;
      }

      case 'market': {
        // First get a market ticker
        const marketsResponse = await kalshiClient.getMarkets({ limit: 1, status: 'open' });
        if (marketsResponse.markets.length === 0) {
          throw new Error('No markets found');
        }
        const ticker = marketsResponse.markets[0].ticker;

        console.log(`📡 Calling: ${kalshiClient.baseUrl}/markets/${ticker}`);
        const market = await kalshiClient.getMarket(ticker);
        debugInfo = {
          url: `${kalshiClient.baseUrl}/markets/${ticker}`,
          ticker,
          responseType: typeof market,
          hasMarket: !!market,
        };
        result = { market };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown API: ${api}. Available: events, markets, event, market`,
        });
    }

    const elapsed = Date.now() - startTime;

    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ DEBUG: ${api} completed in ${elapsed}ms`);
    console.log('Debug info:', JSON.stringify(debugInfo, null, 2));
    console.log('═══════════════════════════════════════════════════');

    return res.json({
      success: true,
      api,
      elapsedMs: elapsed,
      debugInfo,
      result,
    });

  } catch (error: any) {
    const elapsed = Date.now() - startTime;

    console.error('═══════════════════════════════════════════════════');
    console.error(`❌ DEBUG: ${api} FAILED in ${elapsed}ms`);
    console.error('Error:', error?.message || error);
    console.error('Stack:', error?.stack);
    console.error('═══════════════════════════════════════════════════');

    return res.status(500).json({
      success: false,
      api,
      elapsedMs: elapsed,
      error: error?.message || 'Unknown error',
      stack: error?.stack,
    });
  }
};
