// src/modules/polymarket/services/historical.pipeline.ts

import { gammaClient } from '../clients/gamma.client';
import { clobClient } from '../clients/clob.client';
import { clickhouse } from '../../../config/clickhouse';

export class HistoricalPipeline {
  private isRunning = false;

  async start(): Promise<void> {
    console.log('🚀 Starting Historical Data Pipeline...');
    this.isRunning = true;

    try {
      const markets = await gammaClient.getAllMarkets();
      console.log(`✅ Fetched ${markets.length} markets`);

      const records = markets.map(m => ({
        id: m.id,
        platform: 'polymarket',
        external_id: m.conditionId || '',
        title: m.question || '',
        description: m.description || '',
        status: m.active ? 'active' : 'closed',
        volume: parseFloat(m.volume || '0') || 0,
        data: JSON.stringify(m),
        created_at: new Date(),
        updated_at: new Date(),
      }));

      await clickhouse.insert('prediction_markets', records);
      console.log('✅ Pipeline completed');
    } catch (error) {
      console.error('❌ Pipeline failed:', error);
    } finally {
      this.isRunning = false;
    }
  }

  getStatus() {
    return { running: this.isRunning };
  }
}

export const historicalPipeline = new HistoricalPipeline();
