// src/modules/kalshi/services/aggregation.pipeline.ts

import crypto from 'crypto';
import { kalshiDb } from './database.init';
import { KalshiEvent, KalshiMarket } from '../types/kalshi.types';
import {
  KalshiPipelineConfig,
  KalshiPipelineStatus,
  KalshiPipelinePhase,
  KalshiPipelineProgress,
  KalshiOrderbookSummary,
} from '../types/aggregation.types';

import { kalshiEventFetcher, kalshiMarketFetcher } from './fetchers';
import { kalshiEventTransformer, kalshiMarketTransformer } from './transformers';

const DEFAULT_CONFIG: KalshiPipelineConfig = {
  topTradersLimit: 100,
  enableOrderbookFetch: false,
  enableCandlestickFetch: false,
  maxEvents: 0,
  maxMarkets: 0,
  maxTotalTrades: 0,
};

export class KalshiAggregationPipeline {
  private status: KalshiPipelineStatus;
  private config: KalshiPipelineConfig;

  // Raw data
  private events: KalshiEvent[] = [];
  private activeMarkets: KalshiMarket[] = [];
  private orderbookMap: Map<string, KalshiOrderbookSummary> = new Map();

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    this.status = this.createInitialStatus();
  }

  private createInitialStatus(): KalshiPipelineStatus {
    return {
      runId: '',
      isRunning: false,
      currentPhase: KalshiPipelinePhase.IDLE,
      progress: this.createEmptyProgress(),
      startedAt: null,
      completedAt: null,
      errorMessage: null,
    };
  }

  private createEmptyProgress(): KalshiPipelineProgress {
    return {
      eventsFetched: 0,
      marketsFetched: 0,
      activeMarkets: 0,
      orderbooksFetched: 0,
      candlesticksFetched: 0,
      tradesFetched: 0,
      eventsStored: 0,
      marketsStored: 0,
      tradesStored: 0,
    };
  }

  /**
   * Apply test mode presets
   */
  private applyTestMode(config: KalshiPipelineConfig): KalshiPipelineConfig {
    if (!config.testMode) return config;

    switch (config.testMode) {
      case 'quick':
        return { ...config, maxEvents: 50, maxMarkets: 500, maxTotalTrades: 5000 };
      case 'moderate':
        return { ...config, maxEvents: 1000, maxMarkets: 10000, maxTotalTrades: 100000 };
      case 'production':
        return { ...config, maxEvents: 0, maxMarkets: 0, maxTotalTrades: 0 };
      default:
        return config;
    }
  }

  /**
   * Start the aggregation pipeline
   */
  async start(config?: Partial<KalshiPipelineConfig>): Promise<string> {
    if (this.status.isRunning) {
      throw new Error('Kalshi Pipeline is already running');
    }

    // Reset state
    this.reset();
    this.config = this.applyTestMode({ ...DEFAULT_CONFIG, ...config });
    this.status.runId = crypto.randomUUID();
    this.status.isRunning = true;
    this.status.startedAt = new Date();
    this.status.errorMessage = null;

    console.log(`🚀 Starting Kalshi Aggregation Pipeline (runId: ${this.status.runId})`);
    console.log('📋 Config:', this.config);
    console.log('📋 Mode: ACTIVE MARKETS');

    // Record pipeline run start
    await this.recordPipelineStart();

    // Run pipeline asynchronously
    this.runPipeline().catch(error => {
      console.error('❌ Kalshi Pipeline failed:', error);
      this.status.currentPhase = KalshiPipelinePhase.FAILED;
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
  getStatus(): KalshiPipelineStatus {
    return { ...this.status };
  }

  /**
   * Reset pipeline state
   */
  private reset(): void {
    this.events = [];
    this.activeMarkets = [];
    this.orderbookMap = new Map();
    this.status.progress = this.createEmptyProgress();
  }

  /**
   * Main pipeline execution
   */
  private async runPipeline(): Promise<void> {
    try {
      // Phase 0: Initialize database
      console.log('🔧 Phase 0: Initializing database...');
      await kalshiDb.initialize();
      console.log('✅ Phase 0 complete: Database initialized');

      // Phase 1: Fetch events
      await this.fetchEvents();

      // Phase 2: Fetch markets and filter to active only
      await this.fetchMarketsAndFilterActive();

      // Store markets immediately
      await this.storeMarketsIncremental();

      // Store events (needs markets for aggregation)
      await this.storeEventsIncremental();

      // Complete
      this.status.currentPhase = KalshiPipelinePhase.COMPLETED;
      this.status.isRunning = false;
      this.status.completedAt = new Date();

      console.log('');
      console.log('═══════════════════════════════════════════════════');
      console.log('✅ Kalshi Aggregation Pipeline COMPLETED');
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

  /**
   * Phase 1: Fetch events from Kalshi (active only)
   */
  private async fetchEvents(): Promise<void> {
    this.status.currentPhase = KalshiPipelinePhase.FETCHING_EVENTS;
    console.log(`📥 Phase 1: Fetching ALL active events...`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active (open) events - no limits
    this.events = await kalshiEventFetcher.fetchAllEvents(true);
    this.status.progress.eventsFetched = this.events.length;

    console.log(`📊 Events fetched: ${this.events.length}`);
    if (this.events.length > 0) {
      console.log(`   • First event: ${this.events[0].title}`);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 1 complete: ${this.events.length} active events`);
  }

  /**
   * Phase 2: Fetch ACTIVE markets directly from API
   */
  private async fetchMarketsAndFilterActive(): Promise<void> {
    this.status.currentPhase = KalshiPipelinePhase.FETCHING_MARKETS;
    console.log(`📥 Phase 2: Fetching ALL active markets...`);
    console.log('═══════════════════════════════════════════════════');

    // Fetch only active (open) markets - no limits
    this.activeMarkets = await kalshiMarketFetcher.fetchAllMarkets(true);
    this.status.progress.marketsFetched = this.activeMarkets.length;
    this.status.progress.activeMarkets = this.activeMarkets.length;

    console.log(`📊 Markets fetched: ${this.activeMarkets.length}`);
    if (this.activeMarkets.length > 0) {
      console.log(`   • First market: ${this.activeMarkets[0].title}`);
    }
    console.log('═══════════════════════════════════════════════════');
    console.log(`✅ Phase 2 complete: ${this.activeMarkets.length} active markets fetched`);
  }

  // ============================================
  // INCREMENTAL STORAGE METHODS
  // ============================================

  /**
   * Store markets incrementally
   */
  private async storeMarketsIncremental(): Promise<void> {
    this.status.currentPhase = KalshiPipelinePhase.STORING;
    console.log('💾 Storing markets...');

    try {
      const enrichedMarkets = kalshiMarketTransformer.transform(
        this.activeMarkets,
        this.orderbookMap
      );

      if (enrichedMarkets.length > 0) {
        const batchSize = 500;
        for (let i = 0; i < enrichedMarkets.length; i += batchSize) {
          const batch = enrichedMarkets.slice(i, i + batchSize);
          await kalshiDb.insert('markets', batch);
        }
        this.status.progress.marketsStored = enrichedMarkets.length;
        console.log(`✅ Stored ${enrichedMarkets.length} Kalshi markets`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store markets:', error);
    }
  }

  /**
   * Store events incrementally
   */
  private async storeEventsIncremental(): Promise<void> {
    this.status.currentPhase = KalshiPipelinePhase.STORING;
    console.log('💾 Storing events...');

    try {
      const enrichedEvents = kalshiEventTransformer.transform(this.events, this.activeMarkets);

      if (enrichedEvents.length > 0) {
        await kalshiDb.insert('events', enrichedEvents);
        this.status.progress.eventsStored = enrichedEvents.length;
        console.log(`✅ Stored ${enrichedEvents.length} Kalshi events`);
      }
    } catch (error) {
      console.error('⚠️ Failed to store events:', error);
    }
  }

  // ============================================
  // PIPELINE RUN TRACKING
  // ============================================

  private async recordPipelineStart(): Promise<void> {
    try {
      await kalshiDb.insert('pipeline_runs', [{
        id: this.status.runId,
        protocol: 'kalshi',
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
      await kalshiDb.insert('pipeline_runs', [{
        id: this.status.runId,
        protocol: 'kalshi',
        status: this.status.currentPhase === KalshiPipelinePhase.COMPLETED ? 'completed' : 'failed',
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
      console.warn('⚠️ Failed to record pipeline end:', error);
    }
  }
}

// Singleton instance
export const kalshiAggregationPipeline = new KalshiAggregationPipeline();
