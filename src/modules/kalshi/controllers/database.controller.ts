// src/modules/kalshi/controllers/database.controller.ts

import { Request, Response } from 'express';
import { kalshiDbService } from '../services/database.service';

export const getKalshiMarketsFromDb = async (req: Request, res: Response) => {
  try {
    const { status, limit, offset, search, event_id } = req.query;

    const markets = await kalshiDbService.getMarkets({
      status: status as 'active' | 'closed' | 'all',
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      search: search as string,
      eventId: event_id as string,
    });

    return res.json({
      success: true,
      data: markets,
      count: markets.length,
    });
  } catch (error: any) {
    console.error('Failed to get Kalshi markets from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch markets' });
  }
};

export const getKalshiMarketByIdFromDb = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const market = await kalshiDbService.getMarketById(id);

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('Failed to get Kalshi market from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch market' });
  }
};

export const getKalshiMarketByTickerFromDb = async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const market = await kalshiDbService.getMarketByTicker(ticker);

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('Failed to get Kalshi market from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch market' });
  }
};

export const getKalshiEventsFromDb = async (req: Request, res: Response) => {
  try {
    const { limit, offset, search } = req.query;

    const events = await kalshiDbService.getEvents({
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      search: search as string,
    });

    return res.json({
      success: true,
      data: events,
      count: events.length,
    });
  } catch (error: any) {
    console.error('Failed to get Kalshi events from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch events' });
  }
};

export const getKalshiEventByIdFromDb = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await kalshiDbService.getEventById(id);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('Failed to get Kalshi event from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch event' });
  }
};

export const getKalshiTradesFromDb = async (req: Request, res: Response) => {
  try {
    const { market_id, ticker, limit, offset } = req.query;

    const trades = await kalshiDbService.getTrades({
      marketId: market_id as string,
      ticker: ticker as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return res.json({
      success: true,
      data: trades,
      count: trades.length,
    });
  } catch (error: any) {
    console.error('Failed to get Kalshi trades from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch trades' });
  }
};

export const getKalshiDbStats = async (_req: Request, res: Response) => {
  try {
    const stats = await kalshiDbService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Failed to get Kalshi DB stats:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch stats' });
  }
};
