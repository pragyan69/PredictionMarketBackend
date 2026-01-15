// src/global.d.ts

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: 'development' | 'production' | 'test';
      PORT: string;
      CLICKHOUSE_HOST: string;
      CLICKHOUSE_PORT: string;
      CLICKHOUSE_USERNAME: string;
      CLICKHOUSE_PASSWORD: string;
      CLICKHOUSE_DATABASE: string;
      POLYMARKET_GAMMA_API_URL: string;
      POLYMARKET_CLOB_API_URL: string;
      POLYMARKET_DATA_API_URL: string;
      POLYMARKET_CLOB_WS_URL: string;
      POLYMARKET_RTDS_WS_URL: string;
      RATE_LIMIT_PER_SECOND: string;
      RATE_LIMIT_GAMMA_API: string;
      RATE_LIMIT_CLOB_API: string;
      RATE_LIMIT_DATA_API: string;
      LOG_LEVEL: string;
    }
  }
}

export {};
