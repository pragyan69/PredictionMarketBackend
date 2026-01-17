// src/modules/polymarket/services/aggregation.pipeline.ts

import crypto from 'crypto';
import { polymarketDb } from './database.init';
import { GammaEvent, GammaMarket, getClobTokenIds } from '../types/gamma.types';
import {
  PipelineConfig,
  PipelineStatus,
  PipelinePhase,
  PipelineProgress,
  OrderbookSummary,
  LeaderboardEntry,
} from '../types/aggregation.types';

import {
  eventFetcher,
  marketFetcher,
  priceFetcher,
  orderbookFetcher,
  traderFetcher,
  tradesFetcher,
  EnrichedTrade,
} from './fetchers';

import {
  eventTransformer,
  marketTransformer,
  traderTransformer,
} from './transformers';

// ========================================
// TEST LIMITS LOCATION: Change these values for testing vs production
// Set to 0 for unlimited (production mode)
// ========================================
const DEFAULT_CONFIG: PipelineConfig = {
  topTradersLimit: 100, // Limit traders to avoid too many position fetches
  enableOrderbookFetch: true,
  enableMarketActivity: false, // Disable since we're fetching trades directly
  enableTraderPositions: false, // Disable for faster execution

  // TEST LIMITS (set to 0 for production/unlimited)
  maxEvents: 1000,        // 0 = unlimited | Testing: 1000
  maxMarkets: 10000,      // 0 = unlimited | Testing: 10000
  maxTotalTrades: 100000, // 0 = unlimited | Testing: 100000
};

export class AggregationPipeline {
  private status: PipelineStatus;
  private config: PipelineConfig;

