// src/modules/auth/auth.service.ts

import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { ethers } from 'ethers';
import { clickhouse } from '../../config/clickhouse';
import { env } from '../../config/env';
import { encrypt, decrypt, generateNonce, hash } from './utils/encryption';
import {
  UserSession,
  PolymarketCredentials,
  KalshiCredentials,
  NonceEntry,
  JWTPayload,
  ConnectResponse,
  VerifyResponse,
  SessionInfoResponse,
} from './types/auth.types';

// In-memory nonce storage (for production, use Redis)
const nonceStore = new Map<string, NonceEntry>();

// Clean up expired nonces periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of nonceStore.entries()) {
    if (entry.expiresAt < now) {
      nonceStore.delete(key);
    }
  }
}, 60000); // Every minute

export class AuthService {
  /**
   * Generate a nonce for wallet connection
   */
  async generateConnectNonce(walletAddress: string): Promise<ConnectResponse> {
    const normalizedAddress = walletAddress.toLowerCase();
    const nonce = generateNonce();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    const message = `Sign this message to connect to Mimiq Trading Platform.\n\nWallet: ${normalizedAddress}\nNonce: ${nonce}\nTimestamp: ${Date.now()}`;

    const entry: NonceEntry = {
      nonce,
      walletAddress: normalizedAddress,
      expiresAt,
      message,
    };

    nonceStore.set(normalizedAddress, entry);

    return {
      nonce,
      expires_at: expiresAt,
      message,
    };
  }

  /**
   * Verify wallet signature and create session
   */
  async verifySignatureAndCreateSession(
    walletAddress: string,
    signature: string,
    nonce: string
  ): Promise<VerifyResponse> {
    const normalizedAddress = walletAddress.toLowerCase();
    const entry = nonceStore.get(normalizedAddress);

    if (!entry) {
      throw new Error('No pending connection request. Please connect first.');
    }

    if (entry.nonce !== nonce) {
      throw new Error('Invalid nonce');
    }

    if (entry.expiresAt < Date.now()) {
      nonceStore.delete(normalizedAddress);
      throw new Error('Nonce expired. Please connect again.');
    }

    // Verify signature
    try {
      const recoveredAddress = ethers.verifyMessage(entry.message, signature);
      if (recoveredAddress.toLowerCase() !== normalizedAddress) {
        throw new Error('Signature verification failed');
      }
    } catch (error) {
      throw new Error('Invalid signature');
    }

    // Remove used nonce
    nonceStore.delete(normalizedAddress);

    // Create session
    const sessionId = uuidv4();
    const expiresAt = new Date(Date.now() + env.auth.sessionExpiryHours * 60 * 60 * 1000);

    // Convert expires string (e.g., '24h') to seconds for JWT
    const expiresInSeconds = env.auth.sessionExpiryHours * 60 * 60;
    const sessionToken = jwt.sign(
      {
        sessionId,
        walletAddress: normalizedAddress,
      } as JWTPayload,
      env.auth.jwtSecret,
      { expiresIn: expiresInSeconds }
    );

    // Store session in database
    await this.createSession({
      session_id: sessionId,
      wallet_address: normalizedAddress,
      session_token: hash(sessionToken),
      poly_api_key: '',
      poly_secret: '',
      poly_passphrase: '',
      poly_funder_address: '',
      poly_signature_type: 0,
      kalshi_api_key_id: '',
      kalshi_private_key: '',
      created_at: new Date(),
      expires_at: expiresAt,
      last_activity: new Date(),
    });

    return {
      session_token: sessionToken,
      expires_at: expiresAt.getTime(),
      wallet_address: normalizedAddress,
    };
  }

  /**
   * Create session in database
   */
  private async createSession(session: UserSession): Promise<void> {
    await clickhouse.getClient().insert({
      table: 'mimiq_sessions',
      values: [
        {
          session_id: session.session_id,
          wallet_address: session.wallet_address,
          session_token: session.session_token,
          poly_api_key: session.poly_api_key,
          poly_secret: session.poly_secret,
          poly_passphrase: session.poly_passphrase,
          poly_funder_address: session.poly_funder_address,
          poly_signature_type: session.poly_signature_type,
          kalshi_api_key_id: session.kalshi_api_key_id,
          kalshi_private_key: session.kalshi_private_key,
          created_at: session.created_at.toISOString().replace('T', ' ').replace('Z', ''),
          expires_at: session.expires_at.toISOString().replace('T', ' ').replace('Z', ''),
          last_activity: session.last_activity.toISOString().replace('T', ' ').replace('Z', ''),
        },
      ],
      format: 'JSONEachRow',
    });
  }

  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    const result = await clickhouse.getClient().query({
      query: `
        SELECT *
        FROM mimiq_sessions
        WHERE session_id = {sessionId:UUID}
        ORDER BY last_activity DESC
        LIMIT 1
      `,
      query_params: { sessionId },
      format: 'JSONEachRow',
    });

