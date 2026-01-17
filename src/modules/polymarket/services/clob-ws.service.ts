// src/modules/polymarket/services/clob-ws.service.ts
// WebSocket service for real-time trade updates from Polymarket

import WebSocket from 'ws';
import { env } from '../../../config/env';
import { polymarketDb } from './database.init';

const MARKET_CHANNEL = 'market';
const WS_URL = env.polymarket.clobWsUrl || 'wss://ws-subscriptions-clob.polymarket.com/ws';

interface LastTradeMessage {
  event_type: 'last_trade_price';
  asset_id: string;
  market: string; // condition_id
  price: string;
  size: string;
  side: 'BUY' | 'SELL';
  fee_rate_bps: string;
  timestamp: string;
}

interface BookMessage {
  event_type: 'book';
  asset_id: string;
  market: string;
  bids: Array<{ price: string; size: string }>;
  asks: Array<{ price: string; size: string }>;
  timestamp: string;
  hash: string;
}

interface PriceChangeMessage {
  event_type: 'price_change';
  market: string;
  price_changes: Array<{
    asset_id: string;
    price: string;
    size: string;
    side: string;
    best_bid: string;
    best_ask: string;
  }>;
  timestamp: string;
}

interface NewMarketMessage {
  event_type: 'new_market';
  id: string;
  question: string;
  market: string;
  slug: string;
  assets_ids: string[];
  outcomes: string[];
  timestamp: string;
}

type WSMessage = LastTradeMessage | BookMessage | PriceChangeMessage | NewMarketMessage;

export class CLOBWebSocketService {
  private ws: WebSocket | null = null;
  private subscribedAssetIds: Set<string> = new Set();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  // Stats
  private stats = {
    tradesReceived: 0,
    tradesStored: 0,
    errors: 0,
    lastTradeAt: null as Date | null,
  };

  /**
   * Connect to the WebSocket
   */
  connect(): void {
    if (this.ws && this.isConnected) {
      console.log('⚠️ CLOB WebSocket already connected');
      return;
    }

    const wsUrl = `${WS_URL}/${MARKET_CHANNEL}`;
    console.log(`🔌 Connecting to CLOB WebSocket: ${wsUrl}`);

    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log('✅ CLOB WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Start ping interval to keep connection alive
      this.startPing();

      // Re-subscribe to previously subscribed assets
      if (this.subscribedAssetIds.size > 0) {
        this.subscribeToAssets(Array.from(this.subscribedAssetIds));
      }
    });

    this.ws.on('message', (data) => this.handleMessage(data));

