// src/modules/dflow/services/aggregation.pipeline.ts

import crypto from 'crypto';
import { dflowDb } from './database.init';
import { DFlowEvent, DFlowMarket, DFlowTrade } from '../types/dflow.types';
import {
  DFlowPipelineConfig,
  DFlowPipelineStatus,
  DFlowPipelinePhase,
  DFlowPipelineProgress,
  DFlowOrderbookSummary,
} from '../types/aggregation.types';

import {
  dflowEventFetcher,
  dflowMarketFetcher,
  dflowOrderbookFetcher,
  dflowTradesFetcher,
} from './fetchers';

import {
  dflowEventTransformer,
  dflowMarketTransformer,
  dflowTradeTransformer,
} from './transformers';

const DEFAULT_CONFIG: DFlowPipelineConfig = {
  maxEvents: 0,
  maxMarkets: 0,
  maxTrades: 0,
  enableOrderbookFetch: true,
};

export class DFlowAggregationPipeline {
  private status: DFlowPipelineStatus;
  private config: DFlowPipelineConfig;

  // Raw data
  private events: DFlowEvent[] = [];
  private markets: DFlowMarket[] = [];
  private activeMarkets: DFlowMarket[] = [];
  private orderbookMap: Map<string, DFlowOrderbookSummary> = new Map();
  private tradesMap: Map<string, DFlowTrade[]> = new Map();

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.status = this.createInitialStatus();
  }

  private createInitialStatus(): DFlowPipelineStatus {
    return {
      runId: '',
      isRunning: false,
      currentPhase: DFlowPipelinePhase.IDLE,
      progress: this.createEmptyProgress(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
  }

  private createEmptyProgress(): DFlowPipelineProgress {
    return {
      eventsFetched: 0,
      marketsFetched: 0,
      activeMarkets: 0,
      orderbooksFetched: 0,
      tradesFetched: 0,
      eventsStored: 0,
      marketsStored: 0,
      tradesStored: 0,
    };
  }

  /**
   * Start the DFlow aggregation pipeline
   */
  async start(config?: Partial<DFlowPipelineConfig>): Promise<string> {
    if (this.status.isRunning) {
      throw new Error('DFlow Pipeline is already running');
    }

    // Reset state
    this.reset();
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.status.runId = crypto.randomUUID();
    this.status.isRunning = true;
    this.status.startedAt = new Date();
    this.status.errorMessage = null;

    console.log(`🚀 Starting DFlow Aggregation Pipeline (runId: ${this.status.runId})`);
    console.log('📋 Config:', this.config);

    // Record pipeline run start
    await this.recordPipelineStart();

    // Run pipeline asynchronously
    this.runPipeline().catch(error => {
      console.error('❌ DFlow Pipeline failed:', error);
      this.status.currentPhase = DFlowPipelinePhase.FAILED;
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
  getStatus(): DFlowPipelineStatus {
    return { ...this.status };
  }

  /**
   * Reset pipeline state
   */
  private reset(): void {
    this.events = [];
    this.markets = [];
    this.activeMarkets = [];
    this.orderbookMap = new Map();
    this.tradesMap = new Map();
    this.status.progress = this.createEmptyProgress();
  }

  /**
   * Main pipeline execution
   */
  private async runPipeline(): Promise<void> {
    try {
      // Phase 0: Initialize database
      console.log('🔧 Phase 0: Initializing DFlow database...');
      await dflowDb.initialize();
      console.log('✅ Phase 0 complete: Database initialized');

      // Phase 1: Fetch events
      await this.fetchEvents();

      // Phase 2: Fetch markets
      await this.fetchMarkets();

      // Phase 3: Fetch orderbooks (optional)
      if (this.config.enableOrderbookFetch && this.activeMarkets.length > 0) {
        await this.fetchOrderbooks();
      }

      // Store markets and events
      await this.storeMarketsIncremental();
      await this.storeEventsIncremental();

      // Phase 4: Fetch trades
      if (this.activeMarkets.length > 0) {
        await this.fetchTrades();
        await this.storeTradesIncremental();
      }

      // Complete
      this.status.currentPhase = DFlowPipelinePhase.COMPLETED;
      this.status.isRunning = false;
      this.status.completedAt = new Date();

      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ DFlow Aggregation Pipeline COMPLETED');
      console.log('═══════════════════════════════════════════════════');
      console.log(`📊 Events: ${this.status.progress.eventsStored}`);
      console.log(`📊 Markets: ${this.status.progress.marketsStored} (${this.status.progress.activeMarkets} active)`);
      console.log(`📊 Trades: ${this.status.progress.tradesStored}`);
      console.log('═══════════════════════════════════════════════════');

      await this.recordPipelineEnd();

    } catch (error) {
      throw error;
    }
  }

  // ============================================
  // FETCH PHASES
  // ============================================

  private async fetchEvents(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.FETCHING_EVENTS;
    console.log('📥 Phase 1: Fetching DFlow events...');
    console.log('═══════════════════════════════════════════════════');

    this.events = await dflowEventFetcher.fetchAllEvents(true);
    this.status.progress.eventsFetched = this.events.length;

    console.log(`📊 Events fetched: ${this.events.length}`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 1 complete: ${this.events.length} events`);
  }

  private async fetchMarkets(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.FETCHING_MARKETS;
    console.log('📥 Phase 2: Fetching DFlow markets...');
    console.log('═══════════════════════════════════════════════════');

    this.markets = await dflowMarketFetcher.fetchAllMarkets(true);
    this.activeMarkets = this.markets.filter(m => m.status === 'active');

    this.status.progress.marketsFetched = this.markets.length;
    this.status.progress.activeMarkets = this.activeMarkets.length;

    console.log(`📊 Markets fetched: ${this.markets.length} (${this.activeMarkets.length} active)`);
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 2 complete: ${this.markets.length} markets`);
  }

  private async fetchOrderbooks(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.FETCHING_ORDERBOOKS;
    console.log('📥 Phase 3: Fetching DFlow orderbooks...');

    this.orderbookMap = await dflowOrderbookFetcher.fetchOrderbooks(
      this.activeMarkets,
      (count) => { this.status.progress.orderbooksFetched = count; }
    );

    console.log(`✅ Phase 3 complete: ${this.orderbookMap.size} orderbooks`);
  }

  private async fetchTrades(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.FETCHING_TRADES;
    console.log('📥 Phase 4: Fetching DFlow trades...');

    this.tradesMap = await dflowTradesFetcher.fetchTradesForMarkets(
      this.activeMarkets,
      50, // 50 trades per market
      (_marketsDone, totalTrades) => {
        this.status.progress.tradesFetched = totalTrades;
      }
    );

    console.log(`✅ Phase 4 complete: ${this.status.progress.tradesFetched} trades`);
  }

  // ============================================
  // STORAGE METHODS
  // ============================================

  private async storeMarketsIncremental(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.STORING;
    console.log('💾 Storing DFlow markets...');

    try {
      const enrichedMarkets = dflowMarketTransformer.transform(
        this.markets,
        this.events,
        this.orderbookMap
      );

      if (enrichedMarkets.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < enrichedMarkets.length; i += batchSize) {
          const batch = enrichedMarkets.slice(i, i + batchSize);
          await dflowDb.insert('markets', batch);
        }
        this.status.progress.marketsStored = enrichedMarkets.length;
        console.log(`✅ Stored ${enrichedMarkets.length} DFlow markets`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store DFlow markets:', error);
    }
  }

  private async storeEventsIncremental(): Promise<void> {
    this.status.currentPhase = DFlowPipelinePhase.STORING;
    console.log('💾 Storing DFlow events...');

    try {
      const enrichedEvents = dflowEventTransformer.transform(this.events, this.markets);

      if (enrichedEvents.length > 0) {
        await dflowDb.insert('events', enrichedEvents);
        this.status.progress.eventsStored = enrichedEvents.length;
        console.log(`✅ Stored ${enrichedEvents.length} DFlow events`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store DFlow events:', error);
    }
  }

  private async storeTradesIncremental(): Promise<void> {
    console.log('💾 Storing DFlow trades...');

    try {
      const allTrades = dflowTradesFetcher.flattenTrades(this.tradesMap);

      // Build market lookup
      const marketMap = new Map<string, DFlowMarket>();
      for (const market of this.markets) {
        marketMap.set(market.id, market);
      }

      const enrichedTrades = dflowTradeTransformer.transform(allTrades, marketMap);

      if (enrichedTrades.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < enrichedTrades.length; i += batchSize) {
          const batch = enrichedTrades.slice(i, i + batchSize);
          await dflowDb.insert('trades', batch);
        }
        this.status.progress.tradesStored = enrichedTrades.length;
        console.log(`✅ Stored ${enrichedTrades.length} DFlow trades`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store DFlow trades:', error);
    }
  }

  // ============================================
  // PIPELINE RUN TRACKING
  // ============================================

  private async recordPipelineStart(): Promise<void> {
    try {
      await dflowDb.insert('pipeline_runs', [{
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
      console.warn('⚠️ Failed to record DFlow pipeline start:', error);
    }
  }

  private async recordPipelineEnd(): Promise<void> {
    try {
      await dflowDb.insert('pipeline_runs', [{
        id: this.status.runId,
        status: this.status.currentPhase === DFlowPipelinePhase.COMPLETED ? 'completed' : 'failed',
        started_at: this.status.startedAt,
        completed_at: this.status.completedAt,
        events_fetched: this.status.progress.eventsFetched,
        markets_fetched: this.status.progress.marketsStored,
        trades_fetched: this.status.progress.tradesStored,
        traders_fetched: 0,
        positions_fetched: 0,
        error_message: this.status.errorMessage || '',
      }]);
    } catch (error) {
      console.warn('⚠️ Failed to record DFlow pipeline end:', error);
    }
  }
}

// Singleton instance
export const dflowAggregationPipeline = new DFlowAggregationPipeline();
