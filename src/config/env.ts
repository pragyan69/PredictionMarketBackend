// src/config/env.ts

import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '8081', 10),
  
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '9000', 10),
    username: process.env.CLICKHOUSE_USERNAME || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'prediction_market',
  },
  
  polymarket: {
    gammaApiUrl: process.env.POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com',
    clobApiUrl: process.env.POLYMARKET_CLOB_API_URL || 'https://clob.polymarket.com',
    dataApiUrl: process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com',
    clobWsUrl: process.env.POLYMARKET_CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws',
    rtdsWsUrl: process.env.POLYMARKET_RTDS_WS_URL || 'wss://ws-live-data.polymarket.com',
    // Trading contracts (Polygon Mainnet)
    chainId: parseInt(process.env.POLYMARKET_CHAIN_ID || '137', 10),
    usdcAddress: process.env.POLYMARKET_USDC || '0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174',
    ctfAddress: process.env.POLYMARKET_CTF || '0x4d97dcd97ec945f40cf65f87097ace5ea0476045',
    ctfExchangeAddress: process.env.POLYMARKET_CTF_EXCHANGE || '0x4bFb41d5B3570DeFd03C39a9A4D8dE6Bd8B8982E',
    negRiskCtfExchangeAddress: process.env.POLYMARKET_NEG_RISK_CTF_EXCHANGE || '0xC5d563A36AE78145C45a50134d48A1215220f80a',
    negRiskAdapterAddress: process.env.POLYMARKET_NEG_RISK_ADAPTER || '0xd91E80cF2E7be2e162c6513ceD06f1dD0dA35296',
  },

  kalshi: {
    apiUrl: process.env.KALSHI_API_URL || 'https://api.elections.kalshi.com/trade-api/v2',
    wsUrl: process.env.KALSHI_WS_URL || 'wss://api.elections.kalshi.com',
    apiKey: process.env.KALSHI_API_KEY || '',
  },

  dflow: {
    tradeApiUrl: process.env.DFLOW_TRADE_API_URL || 'https://quote-api.dflow.net',
    metadataApiUrl: process.env.DFLOW_METADATA_API_URL || 'https://prediction-markets-api.dflow.net',
    apiKey: process.env.DFLOW_API_KEY || '',
  },

  // Authentication & Security
  auth: {
    jwtSecret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
    encryptionKey: process.env.ENCRYPTION_KEY || 'your-32-byte-encryption-key-here',
    sessionExpiryHours: parseInt(process.env.SESSION_EXPIRY_HOURS || '24', 10),
  },

  // MetaMask SDK Configuration (for frontend reference)
  metamask: {
    // Infura Project ID for MetaMask SDK connection
    infuraProjectId: process.env.METAMASK_INFURA_PROJECT_ID || '',
    // Chain IDs supported for wallet connection
    supportedChainIds: (process.env.METAMASK_SUPPORTED_CHAINS || '1,137').split(',').map(Number),
    // DApp metadata for MetaMask SDK
    dappName: process.env.DAPP_NAME || 'Mimiq Trading Platform',
    dappUrl: process.env.DAPP_URL || 'https://mimiq.trade',
  },

  rateLimit: {
    perSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND || '10', 10),
    gammaApi: parseInt(process.env.RATE_LIMIT_GAMMA_API || '5', 10),
    clobApi: parseInt(process.env.RATE_LIMIT_CLOB_API || '10', 10),
    dataApi: parseInt(process.env.RATE_LIMIT_DATA_API || '5', 10),
    kalshiApi: parseInt(process.env.RATE_LIMIT_KALSHI_API || '5', 10),
    dflowApi: parseInt(process.env.RATE_LIMIT_DFLOW_API || '10', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