    this.ws.on('error', (error) => {
      console.error('❌ CLOB WebSocket error:', error.message);
      this.stats.errors++;
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 CLOB WebSocket closed: ${code} - ${reason}`);
      this.isConnected = false;
      this.stopPing();

      // Attempt reconnect
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`🔄 Reconnecting in ${this.reconnectDelay / 1000}s (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
        setTimeout(() => this.connect(), this.reconnectDelay);
      } else {
        console.error('❌ Max reconnect attempts reached');
      }
    });
  }

  /**
   * Subscribe to asset IDs (token IDs) for market updates
   */
  subscribeToAssets(assetIds: string[]): void {
    if (!this.ws || !this.isConnected) {
      console.log('⚠️ WebSocket not connected. Storing asset IDs for later subscription.');
      assetIds.forEach(id => this.subscribedAssetIds.add(id));
      return;
    }

    const message = {
      assets_ids: assetIds,
      type: MARKET_CHANNEL,
      custom_feature_enabled: true, // Enable new_market and market_resolved events
    };

    console.log(`📤 Subscribing to ${assetIds.length} assets...`);
    this.ws.send(JSON.stringify(message));

    assetIds.forEach(id => this.subscribedAssetIds.add(id));
  }

  /**
   * Subscribe to more assets (after initial connection)
   */
  subscribeToMoreAssets(assetIds: string[]): void {
    if (!this.ws || !this.isConnected) {
      console.log('⚠️ WebSocket not connected');
      return;
    }

    const message = {
      assets_ids: assetIds,
      operation: 'subscribe',
    };

    console.log(`📤 Subscribing to ${assetIds.length} more assets...`);
    this.ws.send(JSON.stringify(message));

    assetIds.forEach(id => this.subscribedAssetIds.add(id));
  }

  /**
   * Unsubscribe from assets
   */
  unsubscribeFromAssets(assetIds: string[]): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    const message = {
      assets_ids: assetIds,
      operation: 'unsubscribe',
    };

    this.ws.send(JSON.stringify(message));
    assetIds.forEach(id => this.subscribedAssetIds.delete(id));
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const messageStr = data.toString();

      // Handle PONG
      if (messageStr === 'PONG') {
        return;
      }

      const message = JSON.parse(messageStr) as WSMessage;

      switch (message.event_type) {
        case 'last_trade_price':
          await this.handleTrade(message);
          break;

        case 'book':
          // Orderbook update - can be used to update local orderbook state
          console.log(`📊 Book update: ${message.market} - ${message.bids?.length || 0} bids, ${message.asks?.length || 0} asks`);
          break;

        case 'price_change':
          // Price level change - can be used for real-time price updates
          break;

        case 'new_market':
          console.log(`🆕 New market: ${message.question} (${message.market})`);
          break;

        default:
          // Unknown event type
          console.log(`📨 Unknown event: ${(message as any).event_type}`);
      }
    } catch (error) {
      console.error('❌ Error handling WebSocket message:', error);
      this.stats.errors++;
    }
  }

  /**
   * Handle trade (last_trade_price) event and store in ClickHouse
   */
  private async handleTrade(trade: LastTradeMessage): Promise<void> {
    this.stats.tradesReceived++;
    this.stats.lastTradeAt = new Date();

    try {
      // Transform to our trade format
      const enrichedTrade = {
        id: `ws-${trade.market}-${trade.timestamp}-${trade.asset_id.substring(0, 8)}`,
        market_id: trade.market,
        condition_id: trade.market,
        asset: trade.asset_id,
        user_address: '', // Not available in market channel
        side: trade.side,
        price: parseFloat(trade.price),
        size: parseFloat(trade.size),
        timestamp: new Date(parseInt(trade.timestamp)),
        transaction_hash: '',
        outcome: '',
        outcome_index: 0,
        title: '',
        slug: '',
        event_slug: '',
        fetched_at: new Date(),
      };

      // Store in ClickHouse
      await polymarketDb.insert('polymarket_trades', [enrichedTrade]);
      this.stats.tradesStored++;

      // Log every 100 trades
      if (this.stats.tradesStored % 100 === 0) {
        console.log(`💾 WebSocket trades stored: ${this.stats.tradesStored} (received: ${this.stats.tradesReceived})`);
      }
    } catch (error) {
      console.error('❌ Error storing WebSocket trade:', error);
      this.stats.errors++;
    }
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.send('PING');
      }
    }, 5000); // Ping every 5 seconds as recommended
  }

  /**
   * Stop ping interval
   */
  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    this.stopPing();
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    console.log('🔌 CLOB WebSocket disconnected');
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    subscribedAssets: number;
    stats: { tradesReceived: number; tradesStored: number; errors: number; lastTradeAt: Date | null };
  } {
    return {
      isConnected: this.isConnected,
      subscribedAssets: this.subscribedAssetIds.size,
      stats: { ...this.stats },
    };
  }

  /**
   * Subscribe to all active markets from the database
   */
  async subscribeToActiveMarkets(): Promise<void> {
    try {
      // Get all unique asset IDs from markets table
      const result = await polymarketDb.query<{ clob_token_ids: string[] }>(
        `SELECT DISTINCT clob_token_ids FROM polymarket_aggregation.polymarket_markets WHERE active = 1`
      );

      const assetIds: string[] = [];
      for (const row of result) {
        if (row.clob_token_ids && Array.isArray(row.clob_token_ids)) {
          assetIds.push(...row.clob_token_ids);
        }
      }

      if (assetIds.length > 0) {
        console.log(`📊 Found ${assetIds.length} asset IDs from active markets`);
        // Subscribe in batches to avoid overwhelming the WebSocket
        const batchSize = 100;
        for (let i = 0; i < assetIds.length; i += batchSize) {
          const batch = assetIds.slice(i, i + batchSize);
          this.subscribeToAssets(batch);
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        console.log('⚠️ No active markets found to subscribe to');
      }
    } catch (error) {
      console.error('❌ Error subscribing to active markets:', error);
    }
  }
}

export const clobWsService = new CLOBWebSocketService();
