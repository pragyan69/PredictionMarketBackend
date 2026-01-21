import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import Layout from '../../../components/layout/Layout';
import TradeForm from '../../../components/trading/TradeForm';
import { api } from '../../../lib/api';

interface MarketDetails {
  id: string;
  title: string;
  description?: string;
  volume?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
  outcomes?: string[];
}

export default function MarketDetailPage() {
  const router = useRouter();
  const { platform, id } = router.query;
  const [market, setMarket] = useState<MarketDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!platform || !id) return;

    const fetchMarket = async () => {
      setLoading(true);
      setError(null);
      try {
        console.log('[MarketDetail] Fetching market:', { platform, id });

        let found: any = null;

        // Try to fetch by ID first, then fallback to searching
        if (platform === 'polymarket') {
          // Try direct fetch by ID
          const directRes = await api.getMarketById(id as string);
          console.log('[MarketDetail] Polymarket direct fetch:', directRes);

          if (directRes.success && directRes.data) {
            found = directRes.data;
          } else {
            // Fallback: search in list
            const listRes = await api.getMarkets({ limit: 200, status: 'all' });
            if (listRes.success && listRes.data) {
              found = listRes.data.find((m: any) =>
                m.condition_id === id || m.id === id || m.slug === id
              );
            }
          }

          if (found) {
            const yesPrice = found.outcome_prices?.[0] || found.mid_price || found.best_ask || 0;
            const noPrice = found.outcome_prices?.[1] || (1 - yesPrice) || 0;

            setMarket({
              id: found.condition_id || found.id,
              title: found.question || found.title || found.slug,
              description: found.description,
              volume: found.volume || found.volume_24h || 0,
              yesPrice: yesPrice,
              noPrice: noPrice,
              endDate: found.end_date,
              outcomes: found.outcomes || ['Yes', 'No'],
            });
          } else {
            setError('Market not found');
          }
        } else if (platform === 'kalshi') {
          // Try direct fetch by ID (which is the ticker for Kalshi)
          const directRes = await api.getKalshiMarketById(id as string);
          console.log('[MarketDetail] Kalshi direct fetch:', directRes);

          if (directRes.success && directRes.data) {
            found = directRes.data;
          } else {
            // Fallback: search in list
            const listRes = await api.getKalshiMarkets({ limit: 200, status: 'all' });
            if (listRes.success && listRes.data) {
              found = listRes.data.find((m: any) =>
                m.id === id || m.slug === id || m.condition_id === id
              );
            }
          }

          if (found) {
            console.log('[MarketDetail] Found Kalshi market:', found);

            // Use outcome_prices array or best_bid/best_ask for prices
            const yesPrice = found.outcome_prices?.[0] || found.mid_price || found.best_ask || 0;
            const noPrice = found.outcome_prices?.[1] || (1 - yesPrice) || 0;

            setMarket({
              id: found.id || found.slug,
              title: found.question || found.title || found.slug,
              description: found.description,
              volume: found.volume || 0,
              yesPrice: yesPrice,
              noPrice: noPrice,
              endDate: found.end_date,
              outcomes: found.outcomes || ['Yes', 'No'],
            });
          } else {
            setError('Market not found');
          }
        }
      } catch (err: any) {
        console.error('[MarketDetail] Error:', err);
        setError(err.message || 'Failed to fetch market');
      } finally {
        setLoading(false);
      }
    };

    fetchMarket();
  }, [platform, id]);

  const formatVolume = (vol?: number) => {
    if (!vol || isNaN(vol)) return '$0';
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(2)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(2)}K`;
    return `$${vol.toFixed(2)}`;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || isNaN(price) || price === 0) return '-';
    return `${(price * 100).toFixed(0)}¢`;
  };

  if (loading) {
    return (
      <Layout title="Loading... - Mimiq">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/2 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 card">
              <div className="h-40 bg-gray-200 rounded"></div>
            </div>
            <div className="card">
              <div className="h-60 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (error || !market) {
    return (
      <Layout title="Error - Mimiq">
        <div className="text-center py-10">
          <p className="text-red-600 mb-4">{error || 'Market not found'}</p>
          <button onClick={() => router.back()} className="btn-primary">
            Go Back
          </button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title={`${market.title} - Mimiq`}>
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="text-gray-600 hover:text-gray-900 flex items-center mb-4"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>

        <div className="flex items-start justify-between">
          <div>
            <span
              className={`inline-block px-2 py-1 text-xs font-medium rounded mb-2 ${
                platform === 'polymarket'
                  ? 'bg-purple-100 text-purple-800'
                  : 'bg-blue-100 text-blue-800'
              }`}
            >
              {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
            </span>
            <h1 className="text-2xl font-bold text-gray-900">{market.title}</h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Market Info */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Market Overview</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatPrice(market.yesPrice)}
                </div>
                <div className="text-sm text-gray-600">Yes Price</div>
              </div>
              <div className="bg-red-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-red-600">
                  {formatPrice(market.noPrice)}
                </div>
                <div className="text-sm text-gray-600">No Price</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-gray-800">
                  {formatVolume(market.volume)}
                </div>
                <div className="text-sm text-gray-600">Volume</div>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg text-center">
                <div className="text-lg font-bold text-gray-800">
                  {market.endDate && !isNaN(new Date(market.endDate).getTime())
                    ? new Date(market.endDate).toLocaleDateString()
                    : '-'}
                </div>
                <div className="text-sm text-gray-600">End Date</div>
              </div>
            </div>

            {market.description && (
              <div>
                <h3 className="font-medium text-gray-900 mb-2">Description</h3>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">
                  {market.description}
                </p>
              </div>
            )}
          </div>

          {/* Price Chart Placeholder */}
          <div className="card">
            <h2 className="text-lg font-semibold mb-4">Price History</h2>
            <div className="h-64 bg-gray-100 rounded-lg flex items-center justify-center text-gray-400">
              Price chart coming soon
            </div>
          </div>
        </div>

        {/* Trade Form */}
        <div>
          <TradeForm
            platform={platform as 'polymarket' | 'kalshi'}
            marketId={market.id}
            marketTitle={market.title}
            yesPrice={market.yesPrice}
            noPrice={market.noPrice}
          />
        </div>
      </div>
    </Layout>
  );
}
