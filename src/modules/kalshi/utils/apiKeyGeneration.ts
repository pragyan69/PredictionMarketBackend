// src/modules/kalshi/utils/apiKeyGeneration.ts

import crypto from 'crypto';
import axios from 'axios';
import { env } from '../../../config/env';

/**
 * Generated RSA key pair
 */
export interface RSAKeyPair {
  publicKey: string;  // PEM format
  privateKey: string; // PEM format
}

/**
 * Kalshi API key response
 */
export interface KalshiApiKeyResponse {
  api_key: string;
  created_time: string;
}

/**
 * Kalshi generated key response (includes private key)
 */
export interface KalshiGeneratedKeyResponse {
  api_key: string;
  private_key: string; // PEM format - only returned once!
  created_time: string;
}

/**
 * Kalshi login response
 */
export interface KalshiLoginResponse {
  member_id: string;
  token: string;
}

/**
 * Generate an RSA-4096 key pair for Kalshi authentication
 * The public key is registered with Kalshi, private key is stored securely
 */
export function generateRSAKeyPair(): RSAKeyPair {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
    modulusLength: 4096,
    publicKeyEncoding: {
      type: 'spki',
      format: 'pem',
    },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
    },
  });

  return { publicKey, privateKey };
}

/**
 * Login to Kalshi to get a session token
 * Required for API key operations
 */
export async function kalshiLogin(
  email: string,
  password: string
): Promise<KalshiLoginResponse> {
  const baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

  const response = await axios.post<KalshiLoginResponse>(
    `${baseUrl}/login`,
    { email, password },
    {
      headers: {
        'Content-Type': 'application/json',
      },
    }
  );

  console.log('✅ Kalshi login successful');
  return response.data;
}

/**
 * Register a self-generated RSA public key with Kalshi
 * Requires Premier or Market Maker API access level
 *
 * @param sessionToken - Token from kalshiLogin
 * @param publicKeyPem - RSA public key in PEM format
 * @returns API key ID
 */
export async function registerApiKey(
  sessionToken: string,
  publicKeyPem: string
): Promise<KalshiApiKeyResponse> {
  const baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

  const response = await axios.post<KalshiApiKeyResponse>(
    `${baseUrl}/api_keys`,
    { public_key: publicKeyPem },
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );

  console.log('✅ Registered API key with Kalshi:', response.data.api_key);
  return response.data;
}

/**
 * Request Kalshi to generate both public and private keys
 * The private key is only returned ONCE and must be stored securely
 *
 * @param sessionToken - Token from kalshiLogin
 * @returns API key ID and private key (PEM format)
 */
export async function generateApiKey(
  sessionToken: string
): Promise<KalshiGeneratedKeyResponse> {
  const baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

  const response = await axios.post<KalshiGeneratedKeyResponse>(
    `${baseUrl}/api_keys/generate`,
    {},
    {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );

  console.log('✅ Generated API key from Kalshi:', response.data.api_key);
  return response.data;
}

/**
 * List all API keys for the user
 */
export async function listApiKeys(
  sessionToken: string
): Promise<{ api_keys: KalshiApiKeyResponse[] }> {
  const baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

  const response = await axios.get<{ api_keys: KalshiApiKeyResponse[] }>(
    `${baseUrl}/api_keys`,
    {
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
      },
    }
  );

  return response.data;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  sessionToken: string,
  apiKeyId: string
): Promise<void> {
  const baseUrl = env.kalshi?.apiUrl || 'https://api.elections.kalshi.com/trade-api/v2';

  await axios.delete(`${baseUrl}/api_keys/${apiKeyId}`, {
    headers: {
      'Authorization': `Bearer ${sessionToken}`,
    },
  });

  console.log('✅ Deleted Kalshi API key:', apiKeyId);
}

/**
 * Complete flow: Login and generate API key
 * This is the easiest method - Kalshi generates everything
 *
 * @param email - Kalshi account email
 * @param password - Kalshi account password
 * @returns API key ID and private key
 */
export async function createKalshiApiKeyWithLogin(
  email: string,
  password: string
): Promise<{ apiKeyId: string; privateKey: string }> {
  // Step 1: Login
  const loginResponse = await kalshiLogin(email, password);

  // Step 2: Generate API key
  const keyResponse = await generateApiKey(loginResponse.token);

  return {
    apiKeyId: keyResponse.api_key,
    privateKey: keyResponse.private_key,
  };
}

/**
 * Complete flow: Login and register self-generated key
 * Use this if you want to control key generation
 *
 * @param email - Kalshi account email
 * @param password - Kalshi account password
 * @returns API key ID and private key (self-generated)
 */
export async function createKalshiApiKeyWithOwnKey(
  email: string,
  password: string
): Promise<{ apiKeyId: string; privateKey: string }> {
  // Step 1: Generate our own key pair
  const keyPair = generateRSAKeyPair();

  // Step 2: Login
  const loginResponse = await kalshiLogin(email, password);

  // Step 3: Register our public key
  const keyResponse = await registerApiKey(loginResponse.token, keyPair.publicKey);

  return {
    apiKeyId: keyResponse.api_key,
    privateKey: keyPair.privateKey,
  };
}

/**
 * Validate that a PEM private key is valid
 */
export function validatePrivateKey(pem: string): boolean {
  try {
    crypto.createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}
