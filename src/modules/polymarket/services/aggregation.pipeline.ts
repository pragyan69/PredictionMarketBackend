// src/modules/polymarket/services/aggregation.pipeline.ts

import crypto from 'crypto';
import { polymarketDb } from './database.init';
import { GammaEvent, GammaMarket, getClobTokenIds } from '../types/gamma.types';
import {
  PipelineConfig,
  PipelineStatus,
  PipelinePhase,
  PipelineProgress,
  EnrichedEvent,
  EnrichedMarket,
  EnrichedTrader,
  EnrichedPosition,
  OrderbookSummary,
  MarketActivityData,
  LeaderboardEntry,
  PositionEntry,
} from '../types/aggregation.types';

import {
  eventFetcher,
  marketFetcher,
  priceFetcher,
  orderbookFetcher,
  traderFetcher,
} from './fetchers';

import {
  eventTransformer,
  marketTransformer,
  traderTransformer,
  positionTransformer,
} from './transformers';

const DEFAULT_CONFIG: PipelineConfig = {
  topTradersLimit: 0, // 0 = fetch all
  enableOrderbookFetch: true,
  enableMarketActivity: true,
  enableTraderPositions: true,
};

export class AggregationPipeline {
  private status: PipelineStatus;
  private config: PipelineConfig;

  // Raw data
  private events: GammaEvent[] = [];
  private markets: GammaMarket[] = [];
  private priceMap: Map<string, number> = new Map();
  private orderbookMap: Map<string, OrderbookSummary> = new Map();
  private activityMap: Map<string, MarketActivityData> = new Map();
  private traders: LeaderboardEntry[] = [];
  private positionsMap: Map<string, PositionEntry[]> = new Map();

