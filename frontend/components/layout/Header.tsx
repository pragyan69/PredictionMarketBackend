import Link from 'next/link';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';
import { useState } from 'react';

export default function Header() {
  const { address, isConnected: walletConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect: walletDisconnect } = useDisconnect();
  const { signMessage, isPending: signPending } = useSignMessage();
  const { isConnected, walletAddress, disconnect, setConnected, setCredentials, hasPolymarketCreds, hasKalshiCreds } = useAuthStore();
  const [loading, setLoading] = useState(false);

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
      // Get nonce from backend
      const connectRes = await api.connect(address);
      if (!connectRes.success) {
        alert('Failed to connect: ' + connectRes.error);
        setLoading(false);
        return;
      }

      const { nonce, message } = connectRes.data;

      // Sign the message
      signMessage(
        { message },
        {
          onSuccess: async (signature) => {
            // Verify with backend
            const verifyRes = await api.verify(address, signature, nonce);
            if (verifyRes.success) {
              setConnected(address, verifyRes.data.session_token);
              setCredentials(
                verifyRes.data.has_polymarket_creds,
                verifyRes.data.has_kalshi_creds
              );
            } else {
              alert('Verification failed: ' + verifyRes.error);
            }
            setLoading(false);
          },
          onError: (error) => {
            console.error('Signing error:', error);
            alert('Signing failed: ' + error.message);
            setLoading(false);
          },
        }
      );
    } catch (error: any) {
      console.error('Connection error:', error);
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

            {isConnected && walletAddress ? (
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
