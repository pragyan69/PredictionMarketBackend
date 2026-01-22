// src/modules/polymarket/utils/apiKeyDerivation.ts

import axios from 'axios';
import { env } from '../../../config/env';

// EIP-712 Domain for CLOB Auth
export const CLOB_AUTH_DOMAIN = {
  name: 'ClobAuthDomain',
  version: '1',
  chainId: 137, // Polygon Mainnet
};

// EIP-712 Types for API Key derivation
export const CLOB_AUTH_TYPES = {
  ClobAuth: [
    { name: 'address', type: 'address' },
    { name: 'timestamp', type: 'string' },
    { name: 'nonce', type: 'uint256' },
    { name: 'message', type: 'string' },
  ],
};

// Message that user attests to
export const CLOB_AUTH_MESSAGE = 'This message attests that I control the given wallet';

/**
 * Build the EIP-712 message for API key derivation
 * This is what the frontend will ask the user to sign
 */
export function buildApiKeyMessage(address: string, timestamp: string, nonce: number = 0) {
  return {
    domain: CLOB_AUTH_DOMAIN,
    types: CLOB_AUTH_TYPES,
    primaryType: 'ClobAuth' as const,
    message: {
      address: address,
      timestamp: timestamp,
      nonce: nonce,
      message: CLOB_AUTH_MESSAGE,
    },
  };
}

/**
 * API Key credentials returned by Polymarket
 */
export interface PolymarketApiKeyCredentials {
  apiKey: string;
  secret: string;
  passphrase: string;
}

/**
 * Create or derive API key from Polymarket CLOB
 *
 * @param address - User's Polygon wallet address
 * @param signature - EIP-712 signature from the user
 * @param timestamp - Timestamp used in the signature
 * @param nonce - Nonce used in the signature (default 0)
 * @returns API credentials (apiKey, secret, passphrase)
 */
export async function createApiKey(
  address: string,
  signature: string,
  timestamp: string,
  nonce: number = 0
): Promise<PolymarketApiKeyCredentials> {
  const clobUrl = env.polymarket?.clobApiUrl || 'https://clob.polymarket.com';

  const headers = {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_NONCE': nonce.toString(),
  };

  try {
    // Try to create new API key
    const response = await axios.post<PolymarketApiKeyCredentials>(
      `${clobUrl}/auth/api-key`,
      {},
      { headers }
    );

    console.log('✅ Created new Polymarket API key');
    return response.data;
  } catch (error: any) {
    // If key already exists, try to derive it
    if (error.response?.status === 400 || error.response?.status === 409) {
      console.log('📝 API key exists, deriving...');
      return deriveApiKey(address, signature, timestamp, nonce);
    }
    throw error;
  }
}

/**
 * Derive existing API key from Polymarket CLOB
 * Use the same nonce that was used to create the key
 */
export async function deriveApiKey(
  address: string,
  signature: string,
  timestamp: string,
  nonce: number = 0
): Promise<PolymarketApiKeyCredentials> {
  const clobUrl = env.polymarket?.clobApiUrl || 'https://clob.polymarket.com';

  const headers = {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_NONCE': nonce.toString(),
  };

  const response = await axios.get<PolymarketApiKeyCredentials>(
    `${clobUrl}/auth/derive-api-key`,
    { headers }
  );

  console.log('✅ Derived existing Polymarket API key');
  return response.data;
}

/**
 * Delete an API key
 */
export async function deleteApiKey(
  address: string,
  signature: string,
  timestamp: string,
  nonce: number = 0
): Promise<void> {
  const clobUrl = env.polymarket?.clobApiUrl || 'https://clob.polymarket.com';

  const headers = {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': timestamp,
    'POLY_NONCE': nonce.toString(),
  };

  await axios.delete(`${clobUrl}/auth/api-key`, { headers });
  console.log('✅ Deleted Polymarket API key');
}

/**
 * Get the typed data that frontend needs to request signature for
 * This is the exact format that ethers.js and wagmi expect
 */
export function getApiKeyTypedData(address: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = 0;

  return {
    timestamp,
    nonce,
    typedData: {
      domain: CLOB_AUTH_DOMAIN,
      types: CLOB_AUTH_TYPES,
      primaryType: 'ClobAuth' as const,
      message: {
        address: address,
        timestamp: timestamp,
        nonce: nonce,
        message: CLOB_AUTH_MESSAGE,
      },
    },
  };
}
