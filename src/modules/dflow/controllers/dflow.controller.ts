// src/modules/dflow/controllers/dflow.controller.ts

import { Request, Response } from 'express';
import { dflowTradeClient } from '../clients/trade.client';
import { dflowMetadataClient } from '../clients/metadata.client';
import { DFLOW_CONSTANTS } from '../types/dflow.types';

// ==================== METADATA ENDPOINTS ====================

/**
 * Get all DFlow events with nested markets
 * GET /api/dflow/events
 */
export const getEvents = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const status = req.query.status as string | undefined;
    const category = req.query.category as string | undefined;

    const events = await dflowMetadataClient.getEvents({ limit, offset, status, category });
    return res.json({ success: true, data: events });
  } catch (error: any) {
    console.error('❌ DFlow getEvents error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow events' });
  }
};

/**
 * Get single event by ID
 * GET /api/dflow/events/:id
 */
export const getEventById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await dflowMetadataClient.getEventById(id);
    return res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('❌ DFlow getEventById error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow event' });
  }
};

/**
 * Get all DFlow markets
 * GET /api/dflow/markets
 */
export const getMarkets = async (req: Request, res: Response) => {
  try {
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const offset = req.query.offset ? Number(req.query.offset) : undefined;
    const status = req.query.status as string | undefined;

    const markets = await dflowMetadataClient.getMarkets({ limit, offset, status });
    return res.json({ success: true, data: markets });
  } catch (error: any) {
    console.error('❌ DFlow getMarkets error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow markets' });
  }
};

/**
 * Get single market by ID
 * GET /api/dflow/markets/:id
 */
export const getMarketById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const market = await dflowMetadataClient.getMarketById(id);
    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('❌ DFlow getMarketById error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow market' });
  }
};

/**
 * Get market by ticker
 * GET /api/dflow/markets/ticker/:ticker
 */
export const getMarketByTicker = async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const market = await dflowMetadataClient.getMarketByTicker(ticker);
    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('❌ DFlow getMarketByTicker error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow market by ticker' });
  }
};

/**
 * Search markets
 * GET /api/dflow/markets/search?q=query
 */
export const searchMarkets = async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    if (!query) {
      return res.status(400).json({ success: false, error: 'Query parameter "q" is required' });
    }

    const markets = await dflowMetadataClient.searchMarkets(query, limit);
    return res.json({ success: true, data: markets });
  } catch (error: any) {
    console.error('❌ DFlow searchMarkets error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to search DFlow markets' });
  }
};

/**
 * Get orderbook for a market
 * GET /api/dflow/orderbook/:ticker
 */
export const getOrderbook = async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const orderbook = await dflowMetadataClient.getOrderbook(ticker);
    return res.json({ success: true, data: orderbook });
  } catch (error: any) {
    console.error('❌ DFlow getOrderbook error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow orderbook' });
  }
};

/**
 * Get trades
 * GET /api/dflow/trades
 */
export const getTrades = async (req: Request, res: Response) => {
  try {
    const marketId = req.query.market_id as string | undefined;
    const marketTicker = req.query.market_ticker as string | undefined;
    const limit = req.query.limit ? Number(req.query.limit) : undefined;
    const cursor = req.query.cursor as string | undefined;

    const trades = await dflowMetadataClient.getTrades({
      marketId,
      marketTicker,
      limit,
      cursor,
    });
    return res.json({ success: true, data: trades });
  } catch (error: any) {
    console.error('❌ DFlow getTrades error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch DFlow trades' });
  }
};

// ==================== TRADING ENDPOINTS ====================

/**
 * Get a swap quote
 * POST /api/dflow/quote
 * Body: { inputMint, outputMint, amount, slippageBps?, userPublicKey? }
 */
export const getQuote = async (req: Request, res: Response) => {
  try {
    const { inputMint, outputMint, amount, slippageBps, userPublicKey } = req.body;

    if (!inputMint || !outputMint || !amount) {
      return res.status(400).json({
        success: false,
        error: 'inputMint, outputMint, and amount are required',
      });
    }

    const quote = await dflowTradeClient.getQuote({
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: slippageBps || 50,
      userPublicKey,
    });

    return res.json({ success: true, data: quote });
  } catch (error: any) {
    console.error('❌ DFlow getQuote error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to get swap quote' });
  }
};

/**
 * Create a swap transaction
 * POST /api/dflow/swap
 * Body: { userPublicKey, quoteResponse }
 */
export const createSwap = async (req: Request, res: Response) => {
  try {
    const { userPublicKey, quoteResponse, wrapAndUnwrapSol, computeUnitPriceMicroLamports } = req.body;

    if (!userPublicKey || !quoteResponse) {
      return res.status(400).json({
        success: false,
        error: 'userPublicKey and quoteResponse are required',
      });
    }

    const swap = await dflowTradeClient.createSwap({
      userPublicKey,
      quoteResponse,
      wrapAndUnwrapSol,
      computeUnitPriceMicroLamports,
    });

    return res.json({ success: true, data: swap });
  } catch (error: any) {
    console.error('❌ DFlow createSwap error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to create swap transaction' });
  }
};

/**
 * Get swap instructions (for building custom transactions)
 * POST /api/dflow/swap-instructions
 */
export const getSwapInstructions = async (req: Request, res: Response) => {
  try {
    const { userPublicKey, quoteResponse, wrapAndUnwrapSol } = req.body;

    if (!userPublicKey || !quoteResponse) {
      return res.status(400).json({
        success: false,
        error: 'userPublicKey and quoteResponse are required',
      });
    }

    const instructions = await dflowTradeClient.getSwapInstructions({
      userPublicKey,
      quoteResponse,
      wrapAndUnwrapSol,
    });

    return res.json({ success: true, data: instructions });
  } catch (error: any) {
    console.error('❌ DFlow getSwapInstructions error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to get swap instructions' });
  }
};

