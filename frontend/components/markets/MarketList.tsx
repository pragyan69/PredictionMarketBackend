import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import MarketCard from './MarketCard';

interface Market {
  id: string;
  platform: 'polymarket' | 'kalshi';
  title: string;
  volume?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
}

interface MarketListProps {
  platform?: 'all' | 'polymarket' | 'kalshi';
  limit?: number;
}

export default function MarketList({ platform = 'all', limit = 20 }: MarketListProps) {
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      setError(null);
      try {
        const allMarkets: Market[] = [];

        if (platform === 'all' || platform === 'polymarket') {
          const polyRes = await api.getMarkets({ limit });
          if (polyRes.success && polyRes.data) {
            const polyMarkets = polyRes.data.map((m: any) => ({
              id: m.condition_id || m.id,
              platform: 'polymarket' as const,
              title: m.question || m.title,
              volume: m.volume || m.volume_24h,
              yesPrice: m.yes_price || m.outcome_prices?.[0],
              noPrice: m.no_price || m.outcome_prices?.[1],
              endDate: m.end_date_iso || m.end_date,
            }));
            allMarkets.push(...polyMarkets);
          }
        }

        if (platform === 'all' || platform === 'kalshi') {
          const kalshiRes = await api.getKalshiMarkets({ limit });
          if (kalshiRes.success && kalshiRes.data) {
            const kalshiMarkets = kalshiRes.data.map((m: any) => ({
              id: m.ticker || m.id,
              platform: 'kalshi' as const,
              title: m.title || m.subtitle,
              volume: m.volume || m.dollar_volume,
              yesPrice: m.yes_price ? m.yes_price / 100 : m.last_price / 100,
              noPrice: m.no_price ? m.no_price / 100 : (100 - m.last_price) / 100,
              endDate: m.close_time || m.expiration_time,
            }));
            allMarkets.push(...kalshiMarkets);
          }
        }

        // Sort by volume descending
        allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        setMarkets(allMarkets.slice(0, limit));
      } catch (err: any) {
        setError(err.message || 'Failed to fetch markets');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [platform, limit]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="card animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-6 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="flex space-x-4">
              <div className="h-8 bg-gray-200 rounded w-16"></div>
              <div className="h-8 bg-gray-200 rounded w-16"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-10">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn-primary"
        >
          Retry
        </button>
      </div>
    );
  }

  if (markets.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-gray-500">No markets found</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {markets.map((market) => (
        <MarketCard key={`${market.platform}-${market.id}`} {...market} />
      ))}
    </div>
  );
}
