import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

// Check if window.ethereum is available for wallet signing
declare global {
  interface Window {
    ethereum?: any;
  }
}

export default function SettingsPage() {
  const router = useRouter();
  const { isConnected, walletAddress, hasPolymarketCreds, hasKalshiCreds, setCredentials } = useAuthStore();

  // Tab state
  const [activeTab, setActiveTab] = useState<'quick' | 'manual'>('quick');

  // Polymarket auto-setup state
  const [polyAutoLoading, setPolyAutoLoading] = useState(false);
  const [polyAutoResult, setPolyAutoResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kalshi auto-setup state
  const [kalshiEmail, setKalshiEmail] = useState('');
  const [kalshiPassword, setKalshiPassword] = useState('');
  const [kalshiAutoLoading, setKalshiAutoLoading] = useState(false);
  const [kalshiAutoResult, setKalshiAutoResult] = useState<{ success: boolean; message: string } | null>(null);

  // Manual Polymarket credentials
  const [polyApiKey, setPolyApiKey] = useState('');
  const [polySecret, setPolySecret] = useState('');
  const [polyPassphrase, setPolyPassphrase] = useState('');
  const [polyFunder, setPolyFunder] = useState('');
  const [polyLoading, setPolyLoading] = useState(false);
  const [polyResult, setPolyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Manual Kalshi credentials
  const [kalshiKeyId, setKalshiKeyId] = useState('');
  const [kalshiPrivateKey, setKalshiPrivateKey] = useState('');
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [kalshiResult, setKalshiResult] = useState<{ success: boolean; message: string } | null>(null);

  // Refresh credentials status on mount
  useEffect(() => {
    const refreshStatus = async () => {
      try {
        const res = await api.getCredentialsStatus();
        if (res.success) {
          setCredentials(res.data.polymarket.configured, res.data.kalshi.configured);
        }
      } catch (err) {
        // Ignore errors
      }
    };
    if (isConnected) {
      refreshStatus();
    }
  }, [isConnected, setCredentials]);

  if (!isConnected) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

  // ============================================
  // POLYMARKET AUTO-SETUP
  // ============================================
  // Switch to Polygon network
  const switchToPolygon = async (): Promise<boolean> => {
    if (!window.ethereum) return false;

    const POLYGON_CHAIN_ID = '0x89'; // 137 in hex

    try {
      // Try to switch to Polygon
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: POLYGON_CHAIN_ID }],
      });
      return true;
    } catch (switchError: any) {
      // If Polygon is not added to wallet, add it
      if (switchError.code === 4902) {
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: POLYGON_CHAIN_ID,
              chainName: 'Polygon Mainnet',
              nativeCurrency: {
                name: 'MATIC',
                symbol: 'MATIC',
                decimals: 18,
              },
              rpcUrls: ['https://polygon-rpc.com'],
              blockExplorerUrls: ['https://polygonscan.com'],
            }],
          });
          return true;
        } catch (addError) {
          console.error('Failed to add Polygon network:', addError);
          return false;
        }
      }
      // User rejected the switch
      if (switchError.code === 4001) {
        return false;
      }
      console.error('Failed to switch network:', switchError);
      return false;
    }
  };

  const handlePolymarketAutoSetup = async () => {
    if (!window.ethereum) {
      setPolyAutoResult({ success: false, message: 'No wallet detected. Please install MetaMask or another Web3 wallet.' });
      return;
    }

    setPolyAutoLoading(true);
    setPolyAutoResult(null);

    try {
      // Debug: Check if token exists
      const token = api.getToken();
      console.log('[Settings] Token before request:', token ? token.substring(0, 20) + '...' : 'NO TOKEN');

      // If no token, session may have expired - redirect to reconnect
      if (!token) {
        setPolyAutoResult({
          success: false,
          message: 'Session expired. Please disconnect and reconnect your wallet.'
        });
        setPolyAutoLoading(false);
        return;
      }

      // Check current chain and switch to Polygon if needed
      const currentChainId = await window.ethereum.request({ method: 'eth_chainId' });
      console.log('[Settings] Current chain ID:', currentChainId);

      if (currentChainId !== '0x89') { // Not Polygon
        console.log('[Settings] Switching to Polygon network...');
        const switched = await switchToPolygon();
        if (!switched) {
          setPolyAutoResult({
            success: false,
            message: 'Please switch to Polygon network to set up Polymarket credentials.'
          });
          setPolyAutoLoading(false);
          return;
        }
        // Wait a moment for the network switch to complete
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Step 1: Get the typed data to sign
      const setupRes = await api.getPolymarketSetupData();
      if (!setupRes.success) {
        throw new Error(setupRes.error || 'Failed to get setup data');
      }

      const { timestamp, nonce, typedData } = setupRes.data;

      // Step 2: Request signature from wallet
      const accounts = await window.ethereum.request({ method: 'eth_accounts' });
      const account = accounts[0];

      if (!account) {
        throw new Error('No wallet connected');
      }

      // Sign the EIP-712 typed data
      const signature = await window.ethereum.request({
        method: 'eth_signTypedData_v4',
        params: [account, JSON.stringify(typedData)],
      });

      // Step 3: Send signature to backend to create API key
      const result = await api.polymarketAutoSetup({
        signature,
        timestamp,
        nonce,
        funder_address: account,
        signature_type: 0, // EOA
      });

      if (result.success) {
        setPolyAutoResult({ success: true, message: 'Polymarket API key created successfully!' });
        setCredentials(true, hasKalshiCreds);
      } else {
        throw new Error(result.error || 'Failed to create API key');
      }
    } catch (err: any) {
      console.error('Polymarket auto-setup error:', err);
      let message = err.message || 'Failed to setup Polymarket';
      if (err.code === 4001) {
        message = 'Signature request was rejected';
      } else if (err.response?.status === 401) {
        message = 'Session expired. Please disconnect and reconnect your wallet.';
      }
      setPolyAutoResult({ success: false, message });
    } finally {
      setPolyAutoLoading(false);
    }
  };

  // ============================================
  // KALSHI AUTO-SETUP
  // ============================================
  const handleKalshiAutoSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setKalshiAutoLoading(true);
    setKalshiAutoResult(null);

    try {
      const result = await api.kalshiAutoSetup({
        email: kalshiEmail,
        password: kalshiPassword,
        method: 'generate',
      });

      if (result.success) {
        setKalshiAutoResult({ success: true, message: 'Kalshi API key created successfully!' });
        setCredentials(hasPolymarketCreds, true);
        setKalshiEmail('');
        setKalshiPassword('');
      } else {
        throw new Error(result.error || 'Failed to create API key');
      }
    } catch (err: any) {
      console.error('Kalshi auto-setup error:', err);
      setKalshiAutoResult({ success: false, message: err.response?.data?.error || err.message || 'Failed to setup Kalshi' });
    } finally {
      setKalshiAutoLoading(false);
    }
  };

  // ============================================
  // MANUAL POLYMARKET SUBMIT
  // ============================================
  const handlePolymarketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPolyLoading(true);
    setPolyResult(null);

    try {
      const res = await api.storePolymarketCredentials({
        api_key: polyApiKey,
        secret: polySecret,
        passphrase: polyPassphrase,
        funder_address: polyFunder || undefined,
      });

      if (res.success) {
        setPolyResult({ success: true, message: 'Polymarket credentials saved!' });
        setCredentials(true, hasKalshiCreds);
        setPolyApiKey('');
        setPolySecret('');
        setPolyPassphrase('');
        setPolyFunder('');
      } else {
        setPolyResult({ success: false, message: res.error || 'Failed to save credentials' });
      }
    } catch (err: any) {
      setPolyResult({ success: false, message: err.message || 'Failed to save credentials' });
    } finally {
      setPolyLoading(false);
    }
  };

  // ============================================
  // MANUAL KALSHI SUBMIT
  // ============================================
  const handleKalshiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setKalshiLoading(true);
    setKalshiResult(null);

    try {
      const res = await api.storeKalshiCredentials({
        api_key_id: kalshiKeyId,
        private_key_pem: kalshiPrivateKey,
      });

      if (res.success) {
        setKalshiResult({ success: true, message: 'Kalshi credentials saved!' });
        setCredentials(hasPolymarketCreds, true);
        setKalshiKeyId('');
        setKalshiPrivateKey('');
      } else {
        setKalshiResult({ success: false, message: res.error || 'Failed to save credentials' });
      }
    } catch (err: any) {
      setKalshiResult({ success: false, message: err.message || 'Failed to save credentials' });
    } finally {
      setKalshiLoading(false);
    }
  };

  return (
    <Layout title="Settings - Mimiq">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Trading Setup</h1>
        <p className="text-gray-600">Connect your trading accounts to start trading</p>
      </div>

      {/* Status Overview */}
      <div className="mb-8 p-4 bg-gray-50 rounded-lg">
        <h2 className="text-lg font-semibold mb-4">Connection Status</h2>
        <div className="flex gap-4">
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${hasPolymarketCreds ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${hasPolymarketCreds ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            Polymarket {hasPolymarketCreds ? 'Connected' : 'Not Connected'}
          </div>
          <div className={`flex items-center gap-2 px-4 py-2 rounded-full ${hasKalshiCreds ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-600'}`}>
            <span className={`w-2 h-2 rounded-full ${hasKalshiCreds ? 'bg-green-500' : 'bg-gray-400'}`}></span>
            Kalshi {hasKalshiCreds ? 'Connected' : 'Not Connected'}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 border-b">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('quick')}
            className={`pb-3 px-1 font-medium ${activeTab === 'quick' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Quick Setup (Recommended)
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`pb-3 px-1 font-medium ${activeTab === 'manual' ? 'border-b-2 border-primary-600 text-primary-600' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Manual Setup
          </button>
        </div>
      </div>

      {activeTab === 'quick' ? (
        // ============================================
        // QUICK SETUP TAB
        // ============================================
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Polymarket Quick Setup */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Polymarket</h2>
              {hasPolymarketCreds && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                  Connected
                </span>
              )}
            </div>

            <div className="mb-6">
              <p className="text-gray-600 text-sm mb-4">
                Connect with one click! Sign a message with your wallet to automatically create your Polymarket API credentials.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm text-blue-800">
                <strong>How it works:</strong>
                <ol className="list-decimal ml-4 mt-1 space-y-1">
                  <li>Click the button below</li>
                  <li>Sign the message in your wallet (MetaMask)</li>
                  <li>Your API key is automatically created</li>
                </ol>
              </div>
            </div>

            <button
              onClick={handlePolymarketAutoSetup}
              disabled={polyAutoLoading || hasPolymarketCreds}
              className={`w-full py-3 px-4 rounded-lg font-medium ${
                hasPolymarketCreds
                  ? 'bg-green-100 text-green-800 cursor-not-allowed'
                  : 'bg-primary-600 hover:bg-primary-700 text-white'
              }`}
            >
              {polyAutoLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Waiting for signature...
                </span>
              ) : hasPolymarketCreds ? (
                'Already Connected'
              ) : (
                'Connect Polymarket (1-Click)'
              )}
            </button>

            {polyAutoResult && (
              <div
                className={`mt-4 p-3 rounded ${
                  polyAutoResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {polyAutoResult.message}
              </div>
            )}
          </div>

          {/* Kalshi Quick Setup */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Kalshi</h2>
              {hasKalshiCreds && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                  Connected
                </span>
              )}
            </div>

            <div className="mb-4">
              <p className="text-gray-600 text-sm mb-4">
                Enter your Kalshi login credentials to automatically generate and store your API key.
              </p>
              <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-800">
                <strong>Note:</strong> Your password is only used once to create the API key. It is NOT stored.
              </div>
            </div>

            {hasKalshiCreds ? (
              <div className="text-center py-6">
                <span className="text-green-600 text-lg">Kalshi is connected!</span>
              </div>
            ) : (
              <form onSubmit={handleKalshiAutoSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kalshi Email
                  </label>
                  <input
                    type="email"
                    value={kalshiEmail}
                    onChange={(e) => setKalshiEmail(e.target.value)}
                    className="input w-full"
                    placeholder="your@email.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Kalshi Password
                  </label>
                  <input
                    type="password"
                    value={kalshiPassword}
                    onChange={(e) => setKalshiPassword(e.target.value)}
                    className="input w-full"
                    placeholder="Your Kalshi password"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={kalshiAutoLoading}
                  className="btn-primary w-full"
                >
                  {kalshiAutoLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Creating API Key...
                    </span>
                  ) : (
                    'Connect Kalshi'
                  )}
                </button>

                {kalshiAutoResult && (
                  <div
                    className={`p-3 rounded ${
                      kalshiAutoResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {kalshiAutoResult.message}
                  </div>
                )}
              </form>
            )}
          </div>
        </div>
      ) : (
        // ============================================
        // MANUAL SETUP TAB
        // ============================================
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Polymarket Manual Credentials */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Polymarket</h2>
              {hasPolymarketCreds && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                  Connected
                </span>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Enter your Polymarket CLOB API credentials manually. You can generate these from the{' '}
              <a
                href="https://docs.polymarket.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Polymarket documentation
              </a>
              .
            </p>

            <form onSubmit={handlePolymarketSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key
                </label>
                <input
                  type="text"
                  value={polyApiKey}
                  onChange={(e) => setPolyApiKey(e.target.value)}
                  className="input w-full"
                  placeholder="Your API key"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Secret
                </label>
                <input
                  type="password"
                  value={polySecret}
                  onChange={(e) => setPolySecret(e.target.value)}
                  className="input w-full"
                  placeholder="Your API secret"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Passphrase
                </label>
                <input
                  type="password"
                  value={polyPassphrase}
                  onChange={(e) => setPolyPassphrase(e.target.value)}
                  className="input w-full"
                  placeholder="Your API passphrase"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Funder Address (optional)
                </label>
                <input
                  type="text"
                  value={polyFunder}
                  onChange={(e) => setPolyFunder(e.target.value)}
                  className="input w-full"
                  placeholder="0x..."
                />
              </div>

              <button
                type="submit"
                disabled={polyLoading}
                className="btn-primary w-full"
              >
                {polyLoading ? 'Saving...' : hasPolymarketCreds ? 'Update Credentials' : 'Save Credentials'}
              </button>

              {polyResult && (
                <div
                  className={`p-3 rounded ${
                    polyResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {polyResult.message}
                </div>
              )}
            </form>
          </div>

          {/* Kalshi Manual Credentials */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Kalshi</h2>
              {hasKalshiCreds && (
                <span className="px-2 py-1 bg-green-100 text-green-800 text-sm rounded">
                  Connected
                </span>
              )}
            </div>

            <p className="text-gray-600 text-sm mb-4">
              Enter your Kalshi API credentials manually. Generate an RSA key pair and register
              the public key at{' '}
              <a
                href="https://kalshi.com/account/api"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary-600 hover:underline"
              >
                Kalshi API Settings
              </a>
              .
            </p>

            <form onSubmit={handleKalshiSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  API Key ID
                </label>
                <input
                  type="text"
                  value={kalshiKeyId}
                  onChange={(e) => setKalshiKeyId(e.target.value)}
                  className="input w-full"
                  placeholder="Your API key ID"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Private Key (PEM)
                </label>
                <textarea
                  value={kalshiPrivateKey}
                  onChange={(e) => setKalshiPrivateKey(e.target.value)}
                  className="input w-full h-32 font-mono text-xs"
                  placeholder="-----BEGIN RSA PRIVATE KEY-----&#10;...&#10;-----END RSA PRIVATE KEY-----"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Paste your full private key including the BEGIN/END lines
                </p>
              </div>

              <button
                type="submit"
                disabled={kalshiLoading}
                className="btn-primary w-full"
              >
                {kalshiLoading ? 'Saving...' : hasKalshiCreds ? 'Update Credentials' : 'Save Credentials'}
              </button>

              {kalshiResult && (
                <div
                  className={`p-3 rounded ${
                    kalshiResult.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                >
                  {kalshiResult.message}
                </div>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Security Notice</h3>
        <p className="text-sm text-yellow-700">
          Your credentials are encrypted before being stored. Your Kalshi password is only used once
          to create the API key and is never stored. Make sure you're on the correct website
          before entering sensitive information.
        </p>
      </div>
    </Layout>
  );
}
