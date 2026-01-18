// src/modules/kalshi/services/kalshi-ws.service.ts
// WebSocket service for real-time data from Kalshi

import WebSocket from 'ws';
import { env } from '../../../config/env';
import { kalshiDb } from './database.init';
import { kalshiTradeTransformer } from './transformers';
import {
  KalshiWSMessage,
  KalshiWSSubscribeCommand,
  KalshiWSUnsubscribeCommand,
  KalshiWSUpdateSubscriptionCommand,
  KalshiWSTickerUpdate,
  KalshiWSOrderbookSnapshotMessage,
  KalshiWSOrderbookDeltaMessage,
  KalshiWSTradeMessage,
  KalshiWSMarketLifecycleMessage,
  KalshiWSEventLifecycleMessage,
  KalshiOrderbookSnapshot,
} from '../types/kalshi.types';
import { KalshiOrderbookSummary, KalshiWSChannel } from '../types/aggregation.types';

const WS_URL = env.kalshi?.wsUrl || 'wss://api.elections.kalshi.com';

interface Subscription {
  sid: number;
  channel: KalshiWSChannel;
  marketTickers: Set<string>;
}

export class KalshiWebSocketService {
  private ws: WebSocket | null = null;
  private subscriptions: Map<number, Subscription> = new Map();
  private commandIdCounter = 1;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 5000;
  private pingInterval: NodeJS.Timeout | null = null;
  private isConnected = false;

  // Local orderbook state
  private orderbooks: Map<string, KalshiOrderbookSnapshot> = new Map();

  // Stats
  private stats = {
    tradesReceived: 0,
    tradesStored: 0,
    tickerUpdates: 0,
    orderbookUpdates: 0,
    errors: 0,
    lastTradeAt: null as Date | null,
  };

