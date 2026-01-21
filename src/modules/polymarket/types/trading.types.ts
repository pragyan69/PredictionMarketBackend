// src/modules/polymarket/types/trading.types.ts

// Order side
export type OrderSide = 'BUY' | 'SELL';

// Order type for posting
export type OrderType = 'GTC' | 'GTD' | 'FOK' | 'FAK';

// Signature type
export enum SignatureType {
  EOA = 0,
  POLY_PROXY = 1,
  POLY_GNOSIS_SAFE = 2,
}

// Order structure for EIP-712 signing
export interface PolymarketOrderStruct {
  salt: string;
  maker: string;
  signer: string;
  taker: string;
  tokenId: string;
  makerAmount: string;
  takerAmount: string;
  expiration: string;
  nonce: string;
  feeRateBps: string;
  side: number; // 0 = BUY, 1 = SELL
  signatureType: number;
}

// Signed order (order struct + signature)
export interface SignedOrder extends PolymarketOrderStruct {
  signature: string;
}

// Create order request (client-side)
export interface CreateOrderParams {
  tokenId: string;
  price: number; // 0.01 - 0.99
  size: number; // Number of shares
  side: OrderSide;
  feeRateBps?: number;
  nonce?: number;
  expiration?: number; // Unix timestamp (for GTD orders)
}

// Post order request to CLOB
export interface PostOrderRequest {
  order: SignedOrder;
  owner: string; // API key
  orderType: OrderType;
}

// Order response from CLOB
export interface OrderResponse {
  success: boolean;
  errorMsg?: string;
  orderID?: string;
  transactionsHashes?: string[];
  status?: 'live' | 'matched' | 'delayed';
}

// Open order from CLOB
export interface OpenOrder {
  id: string;
  status: string;
  market: string;
  original_size: string;
  outcome: string;
  maker_address: string;
  owner: string;
  price: string;
  side: string;
  size_matched: string;
  asset_id: string;
  expiration: string;
  type: string;
  created_at: string;
  associate_trades: string[];
}

// Cancel response
export interface CancelResponse {
  canceled: string[];
  not_canceled: { [orderId: string]: string };
}

// Trade (filled order)
export interface Trade {
  id: string;
  taker_order_id: string;
  market: string;
  asset_id: string;
  side: string;
  size: string;
  fee_rate_bps: string;
  price: string;
  status: string;
  match_time: string;
  last_update: string;
  outcome: string;
  bucket_index: string;
  owner: string;
  maker_address: string;
  transaction_hash: string;
  trader_side: string;
  type: string;
}

// Create market order params
export interface CreateMarketOrderParams {
  tokenId: string;
  amount: number; // For BUY: amount in USDC, for SELL: number of shares
  side: OrderSide;
  price: number; // Max price for BUY, min price for SELL
  feeRateBps?: number;
  nonce?: number;
}

// Order book price level
export interface PriceLevel {
  price: string;
  size: string;
}

// Order book
export interface OrderBook {
  market: string;
  asset_id: string;
  bids: PriceLevel[];
  asks: PriceLevel[];
  timestamp: number;
}

// Unified order request (for your API)
export interface UnifiedOrderRequest {
  market_id: string; // tokenId
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  order_type: 'limit' | 'market';
  time_in_force: 'gtc' | 'gtd' | 'fok' | 'ioc';
  expiration_ts?: number;
}

// Unified order response
export interface UnifiedOrderResponse {
  id: string;
  external_id: string;
  platform: 'polymarket';
  status: string;
  market_id: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  price: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  order_type: string;
  time_in_force: string;
  created_at: string;
}

// EIP-712 domain for Polymarket
export const POLYMARKET_DOMAIN = {
  name: 'Polymarket CTF Exchange',
  version: '1',
  chainId: 137,
};

// EIP-712 types for order
export const ORDER_TYPES = {
  Order: [
    { name: 'salt', type: 'uint256' },
    { name: 'maker', type: 'address' },
    { name: 'signer', type: 'address' },
    { name: 'taker', type: 'address' },
    { name: 'tokenId', type: 'uint256' },
    { name: 'makerAmount', type: 'uint256' },
    { name: 'takerAmount', type: 'uint256' },
    { name: 'expiration', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'feeRateBps', type: 'uint256' },
    { name: 'side', type: 'uint8' },
    { name: 'signatureType', type: 'uint8' },
  ],
};

// CLOB operator address (taker for all orders)
export const CLOB_OPERATOR = '0x0000000000000000000000000000000000000000';
