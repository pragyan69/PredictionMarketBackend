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
          console.log('[MarketList] Fetching Polymarket markets...');
          const polyRes = await api.getMarkets({ limit });
          console.log('[MarketList] Polymarket response:', polyRes);
          if (polyRes.success && polyRes.data) {
            const polyMarkets = polyRes.data.map((m: any) => {
              // Use outcome_prices array or mid_price for prices
              const yesPrice = m.outcome_prices?.[0] || m.mid_price || m.best_ask || 0;
              const noPrice = m.outcome_prices?.[1] || (1 - yesPrice) || 0;

              return {
                id: m.condition_id || m.id,
                platform: 'polymarket' as const,
                title: m.question || m.title || m.slug,
                volume: m.volume || m.volume_24h || 0,
                yesPrice: yesPrice,
                noPrice: noPrice,
                endDate: m.end_date,
              };
            });
            console.log('[MarketList] Parsed Polymarket markets:', polyMarkets.length);
            if (polyMarkets.length > 0) {
              console.log('[MarketList] Sample Polymarket market:', polyMarkets[0]);
            }
            allMarkets.push(...polyMarkets);
          } else {
            console.error('[MarketList] Polymarket failed:', polyRes.error);
          }
        }

        if (platform === 'all' || platform === 'kalshi') {
          console.log('[MarketList] Fetching Kalshi markets...');
          const kalshiRes = await api.getKalshiMarkets({ limit });
          console.log('[MarketList] Kalshi response:', kalshiRes);
          if (kalshiRes.success && kalshiRes.data) {
            const kalshiMarkets = kalshiRes.data.map((m: any) => {
              // Use outcome_prices array or best_bid/best_ask for prices
              const yesPrice = m.outcome_prices?.[0] || m.mid_price || m.best_ask || 0;
              const noPrice = m.outcome_prices?.[1] || (1 - yesPrice) || 0;

              return {
                id: m.id || m.slug,
                platform: 'kalshi' as const,
                title: m.question || m.title || m.slug, // Database uses 'question' field
                volume: m.volume || 0,
                yesPrice: yesPrice,
                noPrice: noPrice,
                endDate: m.end_date || m.close_time,
              };
            });
            console.log('[MarketList] Parsed Kalshi markets:', kalshiMarkets.length);
            if (kalshiMarkets.length > 0) {
              console.log('[MarketList] Sample Kalshi market:', kalshiMarkets[0]);
            }
            allMarkets.push(...kalshiMarkets);
          } else {
            console.error('[MarketList] Kalshi failed:', kalshiRes.error);
          }
        }

        console.log('[MarketList] Total markets before sort:', allMarkets.length);
        // Sort by volume descending
        allMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        setMarkets(allMarkets.slice(0, limit));
        console.log('[MarketList] Final markets:', allMarkets.slice(0, limit).length);
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