/**
 * Buy YES or NO tokens for a market
 * POST /api/dflow/trade
 * Body: { marketId, side: 'yes' | 'no', action: 'buy' | 'sell', amount, userPublicKey, slippageBps? }
 */
export const executeTrade = async (req: Request, res: Response) => {
  try {
    const { marketId, side, action, amount, userPublicKey, slippageBps } = req.body;

    // Validate required fields
    if (!marketId || !side || !action || !amount || !userPublicKey) {
      return res.status(400).json({
        success: false,
        error: 'marketId, side (yes/no), action (buy/sell), amount, and userPublicKey are required',
      });
    }

    if (!['yes', 'no'].includes(side)) {
      return res.status(400).json({ success: false, error: 'side must be "yes" or "no"' });
    }

    if (!['buy', 'sell'].includes(action)) {
      return res.status(400).json({ success: false, error: 'action must be "buy" or "sell"' });
    }

    // Get market mints
    const mints = await dflowMetadataClient.getMarketMints(marketId);
    if (!mints) {
      return res.status(404).json({
        success: false,
        error: 'Market not found or mints not available',
      });
    }

    const { yesMint, noMint } = mints;
    const targetMint = side === 'yes' ? yesMint : noMint;
    const slippage = slippageBps || 50;

    let result;

    if (action === 'buy') {
      // Buy: USDC -> YES/NO token
      result = await dflowTradeClient.getQuoteAndSwap(
        DFLOW_CONSTANTS.USDC_MINT,
        targetMint,
        String(amount),
        userPublicKey,
        slippage
      );
    } else {
      // Sell: YES/NO token -> USDC
      result = await dflowTradeClient.getQuoteAndSwap(
        targetMint,
        DFLOW_CONSTANTS.USDC_MINT,
        String(amount),
        userPublicKey,
        slippage
      );
    }

    return res.json({
      success: true,
      data: {
        quote: result.quote,
        swapTransaction: result.swap.swapTransaction,
        lastValidBlockHeight: result.swap.lastValidBlockHeight,
        marketId,
        side,
        action,
        inputMint: action === 'buy' ? DFLOW_CONSTANTS.USDC_MINT : targetMint,
        outputMint: action === 'buy' ? targetMint : DFLOW_CONSTANTS.USDC_MINT,
      },
    });
  } catch (error: any) {
    console.error('❌ DFlow executeTrade error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to execute trade' });
  }
};

/**
 * Get quote for buying/selling market tokens
 * POST /api/dflow/trade/quote
 * Body: { marketId, side: 'yes' | 'no', action: 'buy' | 'sell', amount, userPublicKey? }
 */
export const getTradeQuote = async (req: Request, res: Response) => {
  try {
    const { marketId, side, action, amount, userPublicKey, slippageBps } = req.body;

    if (!marketId || !side || !action || !amount) {
      return res.status(400).json({
        success: false,
        error: 'marketId, side (yes/no), action (buy/sell), and amount are required',
      });
    }

    // Get market mints
    const mints = await dflowMetadataClient.getMarketMints(marketId);
    if (!mints) {
      return res.status(404).json({
        success: false,
        error: 'Market not found or mints not available',
      });
    }

    const { yesMint, noMint } = mints;
    const targetMint = side === 'yes' ? yesMint : noMint;

    let inputMint: string;
    let outputMint: string;

    if (action === 'buy') {
      inputMint = DFLOW_CONSTANTS.USDC_MINT;
      outputMint = targetMint;
    } else {
      inputMint = targetMint;
      outputMint = DFLOW_CONSTANTS.USDC_MINT;
    }

    const quote = await dflowTradeClient.getQuote({
      inputMint,
      outputMint,
      amount: String(amount),
      slippageBps: slippageBps || 50,
      userPublicKey,
    });

    return res.json({
      success: true,
      data: {
        quote,
        marketId,
        side,
        action,
        inputMint,
        outputMint,
        estimatedOutput: quote.outAmount,
        priceImpact: quote.priceImpactPct,
      },
    });
  } catch (error: any) {
    console.error('❌ DFlow getTradeQuote error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to get trade quote' });
  }
};

// ==================== UTILITY ENDPOINTS ====================

/**
 * Get market mints (yesMint and noMint)
 * GET /api/dflow/markets/:id/mints
 */
export const getMarketMints = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const mints = await dflowMetadataClient.getMarketMints(id);

    if (!mints) {
      return res.status(404).json({
        success: false,
        error: 'Market not found or mints not available',
      });
    }

    return res.json({ success: true, data: mints });
  } catch (error: any) {
    console.error('❌ DFlow getMarketMints error:', error?.message || error);
    return res.status(500).json({ success: false, error: 'Failed to fetch market mints' });
  }
};

/**
 * Health check / test endpoint
 * GET /api/dflow/health
 */
export const healthCheck = async (_req: Request, res: Response) => {
  try {
    // Try to fetch a minimal amount of data to verify connectivity
    const events = await dflowMetadataClient.getEvents({ limit: 1 });

    return res.json({
      success: true,
      data: {
        status: 'healthy',
        tradeApiUrl: dflowTradeClient.baseUrl,
        metadataApiUrl: dflowMetadataClient.baseUrl,
        eventsAvailable: events.length > 0,
        usdcMint: DFLOW_CONSTANTS.USDC_MINT,
      },
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: 'DFlow API health check failed',
      details: error?.message,
    });
  }
};
