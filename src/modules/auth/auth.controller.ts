// src/modules/auth/auth.controller.ts

import { Request, Response } from 'express';
import { authService } from './auth.service';
import {
  ConnectRequest,
  VerifyRequest,
  PolymarketDeriveRequest,
  KalshiRegisterRequest,
} from './types/auth.types';

export class AuthController {
  /**
   * POST /auth/connect
   * Get nonce for wallet connection
   */
  async connect(req: Request, res: Response): Promise<void> {
    try {
      const { wallet_address } = req.body as ConnectRequest;

      if (!wallet_address) {
        res.status(400).json({
          success: false,
          error: 'wallet_address is required',
        });
        return;
      }

      // Validate address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(wallet_address)) {
        res.status(400).json({
          success: false,
          error: 'Invalid wallet address format',
        });
        return;
      }

      const result = await authService.generateConnectNonce(wallet_address);

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Connect error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to generate connection nonce',
      });
    }
  }

  /**
   * POST /auth/verify
   * Verify signature and create session
   */
  async verify(req: Request, res: Response): Promise<void> {
    try {
      const { wallet_address, signature, nonce } = req.body as VerifyRequest;

      if (!wallet_address || !signature || !nonce) {
        res.status(400).json({
          success: false,
          error: 'wallet_address, signature, and nonce are required',
        });
        return;
      }

      const result = await authService.verifySignatureAndCreateSession(
        wallet_address,
        signature,
        nonce
      );

      res.json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      console.error('Verify error:', error);
      res.status(401).json({
        success: false,
        error: error.message || 'Verification failed',
      });
    }
  }

  /**
   * POST /auth/logout
   * Invalidate current session
   */
  async logout(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      await authService.invalidateSession(req.auth.sessionId);

      res.json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (error: any) {
      console.error('Logout error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Logout failed',
      });
    }
  }

  /**
   * GET /auth/session
   * Get current session info
   */
  async getSession(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const sessionInfo = await authService.getSessionInfo(req.auth.sessionId);

      if (!sessionInfo) {
        res.status(404).json({
          success: false,
          error: 'Session not found',
        });
        return;
      }

      res.json({
        success: true,
        data: sessionInfo,
      });
    } catch (error: any) {
      console.error('Get session error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get session',
      });
    }
  }

  /**
   * POST /auth/polymarket/derive
   * Store Polymarket L2 credentials
   */
  async storePolymarketCredentials(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { api_key, secret, passphrase, funder_address, signature_type } =
        req.body as PolymarketDeriveRequest;

      if (!api_key || !secret || !passphrase) {
        res.status(400).json({
          success: false,
          error: 'api_key, secret, and passphrase are required',
        });
        return;
      }

      await authService.storePolymarketCredentials(req.auth.sessionId, {
        apiKey: api_key,
        secret,
        passphrase,
        funderAddress: funder_address || req.auth.walletAddress,
        signatureType: signature_type || 0,
      });

      res.json({
        success: true,
        message: 'Polymarket credentials stored successfully',
      });
    } catch (error: any) {
      console.error('Store Polymarket credentials error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store credentials',
      });
    }
  }

  /**
   * POST /auth/kalshi/register
   * Store Kalshi RSA credentials
   */
  async storeKalshiCredentials(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { api_key_id, private_key_pem } = req.body as KalshiRegisterRequest;

      if (!api_key_id || !private_key_pem) {
        res.status(400).json({
          success: false,
          error: 'api_key_id and private_key_pem are required',
        });
        return;
      }

      // Validate PEM format
      if (!private_key_pem.includes('-----BEGIN') || !private_key_pem.includes('-----END')) {
        res.status(400).json({
          success: false,
          error: 'Invalid private key format. Must be PEM format.',
        });
        return;
      }

      await authService.storeKalshiCredentials(req.auth.sessionId, {
        apiKeyId: api_key_id,
        privateKey: private_key_pem,
      });

      res.json({
        success: true,
        message: 'Kalshi credentials stored successfully',
      });
    } catch (error: any) {
      console.error('Store Kalshi credentials error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to store credentials',
      });
    }
  }
}

export const authController = new AuthController();
