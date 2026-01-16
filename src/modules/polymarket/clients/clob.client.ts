import axios, { AxiosInstance } from "axios";
import { env } from "../../../config/env";
import { rateLimitManager } from "../utils/rateLimit";

export class CLOBAPIClient {
  private client: AxiosInstance;
  private readonly RATE_LIMIT_KEY = "clob_api";
  public readonly baseUrl: string;

  constructor() {
    this.baseUrl = env.polymarket?.clobApiUrl || "https://clob.polymarket.com";

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 20000,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    // ✅ Debug request/response
    this.client.interceptors.request.use((config) => {
      console.log("➡️  CLOB REQUEST", {
        url: `${config.baseURL}${config.url}`,
        method: config.method,
        params: config.params,
      });
      return config;
    });

    this.client.interceptors.response.use(
      (res) => {
        console.log("✅ CLOB RESPONSE", {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
        });
        return res;
      },
      (err) => {
        console.error("❌ CLOB ERROR", {
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

    rateLimitManager.createLimiter(this.RATE_LIMIT_KEY, env.rateLimit.clobApi);
    console.log(`✅ CLOB API client ready: ${this.baseUrl}`);
  }

  /**
   * ✅ Public Orderbook Snapshot
   * Tries common paths/params used by polymarket.
   */
  async getOrderBook(tokenId: string) {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    // Try common variants (path + param name)
    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("book", { params: { token_id: tokenId } }),
      () => this.client.get("book", { params: { asset_id: tokenId } }),
      () => this.client.get("data/book", { params: { token_id: tokenId } }),
      () => this.client.get("data/book", { params: { asset_id: tokenId } }),
    ];

    return this.tryAttempts(attempts, "getOrderBook");
  }

  /**
   * ✅ Public Price (best bid/ask or last) – depends on API version
   */
  async getPrice(tokenId: string) {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("price", { params: { token_id: tokenId } }),
      () => this.client.get("price", { params: { asset_id: tokenId } }),
      () => this.client.get("data/price", { params: { token_id: tokenId } }),
      () => this.client.get("data/price", { params: { asset_id: tokenId } }),
    ];

    return this.tryAttempts(attempts, "getPrice");
  }

  /**
   * ✅ Public Prices for many tokens
   */
  async getPrices(tokenIds: string[]) {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const joined = tokenIds.join(",");

    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("prices", { params: { token_ids: joined } }),
      () => this.client.get("prices", { params: { asset_ids: joined } }),
      () => this.client.get("data/prices", { params: { token_ids: joined } }),
      () => this.client.get("data/prices", { params: { asset_ids: joined } }),
    ];

    return this.tryAttempts(attempts, "getPrices");
  }

  /**
   * ✅ Public Market Trades (NOT user trades, no L2 header)
   * We collect trades by market (condition_id) or by asset (tokenId) depending on which your pipeline uses.
   *
   * Use whichever you have available:
   * - market = condition_id (recommended)
   * - asset_id/token_id = tokenId
   */
  async getPublicTrades(params: {
    market?: string;      // condition_id
    tokenId?: string;     // asset/token id
    before?: number;
    after?: number;
    limit?: number;
  }) {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const q: any = {
      limit: params.limit ?? 100,
      before: params.before,
      after: params.after,
    };

    // Try both param names
    if (params.market) q.market = params.market;
    if (params.tokenId) {
      q.token_id = params.tokenId;
      q.asset_id = params.tokenId;
    }

    // Try common public endpoints
    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("data/market-trades", { params: q }),
      () => this.client.get("data/trades", { params: q }), // some versions expose public market trades here
      () => this.client.get("trades", { params: q }),
    ];

    return this.tryAttempts(attempts, "getPublicTrades");
  }

  // ---------- helper ----------
  private async tryAttempts(attempts: Array<() => Promise<any>>, label: string) {
    let lastErr: any = null;

    for (let i = 0; i < attempts.length; i++) {
      try {
        const res = await attempts[i]();
        return res.data;
      } catch (err: any) {
        lastErr = err;
        const status = err?.response?.status;
        console.warn(`⚠️  ${label} attempt ${i + 1}/${attempts.length} failed`, {
          status,
          message: err?.message,
        });

        // If it's clearly "unauthorized", stop retrying because that endpoint needs auth
        if (status === 401 || status === 403) break;
      }
    }

    throw lastErr;
  }
}

export const clobClient = new CLOBAPIClient();
