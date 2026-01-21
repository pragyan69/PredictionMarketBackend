import Link from 'next/link';

interface MarketCardProps {
  id: string;
  platform: 'polymarket' | 'kalshi';
  title: string;
  volume?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
}

export default function MarketCard({
  id,
  platform,
  title,
  volume,
  yesPrice,
  noPrice,
  endDate,
}: MarketCardProps) {
  const formatVolume = (vol?: number) => {
    if (!vol) return '$0';
    if (vol >= 1_000_000) return `$${(vol / 1_000_000).toFixed(1)}M`;
    if (vol >= 1_000) return `$${(vol / 1_000).toFixed(1)}K`;
    return `$${vol.toFixed(0)}`;
  };

  const formatPrice = (price?: number) => {
    if (price === undefined || price === null || isNaN(price)) return '-';
    // Price is between 0 and 1, convert to cents
    return `${(price * 100).toFixed(0)}¢`;
  };

  return (
    <Link href={`/markets/${platform}/${id}`}>
      <div className="card hover:shadow-xl transition-shadow cursor-pointer">
        <div className="flex justify-between items-start mb-3">
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
              platform === 'polymarket'
                ? 'bg-purple-100 text-purple-800'
                : 'bg-blue-100 text-blue-800'
            }`}
          >
            {platform === 'polymarket' ? 'Polymarket' : 'Kalshi'}
          </span>
          {volume !== undefined && (
            <span className="text-sm text-gray-500">Vol: {formatVolume(volume)}</span>
          )}
        </div>

        <h3 className="text-lg font-semibold text-gray-900 mb-4 line-clamp-2">
          {title}
        </h3>

        <div className="flex justify-between items-center">
          <div className="flex space-x-4">
            <div className="text-center">
              <div className="text-green-600 font-bold text-lg">{formatPrice(yesPrice)}</div>
              <div className="text-xs text-gray-500">Yes</div>
            </div>
            <div className="text-center">
              <div className="text-red-600 font-bold text-lg">{formatPrice(noPrice)}</div>
              <div className="text-xs text-gray-500">No</div>
            </div>
          </div>
          {endDate && (
            <div className="text-xs text-gray-400">
              Ends: {new Date(endDate).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
