import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygon, mainnet } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState, useRef } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

const config = createConfig({
  chains: [mainnet, polygon],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
  },
});

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { sessionToken, setCredentials, disconnect, isConnected } = useAuthStore();
  const [initialized, setInitialized] = useState(false);
  const initRef = useRef(false);

  useEffect(() => {
    // Only run once on mount, not on every sessionToken change
    if (initRef.current) return;
    initRef.current = true;

    const initAuth = async () => {
      // Wait a bit for localStorage to hydrate
      await new Promise(resolve => setTimeout(resolve, 100));

      const token = api.getToken();
      console.log('[AuthInitializer] Token from storage:', token ? 'exists' : 'none');

      if (token) {
        try {
          const res = await api.getSession();
          console.log('[AuthInitializer] getSession result:', res);
          if (res.success) {
            setCredentials(
              res.data.has_polymarket_creds || false,
              res.data.has_kalshi_creds || false
            );
          } else {
            console.log('[AuthInitializer] Session invalid, disconnecting');
            disconnect();
          }
        } catch (error) {
          console.error('[AuthInitializer] getSession error:', error);
          // Don't disconnect on network errors - keep the local state
          // Only disconnect if the session is explicitly invalid
        }
      }
      setInitialized(true);
    };

    initAuth();
  }, []); // Empty deps - only run once on mount

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <AuthInitializer>
          <Component {...pageProps} />
        </AuthInitializer>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
