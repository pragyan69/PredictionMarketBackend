// src/modules/portfolio/portfolio.routes.ts

import { Router } from 'express';
import { portfolioController } from './portfolio.controller';
import { requireAuth } from '../auth/auth.middleware';

export const portfolioRouter = Router();

// All routes require authentication
portfolioRouter.use(requireAuth);

// Get portfolio summary
portfolioRouter.get('/', (req, res) => portfolioController.getPortfolioSummary(req, res));

// Get positions
portfolioRouter.get('/positions', (req, res) => portfolioController.getPositions(req, res));

// Get trade history
portfolioRouter.get('/history', (req, res) => portfolioController.getTradeHistory(req, res));

// Balance endpoint (separate from portfolio)
export const balanceRouter = Router();
balanceRouter.use(requireAuth);
balanceRouter.get('/', (req, res) => portfolioController.getBalances(req, res));
