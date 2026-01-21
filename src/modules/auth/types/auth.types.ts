// src/modules/auth/types/auth.types.ts

// Session stored in database
export interface UserSession {
  session_id: string;
  wallet_address: string;
  session_token: string;

  // Polymarket credentials (encrypted)
  poly_api_key: string;
  poly_secret: string;
  poly_passphrase: string;
  poly_funder_address: string;
  poly_signature_type: number; // 0=EOA, 1=Proxy, 2=Safe

  // Kalshi credentials (encrypted)
  kalshi_api_key_id: string;
  kalshi_private_key: string; // Encrypted PEM

  created_at: Date;
  expires_at: Date;
  last_activity: Date;
}

// Polymarket L2 credentials (decrypted)
export interface PolymarketCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
  funderAddress: string;
  signatureType: number;
}

// Kalshi credentials (decrypted)
export interface KalshiCredentials {
  apiKeyId: string;
  privateKey: string; // PEM format
}

// Request context after auth middleware
export interface AuthContext {
  sessionId: string;
  walletAddress: string;
  polymarket?: PolymarketCredentials;
  kalshi?: KalshiCredentials;
}

// Connect wallet request
export interface ConnectRequest {
  wallet_address: string;
}

// Connect wallet response
export interface ConnectResponse {
  nonce: string;
  expires_at: number;
  message: string; // Message to sign
}

// Verify signature request
export interface VerifyRequest {
  wallet_address: string;
  signature: string;
  nonce: string;
}

// Verify response
export interface VerifyResponse {
  session_token: string;
  expires_at: number;
  wallet_address: string;
}

// Session info response
export interface SessionInfoResponse {
  wallet_address: string;
  created_at: number;
  expires_at: number;
  has_polymarket_credentials: boolean;
  has_kalshi_credentials: boolean;
}

// Polymarket derive credentials request
export interface PolymarketDeriveRequest {
  api_key: string;
  secret: string;
  passphrase: string;
  funder_address?: string;
  signature_type?: number;
}

// Kalshi register key request
export interface KalshiRegisterRequest {
  api_key_id: string;
  private_key_pem: string;
}

// JWT payload
export interface JWTPayload {
  sessionId: string;
  walletAddress: string;
  iat: number;
  exp: number;
}

// Nonce storage (in-memory for simplicity, could be Redis)
export interface NonceEntry {
  nonce: string;
  walletAddress: string;
  expiresAt: number;
  message: string;
}
