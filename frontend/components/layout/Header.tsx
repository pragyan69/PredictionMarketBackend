import Link from 'next/link';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

export default function Header() {
  const { address, isConnected: walletConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: walletDisconnect } = useDisconnect();
  const { signMessage, isPending: signPending } = useSignMessage();
  const { isConnected, walletAddress, disconnect, setConnected, setCredentials, hasPolymarketCreds, hasKalshiCreds, _hasHydrated } = useAuthStore();
  const [loading, setLoading] = useState(false);

  // Fix hydration mismatch - only render wallet state after mount AND hydration
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    if (!walletConnected) {
      const connector = connectors[0];
      if (connector) {
        connect({ connector });
      }
      return;
    }

    if (!address) return;

    setLoading(true);
    try {
      const connectRes = await api.connect(address);

      if (!connectRes.success) {
        alert('Failed to connect: ' + connectRes.error);
        setLoading(false);
        return;
      }

      const { nonce, message } = connectRes.data;

      signMessage(
        { message },
        {
          onSuccess: async (signature) => {
            const verifyRes = await api.verify(address, signature, nonce);

            if (verifyRes.success) {
              setConnected(address, verifyRes.data.session_token);
              setCredentials(
                verifyRes.data.has_polymarket_creds || false,
                verifyRes.data.has_kalshi_creds || false
              );
            } else {
              alert('Verification failed: ' + verifyRes.error);
            }
            setLoading(false);
          },
          onError: (error) => {
            alert('Signing failed: ' + error.message);
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      alert('Connection failed: ' + error.message);
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await api.logout();
    } catch {}
    disconnect();
    walletDisconnect();
  };

  const shortenAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <header className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-100 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:shadow-indigo-500/30 transition-shadow">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                PredictX
              </span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              <Link href="/" className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                Dashboard
              </Link>
              <Link href="/markets" className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                Markets
              </Link>
              <Link href="/leaderboard" className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                Leaderboard
              </Link>
              {isConnected && (
                <>
                  <Link href="/portfolio" className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                    Portfolio
                  </Link>
                  <Link href="/settings" className="px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors text-sm font-medium">
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-3">
            {/* Platform badges */}
            {isConnected && (
              <div className="hidden sm:flex items-center space-x-1.5">
                {hasPolymarketCreds && (
                  <span className="px-2.5 py-1 bg-purple-50 text-purple-700 rounded-lg text-xs font-medium border border-purple-100">
                    Polymarket
                  </span>
                )}
                {hasKalshiCreds && (
                  <span className="px-2.5 py-1 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium border border-blue-100">
                    Kalshi
                  </span>
                )}
              </div>
            )}

            {/* Wallet Connection */}
            {!mounted || !_hasHydrated ? (
              <button className="px-4 py-2 bg-gray-100 text-gray-400 rounded-xl text-sm font-medium" disabled>
                Loading...
              </button>
            ) : isConnected && walletAddress ? (
              <div className="flex items-center space-x-2">
                <div className="hidden sm:flex items-center px-3 py-1.5 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-pulse"></div>
                  <span className="text-sm text-gray-600 font-medium">
                    {shortenAddress(walletAddress)}
                  </span>
                </div>
                <button
                  onClick={handleDisconnect}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl text-sm font-medium transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading || signPending}
                className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl text-sm font-medium transition-all shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading || signPending ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connecting...
                  </span>
                ) : walletConnected ? (
                  'Sign In'
                ) : (
                  'Connect Wallet'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
