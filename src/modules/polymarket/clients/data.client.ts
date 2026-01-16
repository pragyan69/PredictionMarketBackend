import axios, { AxiosInstance } from "axios";
import { env } from "../../../config/env";
import { rateLimitManager } from "../utils/rateLimit";
import {
  LeaderboardParams,
  LeaderboardEntry,
  PositionsParams,
  PositionEntry,
  TradesParams,
  TradeEntry,
  ActivityParams,
  ActivityEntry,
} from "../types/data.types";

export class DataAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = "data_api";
  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.polymarket?.dataApiUrl || "https://data-api.polymarket.com";

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 15000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    // ✅ request debug
    this.client.interceptors.request.use((config) => {
      console.log("➡️  DATA API REQUEST", {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    // ✅ response/error debug
    this.client.interceptors.response.use(
      (res) => {
        console.log("✅ DATA API RESPONSE", {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
        });
        return res;
      },
      (err) => {
        console.error("❌ DATA API ERROR", {
          message: err.message,
          code: err.code,
          url: err.config?.baseURL ? `${err.config.baseURL}${err.config.url}` : err.config?.url,
          method: err.config?.method,
          params: err.config?.params,
          status: err.response?.status,
          data: err.response?.data,
        });
        return Promise.reject(err);
      }
    );

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.dataApi);
    console.log(`✅ Data API client ready: ${this.baseUrl}`);
  }

  /**
   * GET /v1/leaderboard
   * Fetches top traders with ranking and stats
   */
  async getLeaderboard(params?: LeaderboardParams): Promise<LeaderboardEntry[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    const response = await this.client.get<LeaderboardEntry[]>("/v1/leaderboard", { params });
    return response.data;
  }

  /**
   * GET /positions
   * Fetches open positions for a trader
   */
  async getPositions(params: PositionsParams): Promise<PositionEntry[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    const response = await this.client.get<PositionEntry[]>("/positions", { params });
    return response.data;
  }

  /**
   * GET /trades
   * Fetches trades for markets
   */
  async getTrades(params?: TradesParams): Promise<TradeEntry[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    const response = await this.client.get<TradeEntry[]>("/trades", { params });
    return response.data;
  }

  /**
   * GET /activity
   * Fetches user's on-chain activity
   */
  async getActivity(params: ActivityParams): Promise<ActivityEntry[]> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);
    const response = await this.client.get<ActivityEntry[]>("/activity", { params });
    return response.data;
  }

  // ========================================
  // Legacy method aliases for backward compatibility
  // ========================================

  /**
   * @deprecated Use getPositions instead
   */
  async getCurrentPositions(address: string, params?: { limit?: number; offset?: number }): Promise<PositionEntry[]> {
    return this.getPositions({ user: address, ...params });
  }

  /**
   * @deprecated Use getActivity instead
   */
  async getUserActivity(address: string, params?: { limit?: number; offset?: number }): Promise<ActivityEntry[]> {
    return this.getActivity({ user: address, ...params });
  }

  /**
   * @deprecated Market activity is now fetched via getTrades with market filter
   */
  async getMarketActivity(marketId: string, params?: { limit?: number; offset?: number }): Promise<TradeEntry[]> {
    return this.getTrades({ market: [marketId], ...params });
  }
}

export const dataClient = new DataAPIClient();
