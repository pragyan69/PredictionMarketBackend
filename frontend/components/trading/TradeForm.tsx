import { useState } from 'react';
import { useAuthStore } from '../../lib/store';
import { api } from '../../lib/api';

interface TradeFormProps {
  platform: 'polymarket' | 'kalshi';
  marketId: string;
  marketTitle: string;
  yesPrice?: number;
  noPrice?: number;
}

export default function TradeForm({
  platform,
  marketId,
  marketTitle,
  yesPrice = 0.5,
  noPrice = 0.5,
}: TradeFormProps) {
  const { isConnected, hasPolymarketCreds, hasKalshiCreds } = useAuthStore();
  const [side, setSide] = useState<'yes' | 'no'>('yes');
  const [action, setAction] = useState<'buy' | 'sell'>('buy');
  const [price, setPrice] = useState(side === 'yes' ? yesPrice : noPrice);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);

  const hasCredentials = platform === 'polymarket' ? hasPolymarketCreds : hasKalshiCreds;

  const handleSideChange = (newSide: 'yes' | 'no') => {
    setSide(newSide);
    setPrice(newSide === 'yes' ? yesPrice : noPrice);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isConnected || !hasCredentials) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await api.createOrder({
        platform,
        market_id: marketId,
        side,
        action,
        price,
        quantity,
        order_type: 'limit',
        time_in_force: 'gtc',
      });

      if (res.success) {
        setResult({ success: true, message: 'Order placed successfully!' });
      } else {
        setResult({ success: false, message: res.error || 'Order failed' });
      }
    } catch (err: any) {
      setResult({ success: false, message: err.message || 'Failed to place order' });
    } finally {
      setLoading(false);
    }
  };

  const estimatedCost = action === 'buy' ? price * quantity : 0;
  const potentialProfit = action === 'buy' ? (1 - price) * quantity : price * quantity;

  if (!isConnected) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Trade</h3>
        <p className="text-gray-500 text-center py-4">
          Connect your wallet to trade
        </p>
      </div>
    );
  }

  if (!hasCredentials) {
    return (
      <div className="card">
        <h3 className="text-lg font-semibold mb-4">Trade</h3>
        <p className="text-gray-500 text-center py-4">
          Set up your {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'} credentials to trade
        </p>
        <a
          href="/settings"
          className="btn-primary block text-center"
        >
          Setup Credentials
        </a>
      </div>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Trade</h3>

      <form onSubmit={handleSubmit}>
        {/* Side Selection */}
        <div className="flex mb-4 rounded-lg overflow-hidden border border-gray-200">
          <button
            type="button"
            onClick={() => handleSideChange('yes')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              side === 'yes'
                ? 'bg-green-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Yes
          </button>
          <button
            type="button"
            onClick={() => handleSideChange('no')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              side === 'no'
                ? 'bg-red-500 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            No
          </button>
        </div>

        {/* Action Selection */}
        <div className="flex mb-4 rounded-lg overflow-hidden border border-gray-200">
          <button
            type="button"
            onClick={() => setAction('buy')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              action === 'buy'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Buy
          </button>
          <button
            type="button"
            onClick={() => setAction('sell')}
            className={`flex-1 py-2 px-4 text-sm font-medium ${
              action === 'sell'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-50'
            }`}
          >
            Sell
          </button>
        </div>

        {/* Price Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price (¢)
          </label>
          <input
            type="number"
            min="1"
            max="99"
            step="1"
            value={Math.round(price * 100)}
            onChange={(e) => setPrice(Number(e.target.value) / 100)}
            className="input w-full"
          />
        </div>

        {/* Quantity Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Quantity
          </label>
          <input
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="input w-full"
          />
        </div>

        {/* Estimate */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg text-sm">
          <div className="flex justify-between mb-1">
            <span className="text-gray-600">Est. Cost:</span>
            <span className="font-medium">${estimatedCost.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Potential Profit:</span>
            <span className="font-medium text-green-600">
              ${potentialProfit.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 px-4 rounded-lg font-medium ${
            side === 'yes'
              ? 'bg-green-500 hover:bg-green-600 text-white'
              : 'bg-red-500 hover:bg-red-600 text-white'
          } disabled:opacity-50`}
        >
          {loading ? 'Placing Order...' : `${action === 'buy' ? 'Buy' : 'Sell'} ${side.toUpperCase()}`}
        </button>

        {/* Result Message */}
        {result && (
          <div
            className={`mt-4 p-3 rounded-lg ${
              result.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}
          >
            {result.message}
          </div>
        )}
      </form>
    </div>
  );
}
