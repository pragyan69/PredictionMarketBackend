// src/modules/dflow/services/fetchers/event.fetcher.ts

import { dflowMetadataClient } from '../../clients/metadata.client';
import { DFlowEvent } from '../../types/dflow.types';

export class DFlowEventFetcher {
  /**
   * Fetch all events from DFlow API
   */
  async fetchAllEvents(activeOnly: boolean = true): Promise<DFlowEvent[]> {
    console.log(`📥 Fetching DFlow events (activeOnly: ${activeOnly})...`);

    try {
      const events = await dflowMetadataClient.getEvents({
        status: activeOnly ? 'active' : undefined,
        limit: 500,
      });

      console.log(`✅ Fetched ${events.length} DFlow events`);
      return events;
    } catch (error) {
      console.error('❌ Failed to fetch DFlow events:', error);
      return [];
    }
  }

  /**
   * Fetch single event by ID
   */
  async fetchEventById(eventId: string): Promise<DFlowEvent | null> {
    try {
      return await dflowMetadataClient.getEventById(eventId);
    } catch {
      return null;
    }
  }
}

export const dflowEventFetcher = new DFlowEventFetcher();
