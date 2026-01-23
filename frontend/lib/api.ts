import axios, { AxiosInstance } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081/api';

class ApiClient {
  private client: AxiosInstance;
  private token: string | null = null;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('session_token');
      console.log('[ApiClient] Initialized with token:', this.token ? 'exists' : 'none');
    }

    // Add auth header to requests
    this.client.interceptors.request.use((config) => {
      // Always try to get fresh token
      const currentToken = this.getToken();
      if (currentToken) {
        config.headers.Authorization = `Bearer ${currentToken}`;
      }
      return config;
    });

    // Log responses for debugging
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        console.error('[ApiClient] Request failed:', {
          url: error.config?.url,
          status: error.response?.status,
          data: error.response?.data,
        });
        return Promise.reject(error);
      }
    );
  }

  setToken(token: string | null) {
    this.token = token;
    console.log('[ApiClient] setToken called:', token ? 'token set' : 'token cleared');
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('session_token', token);
      } else {
        localStorage.removeItem('session_token');
      }
    }
  }

  getToken(): string | null {
    if (typeof window !== 'undefined') {
      // Always try to get fresh token from storage
      // First try direct storage
      let storedToken = localStorage.getItem('session_token');

      // If not found, try to get from zustand persist store
      if (!storedToken) {
        try {
          const authStorage = localStorage.getItem('auth-storage');
          if (authStorage) {
            const parsed = JSON.parse(authStorage);
            if (parsed?.state?.sessionToken) {
              storedToken = parsed.state.sessionToken;
              // Sync it back to session_token for consistency
              if (storedToken) {
                localStorage.setItem('session_token', storedToken);
                console.log('[ApiClient] Synced token from auth-storage');
              }
            }
          }
        } catch (e) {
          console.error('[ApiClient] Failed to parse auth-storage:', e);
        }
      }

      // Update instance token if we found one
      if (storedToken) {
        this.token = storedToken;
      }
    }
    return this.token;
  }

  // Auth endpoints
  async connect(walletAddress: string) {
    const res = await this.client.post('/auth/connect', { wallet_address: walletAddress });
    return res.data;
  }

  async verify(walletAddress: string, signature: string, nonce: string) {
    const res = await this.client.post('/auth/verify', {
      wallet_address: walletAddress,
      signature,
      nonce,
    });
    if (res.data.success) {
      this.setToken(res.data.data.session_token);
    }
    return res.data;
  }

  async logout() {
    const res = await this.client.post('/auth/logout');
    this.setToken(null);
    return res.data;
  }

  async getSession() {
    const res = await this.client.get('/auth/session');
    return res.data;
  }

  async storePolymarketCredentials(credentials: {
    api_key: string;
    secret: string;
    passphrase: string;
    funder_address?: string;
    signature_type?: number;
  }) {
    const res = await this.client.post('/auth/polymarket/derive', credentials);
    return res.data;
  }

  async storeKalshiCredentials(credentials: {
    api_key_id: string;
    private_key_pem: string;
  }) {
    const res = await this.client.post('/auth/kalshi/register', credentials);
    return res.data;
  }

  // ==================== AUTOMATED SETUP ENDPOINTS ====================

  // Get EIP-712 typed data for Polymarket API key signature
  async getPolymarketSetupData() {
    const res = await this.client.get('/auth/polymarket/setup-data');
    return res.data;
  }

  // Auto-create Polymarket API key with wallet signature
  async polymarketAutoSetup(data: {
    signature: string;
    timestamp: string;
    nonce?: number;
    funder_address?: string;
    signature_type?: number;
  }) {
    const res = await this.client.post('/auth/polymarket/auto-setup', data);
    return res.data;
  }

  // Auto-create Kalshi API key with email/password
  async kalshiAutoSetup(data: {
    email: string;
    password: string;
    method?: 'generate' | 'own_key';
  }) {
    const res = await this.client.post('/auth/kalshi/auto-setup', data);
    return res.data;
  }

  // Get status of all trading credentials
  async getCredentialsStatus() {
    const res = await this.client.get('/auth/credentials/status');
    return res.data;
  }

  // ==================== POLYMARKET DATA ENDPOINTS ====================

  // Get markets from database (aggregated data)
  async getMarkets(params?: { status?: string; limit?: number; offset?: number; search?: string }) {
    const res = await this.client.get('/polymarket/markets', { params });
    return res.data;
  }

  // Get single market by ID
  async getMarketById(id: string) {
    const res = await this.client.get(`/polymarket/markets/${id}`);
    return res.data;
  }

  // Get market by condition ID
  async getMarketByConditionId(conditionId: string) {
    const res = await this.client.get(`/polymarket/markets/condition/${conditionId}`);
    return res.data;
  }

  // Get events from database
  async getEvents(params?: { limit?: number; offset?: number; search?: string }) {
    const res = await this.client.get('/polymarket/events', { params });
    return res.data;
  }

  // Get single event by ID
  async getEventById(id: string) {
    const res = await this.client.get(`/polymarket/events/${id}`);
    return res.data;
  }

  // Get leaderboard from database
  async getLeaderboard(params?: { platform?: string; period?: string; limit?: number; offset?: number }) {
    // For now, only Polymarket has leaderboard data
    // Kalshi leaderboard can be added later when available
    const { platform, period, ...rest } = params || {};
    const res = await this.client.get('/polymarket/leaderboard', { params: rest });
    return res.data;
  }

  // Get trades from database
  async getTrades(params?: { market_id?: string; condition_id?: string; user_address?: string; limit?: number }) {
    const res = await this.client.get('/polymarket/trades', { params });
    return res.data;
  }

  // Get polymarket stats
  async getPolymarketStats() {
    const res = await this.client.get('/polymarket/stats');
    return res.data;
  }

  // ==================== KALSHI DATA ENDPOINTS ====================

  // Get Kalshi markets from database
  async getKalshiMarkets(params?: { status?: string; limit?: number; offset?: number; search?: string }) {
    const res = await this.client.get('/kalshi/markets', { params });
    return res.data;
  }

  // Get single Kalshi market by ID
  async getKalshiMarketById(id: string) {
    const res = await this.client.get(`/kalshi/markets/${id}`);
    return res.data;
  }

  // Get Kalshi market by ticker
  async getKalshiMarketByTicker(ticker: string) {
    const res = await this.client.get(`/kalshi/markets/ticker/${ticker}`);
    return res.data;
  }

  // Get Kalshi events from database
  async getKalshiEvents(params?: { limit?: number; offset?: number; search?: string }) {
    const res = await this.client.get('/kalshi/events', { params });
    return res.data;
  }

  // Get single Kalshi event by ID
  async getKalshiEventById(id: string) {
    const res = await this.client.get(`/kalshi/events/${id}`);
    return res.data;
  }

  // Get Kalshi trades from database
  async getKalshiTrades(params?: { market_id?: string; ticker?: string; limit?: number }) {
    const res = await this.client.get('/kalshi/trades', { params });
    return res.data;
  }

  // Get Kalshi stats
  async getKalshiStats() {
    const res = await this.client.get('/kalshi/stats');
    return res.data;
  }

  // ==================== LIVE DATA ENDPOINTS (From APIs directly) ====================

  // Get live markets from Gamma API
  async getLiveMarkets(params?: { limit?: number; active?: boolean }) {
    const res = await this.client.get('/polymarket/mainData/gamma/markets', { params });
    return res.data;
  }

  // Get live events from Gamma API
  async getLiveEvents(params?: { limit?: number; active?: boolean }) {
    const res = await this.client.get('/polymarket/mainData/gamma/events', { params });
    return res.data;
  }

  // Get live leaderboard from Data API
  async getLiveLeaderboard(params?: { limit?: number }) {
    const res = await this.client.get('/polymarket/mainData/leaderboard', { params });
    return res.data;
  }

  // Get orderbook for a token
  async getOrderbook(tokenId: string) {
    const res = await this.client.get(`/polymarket/mainData/clob/orderbook/${tokenId}`);
    return res.data;
  }

  // Get price for a token
  async getPrice(tokenId: string) {
    const res = await this.client.get(`/polymarket/mainData/clob/price/${tokenId}`);
    return res.data;
  }

  // ==================== AGGREGATION PIPELINE ENDPOINTS ====================

  // Start Polymarket aggregation pipeline
  async startPolymarketPipeline(config?: { topTradersLimit?: number; enableOrderbookFetch?: boolean }) {
    const res = await this.client.post('/polymarket/aggregation/start', config);
    return res.data;
  }

  // Get Polymarket pipeline status
  async getPolymarketPipelineStatus() {
    const res = await this.client.get('/polymarket/aggregation/status');
    return res.data;
  }

  // Start Kalshi aggregation pipeline
  async startKalshiPipeline(config?: { testMode?: 'quick' | 'moderate' | 'production' }) {
    const res = await this.client.post('/kalshi/aggregation/start', config);
    return res.data;
  }

  // Get Kalshi pipeline status
  async getKalshiPipelineStatus() {
    const res = await this.client.get('/kalshi/aggregation/status');
    return res.data;
  }

  // ==================== WEBSOCKET CONTROL ENDPOINTS ====================

  // Polymarket CLOB WebSocket
  async startClobWebSocket() {
    const res = await this.client.post('/polymarket/clob-ws/start');
    return res.data;
  }

  async stopClobWebSocket() {
    const res = await this.client.post('/polymarket/clob-ws/stop');
    return res.data;
  }

  async getClobWebSocketStatus() {
    const res = await this.client.get('/polymarket/clob-ws/status');
    return res.data;
  }

  // Polymarket RTDS WebSocket
  async startRtdsWebSocket() {
    const res = await this.client.post('/polymarket/rtds-ws/start');
    return res.data;
  }

  async stopRtdsWebSocket() {
    const res = await this.client.post('/polymarket/rtds-ws/stop');
    return res.data;
  }

  // Kalshi WebSocket
  async startKalshiWebSocket() {
    const res = await this.client.post('/kalshi/ws/connect');
    return res.data;
  }

  async stopKalshiWebSocket() {
    const res = await this.client.post('/kalshi/ws/disconnect');
    return res.data;
  }

  async getKalshiWebSocketStatus() {
    const res = await this.client.get('/kalshi/ws/status');
    return res.data;
  }

  // ==================== ORDERS ENDPOINTS ====================

  async createOrder(order: {
    platform: 'polymarket' | 'kalshi';
    market_id: string;
    side: 'yes' | 'no';
    action: 'buy' | 'sell';
    price: number;
    quantity: number;
    order_type?: 'limit' | 'market';
    time_in_force?: 'gtc' | 'gtd' | 'fok' | 'ioc';
    private_key?: string;
  }) {
    const res = await this.client.post('/orders', order);
    return res.data;
  }

  async getOrders(params?: { platform?: string; status?: string; limit?: number }) {
    const res = await this.client.get('/orders', { params });
    return res.data;
  }

  async getOrder(id: string) {
    const res = await this.client.get(`/orders/${id}`);
    return res.data;
  }

  async cancelOrder(id: string, platform: string) {
    const res = await this.client.delete(`/orders/${id}`, { params: { platform } });
    return res.data;
  }

  // ==================== PORTFOLIO ENDPOINTS ====================

  async getPortfolio() {
    const res = await this.client.get('/portfolio');
    return res.data;
  }

  async getPositions(platform?: string) {
    const res = await this.client.get('/portfolio/positions', { params: { platform } });
    return res.data;
  }

  async getTradeHistory(params?: { platform?: string; limit?: number }) {
    const res = await this.client.get('/portfolio/history', { params });
    return res.data;
  }

  async getBalances() {
    const res = await this.client.get('/balance');
    return res.data;
  }

  // ==================== DFLOW ENDPOINTS ====================

  // Get DFlow events with nested markets
  async getDFlowEvents(params?: { limit?: number; offset?: number; status?: string; category?: string }) {
    const res = await this.client.get('/dflow/events', { params });
    return res.data;
  }

  // Get single DFlow event by ID
  async getDFlowEventById(id: string) {
    const res = await this.client.get(`/dflow/events/${id}`);
    return res.data;
  }

  // Get DFlow markets
  async getDFlowMarkets(params?: { limit?: number; offset?: number; status?: string }) {
    const res = await this.client.get('/dflow/markets', { params });
    return res.data;
  }

  // Get single DFlow market by ID
  async getDFlowMarketById(id: string) {
    const res = await this.client.get(`/dflow/markets/${id}`);
    return res.data;
  }

  // Get DFlow market by ticker
  async getDFlowMarketByTicker(ticker: string) {
    const res = await this.client.get(`/dflow/markets/ticker/${ticker}`);
    return res.data;
  }

  // Search DFlow markets
  async searchDFlowMarkets(query: string, limit?: number) {
    const res = await this.client.get('/dflow/markets/search', { params: { q: query, limit } });
    return res.data;
  }

  // Get DFlow market mints (yesMint, noMint)
  async getDFlowMarketMints(marketId: string) {
    const res = await this.client.get(`/dflow/markets/${marketId}/mints`);
    return res.data;
  }

  // Get DFlow orderbook
  async getDFlowOrderbook(ticker: string) {
    const res = await this.client.get(`/dflow/orderbook/${ticker}`);
    return res.data;
  }

  // Get DFlow trades
  async getDFlowTrades(params?: { market_id?: string; market_ticker?: string; limit?: number; cursor?: string }) {
    const res = await this.client.get('/dflow/trades', { params });
    return res.data;
  }

  // Get swap quote for DFlow
  async getDFlowQuote(data: {
    inputMint: string;
    outputMint: string;
    amount: string;
    slippageBps?: number;
    userPublicKey?: string;
  }) {
    const res = await this.client.post('/dflow/quote', data);
    return res.data;
  }

  // Create DFlow swap transaction
  async createDFlowSwap(data: {
    userPublicKey: string;
    quoteResponse: any;
    wrapAndUnwrapSol?: boolean;
    computeUnitPriceMicroLamports?: number;
  }) {
    const res = await this.client.post('/dflow/swap', data);
    return res.data;
  }

  // Get DFlow swap instructions
  async getDFlowSwapInstructions(data: {
    userPublicKey: string;
    quoteResponse: any;
    wrapAndUnwrapSol?: boolean;
  }) {
    const res = await this.client.post('/dflow/swap-instructions', data);
    return res.data;
  }

  // Execute a trade on DFlow (convenience method)
  async executeDFlowTrade(data: {
    marketId: string;
    side: 'yes' | 'no';
    action: 'buy' | 'sell';
    amount: number;
    userPublicKey: string;
    slippageBps?: number;
  }) {
    const res = await this.client.post('/dflow/trade', data);
    return res.data;
  }

  // Get trade quote for DFlow (without creating transaction)
  async getDFlowTradeQuote(data: {
    marketId: string;
    side: 'yes' | 'no';
    action: 'buy' | 'sell';
    amount: number;
    userPublicKey?: string;
    slippageBps?: number;
  }) {
    const res = await this.client.post('/dflow/trade/quote', data);
    return res.data;
  }

  // DFlow health check
  async getDFlowHealth() {
    const res = await this.client.get('/dflow/health');
    return res.data;
  }
}

export const api = new ApiClient();
