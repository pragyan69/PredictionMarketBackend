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

  async getEvents(): Promise<GammaEvent[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<GammaEvent[]>("/events");
    return response.data;
  }

  async getEventBySlug(slug: string): Promise<GammaEvent> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const response = await this.client.get<GammaEvent>(`/events/${slug}`);
    return response.data;
  }

  async getAllMarkets(): Promise<GammaMarket[]> {
    const allMarkets: GammaMarket[] = [];
    let offset = 0;
    const limit = 100;

    while (true) {
      const markets = await this.getMarkets({ limit, offset });

      if (!markets || markets.length === 0) {
        break;
      }

      allMarkets.push(...markets);
      console.log(`Fetched ${allMarkets.length} markets...`);

      // If we got fewer than the limit, we've reached the end
      if (markets.length < limit) {
        break;
      }

      offset += limit;
    }

    return allMarkets;
  }
}

export const gammaClient = new GammaAPIClient();
