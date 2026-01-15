// src/config/env.ts

import dotenv from 'dotenv';

dotenv.config();

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  
  clickhouse: {
    host: process.env.CLICKHOUSE_HOST || 'localhost',
    port: parseInt(process.env.CLICKHOUSE_PORT || '9000', 10),
    username: process.env.CLICKHOUSE_USERNAME || 'default',
    password: process.env.CLICKHOUSE_PASSWORD || '',
    database: process.env.CLICKHOUSE_DATABASE || 'drift_data',
  },
  
  polymarket: {
    gammaApiUrl: process.env.POLYMARKET_GAMMA_API_URL || 'https://gamma-api.polymarket.com',
    clobApiUrl: process.env.POLYMARKET_CLOB_API_URL || 'https://clob.polymarket.com',
    dataApiUrl: process.env.POLYMARKET_DATA_API_URL || 'https://data-api.polymarket.com',
    clobWsUrl: process.env.POLYMARKET_CLOB_WS_URL || 'wss://ws-subscriptions-clob.polymarket.com/ws',
    rtdsWsUrl: process.env.POLYMARKET_RTDS_WS_URL || 'wss://ws-live-data.polymarket.com',
  },
  
  rateLimit: {
    perSecond: parseInt(process.env.RATE_LIMIT_PER_SECOND || '10', 10),
    gammaApi: parseInt(process.env.RATE_LIMIT_GAMMA_API || '5', 10),
    clobApi: parseInt(process.env.RATE_LIMIT_CLOB_API || '10', 10),
    dataApi: parseInt(process.env.RATE_LIMIT_DATA_API || '5', 10),
  },
  
  logging: {
    level: process.env.LOG_LEVEL || 'info',
  },
};
