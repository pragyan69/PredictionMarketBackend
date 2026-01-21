import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AuthState {
  isConnected: boolean;
  walletAddress: string | null;
  sessionToken: string | null;
  hasPolymarketCreds: boolean;
  hasKalshiCreds: boolean;
  setConnected: (address: string, token: string) => void;
  setCredentials: (poly: boolean, kalshi: boolean) => void;
  disconnect: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isConnected: false,
      walletAddress: null,
      sessionToken: null,
      hasPolymarketCreds: false,
      hasKalshiCreds: false,
      setConnected: (address, token) =>
        set({
          isConnected: true,
          walletAddress: address,
          sessionToken: token,
        }),
      setCredentials: (poly, kalshi) =>
        set({
          hasPolymarketCreds: poly,
          hasKalshiCreds: kalshi,
        }),
      disconnect: () =>
        set({
          isConnected: false,
          walletAddress: null,
          sessionToken: null,
          hasPolymarketCreds: false,
          hasKalshiCreds: false,
        }),
    }),
    {
      name: 'auth-storage',
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
