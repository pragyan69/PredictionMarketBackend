// src/modules/kalshi/utils/rsaSigner.ts

import crypto from 'crypto';
import { KalshiCredentials } from '../../auth/types/auth.types';

/**
 * Sign a request for Kalshi API using RSA-PSS
 */
export function signRequest(
  privateKeyPem: string,
  timestamp: string,
  method: string,
  path: string,
  body?: string
): string {
  // Build message to sign
  // Format: timestamp + method + path + body
  let message = timestamp + method.toUpperCase() + path;
  if (body) {
    message += body;
  }

  // Create RSA-PSS signature
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(message);
  sign.end();

  // Sign with PSS padding
  const signature = sign.sign({
    key: privateKeyPem,
    padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    saltLength: 32, // crypto.constants.RSA_PSS_SALTLEN_DIGEST
  });

  // Return base64 encoded signature
  return signature.toString('base64');
}

/**
 * Build authentication headers for Kalshi API
 */
export function buildKalshiAuthHeaders(
  credentials: KalshiCredentials,
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  // Timestamp in milliseconds
  const timestamp = Date.now().toString();

  // Sign the request
  const signature = signRequest(
    credentials.privateKey,
    timestamp,
    method,
    path,
    body
  );

  return {
    'KALSHI-ACCESS-KEY': credentials.apiKeyId,
    'KALSHI-ACCESS-TIMESTAMP': timestamp,
    'KALSHI-ACCESS-SIGNATURE': signature,
  };
}

/**
 * Validate that a private key is in valid PEM format
 */
export function validatePrivateKey(pem: string): boolean {
  try {
    // Try to create a key object
    crypto.createPrivateKey(pem);
    return true;
  } catch {
    return false;
  }
}

/**
 * Generate an RSA key pair (for testing/demo purposes)
 */
export function generateRSAKeyPair(): { publicKey: string; privateKey: string } {
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
