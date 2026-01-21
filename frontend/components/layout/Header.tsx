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

  // Log state for debugging
  useEffect(() => {
    console.log('[Header] State:', { mounted, _hasHydrated, isConnected, walletConnected, walletAddress: walletAddress?.slice(0, 10) });
  }, [mounted, _hasHydrated, isConnected, walletConnected, walletAddress]);

  const handleConnect = async () => {
    console.log('[Header] handleConnect called, walletConnected:', walletConnected, 'address:', address);

    if (!walletConnected) {
      const connector = connectors[0];
      console.log('[Header] Connecting wallet with connector:', connector?.name);
      if (connector) {
        connect({ connector });
      }
      return;
    }

    if (!address) {
      console.log('[Header] No address available');
      return;
    }

    setLoading(true);
    try {
      // Get nonce from backend
      console.log('[Header] Getting nonce for address:', address);
      const connectRes = await api.connect(address);
      console.log('[Header] Connect response:', connectRes);

      if (!connectRes.success) {
        alert('Failed to connect: ' + connectRes.error);
        setLoading(false);
        return;
      }

      const { nonce, message } = connectRes.data;
      console.log('[Header] Got nonce, requesting signature...');

      // Sign the message
      signMessage(
        { message },
        {
          onSuccess: async (signature) => {
            console.log('[Header] Signature obtained, verifying...');
            // Verify with backend
            const verifyRes = await api.verify(address, signature, nonce);
            console.log('[Header] Verify response:', verifyRes);

            if (verifyRes.success) {
              console.log('[Header] Verification successful, setting connected state');
              setConnected(address, verifyRes.data.session_token);
              setCredentials(
                verifyRes.data.has_polymarket_creds || false,
                verifyRes.data.has_kalshi_creds || false
              );
              console.log('[Header] State updated successfully');
            } else {
              console.error('[Header] Verification failed:', verifyRes.error);
              alert('Verification failed: ' + verifyRes.error);
            }
            setLoading(false);
          },
          onError: (error) => {
            console.error('[Header] Signing error:', error);
            alert('Signing failed: ' + error.message);
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('[Header] Connection error:', error);
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
    <header className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-8">
            <Link href="/" className="text-xl font-bold text-primary-600">
              Mimiq
            </Link>
            <nav className="hidden md:flex space-x-6">
              <Link href="/" className="text-gray-600 hover:text-gray-900">
                Dashboard
              </Link>
              <Link href="/markets" className="text-gray-600 hover:text-gray-900">
                Markets
              </Link>
              <Link href="/leaderboard" className="text-gray-600 hover:text-gray-900">
                Leaderboard
              </Link>
              {isConnected && (
                <>
                  <Link href="/portfolio" className="text-gray-600 hover:text-gray-900">
                    Portfolio
                  </Link>
                  <Link href="/settings" className="text-gray-600 hover:text-gray-900">
                    Settings
                  </Link>
                </>
              )}
            </nav>
          </div>

          <div className="flex items-center space-x-4">
            {isConnected && (
              <div className="flex items-center space-x-2 text-sm">
                {hasPolymarketCreds && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded">Poly</span>
                )}
                {hasKalshiCreds && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">Kalshi</span>
                )}
              </div>
            )}

            {/* Only render wallet state after mount AND hydration to prevent mismatch */}
            {!mounted || !_hasHydrated ? (
              <button className="btn-primary" disabled>
                Loading...
              </button>
            ) : isConnected && walletAddress ? (
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  {shortenAddress(walletAddress)}
                </span>
                <button
                  onClick={handleDisconnect}
                  className="btn-secondary text-sm"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <button
                onClick={handleConnect}
                disabled={loading || signPending}
                className="btn-primary"
              >
                {loading || signPending ? 'Connecting...' : walletConnected ? 'Sign In' : 'Connect Wallet'}
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
