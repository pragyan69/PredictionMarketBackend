import Layout from '../components/layout/Layout';
import MarketList from '../components/markets/MarketList';
import { useState } from 'react';

export default function Home() {
  const [selectedPlatform, setSelectedPlatform] = useState<'all' | 'polymarket' | 'kalshi' | 'dflow'>('all');

  const platforms = [
    { id: 'all', label: 'All Markets', color: 'bg-gradient-to-r from-indigo-600 to-purple-600', activeText: 'text-white' },
    { id: 'polymarket', label: 'Polymarket', color: 'bg-purple-600', activeText: 'text-white', icon: '🟣' },
    { id: 'kalshi', label: 'Kalshi', color: 'bg-blue-600', activeText: 'text-white', icon: '🔵' },
    { id: 'dflow', label: 'DFlow', color: 'bg-emerald-600', activeText: 'text-white', icon: '🟢' },
  ] as const;

  return (
    <Layout title="Prediction Markets - Dashboard">
      {/* Hero Section */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent">
            Prediction Markets
          </h1>
        </div>
        <p className="text-gray-500 text-lg max-w-2xl">
          Trade on the world's leading prediction markets. Access Polymarket, Kalshi, and DFlow markets all in one place.
        </p>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">3</div>
          <div className="text-sm text-gray-500">Platforms</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-gray-900">Live</div>
          <div className="text-sm text-gray-500">Market Data</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-emerald-600">Active</div>
          <div className="text-sm text-gray-500">Trading</div>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">24/7</div>
          <div className="text-sm text-gray-500">Access</div>
        </div>
      </div>

      {/* Platform Filter */}
      <div className="mb-6">
        <div className="flex flex-wrap gap-2">
          {platforms.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
                selectedPlatform === platform.id
                  ? `${platform.color} ${platform.activeText} shadow-lg shadow-${platform.color}/25`
                  : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-200 hover:border-gray-300'
              }`}
            >
              {'icon' in platform && <span>{platform.icon}</span>}
              {platform.label}
            </button>
          ))}
        </div>
      </div>

      {/* Markets Grid */}
      <MarketList platform={selectedPlatform} initialLimit={24} loadMoreIncrement={12} />
    </Layout>
  );
}
