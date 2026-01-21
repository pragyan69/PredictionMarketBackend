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
        const dataInfo = Array.isArray(res.data)
          ? `Array[${res.data.length}]${res.data.length > 0 ? ` first: ${JSON.stringify(res.data[0]).substring(0, 200)}...` : ''}`
          : typeof res.data === 'object'
          ? `Object keys: ${Object.keys(res.data || {}).join(', ')}`
          : typeof res.data;
        console.log("✅ CLOB RESPONSE", {
          status: res.status,
          url: `${res.config.baseURL}${res.config.url}`,
          dataType: dataInfo,
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

    // Try common variants (path + param name) - paths must start with /
    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("/book", { params: { token_id: tokenId } }),
      () => this.client.get("/book", { params: { asset_id: tokenId } }),
      () => this.client.get("/data/book", { params: { token_id: tokenId } }),
      () => this.client.get("/data/book", { params: { asset_id: tokenId } }),
    ];

    return this.tryAttempts(attempts, "getOrderBook");
  }

  /**
   * ✅ Public Price (best bid/ask or last)
   * API: GET https://clob.polymarket.com/price?token_id=<token_id>&side=<BUY|SELL>
   * @param tokenId - The token ID
   * @param side - "BUY" or "SELL" (BUY = best ask price, SELL = best bid price)
   */
  async getPrice(tokenId: string, side: "BUY" | "SELL" = "BUY") {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    // API requires both token_id and side parameters
    const response = await this.client.get("/price", {
      params: { token_id: tokenId, side },
    });
    return response.data;
  }

  /**
   * ✅ Get both BUY and SELL prices for a token (to calculate mid price)
   */
  async getPriceBothSides(tokenId: string): Promise<{ buy: number; sell: number; mid: number }> {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    try {
      const [buyRes, sellRes] = await Promise.all([
        this.client.get("/price", { params: { token_id: tokenId, side: "BUY" } }),
        this.client.get("/price", { params: { token_id: tokenId, side: "SELL" } }),
      ]);

      const buyPrice = parseFloat(buyRes.data?.price || "0");
      const sellPrice = parseFloat(sellRes.data?.price || "0");
      const midPrice = (buyPrice + sellPrice) / 2;

      return { buy: buyPrice, sell: sellPrice, mid: midPrice };
    } catch (error) {
      console.warn(`⚠️ Failed to get prices for token ${tokenId}:`, error);
      return { buy: 0, sell: 0, mid: 0 };
    }
  }

  /**
   * ✅ Public Prices for many tokens (batch endpoint)
   * API: GET https://clob.polymarket.com/prices?token_ids=<id1>,<id2>,...&side=<BUY|SELL>
   * @param tokenIds - Array of token IDs
   * @param side - "BUY" or "SELL"
   */
  async getPrices(tokenIds: string[], side: "BUY" | "SELL" = "BUY") {
    await rateLimitManager.acquire(this.RATE_LIMIT_KEY);

    const joined = tokenIds.join(",");

    // API requires both token_ids and side parameters
    const response = await this.client.get("/prices", {
      params: { token_ids: joined, side },
    });
    return response.data;
  }

  /**
   * ✅ Get prices for multiple tokens with both sides (for mid price calculation)
   */
  async getPricesBothSides(tokenIds: string[]): Promise<Map<string, number>> {
    const priceMap = new Map<string, number>();

    if (tokenIds.length === 0) return priceMap;

    try {
      const joined = tokenIds.join(",");

      // Fetch both buy and sell prices
      const [buyRes, sellRes] = await Promise.all([
        this.client.get("/prices", { params: { token_ids: joined, side: "BUY" } }),
        this.client.get("/prices", { params: { token_ids: joined, side: "SELL" } }),
      ]);

      // Parse responses - format is typically { "token_id": "price", ... }
      const buyPrices = buyRes.data || {};
      const sellPrices = sellRes.data || {};

      for (const tokenId of tokenIds) {
        const buyPrice = parseFloat(buyPrices[tokenId] || "0");
        const sellPrice = parseFloat(sellPrices[tokenId] || "0");

        // Calculate mid price
        if (buyPrice > 0 || sellPrice > 0) {
          const midPrice = (buyPrice + sellPrice) / 2;
          priceMap.set(tokenId, midPrice);
        }
      }
    } catch (error) {
      console.warn(`⚠️ Failed to get batch prices:`, error);
    }

    return priceMap;
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

    // Try common public endpoints - paths must start with /
    const attempts: Array<() => Promise<any>> = [
      () => this.client.get("/data/market-trades", { params: q }),
      () => this.client.get("/data/trades", { params: q }), // some versions expose public market trades here
      () => this.client.get("/trades", { params: q }),
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
