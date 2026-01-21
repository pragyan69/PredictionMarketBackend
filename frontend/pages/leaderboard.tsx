import { useState, useEffect } from 'react';
import Layout from '../components/layout/Layout';
import { api } from '../lib/api';

interface LeaderboardEntry {
  rank: number;
  address: string;
  username?: string;
  totalProfit: number;
  winRate: number;
  trades: number;
}

export default function LeaderboardPage() {
  const [leaders, setLeaders] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [platform, setPlatform] = useState<'polymarket' | 'kalshi'>('polymarket');
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'all'>('weekly');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      setLoading(true);
      try {
        const res = await api.getLeaderboard({ platform, period, limit: 50 });
        if (res.success && res.data) {
          const mapped = res.data.map((entry: any, idx: number) => ({
            rank: idx + 1,
            address: entry.wallet_address || entry.address || entry.user_id,
            username: entry.username || entry.name,
            totalProfit: entry.total_profit || entry.profit || 0,
            winRate: entry.win_rate || entry.accuracy || 0,
            trades: entry.total_trades || entry.trades || 0,
          }));
          setLeaders(mapped);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();
  }, [platform, period]);

  const formatProfit = (profit: number) => {
    const prefix = profit >= 0 ? '+' : '';
    if (Math.abs(profit) >= 1_000_000) {
      return `${prefix}$${(profit / 1_000_000).toFixed(2)}M`;
    }
    if (Math.abs(profit) >= 1_000) {
      return `${prefix}$${(profit / 1_000).toFixed(2)}K`;
    }
    return `${prefix}$${profit.toFixed(2)}`;
  };

  const shortenAddress = (addr: string) => {
    if (!addr) return '-';
    if (addr.length <= 12) return addr;
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  return (
    <Layout title="Leaderboard - Mimiq">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Leaderboard</h1>
        <p className="text-gray-600">
          Top traders across prediction markets
        </p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="flex space-x-2">
          <button
            onClick={() => setPlatform('polymarket')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platform === 'polymarket'
                ? 'bg-purple-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Polymarket
          </button>
          <button
            onClick={() => setPlatform('kalshi')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              platform === 'kalshi'
                ? 'bg-blue-600 text-white'
                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'
            }`}
          >
            Kalshi
          </button>
        </div>

        <div className="flex space-x-2">
          {(['daily', 'weekly', 'monthly', 'all'] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                period === p
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-200">
            {[...Array(10)].map((_, i) => (
              <div key={i} className="p-4 animate-pulse flex items-center space-x-4">
                <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        ) : leaders.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No leaderboard data available
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Trader
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Profit
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                  Win Rate
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                  Trades
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {leaders.map((leader) => (
                <tr key={leader.address} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold ${
                        leader.rank === 1
                          ? 'bg-yellow-100 text-yellow-800'
                          : leader.rank === 2
                          ? 'bg-gray-100 text-gray-800'
                          : leader.rank === 3
                          ? 'bg-orange-100 text-orange-800'
                          : 'text-gray-500'
                      }`}
                    >
                      {leader.rank}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      {leader.username && (
                        <div className="font-medium text-gray-900">
                          {leader.username}
                        </div>
                      )}
                      <div className="text-sm text-gray-500 font-mono">
                        {shortenAddress(leader.address)}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <span
                      className={`font-semibold ${
                        leader.totalProfit >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatProfit(leader.totalProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right hidden sm:table-cell">
                    <span className="text-gray-900">
                      {(leader.winRate * 100).toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-gray-500 hidden md:table-cell">
                    {leader.trades.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}