    const rows = await result.json<UserSession[]>();
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Get session by wallet address
   */
  async getSessionByWallet(walletAddress: string): Promise<UserSession | null> {
    const result = await clickhouse.getClient().query({
      query: `
        SELECT *
        FROM mimiq_sessions
        WHERE wallet_address = {walletAddress:String}
        AND expires_at > now()
        ORDER BY last_activity DESC
        LIMIT 1
      `,
      query_params: { walletAddress: walletAddress.toLowerCase() },
      format: 'JSONEachRow',
    });

    const rows = await result.json<UserSession[]>();
    return rows.length > 0 ? rows[0] : null;
  }

  /**
   * Validate JWT and get session
   */
  async validateToken(token: string): Promise<{ sessionId: string; walletAddress: string } | null> {
    try {
      const payload = jwt.verify(token, env.auth.jwtSecret) as JWTPayload;
      const session = await this.getSession(payload.sessionId);

      if (!session) {
        return null;
      }

      if (new Date(session.expires_at) < new Date()) {
        return null;
      }

      // Update last activity
      await this.updateLastActivity(payload.sessionId);

      return {
        sessionId: payload.sessionId,
        walletAddress: payload.walletAddress,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Update last activity timestamp
   */
  private async updateLastActivity(sessionId: string): Promise<void> {
    // ClickHouse uses ReplacingMergeTree, so we insert a new row
    const session = await this.getSession(sessionId);
    if (session) {
      session.last_activity = new Date();
      await this.createSession(session);
    }
  }

  /**
   * Get session info
   */
  async getSessionInfo(sessionId: string): Promise<SessionInfoResponse | null> {
    const session = await this.getSession(sessionId);
    if (!session) return null;

    return {
      wallet_address: session.wallet_address,
      created_at: new Date(session.created_at).getTime(),
      expires_at: new Date(session.expires_at).getTime(),
      has_polymarket_credentials: !!session.poly_api_key,
      has_kalshi_credentials: !!session.kalshi_api_key_id,
    };
  }

  /**
   * Store Polymarket credentials
   */
  async storePolymarketCredentials(
    sessionId: string,
    credentials: PolymarketCredentials
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.poly_api_key = encrypt(credentials.apiKey);
    session.poly_secret = encrypt(credentials.secret);
    session.poly_passphrase = encrypt(credentials.passphrase);
    session.poly_funder_address = credentials.funderAddress || '';
    session.poly_signature_type = credentials.signatureType || 0;
    session.last_activity = new Date();

    await this.createSession(session);
  }

  /**
   * Get Polymarket credentials
   */
  async getPolymarketCredentials(sessionId: string): Promise<PolymarketCredentials | null> {
    const session = await this.getSession(sessionId);
    if (!session || !session.poly_api_key) {
      return null;
    }

    return {
      apiKey: decrypt(session.poly_api_key),
      secret: decrypt(session.poly_secret),
      passphrase: decrypt(session.poly_passphrase),
      funderAddress: session.poly_funder_address,
      signatureType: session.poly_signature_type,
    };
  }

  /**
   * Store Kalshi credentials
   */
  async storeKalshiCredentials(
    sessionId: string,
    credentials: KalshiCredentials
  ): Promise<void> {
    const session = await this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    session.kalshi_api_key_id = credentials.apiKeyId;
    session.kalshi_private_key = encrypt(credentials.privateKey);
    session.last_activity = new Date();

    await this.createSession(session);
  }

  /**
   * Get Kalshi credentials
   */
  async getKalshiCredentials(sessionId: string): Promise<KalshiCredentials | null> {
    const session = await this.getSession(sessionId);
    if (!session || !session.kalshi_api_key_id) {
      return null;
    }

    return {
      apiKeyId: session.kalshi_api_key_id,
      privateKey: decrypt(session.kalshi_private_key),
    };
  }

  /**
   * Invalidate session (logout)
   */
  async invalidateSession(sessionId: string): Promise<void> {
    const session = await this.getSession(sessionId);
    if (session) {
      session.expires_at = new Date(0); // Set to epoch
      session.last_activity = new Date();
      await this.createSession(session);
    }
  }
}

export const authService = new AuthService();
