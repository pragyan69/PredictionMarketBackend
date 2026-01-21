import Layout from '../../components/layout/Layout';
import MarketList from '../../components/markets/MarketList';
import { useState } from 'react';

export default function MarketsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'polymarket' | 'kalshi'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <Layout title="Markets - Mimiq">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">All Markets</h1>
        <p className="text-gray-600">
          Browse and trade on prediction markets
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setSelectedPlatform('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              selectedPlatform === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            All
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

        <div className="relative">
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input w-full sm:w-64 pl-10"
          />
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Markets Grid */}
      <MarketList platform={selectedPlatform} limit={50} />
    </Layout>
  );
}
