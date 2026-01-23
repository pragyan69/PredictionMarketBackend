// src/modules/polymarket/controllers/database.controller.ts

import { Request, Response } from 'express';
import { polymarketDbService } from '../services/database.service';

export const getMarketsFromDb = async (req: Request, res: Response) => {
  try {
    const { status, limit, offset, search, event_id } = req.query;

    const markets = await polymarketDbService.getMarkets({
      status: status as 'active' | 'closed' | 'all',
      limit: limit ? parseInt(limit as string, 10) : 50,
      offset: offset ? parseInt(offset as string, 10) : 0,
      search: search as string,
      eventId: event_id as string,
    });

    return res.json({
      success: true,
      data: markets,
      count: markets ? markets.length : 0,
    });
  } catch (error: any) {
    console.error('Failed to get markets from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch markets' });
  }
};

export const getMarketByIdFromDb = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const market = await polymarketDbService.getMarketById(id);

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('Failed to get market from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch market' });
  }
};

export const getMarketByConditionIdFromDb = async (req: Request, res: Response) => {
  try {
    const { conditionId } = req.params;
    const market = await polymarketDbService.getMarketByConditionId(conditionId);

    if (!market) {
      return res.status(404).json({ success: false, error: 'Market not found' });
    }

    return res.json({ success: true, data: market });
  } catch (error: any) {
    console.error('Failed to get market from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch market' });
  }
};

export const getEventsFromDb = async (req: Request, res: Response) => {
  try {
    const { limit, offset, search } = req.query;

    const events = await polymarketDbService.getEvents({
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
    console.error('Failed to get events from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch events' });
  }
};

export const getEventByIdFromDb = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const event = await polymarketDbService.getEventById(id);

    if (!event) {
      return res.status(404).json({ success: false, error: 'Event not found' });
    }

    return res.json({ success: true, data: event });
  } catch (error: any) {
    console.error('Failed to get event from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch event' });
  }
};

export const getLeaderboardFromDb = async (req: Request, res: Response) => {
  try {
    const { limit, offset } = req.query;

    const traders = await polymarketDbService.getLeaderboard({
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return res.json({
      success: true,
      data: traders,
      count: traders.length,
    });
  } catch (error: any) {
    console.error('Failed to get leaderboard from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch leaderboard' });
  }
};

export const getTradesFromDb = async (req: Request, res: Response) => {
  try {
    const { market_id, condition_id, user_address, limit, offset } = req.query;

    const trades = await polymarketDbService.getTrades({
      marketId: market_id as string,
      conditionId: condition_id as string,
      userAddress: user_address as string,
      limit: limit ? parseInt(limit as string, 10) : 100,
      offset: offset ? parseInt(offset as string, 10) : 0,
    });

    return res.json({
      success: true,
      data: trades,
      count: trades.length,
    });
  } catch (error: any) {
    console.error('Failed to get trades from DB:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch trades' });
  }
};

export const getDbStats = async (_req: Request, res: Response) => {
  try {
    const stats = await polymarketDbService.getStats();
    return res.json({ success: true, data: stats });
  } catch (error: any) {
    console.error('Failed to get DB stats:', error);
    return res.status(500).json({ success: false, error: error?.message || 'Failed to fetch stats' });
  }
};