  // Transformed data
  private enrichedEvents: EnrichedEvent[] = [];
  private enrichedMarkets: EnrichedMarket[] = [];
  private enrichedTraders: EnrichedTrader[] = [];
  private enrichedPositions: EnrichedPosition[] = [];

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
      pricesFetched: 0,
      orderbooksFetched: 0,
      marketActivityFetched: 0,
      tradersFetched: 0,
      positionsFetched: 0,
      eventsStored: 0,
      marketsStored: 0,
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
    console.log('📋 Mode: INCREMENTAL STORAGE (data saved after each phase)');

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
    this.priceMap = new Map();
    this.orderbookMap = new Map();
    this.activityMap = new Map();
    this.traders = [];
    this.positionsMap = new Map();
    this.enrichedEvents = [];
    this.enrichedMarkets = [];
    this.enrichedTraders = [];
    this.enrichedPositions = [];
    this.status.progress = this.createEmptyProgress();
  }

  /**
   * Main pipeline execution with INCREMENTAL STORAGE
   * Data is saved to database after each relevant phase
   */
  private async runPipeline(): Promise<void> {
    try {
      // Phase 0: Initialize database
      console.log('🔧 Phase 0: Initializing database...');
      await polymarketDb.initialize();
      console.log('✅ Phase 0 complete: Database initialized');

      // Phase 1: Fetch events
      await this.fetchEvents();

      // Phase 2: Fetch markets
      await this.fetchMarkets();
      // 💾 INCREMENTAL: Store basic markets immediately
      await this.storeMarketsIncremental('basic');

      // Phase 3: Fetch prices
      await this.fetchPrices();

      // Phase 4: Fetch orderbooks (optional)
      if (this.config.enableOrderbookFetch) {
        await this.fetchOrderbooks();
      }

      // Phase 5: Fetch market activity (optional)
      if (this.config.enableMarketActivity) {
        await this.fetchMarketActivity();
      }

      // 💾 INCREMENTAL: Store fully enriched markets (replaces basic)
      await this.storeMarketsIncremental('enriched');

      // 💾 INCREMENTAL: Store events (depends on markets for aggregation)
      await this.storeEventsIncremental();

      // Phase 6: Fetch traders
      await this.fetchTraders();
      // 💾 INCREMENTAL: Store traders immediately
      await this.storeTradersIncremental();

      // Phase 7: Fetch positions (optional)
      if (this.config.enableTraderPositions) {
        await this.fetchPositions();
        // 💾 INCREMENTAL: Store positions immediately
        await this.storePositionsIncremental();
      }

      // Complete
      this.status.currentPhase = PipelinePhase.COMPLETED;
      this.status.isRunning = false;
      this.status.completedAt = new Date();

      console.log('✅ Aggregation Pipeline completed successfully');
      console.log(`📊 Final counts: ${this.status.progress.eventsStored} events, ${this.status.progress.marketsStored} markets, ${this.status.progress.tradersStored} traders, ${this.status.progress.positionsStored} positions`);
      await this.recordPipelineEnd();

    } catch (error) {
      throw error;
    }
  }

  /**
   * Phase 1: Fetch events from Gamma
   */
  private async fetchEvents(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_EVENTS;
    console.log('📥 Phase 1: Fetching events...');

    this.events = await eventFetcher.fetchAllEvents();
    this.status.progress.eventsFetched = this.events.length;

    console.log(`✅ Phase 1 complete: ${this.events.length} events`);
  }

  /**
   * Phase 2: Fetch markets from Gamma
   */
  private async fetchMarkets(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKETS;
    console.log('📥 Phase 2: Fetching markets...');

    this.markets = await marketFetcher.fetchAllMarkets();
    this.status.progress.marketsFetched = this.markets.length;

    console.log(`✅ Phase 2 complete: ${this.markets.length} markets`);
  }

  /**
   * Phase 3: Fetch prices from CLOB
   */
  private async fetchPrices(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_PRICES;
    console.log('📥 Phase 3: Fetching prices...');

    // Collect all token IDs from markets (parse JSON string)
    const tokenIds: string[] = [];
    for (const market of this.markets) {
      const ids = getClobTokenIds(market);
      tokenIds.push(...ids);
    }

    console.log(`  Found ${tokenIds.length} token IDs to fetch prices for`);

    this.priceMap = await priceFetcher.fetchPrices(
      tokenIds,
      (count) => { this.status.progress.pricesFetched = count; }
    );
    this.status.progress.pricesFetched = this.priceMap.size;

    console.log(`✅ Phase 3 complete: ${this.priceMap.size} prices`);
  }

  /**
   * Phase 4: Fetch orderbooks from CLOB
   */
  private async fetchOrderbooks(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_ORDERBOOKS;
    console.log('📥 Phase 4: Fetching orderbooks...');

    // Get unique token IDs (first token from each market for representative orderbook)
    const tokenIds: string[] = [];
    for (const market of this.markets) {
      const ids = getClobTokenIds(market);
      if (ids.length > 0) {
        tokenIds.push(ids[0]);
      }
    }

    console.log(`  Found ${tokenIds.length} markets to fetch orderbooks for`);

    this.orderbookMap = await orderbookFetcher.fetchOrderbooks(
      tokenIds,
      (count) => { this.status.progress.orderbooksFetched = count; }
    );
    this.status.progress.orderbooksFetched = this.orderbookMap.size;

    console.log(`✅ Phase 4 complete: ${this.orderbookMap.size} orderbooks`);
  }

  /**
   * Phase 5: Fetch market activity from Data API
   */
  private async fetchMarketActivity(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_MARKET_ACTIVITY;
    console.log('📥 Phase 5: Fetching market activity...');

    // Get market IDs (using conditionId)
    const marketIds = this.markets
      .filter((m): m is GammaMarket & { conditionId: string } => !!m.conditionId)
      .map(m => m.conditionId);

    console.log(`  Found ${marketIds.length} markets to fetch activity for`);

    this.activityMap = await marketFetcher.fetchMarketActivity(
      marketIds,
      (count) => { this.status.progress.marketActivityFetched = count; }
    );
    this.status.progress.marketActivityFetched = this.activityMap.size;

    console.log(`✅ Phase 5 complete: ${this.activityMap.size} market activities`);
  }

  /**
   * Phase 6: Fetch traders (leaderboard)
   */
  private async fetchTraders(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_TRADERS;
    console.log('📥 Phase 6: Fetching traders...');

    this.traders = await traderFetcher.fetchLeaderboard(this.config.topTradersLimit);
    this.status.progress.tradersFetched = this.traders.length;

    console.log(`✅ Phase 6 complete: ${this.traders.length} traders`);
  }

  /**
   * Phase 7: Fetch positions for traders
   */
  private async fetchPositions(): Promise<void> {
    this.status.currentPhase = PipelinePhase.FETCHING_POSITIONS;
    console.log('📥 Phase 7: Fetching positions...');

    const traderAddresses = this.traders
      .filter(t => t.address)
      .map(t => t.address);

    console.log(`  Fetching positions for ${traderAddresses.length} traders`);

    this.positionsMap = await traderFetcher.fetchPositionsForTraders(
      traderAddresses,
      (count) => { this.status.progress.positionsFetched = count; }
    );

    // Count total positions
    let totalPositions = 0;
    for (const positions of this.positionsMap.values()) {
      totalPositions += positions.length;
    }
    this.status.progress.positionsFetched = totalPositions;

    console.log(`✅ Phase 7 complete: ${totalPositions} positions for ${this.positionsMap.size} traders`);
  }

  // ============================================
  // INCREMENTAL STORAGE METHODS
  // ============================================

  /**
   * Store markets incrementally
   * @param mode 'basic' = without price/orderbook enrichment, 'enriched' = full enrichment
   */
  private async storeMarketsIncremental(mode: 'basic' | 'enriched'): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log(`💾 Storing markets (${mode})...`);

    try {
      // Transform markets with available data
      this.enrichedMarkets = marketTransformer.transform(
        this.markets,
        this.events,
        this.priceMap,
        this.orderbookMap,
        this.activityMap
      );

      if (this.enrichedMarkets.length > 0) {
        // Store in batches to avoid memory issues with large datasets
        const batchSize = 1000;
        for (let i = 0; i < this.enrichedMarkets.length; i += batchSize) {
          const batch = this.enrichedMarkets.slice(i, i + batchSize);
          await polymarketDb.insert('polymarket_markets', batch);
          console.log(`  💾 Stored markets batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(this.enrichedMarkets.length / batchSize)} (${Math.min(i + batchSize, this.enrichedMarkets.length)}/${this.enrichedMarkets.length})`);
        }
        this.status.progress.marketsStored = this.enrichedMarkets.length;
        console.log(`✅ Stored ${this.enrichedMarkets.length} markets (${mode})`);
      }
    } catch (error) {
      console.error(`⚠️ Failed to store markets (${mode}):`, error);
      // Don't throw - allow pipeline to continue
    }
  }

  /**
   * Store events incrementally
   */
  private async storeEventsIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing events...');

    try {
      // Transform events (needs markets for aggregation)
      this.enrichedEvents = eventTransformer.transform(this.events, this.markets);

      if (this.enrichedEvents.length > 0) {
        await polymarketDb.insert('polymarket_events', this.enrichedEvents);
        this.status.progress.eventsStored = this.enrichedEvents.length;
        console.log(`✅ Stored ${this.enrichedEvents.length} events`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store events:', error);
    }
  }

  /**
   * Store traders incrementally
   */
  private async storeTradersIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing traders...');

    try {
      // Transform traders
      this.enrichedTraders = traderTransformer.transform(this.traders);

      if (this.enrichedTraders.length > 0) {
        await polymarketDb.insert('polymarket_traders', this.enrichedTraders);
        this.status.progress.tradersStored = this.enrichedTraders.length;
        console.log(`✅ Stored ${this.enrichedTraders.length} traders`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store traders:', error);
    }
  }

  /**
   * Store positions incrementally
   */
  private async storePositionsIncremental(): Promise<void> {
    this.status.currentPhase = PipelinePhase.STORING;
    console.log('💾 Storing positions...');

    try {
      // Transform positions
      this.enrichedPositions = positionTransformer.transform(this.positionsMap);

      if (this.enrichedPositions.length > 0) {
        // Store in batches
        const batchSize = 1000;
        for (let i = 0; i < this.enrichedPositions.length; i += batchSize) {
          const batch = this.enrichedPositions.slice(i, i + batchSize);
          await polymarketDb.insert('polymarket_trader_positions', batch);
        }
        this.status.progress.positionsStored = this.enrichedPositions.length;
        console.log(`✅ Stored ${this.enrichedPositions.length} positions`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store positions:', error);
    }
  }

  // ============================================
  // PIPELINE RUN TRACKING
  // ============================================

  /**
   * Record pipeline start in ClickHouse
   */
  private async recordPipelineStart(): Promise<void> {
    try {
      await polymarketDb.insert('polymarket_pipeline_runs', [{
        id: this.status.runId,
        status: 'running',
        started_at: this.status.startedAt,
        completed_at: null,
        events_fetched: 0,
        markets_fetched: 0,
        traders_fetched: 0,
        positions_fetched: 0,
        error_message: '',
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to record pipeline start:', error);
    }
  }

  /**
   * Record pipeline end in ClickHouse
   */
  private async recordPipelineEnd(): Promise<void> {
    try {
      await polymarketDb.insert('polymarket_pipeline_runs', [{
        id: this.status.runId,
        status: this.status.currentPhase === PipelinePhase.COMPLETED ? 'completed' : 'failed',
        started_at: this.status.startedAt,
        completed_at: this.status.completedAt,
        events_fetched: this.status.progress.eventsFetched,
        markets_fetched: this.status.progress.marketsFetched,
        traders_fetched: this.status.progress.tradersFetched,
        positions_fetched: this.status.progress.positionsFetched,
        error_message: this.status.errorMessage || '',
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to record pipeline end:', error);
    }
  }
}

// Singleton instance
export const aggregationPipeline = new AggregationPipeline();
