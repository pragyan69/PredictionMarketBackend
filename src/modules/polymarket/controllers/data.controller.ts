import { Request, Response } from 'express';
import { dataClient } from '../clients/data.client';

export const getLeaderboard = async (req: Request, res: Response) => {
  try {
    const leaderboard = await dataClient.getLeaderboard();
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch leaderboard' });
  }
};

export const getCurrentPositions = async (req: Request, res: Response) => {
  try {
    const { address } = req.params;
    const positions = await dataClient.getCurrentPositions(address);
    res.json({ success: true, data: positions });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to fetch positions' });
  }
};
