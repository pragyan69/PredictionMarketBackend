// src/modules/dflow/types/dflow.types.ts

// ==================== MARKET STRUCTURE ====================

export interface DFlowMarketAccounts {
  yesMint: string;
  noMint: string;
  marketLedger: string;
  isInitialized: boolean;
}

export interface DFlowMarket {
  id: string;
  ticker: string;
  title: string;
  description?: string;
  status: 'active' | 'resolved' | 'pending';
  outcome?: 'yes' | 'no' | null;
  accounts: DFlowMarketAccounts;
  yesPrice?: number;
  noPrice?: number;
  volume?: number;
  liquidity?: number;
  createdAt?: string;
  resolvedAt?: string;
  expirationTime?: string;
}

export interface DFlowEvent {
  id: string;
  title: string;
  description?: string;
  category?: string;
  markets: DFlowMarket[];
  createdAt?: string;
  status?: string;
}

// ==================== TRADE API TYPES ====================

export interface QuoteRequest {
  inputMint: string;          // Token to swap from (e.g., USDC mint or yesMint/noMint)
  outputMint: string;         // Token to swap to
  amount: string;             // Amount in smallest units (e.g., lamports)
  slippageBps?: number;       // Slippage tolerance in basis points (default: 50 = 0.5%)
  userPublicKey?: string;     // User's Solana public key
}

export interface QuoteResponse {
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  priceImpactPct: string;
  marketInfos: MarketInfo[];
  otherAmountThreshold: string;
  swapMode: string;
  slippageBps: number;
  routePlan: RoutePlan[];
}

export interface MarketInfo {
  id: string;
  label: string;
  inputMint: string;
  outputMint: string;
  inAmount: string;
  outAmount: string;
  lpFee: {
    amount: string;
    pct: number;
  };
  platformFee: {
    amount: string;
    pct: number;
  };
}

export interface RoutePlan {
  swapInfo: {
    ammKey: string;
    label: string;
    inputMint: string;
    outputMint: string;
    inAmount: string;
    outAmount: string;
    feeAmount: string;
    feeMint: string;
  };
  percent: number;
}

export interface SwapRequest {
  userPublicKey: string;
  quoteResponse: QuoteResponse;
  wrapAndUnwrapSol?: boolean;
  computeUnitPriceMicroLamports?: number;
  asLegacyTransaction?: boolean;
  useSharedAccounts?: boolean;
  destinationTokenAccount?: string;
}

export interface SwapResponse {
  swapTransaction: string;     // Base64 encoded transaction
  lastValidBlockHeight: number;
  prioritizationFeeLamports?: number;
}

export interface SwapInstructionsRequest {
  userPublicKey: string;
  quoteResponse: QuoteResponse;
  wrapAndUnwrapSol?: boolean;
}

export interface SwapInstructionsResponse {
  tokenLedgerInstruction?: InstructionData;
  computeBudgetInstructions: InstructionData[];
  setupInstructions: InstructionData[];
  swapInstruction: InstructionData;
  cleanupInstruction?: InstructionData;
  addressLookupTableAddresses: string[];
}

export interface InstructionData {
  programId: string;
  accounts: AccountMeta[];
  data: string;    // Base64 encoded
}

export interface AccountMeta {
  pubkey: string;
  isSigner: boolean;
  isWritable: boolean;
}

// ==================== ORDERBOOK TYPES ====================

export interface OrderbookLevel {
  price: number;
  size: number;
}

export interface Orderbook {
  marketTicker: string;
  bids: OrderbookLevel[];
  asks: OrderbookLevel[];
  timestamp: string;
}

// ==================== TRADE HISTORY TYPES ====================

export interface DFlowTrade {
  id: string;
  marketId: string;
  marketTicker: string;
  side: 'buy' | 'sell';
  outcome: 'yes' | 'no';
  price: number;
  size: number;
  timestamp: string;
  maker?: string;
  taker?: string;
  txSignature?: string;
}

export interface TradesResponse {
  trades: DFlowTrade[];
  nextCursor?: string;
}

// ==================== API RESPONSE WRAPPERS ====================

export interface DFlowApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ==================== UNIFIED TRADING TYPES ====================

export type Platform = 'polymarket' | 'kalshi' | 'dflow';

export interface UnifiedMarket {
  id: string;
  platform: Platform;
  title: string;
  description?: string;
  yesPrice: number;
  noPrice: number;
  volume?: number;
  liquidity?: number;
  status: string;
  // Platform-specific identifiers
  platformData: {
    // For DFlow
    yesMint?: string;
    noMint?: string;
    ticker?: string;
    // For Polymarket
    conditionId?: string;
    tokenId?: string;
    // For Kalshi
    kalshiTicker?: string;
    eventTicker?: string;
  };
}

export interface UnifiedTradeRequest {
  platform: Platform;
  marketId: string;
  side: 'yes' | 'no';
  action: 'buy' | 'sell';
  amount: number;           // Amount in USDC (or native token units)
  slippageBps?: number;     // Slippage tolerance
  // Solana specific (for DFlow)
  userPublicKey?: string;
  // EVM specific (for Polymarket)
  walletAddress?: string;
  privateKey?: string;
}

export interface UnifiedTradeResponse {
  platform: Platform;
  success: boolean;
  // For DFlow - returns transaction to sign
  transaction?: string;
  lastValidBlockHeight?: number;
  // For other platforms - returns order details
  orderId?: string;
  status?: string;
  filledAmount?: number;
  avgPrice?: number;
  error?: string;
}

// ==================== CONSTANTS ====================

// DFlow uses Solana, these are common token mints
export const DFLOW_CONSTANTS = {
  // USDC on Solana (mainnet)
  USDC_MINT: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  // Native SOL wrapped
  WSOL_MINT: 'So11111111111111111111111111111111111111112',
  // API URLs
  TRADE_API_URL: 'https://quote-api.dflow.net',
  METADATA_API_URL: 'https://prediction-markets-api.dflow.net',
} as const;
