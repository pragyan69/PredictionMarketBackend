-- Polymarket Data Aggregation Pipeline - ClickHouse Schema
-- NOTE: This schema is automatically created by the pipeline when you run it.
-- You do NOT need to run this manually - it's here for reference only.

-- Create database
CREATE DATABASE IF NOT EXISTS polymarket_aggregation;

-- Events table
CREATE TABLE IF NOT EXISTS polymarket_aggregation.polymarket_events (
    id String,
    slug String,
    title String,
    description String,
    start_date DateTime64(3),
    end_date DateTime64(3),
    created_at DateTime64(3),
    market_count UInt32,
    total_volume Float64,
    total_liquidity Float64,
    active_markets UInt32,
    closed_markets UInt32,
    fetched_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(fetched_at)
ORDER BY (id);

-- Markets table
CREATE TABLE IF NOT EXISTS polymarket_aggregation.polymarket_markets (
    id String,
    event_id String,
    slug String,
    question String,
    description String,
    condition_id String,
    market_type String,
    outcomes Array(String),
    outcome_prices Array(Float64),
    clob_token_ids Array(String),
    best_bid Float64,
    best_ask Float64,
    mid_price Float64,
    spread Float64,
    orderbook_bid_depth Float64,
    orderbook_ask_depth Float64,
    volume Float64,
    liquidity Float64,
    volume_24h Float64,
    trades_24h UInt32,
    unique_traders_24h UInt32,
    active UInt8,
    closed UInt8,
    start_date DateTime64(3),
    end_date DateTime64(3),
    created_at DateTime64(3),
    fetched_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(fetched_at)
ORDER BY (id);

-- Traders table (from leaderboard)
CREATE TABLE IF NOT EXISTS polymarket_aggregation.polymarket_traders (
    user_address String,
    rank UInt32,
    total_pnl Float64,
    total_volume Float64,
    markets_traded UInt32,
    win_rate Float64,
    avg_position_size Float64,
    fetched_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(fetched_at)
ORDER BY (user_address);

-- Trader positions table
CREATE TABLE IF NOT EXISTS polymarket_aggregation.polymarket_trader_positions (
    user_address String,
    market_id String,
    asset_id String,
    size Float64,
    entry_price Float64,
    current_price Float64,
    pnl Float64,
    position_updated_at DateTime64(3),
    fetched_at DateTime64(3) DEFAULT now64(3)
) ENGINE = ReplacingMergeTree(fetched_at)
ORDER BY (user_address, market_id, asset_id);

-- Pipeline runs tracking table
CREATE TABLE IF NOT EXISTS polymarket_aggregation.polymarket_pipeline_runs (
    id String,
    status String,
    started_at DateTime64(3),
    completed_at Nullable(DateTime64(3)),
    events_fetched UInt32 DEFAULT 0,
    markets_fetched UInt32 DEFAULT 0,
    traders_fetched UInt32 DEFAULT 0,
    positions_fetched UInt32 DEFAULT 0,
    error_message String DEFAULT ''
) ENGINE = MergeTree()
ORDER BY (started_at, id);
