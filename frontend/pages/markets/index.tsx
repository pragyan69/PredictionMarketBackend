import Layout from '../../components/layout/Layout';
import MarketList from '../../components/markets/MarketList';
import { useState } from 'react';

export default function MarketsPage() {
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'polymarket' | 'kalshi' | 'dflow'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const platforms = [
    { id: 'all', label: 'All', color: 'bg-gradient-to-r from-indigo-600 to-purple-600' },
    { id: 'polymarket', label: 'Polymarket', color: 'bg-purple-600', icon: '🟣' },
    { id: 'kalshi', label: 'Kalshi', color: 'bg-blue-600', icon: '🔵' },
    { id: 'dflow', label: 'DFlow', color: 'bg-emerald-600', icon: '🟢' },
  ] as const;

  return (
    <Layout title="Markets - PredictX">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent mb-2">
          All Markets
        </h1>
        <p className="text-gray-500 text-lg">
          Browse and trade on prediction markets across all platforms
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-1.5 ${
                selectedPlatform === platform.id
                  ? `${platform.color} text-white shadow-lg`
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              {'icon' in platform && <span className="text-xs">{platform.icon}</span>}
              {platform.label}
            </button>
          ))}
        </div>

        <div className="relative">
          <input
            type="text"
            placeholder="Search markets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full sm:w-72 px-4 py-2.5 pl-10 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
      <MarketList platform={selectedPlatform} initialLimit={48} loadMoreIncrement={24} />
    </Layout>
  );
}
