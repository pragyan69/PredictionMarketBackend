import { useState, useEffect } from 'react';
import { api } from '../../lib/api';
import MarketCard from './MarketCard';

interface Market {
  id: string;
  platform: 'polymarket' | 'kalshi' | 'dflow';
  title: string;
  volume?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
}

interface MarketListProps {
  platform?: 'all' | 'polymarket' | 'kalshi' | 'dflow';
  initialLimit?: number;
  loadMoreIncrement?: number;
}

export default function MarketList({
  platform = 'all',
  initialLimit = 24,
  loadMoreIncrement = 12,
}: MarketListProps) {
  const [allMarkets, setAllMarkets] = useState<Market[]>([]);
  const [displayedCount, setDisplayedCount] = useState(initialLimit);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMarkets = async () => {
      setLoading(true);
      setError(null);
      try {
        const fetchedMarkets: Market[] = [];
        const fetchLimit = 100; // Fetch more initially for client-side pagination

        if (platform === 'all' || platform === 'polymarket') {
          console.log('[MarketList] Fetching Polymarket markets...');
          const polyRes = await api.getMarkets({ limit: fetchLimit });
          if (polyRes.success && polyRes.data) {
            const polyMarkets = polyRes.data.map((m: any) => {
              const yesPrice = m.outcome_prices?.[0] || m.mid_price || m.best_ask || 0;
              const noPrice = m.outcome_prices?.[1] || (1 - yesPrice) || 0;
              return {
                id: m.condition_id || m.id,
                platform: 'polymarket' as const,
                title: m.question || m.title || m.slug,
                volume: m.volume || m.volume_24h || 0,
                yesPrice,
                noPrice,
                endDate: m.end_date,
              };
            });
            fetchedMarkets.push(...polyMarkets);
          }
        }

        if (platform === 'all' || platform === 'kalshi') {
          console.log('[MarketList] Fetching Kalshi markets...');
          const kalshiRes = await api.getKalshiMarkets({ limit: fetchLimit });
          if (kalshiRes.success && kalshiRes.data) {
            const kalshiMarkets = kalshiRes.data.map((m: any) => {
              const yesPrice = m.outcome_prices?.[0] || m.mid_price || m.best_ask || 0;
              const noPrice = m.outcome_prices?.[1] || (1 - yesPrice) || 0;
              return {
                id: m.id || m.slug,
                platform: 'kalshi' as const,
                title: m.question || m.title || m.slug,
                volume: m.volume || 0,
                yesPrice,
                noPrice,
                endDate: m.end_date || m.close_time,
              };
            });
            fetchedMarkets.push(...kalshiMarkets);
          }
        }

        if (platform === 'all' || platform === 'dflow') {
          console.log('[MarketList] Fetching DFlow markets...');
          try {
            const dflowRes = await api.getDFlowMarkets({ limit: fetchLimit });
            if (dflowRes.success && dflowRes.data) {
              const dflowMarkets = dflowRes.data.map((m: any) => {
                const yesPrice = m.outcome_prices?.[0] || m.mid_price || m.yesPrice || 0;
                const noPrice = m.outcome_prices?.[1] || (1 - yesPrice) || m.noPrice || 0;
                return {
                  id: m.id || m.condition_id,
                  platform: 'dflow' as const,
                  title: m.question || m.title || m.slug,
                  volume: m.volume || 0,
                  yesPrice,
                  noPrice,
                  endDate: m.end_date || m.expirationTime,
                };
              });
              fetchedMarkets.push(...dflowMarkets);
            }
          } catch (dflowError) {
            console.log('[MarketList] DFlow fetch failed (may not have data yet):', dflowError);
          }
        }

        // Sort by volume descending
        fetchedMarkets.sort((a, b) => (b.volume || 0) - (a.volume || 0));
        setAllMarkets(fetchedMarkets);
        setDisplayedCount(initialLimit);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch markets');
      } finally {
        setLoading(false);
      }
    };

    fetchMarkets();
  }, [platform, initialLimit]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    // Simulate a small delay for UX
    setTimeout(() => {
      setDisplayedCount(prev => Math.min(prev + loadMoreIncrement, allMarkets.length));
      setLoadingMore(false);
    }, 300);
  };

  const displayedMarkets = allMarkets.slice(0, displayedCount);
  const hasMore = displayedCount < allMarkets.length;

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-20 mb-4"></div>
            <div className="h-5 bg-gray-200 rounded mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
            <div className="flex space-x-3">
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
              <div className="h-10 bg-gray-200 rounded flex-1"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-red-500 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <p className="text-red-600 font-medium mb-2">Failed to load markets</p>
        <p className="text-gray-500 text-sm mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  if (allMarkets.length === 0) {
    return (
      <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-100">
        <div className="text-gray-400 mb-4">
          <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
        <p className="text-gray-500 font-medium">No markets found</p>
        <p className="text-gray-400 text-sm mt-1">Try selecting a different platform</p>
      </div>
    );
  }

  return (
    <div>
      {/* Markets count */}
      <div className="mb-4 text-sm text-gray-500">
        Showing {displayedMarkets.length} of {allMarkets.length} markets
      </div>

      {/* Markets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {displayedMarkets.map((market) => (
          <MarketCard key={`${market.platform}-${market.id}`} {...market} />
        ))}
      </div>

      {/* Load More Button */}
      {hasMore && (
        <div className="mt-8 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="inline-flex items-center px-6 py-3 bg-white border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm disabled:opacity-50"
          >
            {loadingMore ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Loading...
              </>
            ) : (
              <>
                Show More
                <span className="ml-2 px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-500">
                  +{Math.min(loadMoreIncrement, allMarkets.length - displayedCount)}
                </span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Show all loaded message */}
      {!hasMore && allMarkets.length > initialLimit && (
        <div className="mt-8 text-center text-sm text-gray-400">
          All {allMarkets.length} markets loaded
        </div>
      )}
    </div>
  );
}