  // Raw data
  private events: GammaEvent[] = [];
  private markets: GammaMarket[] = [];
  private activeMarkets: GammaMarket[] = [];
  private priceMap: Map<string, number> = new Map();
  private orderbookMap: Map<string, OrderbookSummary> = new Map();
  private tradesMap: Map<string, EnrichedTrade[]> = new Map();
  private traders: LeaderboardEntry[] = [];

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.status = this.createInitialStatus();
  }

  private createInitialStatus(): PipelineStatus {
    return {
      runId: '',
      isRunning: false,
      currentPhase: PipelinePhase.IDLE,
      progress: this.createEmptyProgress(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
  }

  private createEmptyProgress(): PipelineProgress {
    return {
      eventsFetched: 0,
      marketsFetched: 0,
      activeMarkets: 0,
      pricesFetched: 0,
      orderbooksFetched: 0,
      marketActivityFetched: 0,
      tradesFetched: 0,
      tradersFetched: 0,
      positionsFetched: 0,
      eventsStored: 0,
      marketsStored: 0,
      tradesStored: 0,
      tradersStored: 0,
      positionsStored: 0,
    };
  }

  /**
   * Start the aggregation pipeline
   */
  async start(config?: Partial<PipelineConfig>): Promise<string> {
    if (this.status.isRunning) {
      throw new Error('Pipeline is already running');
    }

    // Reset state
    this.reset();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status.runId = crypto.randomUUID();
    this.status.isRunning = true;
    this.status.startedAt = new Date();
    this.status.errorMessage = null;

    console.log(`🚀 Starting Aggregation Pipeline (runId: ${this.status.runId})`);
    console.log('📋 Config:', this.config);
    console.log('📋 Mode: ACTIVE MARKETS + TRADES (incremental storage)');

    // Record pipeline run start
    await this.recordPipelineStart();

    // Run pipeline asynchronously
    this.runPipeline().catch(error => {
      console.error('❌ Pipeline failed:', error);
      this.status.currentPhase = PipelinePhase.FAILED;
      this.status.errorMessage = error.message || 'Unknown error';
      this.status.isRunning = false;
      this.status.completedAt = new Date();
      this.recordPipelineEnd();
    });

    return this.status.runId;
  }

  /**
   * Get current pipeline status
   */
  getStatus(): PipelineStatus {
    return { ...this.status };
  }

  /**
   * Reset pipeline state
   */
  private reset(): void {
    this.events = [];
    this.markets = [];
    this.activeMarkets = [];
    this.priceMap = new Map();
    this.orderbookMap = new Map();
    this.tradesMap = new Map();
    this.traders = [];
    this.status.progress = this.createEmptyProgress();
  }

  /**
   * Main pipeline execution
   * Focus: Active markets + Trades
   */
  private async runPipeline(): Promise<void> {
    try {
      // Phase 0: Initialize database
      console.log('🔧 Phase 0: Initializing database...');
      await polymarketDb.initialize();
      console.log('✅ Phase 0 complete: Database initialized');

      // Phase 1: Fetch events
      await this.fetchEvents();

      // Phase 2: Fetch markets and filter to active only
      await this.fetchMarketsAndFilterActive();

      // 💾 Store markets immediately
      await this.storeMarketsIncremental();

      // 💾 Store events (needs markets for aggregation)
      await this.storeEventsIncremental();

      // Phase 3: Fetch trades for each active market
      await this.fetchTradesForActiveMarkets();

      // Phase 4: Fetch orderbooks (optional, for price data)
      if (this.config.enableOrderbookFetch) {
        await this.fetchOrderbooksForActiveMarkets();
      }

      // Phase 5: Fetch traders (leaderboard)
      await this.fetchTraders();
      await this.storeTradersIncremental();

      // Complete
      this.status.currentPhase = PipelinePhase.COMPLETED;
      this.status.isRunning = false;
      this.status.completedAt = new Date();

      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ Aggregation Pipeline COMPLETED');
      console.log('═══════════════════════════════════════════════════');
      console.log(`📊 Events: ${this.status.progress.eventsStored}`);
      console.log(`📊 Markets: ${this.status.progress.marketsStored} (${this.status.progress.activeMarkets} active)`);
      console.log(`📊 Trades: ${this.status.progress.tradesStored}`);
      console.log(`📊 Traders: ${this.status.progress.tradersStored}`);
      console.log('═══════════════════════════════════════════════════');

      await this.recordPipelineEnd();

    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // FETCH PHASES
  // ============================================

  /**
   * Phase 1: Fetch events from Gamma (active only)
   * LIMIT APPLIED: config.maxEvents (0 = unlimited)
   */
  private async fetchEvents(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_EVENTS;
    const limit = this.config.maxEvents || 0;
    console.log(`📥 Phase 1: Fetching ACTIVE events... ${limit > 0 ? `(LIMIT: ${limit})` : '(unlimited)'}`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active events (active=true, closed=false)
    let events = await eventFetcher.fetchAllEvents(true);

    // Apply limit if set
    if (limit > 0 && events.length > limit) {
      console.log(`   ⚠️ LIMIT APPLIED: Reducing from ${events.length} to ${limit} events`);
      events = events.slice(0, limit);
    }

    this.events = events;
    this.status.progress.eventsFetched = this.events.length;

    // Debug verification
    console.log(`📊 VERIFICATION - Events:`);
    console.log(`   • Array length: ${this.events.length}`);
    console.log(`   • First 3 event IDs: ${this.events.slice(0, 3).map(e => e.id).join(', ')}`);
    if (this.events.length > 0) {
      console.log(`   • First event title: ${this.events[0].title}`);
      console.log(`   • Memory check: ${JSON.stringify(this.events[0] || {}).length} bytes for first event`);
    }
    console.log('═══════════════════════════════════════════════════');

    console.log(`✅ Phase 1 complete: ${this.events.length} active events`);
  }

  /**
   * Phase 2: Fetch ACTIVE markets directly from API (active=true, closed=false)
   * LIMIT APPLIED: config.maxMarkets (0 = unlimited)
   */
  private async fetchMarketsAndFilterActive(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKETS;
    const limit = this.config.maxMarkets || 0;
    console.log(`📥 Phase 2: Fetching ACTIVE markets... ${limit > 0 ? `(LIMIT: ${limit})` : '(unlimited)'}`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active markets directly from API (active=true, closed=false)
    let markets = await marketFetcher.fetchAllMarkets(true);

    // Apply limit if set
    if (limit > 0 && markets.length > limit) {
      console.log(`   ⚠️ LIMIT APPLIED: Reducing from ${markets.length} to ${limit} markets`);
      markets = markets.slice(0, limit);
    }

    this.activeMarkets = markets;
    this.markets = this.activeMarkets; // For compatibility
    this.status.progress.marketsFetched = this.activeMarkets.length;
    this.status.progress.activeMarkets = this.activeMarkets.length;

    // Debug verification
    console.log(`📊 VERIFICATION - Active Markets (from API):`);
    console.log(`   • Total fetched: ${this.activeMarkets.length}`);
    if (this.activeMarkets.length > 0) {
      console.log(`   • First 3 market IDs: ${this.activeMarkets.slice(0, 3).map(m => m.id).join(', ')}`);
      console.log(`   • First 3 conditionIds: ${this.activeMarkets.slice(0, 3).map(m => m.conditionId || 'N/A').join(', ')}`);
      console.log(`   • First market title: ${this.activeMarkets[0].question}`);
      console.log(`   • First market sample: ${JSON.stringify(this.activeMarkets[0] || {}, null, 2).substring(0, 500)}`);
    } else {
      console.log(`   ⚠️ No active markets found!`);
    }
    console.log('═══════════════════════════════════════════════════');

    console.log(`✅ Phase 2 complete: ${this.activeMarkets.length} ACTIVE markets fetched`);
  }

  /**
   * Phase 3: Fetch trades for each active market
   * LIMIT APPLIED: config.maxTotalTrades (0 = unlimited)
   */
  private async fetchTradesForActiveMarkets(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKET_ACTIVITY; // Reuse phase
    const maxTrades = this.config.maxTotalTrades || 0;
    console.log(`📥 Phase 3: Fetching trades... ${maxTrades > 0 ? `(LIMIT: ${maxTrades})` : '(unlimited)'}`);
    console.log('═══════════════════════════════════════════════════');

    // Get condition IDs of active markets
    const conditionIds = this.activeMarkets
      .filter((m): m is GammaMarket & { conditionId: string } => !!m.conditionId)
      .map(m => m.conditionId);

    console.log(`📊 VERIFICATION - Condition IDs:`);
    console.log(`   • Total active markets: ${this.activeMarkets.length}`);
    console.log(`   • Markets with conditionId: ${conditionIds.length}`);
    console.log(`   • First 5 conditionIds: ${conditionIds.slice(0, 5).join(', ')}`);
    console.log('═══════════════════════════════════════════════════');

    console.log(`  Found ${conditionIds.length} active markets with condition IDs`);

    // Fetch trades with progress callback
    let lastStoredCount = 0;
    const STORE_BATCH_SIZE = 1000; // Store every 1000 trades
    let limitReached = false;

    this.tradesMap = await tradesFetcher.fetchTradesForMarkets(
      conditionIds,
      100, // 100 trades per market
      async (_marketsDone, totalTrades, currentTradesMap) => {
        this.status.progress.tradesFetched = totalTrades;

        // Update this.tradesMap with current progress so storeTradesIncremental can access it
        this.tradesMap = currentTradesMap;

        // Check if limit reached
        if (maxTrades > 0 && totalTrades >= maxTrades && !limitReached) {
          limitReached = true;
          console.log(`   ⚠️ LIMIT REACHED: ${maxTrades} trades - stopping fetch`);
        }

        // Store trades incrementally every STORE_BATCH_SIZE trades
        if (totalTrades - lastStoredCount >= STORE_BATCH_SIZE) {
          await this.storeTradesIncremental();
          lastStoredCount = this.status.progress.tradesStored;
          console.log(`  💾 Incremental store: ${lastStoredCount} trades stored, ${totalTrades} fetched`);
        }

        // Return true to signal stop if limit reached
        return limitReached;
      },
      maxTrades // Pass the limit to the fetcher
    );

    // Store any remaining trades
    await this.storeTradesIncremental();

    console.log(`✅ Phase 3 complete: ${this.status.progress.tradesFetched} trades fetched, ${this.status.progress.tradesStored} stored`);
  }

  /**
   * Phase 4: Fetch orderbooks for active markets
   */
  private async fetchOrderbooksForActiveMarkets(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_ORDERBOOKS;
    console.log('📥 Phase 4: Fetching orderbooks for active markets...');

    // Get token IDs from active markets
    const tokenIds: string[] = [];
    for (const market of this.activeMarkets) {
      const ids = getClobTokenIds(market);
      if (ids.length > 0) {
        tokenIds.push(ids[0]); // First token per market
      }
    }

    console.log(`  Found ${tokenIds.length} tokens to fetch orderbooks for`);

    this.orderbookMap = await orderbookFetcher.fetchOrderbooks(
      tokenIds,
      (count) => { this.status.progress.orderbooksFetched = count; }
    );

    console.log(`✅ Phase 4 complete: ${this.orderbookMap.size} orderbooks`);
  }

  /**
   * Phase 5: Fetch traders (leaderboard)
   */
  private async fetchTraders(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_TRADERS;
    console.log('📥 Phase 5: Fetching traders...');

    this.traders = await traderFetcher.fetchLeaderboard(this.config.topTradersLimit);
    this.status.progress.tradersFetched = this.traders.length;

    console.log(`✅ Phase 5 complete: ${this.traders.length} traders`);
  }

  // ============================================
  // INCREMENTAL STORAGE METHODS
  // ============================================

  /**
   * Store markets incrementally
   */
  private async storeMarketsIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing markets...');

    try {
      const enrichedMarkets = marketTransformer.transform(
        this.activeMarkets, // Only store active markets
        this.events,
        this.priceMap,
        this.orderbookMap,
        new Map() // No activity data
      );

      if (enrichedMarkets.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < enrichedMarkets.length; i += batchSize) {
          const batch = enrichedMarkets.slice(i, i + batchSize);
          await polymarketDb.insert('polymarket_markets', batch);
        }
        this.status.progress.marketsStored = enrichedMarkets.length;
        console.log(`✅ Stored ${enrichedMarkets.length} markets`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store markets:', error);
    }
  }

  /**
   * Store events incrementally
   */
  private async storeEventsIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing events...');

    try {
      const enrichedEvents = eventTransformer.transform(this.events, this.activeMarkets);

      if (enrichedEvents.length > 0) {
        await polymarketDb.insert('polymarket_events', enrichedEvents);
        this.status.progress.eventsStored = enrichedEvents.length;
        console.log(`✅ Stored ${enrichedEvents.length} events`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store events:', error);
    }
  }

  /**
   * Store trades incrementally
   */
  private async storeTradesIncremental(): Promise<void> {
    try {
      const allTrades = tradesFetcher.flattenTrades(this.tradesMap);

      // Only store new trades (not already stored)
      const newTrades = allTrades.slice(this.status.progress.tradesStored);

      if (newTrades.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < newTrades.length; i += batchSize) {
          const batch = newTrades.slice(i, i + batchSize);
          await polymarketDb.insert('polymarket_trades', batch);
        }
        this.status.progress.tradesStored += newTrades.length;
        console.log(`  💾 Stored ${this.status.progress.tradesStored} trades total`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store trades:', error);
    }
  }

  /**
   * Store traders incrementally
   */
  private async storeTradersIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing traders...');

    try {
      const enrichedTraders = traderTransformer.transform(this.traders);

      if (enrichedTraders.length > 0) {
        await polymarketDb.insert('polymarket_traders', enrichedTraders);
        this.status.progress.tradersStored = enrichedTraders.length;
        console.log(`✅ Stored ${enrichedTraders.length} traders`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store traders:', error);
    }
  }

  // ============================================
  // PIPELINE RUN TRACKING
  // ============================================

  private async recordPipelineStart(): Promise<void> {
    try {
      await polymarketDb.insert('polymarket_pipeline_runs', [{
        id: this.status.runId,
        status: 'running',
        started_at: this.status.startedAt,
        completed_at: null,
        events_fetched: 0,
        markets_fetched: 0,
        trades_fetched: 0,
        traders_fetched: 0,
        positions_fetched: 0,
        error_message: '',
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to record pipeline start:', error);
    }
  }

  private async recordPipelineEnd(): Promise<void> {
    try {
      await polymarketDb.insert('polymarket_pipeline_runs', [{
        id: this.status.runId,
        status: this.status.currentPhase === PipelinePhase.COMPLETED ? 'completed' : 'failed',
        started_at: this.status.startedAt,
        completed_at: this.status.completedAt,
        events_fetched: this.status.progress.eventsFetched,
        markets_fetched: this.status.progress.marketsStored,
        trades_fetched: this.status.progress.tradesStored,
        traders_fetched: this.status.progress.tradersStored,
        positions_fetched: this.status.progress.positionsStored,
        error_message: this.status.errorMessage || '',
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to record pipeline end:', error);
    }
  }
}

// Singleton instance
export const aggregationPipeline = new AggregationPipeline();
