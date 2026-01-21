import { useState } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

export default function SettingsPage() {
  const router = useRouter();
  const { isConnected, hasPolymarketCreds, hasKalshiCreds, setCredentials } = useAuthStore();

  // Polymarket credentials
  const [polyApiKey, setPolyApiKey] = useState('');
  const [polySecret, setPolySecret] = useState('');
  const [polyPassphrase, setPolyPassphrase] = useState('');
  const [polyFunder, setPolyFunder] = useState('');
  const [polyLoading, setPolyLoading] = useState(false);
  const [polyResult, setPolyResult] = useState<{ success: boolean; message: string } | null>(null);

  // Kalshi credentials
  const [kalshiKeyId, setKalshiKeyId] = useState('');
  const [kalshiPrivateKey, setKalshiPrivateKey] = useState('');
  const [kalshiLoading, setKalshiLoading] = useState(false);
  const [kalshiResult, setKalshiResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isConnected) {
    if (typeof window !== 'undefined') {
      router.push('/');
    }
    return null;
  }

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
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
        <p className="text-gray-600">Manage your trading credentials</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Polymarket Credentials */}
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
            Enter your Polymarket CLOB API credentials. You can generate these from the{' '}
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

        {/* Kalshi Credentials */}
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
            Enter your Kalshi API credentials. Generate an RSA key pair and register
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

      {/* Security Notice */}
      <div className="mt-8 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        <h3 className="font-medium text-yellow-800 mb-2">Security Notice</h3>
        <p className="text-sm text-yellow-700">
          Your credentials are encrypted before being stored. However, never share your
          API keys or private keys with anyone. Make sure you're on the correct website
          before entering sensitive information.
        </p>
      </div>
    </Layout>
  );
}
