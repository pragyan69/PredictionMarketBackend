// src/modules/polymarket/utils/orderSigner.ts

import { ethers } from 'ethers';
import crypto from 'crypto';
import { env } from '../../../config/env';
import {
  PolymarketOrderStruct,
  SignedOrder,
  CreateOrderParams,
  OrderSide,
  SignatureType,
  POLYMARKET_DOMAIN,
  ORDER_TYPES,
  CLOB_OPERATOR,
} from '../types/trading.types';
import { PolymarketCredentials } from '../../auth/types/auth.types';

/**
 * Generate random salt for order
 */
export function generateSalt(): string {
  return '0x' + crypto.randomBytes(32).toString('hex');
}

/**
 * Convert price to maker/taker amounts
 * For BUY: makerAmount = price * size (what you pay)
 *          takerAmount = size (what you get)
 * For SELL: makerAmount = size (what you give)
 *           takerAmount = price * size (what you get)
 */
export function calculateAmounts(
  price: number,
  size: number,
  side: OrderSide
): { makerAmount: string; takerAmount: string } {
  // USDC has 6 decimals
  const USDC_DECIMALS = 6;
  const priceInUsdc = Math.round(price * 10 ** USDC_DECIMALS);
  const sizeScaled = Math.round(size * 10 ** USDC_DECIMALS);

  if (side === 'BUY') {
    // Paying USDC for shares
    const totalCost = Math.round(price * size * 10 ** USDC_DECIMALS);
    return {
      makerAmount: totalCost.toString(),
      takerAmount: sizeScaled.toString(),
    };
  } else {
    // Selling shares for USDC
    const totalReceive = Math.round(price * size * 10 ** USDC_DECIMALS);
    return {
      makerAmount: sizeScaled.toString(),
      takerAmount: totalReceive.toString(),
    };
  }
}

/**
 * Build order struct for EIP-712 signing
 */
export function buildOrderStruct(
  params: CreateOrderParams,
  maker: string,
  signer: string,
  signatureType: SignatureType = SignatureType.EOA
): PolymarketOrderStruct {
  const { makerAmount, takerAmount } = calculateAmounts(
    params.price,
    params.size,
    params.side
  );

  return {
    salt: generateSalt(),
    maker: maker,
    signer: signer,
    taker: CLOB_OPERATOR,
    tokenId: params.tokenId,
    makerAmount,
    takerAmount,
    expiration: (params.expiration || 0).toString(),
    nonce: (params.nonce || 0).toString(),
    feeRateBps: (params.feeRateBps || 0).toString(),
    side: params.side === 'BUY' ? 0 : 1,
    signatureType,
  };
}

/**
 * Sign order using EIP-712
 * Note: This requires the private key, which should be handled securely
 * In production, signing should happen client-side
 */
export async function signOrder(
  order: PolymarketOrderStruct,
  privateKey: string
): Promise<SignedOrder> {
  const wallet = new ethers.Wallet(privateKey);

  const domain = {
    name: POLYMARKET_DOMAIN.name,
    version: POLYMARKET_DOMAIN.version,
    chainId: env.polymarket.chainId,
  };

  // Convert order to proper types for signing
  const orderForSigning = {
    salt: BigInt(order.salt),
    maker: order.maker,
    signer: order.signer,
    taker: order.taker,
    tokenId: BigInt(order.tokenId),
    makerAmount: BigInt(order.makerAmount),
    takerAmount: BigInt(order.takerAmount),
    expiration: BigInt(order.expiration),
    nonce: BigInt(order.nonce),
    feeRateBps: BigInt(order.feeRateBps),
    side: order.side,
    signatureType: order.signatureType,
  };

  const signature = await wallet.signTypedData(domain, ORDER_TYPES, orderForSigning);

  return {
    ...order,
    signature,
  };
}

/**
 * Build L2 authentication headers for CLOB API
 */
export function buildL2Headers(
  credentials: PolymarketCredentials,
  method: string,
  path: string,
  body?: string
): Record<string, string> {
  const timestamp = Math.floor(Date.now() / 1000).toString();

  // Build message to sign
  let message = timestamp + method.toUpperCase() + path;
  if (body) {
    message += body;
  }

  // Create HMAC signature
  const hmac = crypto.createHmac('sha256', credentials.secret);
  hmac.update(message);
  const signature = hmac.digest('base64');

  return {
    'POLY_ADDRESS': credentials.funderAddress,
    'POLY_API_KEY': credentials.apiKey,
    'POLY_PASSPHRASE': credentials.passphrase,
    'POLY_TIMESTAMP': timestamp,
    'POLY_SIGNATURE': signature,
  };
}

/**
 * Build headers for L1 authentication (derive API key)
 */
export function buildL1Headers(address: string, signature: string): Record<string, string> {
  return {
    'POLY_ADDRESS': address,
    'POLY_SIGNATURE': signature,
    'POLY_TIMESTAMP': Math.floor(Date.now() / 1000).toString(),
    'POLY_NONCE': '0',
  };
}
