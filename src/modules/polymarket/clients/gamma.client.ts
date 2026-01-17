import axios, { AxiosInstance } from "axios";
import { env } from "../../../config/env";
import { GammaMarket, GammaEvent } from "../types/gamma.types";
import { rateLimitManager } from "../utils/rateLimit";

export class GammaAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = "gamma_api";

  // ✅ Explicit main endpoint
  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.polymarket?.gammaApiUrl || "https://gamma-api.polymarket.com";

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 30000,
      headers: { "Content-Type": "application/json" },
    });

    // ✅ Debug request interceptor
    this.client.interceptors.request.use((config) => {
      console.log("➡️  GAMMA API REQUEST", {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    // ✅ Debug response/error interceptor
    this.client.interceptors.response.use(
      (res) => {
        const dataInfo = Array.isArray(res.data)
          ? `Array[${res.data.length}]${res.data.length > 0 ? ` first: ${JSON.stringify(res.data[0]).substring(0, 200)}...` : ''}`
          : typeof res.data === 'object'
          ? `Object keys: ${Object.keys(res.data || {}).join(', ')}`
          : typeof res.data;
        console.log("✅ GAMMA API RESPONSE", {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
          dataType: dataInfo,
        });
        return res;
      },
      (err) => {
        console.error("❌ GAMMA API ERROR", {
          message: err.message,
          code: err.code,
          url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
          method: err.config?.method,
          params: err.config?.params,
          status: err.response?.status,
          statusText: err.response?.statusText,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.gammaApi);

    console.log(`✅ Gamma API client ready: ${this.baseUrl}`);
  }

  async getMarkets(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
    condition_id?: string;
  }): Promise<GammaMarket[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    // API returns array directly, not wrapped in { data, next_cursor }
    const response = await this.client.get<GammaMarket[]>("/markets", { params });
    return response.data;
  }

  async getMarketBySlug(slug: string): Promise<GammaMarket> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<GammaMarket>(`/markets/${slug}`);
    return response.data;
  }

  async getMarketByConditionId(conditionId: string): Promise<GammaMarket> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    // Some Gamma setups return array; your type expects GammaMarket.
    // Keep as-is for now.
    const response = await this.client.get<GammaMarket>("/markets", {
      params: { condition_id: conditionId },
    });
    return response.data;
  }

  async getEvents(params?: {
    limit?: number;
    offset?: number;
    active?: boolean;
    closed?: boolean;
    archived?: boolean;
  }): Promise<GammaEvent[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<GammaEvent[]>("/events", { params });
    return response.data;
  }

  async getEventBySlug(slug: string): Promise<GammaEvent> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<GammaEvent>(`/events/${slug}`);
    return response.data;
  }

  /**
   * Fetch all events with pagination
   * @param activeOnly - If true, only fetch active events that are not closed
   */
  async getAllEvents(activeOnly: boolean = false): Promise<GammaEvent[]> {
    const allEvents: GammaEvent[] = [];
    let offset = 0;
    const limit = 100;

    console.log(`📥 Fetching all events (activeOnly=${activeOnly})...`);

    while (true) {
      const params: any = { limit, offset };
      if (activeOnly) {
        params.active = true;
        params.closed = false;
      }

      const events = await this.getEvents(params);

      if (!events || events.length === 0) {
        break;
      }

      allEvents.push(...events);
      console.log(`  Fetched ${allEvents.length} events...`);

      if (events.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(`✅ Total events fetched: ${allEvents.length}`);
    return allEvents;
  }

  /**
   * Fetch all markets with pagination
   * @param activeOnly - If true, only fetch active markets that are not closed
   */
  async getAllMarkets(activeOnly: boolean = false): Promise<GammaMarket[]> {
    const allMarkets: GammaMarket[] = [];
    let offset = 0;
    const limit = 100;

    console.log(`📥 Fetching all markets (activeOnly=${activeOnly})...`);

    while (true) {
      const params: any = { limit, offset };
      if (activeOnly) {
        params.active = true;
        params.closed = false;
      }

      const markets = await this.getMarkets(params);

      if (!markets || markets.length === 0) {
        break;
      }

      allMarkets.push(...markets);
      console.log(`  Fetched ${allMarkets.length} markets...`);

      if (markets.length < limit) {
        break;
      }

      offset += limit;
    }

    console.log(`✅ Total markets fetched: ${allMarkets.length}`);
    return allMarkets;
  }
}

export const gammaClient = new GammaAPIClient();
