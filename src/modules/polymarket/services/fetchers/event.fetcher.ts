// src/modules/polymarket/services/fetchers/event.fetcher.ts

import { gammaClient } from '../../clients/gamma.client';
import { GammaEvent } from '../../types/gamma.types';

export class EventFetcher {
  /**
   * Fetch all events from Gamma API with pagination
   * @param activeOnly - If true, only fetch active events that are not closed
   * Returns events with their associated markets
   */
  async fetchAllEvents(activeOnly: boolean = false): Promise<GammaEvent[]> {
    console.log(`📥 Fetching all events from Gamma API (activeOnly=${activeOnly})...`);
    console.log(`   🔗 URL: ${gammaClient.baseUrl}/events`);

    try {
      const events = await gammaClient.getAllEvents(activeOnly);

      // Debug: Verify actual data
      console.log(`   📊 DEBUG: Raw response type: ${typeof events}`);
      console.log(`   📊 DEBUG: Is array: ${Array.isArray(events)}`);
      console.log(`   📊 DEBUG: Length: ${events?.length ?? 'undefined'}`);

      if (events && events.length > 0) {
        console.log(`   📊 DEBUG: First event sample:`, JSON.stringify(events[0], null, 2).substring(0, 500));
        // Count active vs closed
        const activeCount = events.filter(e => e.active === true && e.closed !== true).length;
        const closedCount = events.filter(e => e.closed === true).length;
        console.log(`   📊 DEBUG: Active events: ${activeCount}, Closed events: ${closedCount}`);
      } else {
        console.log(`   ⚠️ DEBUG: No events returned or empty array`);
      }

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