  /**
   * Connect to the Kalshi WebSocket
   */
  connect(): void {
    if (this.ws && this.isConnected) {
      console.log('⚠️ Kalshi WebSocket already connected');
      return;
    }

    console.log(`🔌 Connecting to Kalshi WebSocket: ${WS_URL}`);

    this.ws = new WebSocket(WS_URL);

    this.ws.on('open', () => {
      console.log('✅ Kalshi WebSocket connected');
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Start ping interval to keep connection alive
      this.startPing();

      // Re-subscribe to previously subscribed channels
      for (const sub of this.subscriptions.values()) {
        this.subscribe([sub.channel], Array.from(sub.marketTickers));
      }
    });

    this.ws.on('message', (data) => this.handleMessage(data));

    this.ws.on('error', (error) => {
      console.error('❌ Kalshi WebSocket error:', error.message);
      this.stats.errors++;
    });

    this.ws.on('close', (code, reason) => {
      console.log(`🔌 Kalshi WebSocket closed: ${code} - ${reason}`);
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

    // Handle ping frames from Kalshi (sent every 10 seconds)
    this.ws.on('ping', (data) => {
      if (this.ws) {
        this.ws.pong(data);
      }
    });
  }

  /**
   * Subscribe to channels
   */
  subscribe(
    channels: KalshiWSChannel[],
    marketTickers?: string[],
    sendInitialSnapshot: boolean = true
  ): void {
    if (!this.ws || !this.isConnected) {
      console.log('⚠️ WebSocket not connected. Cannot subscribe.');
      return;
    }

    const command: KalshiWSSubscribeCommand = {
      id: this.commandIdCounter++,
      cmd: 'subscribe',
      params: {
        channels,
        ...(marketTickers && marketTickers.length === 1 && { market_ticker: marketTickers[0] }),
        ...(marketTickers && marketTickers.length > 1 && { market_tickers: marketTickers }),
        send_initial_snapshot: sendInitialSnapshot,
      },
    };

    console.log(`📤 Subscribing to channels: ${channels.join(', ')} ${marketTickers ? `for ${marketTickers.length} markets` : ''}`);
    this.ws.send(JSON.stringify(command));
  }

  /**
   * Unsubscribe from subscriptions by SID
   */
  unsubscribe(sids: number[]): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    const command: KalshiWSUnsubscribeCommand = {
      id: this.commandIdCounter++,
      cmd: 'unsubscribe',
      params: { sids },
    };

    this.ws.send(JSON.stringify(command));
    sids.forEach(sid => this.subscriptions.delete(sid));
  }

  /**
   * Update subscription to add/remove markets
   */
  updateSubscription(
    sid: number,
    action: 'add_markets' | 'delete_markets',
    marketTickers: string[],
    sendInitialSnapshot: boolean = true
  ): void {
    if (!this.ws || !this.isConnected) {
      return;
    }

    const command: KalshiWSUpdateSubscriptionCommand = {
      id: this.commandIdCounter++,
      cmd: 'update_subscription',
      params: {
        sid,
        ...(marketTickers.length === 1 && { market_ticker: marketTickers[0] }),
        ...(marketTickers.length > 1 && { market_tickers: marketTickers }),
        action,
        send_initial_snapshot: sendInitialSnapshot,
      },
    };

    this.ws.send(JSON.stringify(command));

    // Update local subscription state
    const sub = this.subscriptions.get(sid);
    if (sub) {
      if (action === 'add_markets') {
        marketTickers.forEach(t => sub.marketTickers.add(t));
      } else {
        marketTickers.forEach(t => sub.marketTickers.delete(t));
      }
    }
  }

  /**
   * Handle incoming WebSocket message
   */
  private async handleMessage(data: WebSocket.Data): Promise<void> {
    try {
      const messageStr = data.toString();

      // Handle heartbeat (ping frame response)
      if (messageStr === 'heartbeat') {
        return;
      }

      const message = JSON.parse(messageStr) as KalshiWSMessage;

      switch (message.type) {
        case 'subscribed':
          this.handleSubscribed(message);
          break;

        case 'unsubscribed':
          console.log(`📤 Unsubscribed from SID: ${message.sid}`);
          this.subscriptions.delete(message.sid);
          break;

        case 'ok':
          // Successful update
          break;

        case 'error':
          console.error('❌ Kalshi WS Error:', message.msg);
          this.stats.errors++;
          break;

        case 'ticker':
          await this.handleTicker(message as KalshiWSTickerUpdate);
          break;

        case 'orderbook_snapshot':
          this.handleOrderbookSnapshot(message as KalshiWSOrderbookSnapshotMessage);
          break;

        case 'orderbook_delta':
          this.handleOrderbookDelta(message as KalshiWSOrderbookDeltaMessage);
          break;

        case 'trade':
          await this.handleTrade(message as KalshiWSTradeMessage);
          break;

        case 'market_lifecycle_v2':
          this.handleMarketLifecycle(message as KalshiWSMarketLifecycleMessage);
          break;

        case 'event_lifecycle':
          this.handleEventLifecycle(message as KalshiWSEventLifecycleMessage);
          break;

        default:
          console.log(`📨 Unknown Kalshi WS event: ${(message as any).type}`);
      }
    } catch (error) {
      console.error('❌ Error handling Kalshi WebSocket message:', error);
      this.stats.errors++;
    }
  }

  /**
   * Handle subscribed response
   */
  private handleSubscribed(message: { type: 'subscribed'; msg: { channel: string; sid: number } }): void {
    const { channel, sid } = message.msg;
    console.log(`✅ Subscribed to ${channel} (SID: ${sid})`);

    this.subscriptions.set(sid, {
      sid,
      channel: channel as KalshiWSChannel,
      marketTickers: new Set(),
    });
  }

  /**
   * Handle ticker update
   */
  private async handleTicker(message: KalshiWSTickerUpdate): Promise<void> {
    this.stats.tickerUpdates++;

    // Ticker updates can be used to update local market state
    // For now, just log periodically
    if (this.stats.tickerUpdates % 100 === 0) {
      console.log(`📊 Kalshi ticker updates received: ${this.stats.tickerUpdates}`);
    }
  }

  /**
   * Handle orderbook snapshot
   */
  private handleOrderbookSnapshot(message: KalshiWSOrderbookSnapshotMessage): void {
    const { msg } = message;
    this.orderbooks.set(msg.market_ticker, msg);
    this.stats.orderbookUpdates++;

    console.log(`📊 Orderbook snapshot: ${msg.market_ticker} - ${msg.yes?.length || 0} yes levels, ${msg.no?.length || 0} no levels`);
  }

  /**
   * Handle orderbook delta
   */
  private handleOrderbookDelta(message: KalshiWSOrderbookDeltaMessage): void {
    const { msg } = message;
    const orderbook = this.orderbooks.get(msg.market_ticker);

    if (orderbook) {
      // Apply delta to local orderbook state
      const side = msg.side === 'yes' ? 'yes' : 'no';
      const levels = orderbook[side] || [];

      // Find existing level or add new one
      const levelIndex = levels.findIndex(([price]) => price === msg.price);

      if (levelIndex >= 0) {
        // Update existing level
        const newContracts = levels[levelIndex][1] + msg.delta;
        if (newContracts <= 0) {
          // Remove level if contracts go to 0 or below
          levels.splice(levelIndex, 1);
        } else {
          levels[levelIndex][1] = newContracts;
        }
      } else if (msg.delta > 0) {
        // Add new level
        levels.push([msg.price, msg.delta]);
        // Sort by price
        levels.sort((a, b) => b[0] - a[0]); // Descending for bids, need to check side
      }

      this.stats.orderbookUpdates++;
    }
  }

  /**
   * Handle trade event and store in ClickHouse
   */
  private async handleTrade(message: KalshiWSTradeMessage): Promise<void> {
    this.stats.tradesReceived++;
    this.stats.lastTradeAt = new Date();

    try {
      // Transform to our trade format
      const enrichedTrade = kalshiTradeTransformer.transformTrade(message.msg);

      // Store in ClickHouse
      await kalshiDb.insert('trades', [enrichedTrade]);
      this.stats.tradesStored++;

      // Log every 100 trades
      if (this.stats.tradesStored % 100 === 0) {
        console.log(`💾 Kalshi WebSocket trades stored: ${this.stats.tradesStored} (received: ${this.stats.tradesReceived})`);
      }
    } catch (error) {
      console.error('❌ Error storing Kalshi WebSocket trade:', error);
      this.stats.errors++;
    }
  }

  /**
   * Handle market lifecycle event
   */
  private handleMarketLifecycle(message: KalshiWSMarketLifecycleMessage): void {
    const { msg } = message;
    console.log(`🔄 Market lifecycle: ${msg.market_ticker} - ${msg.event_type}`);

    // Can trigger market refresh or notifications here
  }

  /**
   * Handle event lifecycle event
   */
  private handleEventLifecycle(message: KalshiWSEventLifecycleMessage): void {
    const { msg } = message;
    console.log(`🔄 Event lifecycle: ${msg.event_ticker} - ${msg.title}`);

    // Can trigger event refresh or notifications here
  }

  /**
   * Get orderbook summary for a market
   */
  getOrderbookSummary(ticker: string): KalshiOrderbookSummary | null {
    const orderbook = this.orderbooks.get(ticker);
    if (!orderbook) return null;

    const yesLevels = orderbook.yes || [];
    const noLevels = orderbook.no || [];
    const yesDollarLevels = orderbook.yes_dollars || [];
    const noDollarLevels = orderbook.no_dollars || [];

    // Get best bid/ask from dollar levels if available
    const bestBid = yesDollarLevels.length > 0 ? parseFloat(yesDollarLevels[0][0]) : (yesLevels.length > 0 ? yesLevels[0][0] / 100 : 0);
    const bestAsk = noDollarLevels.length > 0 ? (1 - parseFloat(noDollarLevels[0][0])) : (noLevels.length > 0 ? 1 - noLevels[0][0] / 100 : 1);

    const bidDepth = yesLevels.reduce((sum, [_, contracts]) => sum + contracts, 0);
    const askDepth = noLevels.reduce((sum, [_, contracts]) => sum + contracts, 0);

    return {
      ticker,
      bestBid,
      bestAsk,
      midPrice: (bestBid + bestAsk) / 2,
      spread: bestAsk - bestBid,
      bidDepth,
      askDepth,
      timestamp: new Date(),
    };
  }

  /**
   * Start ping interval to keep connection alive
   */
  private startPing(): void {
    this.stopPing();
    // Kalshi sends ping every 10 seconds, we respond with pong automatically
    // We can also send our own pings if needed
    this.pingInterval = setInterval(() => {
      if (this.ws && this.isConnected) {
        this.ws.ping();
      }
    }, 30000); // Ping every 30 seconds as backup
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
    this.subscriptions.clear();
    console.log('🔌 Kalshi WebSocket disconnected');
  }

  /**
   * Get connection status
   */
  getStatus(): {
    isConnected: boolean;
    subscriptions: number;
    stats: { tradesReceived: number; tradesStored: number; tickerUpdates: number; orderbookUpdates: number; errors: number; lastTradeAt: Date | null };
  } {
    return {
      isConnected: this.isConnected,
      subscriptions: this.subscriptions.size,
      stats: { ...this.stats },
    };
  }

  /**
   * Subscribe to all active markets from the database
   */
  async subscribeToActiveMarkets(): Promise<void> {
    try {
      // Get all unique market tickers from markets table
      const result = await kalshiDb.query<{ id: string }>(
        `SELECT DISTINCT id FROM prediction_market.markets WHERE protocol = 'kalshi' AND active = 1`
      );

      const marketTickers = result.map(row => row.id);

      if (marketTickers.length > 0) {
        console.log(`📊 Found ${marketTickers.length} active Kalshi markets`);

        // Subscribe to channels in batches
        const batchSize = 100;
        for (let i = 0; i < marketTickers.length; i += batchSize) {
          const batch = marketTickers.slice(i, i + batchSize);

          // Subscribe to orderbook updates
          this.subscribe(['orderbook_delta'], batch);

          // Subscribe to ticker updates
          this.subscribe(['ticker'], batch);

          // Subscribe to trade updates
          this.subscribe(['trade'], batch);

          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        console.log('⚠️ No active Kalshi markets found to subscribe to');
      }
    } catch (error) {
      console.error('❌ Error subscribing to active markets:', error);
    }
  }

  /**
   * Subscribe to market lifecycle and event lifecycle
   */
  subscribeToLifecycleEvents(): void {
    this.subscribe(['market_lifecycle_v2']);
    this.subscribe(['event_lifecycle']);
  }
}

export const kalshiWsService = new KalshiWebSocketService();
