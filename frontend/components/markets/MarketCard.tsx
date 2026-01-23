import Link from 'next/link';

interface MarketCardProps {
  id: string;
  platform: 'polymarket' | 'kalshi' | 'dflow';
  title: string;
  volume?: number;
  yesPrice?: number;
  noPrice?: number;
  endDate?: string;
}

const platformConfig = {
  polymarket: {
    label: 'Polymarket',
    bgColor: 'bg-purple-50',
    textColor: 'text-purple-700',
    borderColor: 'border-purple-100',
    icon: '🟣',
  },
  kalshi: {
    label: 'Kalshi',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-100',
    icon: '🔵',
  },
  dflow: {
    label: 'DFlow',
    bgColor: 'bg-emerald-50',
    textColor: 'text-emerald-700',
    borderColor: 'border-emerald-100',
    icon: '🟢',
  },
};

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

  const getTimeRemaining = (date?: string) => {
    if (!date) return null;
    const end = new Date(date);
    const now = new Date();
    const diff = end.getTime() - now.getTime();

    if (diff < 0) return 'Ended';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    if (days > 30) return `${Math.floor(days / 30)}mo`;
    if (days > 0) return `${days}d`;

    const hours = Math.floor(diff / (1000 * 60 * 60));
    if (hours > 0) return `${hours}h`;

    const mins = Math.floor(diff / (1000 * 60));
    return `${mins}m`;
  };

  const config = platformConfig[platform];
  const yesPricePercent = yesPrice ? Math.round(yesPrice * 100) : 0;

  return (
    <Link href={`/markets/${platform}/${id}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-5 hover:shadow-lg hover:border-gray-200 transition-all duration-200 cursor-pointer group h-full flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <span className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg ${config.bgColor} ${config.textColor} border ${config.borderColor}`}>
            <span className="text-[10px]">{config.icon}</span>
            {config.label}
          </span>
          {volume !== undefined && volume > 0 && (
            <span className="text-xs text-gray-400 font-medium">
              {formatVolume(volume)}
            </span>
          )}
        </div>

        {/* Title */}
        <h3 className="text-sm font-semibold text-gray-900 mb-4 line-clamp-2 group-hover:text-indigo-600 transition-colors flex-grow">
          {title}
        </h3>

        {/* Price Bar */}
        <div className="mb-3">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${yesPricePercent}%` }}
            />
          </div>
        </div>

        {/* Prices */}
        <div className="flex justify-between items-center">
          <div className="flex gap-4">
            <div>
              <div className="text-emerald-600 font-bold text-lg">{formatPrice(yesPrice)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">Yes</div>
            </div>
            <div>
              <div className="text-rose-500 font-bold text-lg">{formatPrice(noPrice)}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wide">No</div>
            </div>
          </div>

          {endDate && (
            <div className="text-right">
              <div className="text-xs font-medium text-gray-500">
                {getTimeRemaining(endDate)}
              </div>
              <div className="text-[10px] text-gray-400">remaining</div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
