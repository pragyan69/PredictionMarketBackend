// src/modules/trading/database.init.ts

import { clickhouse } from '../../config/clickhouse';

/**
 * Initialize trading-related database tables
 */
export async function initTradingTables(): Promise<void> {
  console.log('📊 Initializing trading database tables...');

  // Sessions table
  await clickhouse.getClient().command({
    query: `
      CREATE TABLE IF NOT EXISTS mimiq_sessions (
        session_id UUID,
        wallet_address String,
        session_token String,

        -- Polymarket credentials (encrypted)
        poly_api_key String DEFAULT '',
        poly_secret String DEFAULT '',
        poly_passphrase String DEFAULT '',
        poly_funder_address String DEFAULT '',
        poly_signature_type UInt8 DEFAULT 0,

        -- Kalshi credentials (encrypted)
        kalshi_api_key_id String DEFAULT '',
        kalshi_private_key String DEFAULT '',

        created_at DateTime64(3) DEFAULT now64(3),
        expires_at DateTime64(3),
        last_activity DateTime64(3) DEFAULT now64(3)
      )
      ENGINE = ReplacingMergeTree(last_activity)
      ORDER BY (wallet_address, session_id)
    `,
  });
  console.log('  ✅ mimiq_sessions table ready');

  // Orders table
  await clickhouse.getClient().command({
    query: `
      CREATE TABLE IF NOT EXISTS mimiq_orders (
        id UUID,
        platform String,
        external_id String,
        client_order_id String,

        user_wallet String,
        market_id String,
        market_name String DEFAULT '',

        side String,
        action String,
        order_type String,
        time_in_force String,

        price Decimal64(6),
        quantity Decimal64(4),
        filled_quantity Decimal64(4) DEFAULT 0,
        remaining_quantity Decimal64(4),

        status String,
        fees_paid Decimal64(6) DEFAULT 0,

        expiration_ts Nullable(DateTime64(3)),
        created_at DateTime64(3) DEFAULT now64(3),
        updated_at DateTime64(3) DEFAULT now64(3),
        filled_at Nullable(DateTime64(3)),

        raw_request String DEFAULT '',
        raw_response String DEFAULT '',
        error_message String DEFAULT ''
      )
      ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (user_wallet, created_at, id)
    `,
  });
  console.log('  ✅ mimiq_orders table ready');

  // Positions table
  await clickhouse.getClient().command({
    query: `
      CREATE TABLE IF NOT EXISTS mimiq_positions (
        id UUID,
        user_wallet String,
        platform String,

        market_id String,
        market_name String DEFAULT '',

        side String,
        quantity Decimal64(4),
        average_price Decimal64(6),
        current_price Decimal64(6) DEFAULT 0,

        cost_basis Decimal64(6) DEFAULT 0,
        market_value Decimal64(6) DEFAULT 0,
        unrealized_pnl Decimal64(6) DEFAULT 0,
        realized_pnl Decimal64(6) DEFAULT 0,

        created_at DateTime64(3) DEFAULT now64(3),
        updated_at DateTime64(3) DEFAULT now64(3)
      )
      ENGINE = ReplacingMergeTree(updated_at)
      ORDER BY (user_wallet, platform, market_id, side)
    `,
  });
  console.log('  ✅ mimiq_positions table ready');

  // Fills table
  await clickhouse.getClient().command({
    query: `
      CREATE TABLE IF NOT EXISTS mimiq_fills (
        id UUID,
        order_id UUID,
        platform String,
        external_fill_id String DEFAULT '',

        user_wallet String,
        market_id String,

        side String,
        action String,

        price Decimal64(6),
        quantity Decimal64(4),
        total_cost Decimal64(6),
        fees Decimal64(6) DEFAULT 0,

        is_taker UInt8 DEFAULT 0,

        executed_at DateTime64(3),
        created_at DateTime64(3) DEFAULT now64(3)
      )
      ENGINE = MergeTree()
      ORDER BY (user_wallet, executed_at, id)
    `,
  });
  console.log('  ✅ mimiq_fills table ready');

  console.log('✅ All trading tables initialized');
}

/**
 * Drop all trading tables (use with caution!)
 */
export async function dropTradingTables(): Promise<void> {
  console.log('⚠️  Dropping trading tables...');

  await clickhouse.getClient().command({ query: 'DROP TABLE IF EXISTS mimiq_sessions' });
  await clickhouse.getClient().command({ query: 'DROP TABLE IF EXISTS mimiq_orders' });
  await clickhouse.getClient().command({ query: 'DROP TABLE IF EXISTS mimiq_positions' });
  await clickhouse.getClient().command({ query: 'DROP TABLE IF EXISTS mimiq_fills' });

  console.log('✅ Trading tables dropped');
}
