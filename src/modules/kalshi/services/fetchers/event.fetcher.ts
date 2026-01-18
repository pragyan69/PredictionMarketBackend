// src/modules/kalshi/services/fetchers/event.fetcher.ts

import { kalshiClient } from '../../clients/kalshi.client';
import { KalshiEvent } from '../../types/kalshi.types';

export class KalshiEventFetcher {
  /**
   * Fetch all events with optional status filter
   * @param activeOnly - If true, only fetch open events
   */
  async fetchAllEvents(activeOnly: boolean = false): Promise<KalshiEvent[]> {
    console.log(`📥 Fetching Kalshi events (activeOnly=${activeOnly})...`);

    const status = activeOnly ? 'open' : undefined;
    const events = await kalshiClient.getAllEvents(status);

    console.log(`✅ Fetched ${events.length} Kalshi events`);
    return events;
  }

  /**
   * Fetch a single event by ticker
   */
  async fetchEvent(eventTicker: string): Promise<KalshiEvent | null> {
    try {
      const response = await kalshiClient.getEvent(eventTicker, true);
      return response.event;
    } catch (error) {
      console.warn(`⚠️ Failed to fetch Kalshi event ${eventTicker}:`, error);
      return null;
    }
  }
}

export const kalshiEventFetcher = new KalshiEventFetcher();
