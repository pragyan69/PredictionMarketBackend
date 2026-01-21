// src/modules/auth/auth.routes.ts

import { Router } from 'express';
import { authController } from './auth.controller';
import { requireAuth } from './auth.middleware';

export const authRouter = Router();

// Public endpoints
authRouter.post('/connect', (req, res) => authController.connect(req, res));
authRouter.post('/verify', (req, res) => authController.verify(req, res));

// Authenticated endpoints
authRouter.post('/logout', requireAuth, (req, res) => authController.logout(req, res));
authRouter.get('/session', requireAuth, (req, res) => authController.getSession(req, res));

// Platform credential endpoints
authRouter.post('/polymarket/derive', requireAuth, (req, res) =>
  authController.storePolymarketCredentials(req, res)
);
authRouter.post('/kalshi/register', requireAuth, (req, res) =>
  authController.storeKalshiCredentials(req, res)
);
