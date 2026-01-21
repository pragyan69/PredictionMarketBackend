import '../styles/globals.css';
import type { AppProps } from 'next/app';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { polygon } from 'wagmi/chains';
import { injected, metaMask } from 'wagmi/connectors';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect } from 'react';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

const config = createConfig({
  chains: [polygon],
  connectors: [
    metaMask(),
    injected(),
  ],
  transports: {
    [polygon.id]: http(),
  },
});

const queryClient = new QueryClient();

function AuthInitializer({ children }: { children: React.ReactNode }) {
  const { sessionToken, setCredentials, disconnect } = useAuthStore();

  useEffect(() => {
    const initAuth = async () => {
      const token = api.getToken();
      if (token) {
        try {
          const res = await api.getSession();
          if (res.success) {
            setCredentials(
              res.data.has_polymarket_creds,
              res.data.has_kalshi_creds
            );
          } else {
            disconnect();
          }
        } catch {
          disconnect();
        }
      }
    };
    initAuth();
  }, [sessionToken, setCredentials, disconnect]);

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
