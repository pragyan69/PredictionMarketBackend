// src/modules/polymarket/services/fetchers/event.fetcher.ts

import { gammaClient } from '../../clients/gamma.client';
import { GammaEvent } from '../../types/gamma.types';

export class EventFetcher {
  /**
   * Fetch all events from Gamma API
   * Returns events with their associated markets
   */
  async fetchAllEvents(): Promise<GammaEvent[]> {
    console.log('📥 Fetching all events from Gamma API...');

    try {
      const events = await gammaClient.getEvents();
      console.log(`✅ Fetched ${events.length} events`);
      return events;
    } catch (error) {
      console.error('❌ Failed to fetch events:', error);
      throw error;
    }
  }

  /**
   * Fetch a single event by slug
   */
  async fetchEventBySlug(slug: string): Promise<GammaEvent> {
    console.log(`📥 Fetching event: ${slug}`);

    try {
      const event = await gammaClient.getEventBySlug(slug);
      return event;
    } catch (error) {
      console.error(`❌ Failed to fetch event ${slug}:`, error);
      throw error;
    }
  }
}

export const eventFetcher = new EventFetcher();
