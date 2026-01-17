// src/modules/polymarket/controllers/aggregation.controller.ts

import { Request, Response } from 'express';
import { aggregationPipeline } from '../services/aggregation.pipeline';
import { PipelineConfig } from '../types/aggregation.types';
import { gammaClient } from '../clients/gamma.client';
import { dataClient } from '../clients/data.client';
import { clobClient } from '../clients/clob.client';

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

/**
 * Debug endpoint to test individual APIs
 * GET /api/polymarket/aggregation/debug/:api
 *
 * Available APIs: gamma-events, gamma-markets, data-leaderboard, data-trades, clob-book
 */
export const debugTestApi = async (req: Request, res: Response) => {
  const { api } = req.params;
  const startTime = Date.now();

  console.log('═══════════════════════════════════════════════════');
  console.log(`🔧 DEBUG: Testing API - ${api}`);
  console.log('═══════════════════════════════════════════════════');

  try {
    let result: any = null;
    let debugInfo: any = {};

    switch (api) {
      case 'gamma-events': {
        console.log(`📡 Calling: ${gammaClient.baseUrl}/events`);
        const events = await gammaClient.getEvents({ limit: 20 });
        debugInfo = {
          url: `${gammaClient.baseUrl}/events?limit=20`,
          responseType: typeof events,
          isArray: Array.isArray(events),
          count: events?.length ?? 0,
          sample: events?.slice(0, 2) || null,
        };
        result = { count: events.length, firstTwo: events.slice(0, 2) };
        break;
      }

      case 'gamma-events-active': {
        // Test fetching only active events
        console.log(`📡 Calling: ${gammaClient.baseUrl}/events?active=true&closed=false&limit=20`);
        const events = await gammaClient.getEvents({ active: true, closed: false, limit: 20 });
        debugInfo = {
          url: `${gammaClient.baseUrl}/events?active=true&closed=false&limit=20`,
          responseType: typeof events,
          isArray: Array.isArray(events),
          count: events?.length ?? 0,
          activeCount: events?.filter(e => e.active === true && e.closed !== true).length ?? 0,
          closedCount: events?.filter(e => e.closed === true).length ?? 0,
          sample: events?.slice(0, 2) || null,
        };
        result = { count: events.length, firstTwo: events.slice(0, 2) };
        break;
      }

      case 'gamma-markets': {
        console.log(`📡 Calling: ${gammaClient.baseUrl}/markets?limit=10`);
        const markets = await gammaClient.getMarkets({ limit: 10 });
        debugInfo = {
          url: `${gammaClient.baseUrl}/markets?limit=10`,
          responseType: typeof markets,
          isArray: Array.isArray(markets),
          count: markets?.length ?? 0,
          sample: markets?.slice(0, 2) || null,
        };
        result = { count: markets.length, firstTwo: markets.slice(0, 2) };
        break;
      }

      case 'gamma-markets-active': {
        // Test fetching only active markets
        console.log(`📡 Calling: ${gammaClient.baseUrl}/markets?active=true&closed=false&limit=20`);
        const markets = await gammaClient.getMarkets({ active: true, closed: false, limit: 20 });
        debugInfo = {
          url: `${gammaClient.baseUrl}/markets?active=true&closed=false&limit=20`,
          responseType: typeof markets,
          isArray: Array.isArray(markets),
          count: markets?.length ?? 0,
          activeCount: markets?.filter(m => m.active === true && m.closed !== true).length ?? 0,
          closedCount: markets?.filter(m => m.closed === true).length ?? 0,
          sample: markets?.slice(0, 2) || null,
        };
        result = { count: markets.length, firstTwo: markets.slice(0, 2) };
        break;
      }

      case 'data-leaderboard': {
        console.log(`📡 Calling: ${dataClient.baseUrl}/v1/leaderboard?limit=10`);
        const leaderboard = await dataClient.getLeaderboard({ limit: 10 });
        debugInfo = {
          url: `${dataClient.baseUrl}/v1/leaderboard?limit=10`,
          responseType: typeof leaderboard,
          isArray: Array.isArray(leaderboard),
          count: leaderboard?.length ?? 0,
          sample: leaderboard?.slice(0, 2) || null,
        };
        result = { count: leaderboard.length, firstTwo: leaderboard.slice(0, 2) };
        break;
      }

      case 'data-trades': {
        // First get a market conditionId
        console.log(`📡 First getting a market to find conditionId...`);
        const markets = await gammaClient.getMarkets({ limit: 5, active: true });
        const activeMarket = markets.find(m => m.conditionId);

        if (!activeMarket?.conditionId) {
          throw new Error('No active market with conditionId found');
        }

        console.log(`📡 Calling: ${dataClient.baseUrl}/trades?market=${activeMarket.conditionId}&limit=10`);
        const trades = await dataClient.getTrades({
          market: [activeMarket.conditionId],
          limit: 10,
        });
        debugInfo = {
          url: `${dataClient.baseUrl}/trades?market=${activeMarket.conditionId}&limit=10`,
          marketUsed: activeMarket.conditionId,
          responseType: typeof trades,
          isArray: Array.isArray(trades),
          count: trades?.length ?? 0,
          sample: trades?.slice(0, 2) || null,
        };
        result = { marketConditionId: activeMarket.conditionId, count: trades.length, firstTwo: trades.slice(0, 2) };
        break;
      }

      case 'clob-book': {
        // First get a market with clobTokenIds
        console.log(`📡 First getting a market to find clobTokenIds...`);
        const markets = await gammaClient.getMarkets({ limit: 10, active: true });
        let tokenId: string | null = null;

        for (const m of markets) {
          if (m.clobTokenIds) {
            try {
              const ids = typeof m.clobTokenIds === 'string' ? JSON.parse(m.clobTokenIds) : m.clobTokenIds;
              if (Array.isArray(ids) && ids.length > 0) {
                tokenId = ids[0];
                break;
              }
            } catch {
              continue;
            }
          }
        }

        if (!tokenId) {
          throw new Error('No market with clobTokenIds found');
        }

        console.log(`📡 Calling: ${clobClient.baseUrl}/book?token_id=${tokenId}`);
        const book = await clobClient.getOrderBook(tokenId);
        debugInfo = {
          url: `${clobClient.baseUrl}/book?token_id=${tokenId}`,
          tokenIdUsed: tokenId,
          responseType: typeof book,
          hasData: !!book,
          keys: book ? Object.keys(book) : [],
        };
        result = { tokenId, book };
        break;
      }

      default:
        return res.status(400).json({
          success: false,
          error: `Unknown API: ${api}. Available: gamma-events, gamma-events-active, gamma-markets, gamma-markets-active, data-leaderboard, data-trades, clob-book`,
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
