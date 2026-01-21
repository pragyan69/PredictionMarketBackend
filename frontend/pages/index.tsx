import Layout from '../components/layout/Layout';
import MarketList from '../components/markets/MarketList';
import { useState } from 'react';

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'polymarket' | 'kalshi'>('all');

  return (
    <Layout title="Mimiq - Dashboard">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Prediction Markets</h1>
        <p className="text-gray-600">
          Trade on the most popular prediction markets across Polymarket and Kalshi
        </p>
      </div>

      {/* Platform Filter */}
      <div className="mb-6 flex space-x-2">
        <button
          onClick={() => setSelectedPlatform('all')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPlatform === 'all'
              ? 'bg-primary-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          All Markets
        </button>
        <button
          onClick={() => setSelectedPlatform('polymarket')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPlatform === 'polymarket'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Polymarket
        </button>
        <button
          onClick={() => setSelectedPlatform('kalshi')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            selectedPlatform === 'kalshi'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
          }`}
        >
          Kalshi
        </button>
      </div>

      {/* Markets Grid */}
      <MarketList platform={selectedPlatform} limit={24} />
    </Layout>
  );
}
