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

const DEFAULT_CONFIG: PipelineConfig = {
  topTradersLimit: 100,
  enableOrderbookFetch: true,
  enableMarketActivity: false,
  enableTraderPositions: false,
  maxEvents: 0,
  maxMarkets: 0,
  maxTotalTrades: 0,
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

      // Phase 2.5: Fetch prices for active markets
      await this.fetchPricesForActiveMarkets();

      // 💾 Store markets immediately (now with prices!)
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
   */
  private async fetchEvents(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_EVENTS;
    console.log(`📥 Phase 1: Fetching ALL active events...`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active events (active=true, closed=false) - no limits
    this.events = await eventFetcher.fetchAllEvents(true);
    this.status.progress.eventsFetched = this.events.length;

    console.log(`📊 Events fetched: ${this.events.length}`);
    if (this.events.length > 0) {
      console.log(`   • First event: ${this.events[0].title}`);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 1 complete: ${this.events.length} active events`);
  }

  /**
   * Phase 2: Fetch ACTIVE markets directly from API (active=true, closed=false)
   */
  private async fetchMarketsAndFilterActive(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKETS;
    console.log(`📥 Phase 2: Fetching ALL active markets...`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active markets directly from API (active=true, closed=false) - no limits
    this.activeMarkets = await marketFetcher.fetchAllMarkets(true);
    this.status.progress.marketsFetched = this.activeMarkets.length;
    this.status.progress.activeMarkets = this.activeMarkets.length;

    console.log(`📊 Markets fetched: ${this.activeMarkets.length}`);
    if (this.activeMarkets.length > 0) {
      console.log(`   • First market: ${this.activeMarkets[0].question}`);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 2 complete: ${this.activeMarkets.length} active markets fetched`);
  }

  /**
   * Phase 2.5: Fetch prices for active markets
   */
  private async fetchPricesForActiveMarkets(): Promise<void> {
    console.log('📥 Phase 2.5: Fetching prices for active markets...');
    console.log('═══════════════════════════════════════════════════');

    // Collect all token IDs from active markets
    const tokenIds: string[] = [];
    for (const market of this.activeMarkets) {
      const ids = getClobTokenIds(market);
      tokenIds.push(...ids);
    }

    console.log(`📊 Found ${tokenIds.length} tokens to fetch prices for`);

    if (tokenIds.length === 0) {
      console.log('⚠️ No token IDs found, skipping price fetch');
      return;
    }

    try {
      this.priceMap = await priceFetcher.fetchPrices(
        tokenIds,
        (count) => { this.status.progress.pricesFetched = count; }
      );
      console.log(`✅ Phase 2.5 complete: ${this.priceMap.size} prices fetched`);
    } catch (error) {
      console.warn('⚠️ Failed to fetch prices, continuing with empty price map:', error);
      // Continue without prices rather than failing the whole pipeline
    }

    console.log('═══════════════════════════════════════════════════');
  }

  /**
   * Phase 3: Fetch trades for each active market
   * Uses streaming storage to avoid memory issues
   */
  private async fetchTradesForActiveMarkets(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKET_ACTIVITY;
    console.log(`📥 Phase 3: Fetching ALL trades...`);
    console.log('═══════════════════════════════════════════════════');

    // Get condition IDs of active markets
    const conditionIds = this.activeMarkets
      .filter((m): m is GammaMarket & { conditionId: string } => !!m.conditionId)
      .map(m => m.conditionId);

    // Check for checkpoint to resume from
    const checkpoint = await this.loadCheckpoint('trades');
    let startIndex = 0;
    if (checkpoint && checkpoint.lastMarketIndex !== undefined) {
      startIndex = checkpoint.lastMarketIndex;
      this.status.progress.tradesStored = checkpoint.tradesStored || 0;
      this.status.progress.tradesFetched = checkpoint.tradesFetched || 0;
      console.log(`🔄 RESUMING from market ${startIndex}/${conditionIds.length} (${this.status.progress.tradesStored} trades already stored)`);
    }

    const remainingConditionIds = conditionIds.slice(startIndex);
    console.log(`📊 Found ${conditionIds.length} markets, processing ${remainingConditionIds.length} remaining`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch trades with progress callback - streaming to DB
    const STORE_BATCH_SIZE = 500; // Store every 500 trades to reduce memory

    this.tradesMap = await tradesFetcher.fetchTradesForMarkets(
      remainingConditionIds,
      100, // 100 trades per market
      async (marketsDone, totalTrades, currentTradesMap) => {
        this.status.progress.tradesFetched = (checkpoint?.tradesFetched || 0) + totalTrades;
        this.tradesMap = currentTradesMap;

        // Store trades incrementally every STORE_BATCH_SIZE trades
        const pendingTrades = tradesFetcher.flattenTrades(currentTradesMap).length;
        if (pendingTrades >= STORE_BATCH_SIZE) {
          await this.storeTradesIncremental();
          // Save checkpoint after storing
          await this.saveCheckpoint('trades', {
            lastMarketIndex: startIndex + marketsDone,
            tradesStored: this.status.progress.tradesStored,
            tradesFetched: this.status.progress.tradesFetched,
          });
          console.log(`  💾 Checkpoint saved: market ${startIndex + marketsDone}, ${this.status.progress.tradesStored} stored`);
        }

        return false; // Continue fetching
      },
      0 // No limit
    );

    // Store any remaining trades
    await this.storeTradesIncremental();

    // Clear checkpoint on successful completion
    await this.clearCheckpoint('trades');

    console.log(`✅ Phase 3 complete: ${this.status.progress.tradesFetched} trades fetched, ${this.status.progress.tradesStored} stored`);
  }

  // ============================================
  // CHECKPOINT METHODS FOR RESUME CAPABILITY
  // ============================================

  private async saveCheckpoint(phase: string, data: Record<string, any>): Promise<void> {
    try {
      await polymarketDb.insert('pipeline_checkpoints', [{
        run_id: this.status.runId,
        phase,
        checkpoint_data: JSON.stringify(data),
        created_at: new Date(),
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to save checkpoint:', error);
    }
  }

  private async loadCheckpoint(phase: string): Promise<Record<string, any> | null> {
    try {
      const result = await polymarketDb.query(`
        SELECT checkpoint_data FROM prediction_market.pipeline_checkpoints
        WHERE phase = '${phase}'
        ORDER BY created_at DESC
        LIMIT 1
      `);
      if (result && result.length > 0 && result[0].checkpoint_data) {
        return JSON.parse(result[0].checkpoint_data);
      }
    } catch (error) {
      // Table might not exist yet, that's OK
    }
    return null;
  }

  private async clearCheckpoint(phase: string): Promise<void> {
    try {
      await polymarketDb.query(`
        ALTER TABLE prediction_market.pipeline_checkpoints
        DELETE WHERE phase = '${phase}'
      `);
    } catch (error) {
      // Ignore if table doesn't exist
    }
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
          await polymarketDb.insert('markets', batch);
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
        await polymarketDb.insert('events', enrichedEvents);
        this.status.progress.eventsStored = enrichedEvents.length;
        console.log(`✅ Stored ${enrichedEvents.length} events`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store events:', error);
    }
  }

  /**
   * Store trades incrementally and clear memory
   */
  private async storeTradesIncremental(): Promise<void> {
    try {
      const allTrades = tradesFetcher.flattenTrades(this.tradesMap);

      if (allTrades.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < allTrades.length; i += batchSize) {
          const batch = allTrades.slice(i, i + batchSize);
          await polymarketDb.insert('trades', batch);
        }
        this.status.progress.tradesStored += allTrades.length;
        console.log(`  💾 Stored ${this.status.progress.tradesStored} trades total`);

        // CRITICAL: Clear tradesMap to free memory after storing
        this.tradesMap.clear();
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
        await polymarketDb.insert('traders', enrichedTraders);
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
      await polymarketDb.insert('pipeline_runs', [{
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
      await polymarketDb.insert('pipeline_runs', [{
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
