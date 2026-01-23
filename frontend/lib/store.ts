import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

interface AuthState {
  isConnected: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  hasPolymarketCreds: boolean;
  hasKalshiCreds: boolean;
  _hasHydrated: boolean;
  setConnected: (address: string, token: string) => void;
  setCredentials: (poly: boolean, kalshi: boolean) => void;
  disconnect: () => void;
  setHasHydrated: (state: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isConnected: false,
      walletAddress: null,
      sessionToken: null,
      hasPolymarketCreds: false,
      hasKalshiCreds: false,
      _hasHydrated: false,
      setConnected: (address, token) => {
        console.log('[AuthStore] setConnected called:', { address, token: token ? 'exists' : 'none' });
        set({
          isConnected: true,
          walletAddress: address,
          sessionToken: token,
        });
      },
      setCredentials: (poly, kalshi) =>
        set({
          hasPolymarketCreds: poly,
          hasKalshiCreds: kalshi,
        }),
      disconnect: () => {
        console.log('[AuthStore] disconnect called');
        set({
          isConnected: false,
          walletAddress: null,
          sessionToken: null,
          hasPolymarketCreds: false,
          hasKalshiCreds: false,
        });
      },
      setHasHydrated: (state) => set({ _hasHydrated: state }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        console.log('[AuthStore] Rehydrated:', state?.isConnected ? 'connected' : 'not connected');
        // Sync session token to localStorage for ApiClient
        if (state?.sessionToken && typeof window !== 'undefined') {
          const existingToken = localStorage.getItem('session_token');
          if (!existingToken) {
            localStorage.setItem('session_token', state.sessionToken);
            console.log('[AuthStore] Synced session_token to localStorage');
          }
        }
        state?.setHasHydrated(true);
      },
    }
  )
);

interface Market {
  id: string;
  platform: 'polymarket' | 'kalshi';
  title: string;
  volume: number;
  yesPrice: number;
  noPrice: number;
}

interface MarketsState {
  markets: Market[];
  loading: boolean;
  setMarkets: (markets: Market[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useMarketsStore = create<MarketsState>((set) => ({
  markets: [],
  loading: false,
  setMarkets: (markets) => set({ markets }),
  setLoading: (loading) => set({ loading }),
}));

interface Order {
  id: string;
  platform: string;
  marketId: string;
  side: string;
  action: string;
  price: number;
  quantity: number;
  status: string;
}

interface OrdersState {
  orders: Order[];
  loading: boolean;
  setOrders: (orders: Order[]) => void;
  setLoading: (loading: boolean) => void;
}

export const useOrdersStore = create<OrdersState>((set) => ({
  orders: [],
  loading: false,
  setOrders: (orders) => set({ orders }),
  setLoading: (loading) => set({ loading }),
}));
