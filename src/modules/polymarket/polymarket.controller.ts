import { Request, Response } from 'express';
import { gammaClient } from './clients/gamma.client';
import { historicalPipeline } from './services/historical.pipeline';

export const getMarkets = async (req: Request, res: Response) => {
  try {
    const markets = await gammaClient.getMarkets();
    res.json({ success: true, data: markets });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch markets' });
  }
};

export const startHistoricalPipeline = async (req: Request, res: Response) => {
  try {
    historicalPipeline.start();
    res.json({ success: true, message: 'Pipeline started' });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to start pipeline' });
  }
};
