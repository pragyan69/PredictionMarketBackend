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

// Platform credential endpoints (manual)
authRouter.post('/polymarket/derive', requireAuth, (req, res) =>
  authController.storePolymarketCredentials(req, res)
);
authRouter.post('/kalshi/register', requireAuth, (req, res) =>
  authController.storeKalshiCredentials(req, res)
);

// ============================================
// AUTOMATED SETUP ENDPOINTS (NEW!)
// ============================================

// Get EIP-712 typed data for Polymarket API key signature
authRouter.get('/polymarket/setup-data', requireAuth, (req, res) =>
  authController.getPolymarketSetupData(req, res)
);

// Auto-create Polymarket API key with wallet signature
authRouter.post('/polymarket/auto-setup', requireAuth, (req, res) =>
  authController.polymarketAutoSetup(req, res)
);

// Auto-create Kalshi API key with email/password
authRouter.post('/kalshi/auto-setup', requireAuth, (req, res) =>
  authController.kalshiAutoSetup(req, res)
);

// Get status of all trading credentials
authRouter.get('/credentials/status', requireAuth, (req, res) =>
  authController.getCredentialsStatus(req, res)
);
