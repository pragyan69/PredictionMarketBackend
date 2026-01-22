// src/modules/auth/auth.controller.ts

import { Request, Response } from 'express';
import { authService } from './auth.service';
import {
  ConnectRequest,
  VerifyRequest,
  PolymarketDeriveRequest,
  KalshiRegisterRequest,
} from './types/auth.types';
import {
  getApiKeyTypedData,
  createApiKey as createPolymarketApiKey,
} from '../polymarket/utils/apiKeyDerivation';
import {
  createKalshiApiKeyWithLogin,
  createKalshiApiKeyWithOwnKey,
} from '../kalshi/utils/apiKeyGeneration';

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

  // ============================================
  // AUTOMATED SETUP ENDPOINTS
  // ============================================

  /**
   * GET /auth/polymarket/setup-data
   * Get the EIP-712 typed data that frontend needs to request signature
   */
  async getPolymarketSetupData(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { timestamp, nonce, typedData } = getApiKeyTypedData(req.auth.walletAddress);

      res.json({
        success: true,
        data: {
          timestamp,
          nonce,
          typedData,
          message: 'Sign this message to create your Polymarket API key',
        },
      });
    } catch (error: any) {
      console.error('Get Polymarket setup data error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get setup data',
      });
    }
  }

  /**
   * POST /auth/polymarket/auto-setup
   * Automatically create/derive Polymarket API key using wallet signature
   *
   * Body: { signature, timestamp, nonce, funder_address?, signature_type? }
   */
  async polymarketAutoSetup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { signature, timestamp, nonce, funder_address, signature_type } = req.body;

      if (!signature || !timestamp) {
        res.status(400).json({
          success: false,
          error: 'signature and timestamp are required',
        });
        return;
      }

      console.log(`🔑 Creating Polymarket API key for ${req.auth.walletAddress}...`);

      // Create or derive API key from Polymarket
      const credentials = await createPolymarketApiKey(
        req.auth.walletAddress,
        signature,
        timestamp,
        nonce || 0
      );

      // Store credentials in session
      await authService.storePolymarketCredentials(req.auth.sessionId, {
        apiKey: credentials.apiKey,
        secret: credentials.secret,
        passphrase: credentials.passphrase,
        funderAddress: funder_address || req.auth.walletAddress,
        signatureType: signature_type ?? 0,
      });

      console.log(`✅ Polymarket API key created and stored for ${req.auth.walletAddress}`);

      res.json({
        success: true,
        message: 'Polymarket API key created successfully',
        data: {
          api_key_preview: credentials.apiKey.substring(0, 8) + '...',
          funder_address: funder_address || req.auth.walletAddress,
          signature_type: signature_type ?? 0,
        },
      });
    } catch (error: any) {
      console.error('Polymarket auto setup error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create Polymarket API key',
      });
    }
  }

  /**
   * POST /auth/kalshi/auto-setup
   * Automatically create Kalshi API key using email/password
   *
   * Body: { email, password, method?: 'generate' | 'own_key' }
   *
   * - 'generate': Let Kalshi generate both keys (easier)
   * - 'own_key': Generate our own RSA key pair (more control)
   */
  async kalshiAutoSetup(req: Request, res: Response): Promise<void> {
    try {
      if (!req.auth) {
        res.status(401).json({
          success: false,
          error: 'Not authenticated',
        });
        return;
      }

      const { email, password, method = 'generate' } = req.body;

      if (!email || !password) {
        res.status(400).json({
          success: false,
          error: 'Kalshi email and password are required',
        });
        return;
      }

      console.log(`🔑 Creating Kalshi API key for ${email}...`);

      let credentials: { apiKeyId: string; privateKey: string };

      if (method === 'own_key') {
        // Generate our own key pair and register with Kalshi
        credentials = await createKalshiApiKeyWithOwnKey(email, password);
      } else {
        // Let Kalshi generate everything (default, easier)
        credentials = await createKalshiApiKeyWithLogin(email, password);
      }

      // Store credentials in session
      await authService.storeKalshiCredentials(req.auth.sessionId, {
        apiKeyId: credentials.apiKeyId,
        privateKey: credentials.privateKey,
      });

      console.log(`✅ Kalshi API key created and stored`);

      res.json({
        success: true,
        message: 'Kalshi API key created successfully',
        data: {
          api_key_id: credentials.apiKeyId,
          method: method,
        },
      });
    } catch (error: any) {
      console.error('Kalshi auto setup error:', error);

      // Provide helpful error messages
      let errorMessage = error.message || 'Failed to create Kalshi API key';

      if (error.response?.status === 401) {
        errorMessage = 'Invalid Kalshi email or password';
      } else if (error.response?.status === 403) {
        errorMessage = 'Kalshi account does not have API access. Please upgrade to Premier or Market Maker.';
      }

      res.status(error.response?.status || 500).json({
        success: false,
        error: errorMessage,
      });
    }
  }

  /**
   * GET /auth/credentials/status
   * Get status of all trading credentials
   */
  async getCredentialsStatus(req: Request, res: Response): Promise<void> {
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
        data: {
          polymarket: {
            configured: sessionInfo.has_polymarket_credentials,
            ready_to_trade: sessionInfo.has_polymarket_credentials,
          },
          kalshi: {
            configured: sessionInfo.has_kalshi_credentials,
            ready_to_trade: sessionInfo.has_kalshi_credentials,
          },
          all_configured: sessionInfo.has_polymarket_credentials && sessionInfo.has_kalshi_credentials,
        },
      });
    } catch (error: any) {
      console.error('Get credentials status error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get credentials status',
      });
    }
  }
}

export const authController = new AuthController();
