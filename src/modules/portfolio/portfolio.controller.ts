// src/modules/portfolio/portfolio.controller.ts

import { Request, Response } from 'express';
import { portfolioService } from './portfolio.service';
import { Platform } from '../unified/types/orders.types';

export class PortfolioController {
  /**
   * GET /portfolio
   * Get portfolio summary
   */
  async getPortfolioSummary(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const summary = await portfolioService.getPortfolioSummary(req.auth);

      res.json({
        success: true,
        data: summary,
      });
    } catch (error: any) {
      console.error('Get portfolio summary error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get portfolio summary',
      });
    }
  }

  /**
   * GET /portfolio/positions
   * Get all positions
   */
  async getPositions(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { platform } = req.query;

      const positions = await portfolioService.getPositions(req.auth, {
        platform: platform as Platform,
      });

      res.json({
        success: true,
        data: positions,
      });
    } catch (error: any) {
      console.error('Get positions error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get positions',
      });
    }
  }

  /**
   * GET /portfolio/history
   * Get trade history
   */
  async getTradeHistory(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const { platform, from, to, limit, offset } = req.query;

      const history = await portfolioService.getTradeHistory(req.auth.walletAddress, {
        platform: platform as Platform,
        from: from ? parseInt(from as string) : undefined,
        to: to ? parseInt(to as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
      });

      res.json({
        success: true,
        data: history,
      });
    } catch (error: any) {
      console.error('Get trade history error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get trade history',
      });
    }
  }

  /**
   * GET /balance
   * Get balances across all platforms
   */
  async getBalances(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Authentication required',
        });
        return;
      }

      const balances = await portfolioService.getBalances(req.auth);

      res.json({
        success: true,
        data: balances,
      });
    } catch (error: any) {
      console.error('Get balances error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get balances',
      });
    }
  }
}

export const portfolioController = new PortfolioController();
