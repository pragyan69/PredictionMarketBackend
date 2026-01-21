import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Layout from '../components/layout/Layout';
import { api } from '../lib/api';
import { useAuthStore } from '../lib/store';

interface Position {
  id: string;
  platform: string;
  marketId: string;
  marketTitle: string;
  side: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  profit: number;
}

interface Order {
  id: string;
  platform: string;
  marketId: string;
  side: string;
  action: string;
  price: number;
  quantity: number;
  status: string;
  createdAt: string;
}

export default function PortfolioPage() {
  const router = useRouter();
  const { isConnected } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'positions' | 'orders' | 'history'>('positions');
  const [positions, setPositions] = useState<Position[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [balances, setBalances] = useState<{ polymarket: number; kalshi: number }>({
    polymarket: 0,
    kalshi: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isConnected) {
      router.push('/');
      return;
    }

    const fetchPortfolio = async () => {
      setLoading(true);
      try {
        // Fetch positions
        const posRes = await api.getPositions();
        if (posRes.success && posRes.data) {
          setPositions(
            posRes.data.map((p: any) => ({
              id: p.id,
              platform: p.platform,
              marketId: p.market_id,
              marketTitle: p.market_title || p.market_id,
              side: p.side,
              quantity: p.quantity,
              avgPrice: p.avg_price,
              currentPrice: p.current_price || p.avg_price,
              profit: p.unrealized_pnl || 0,
            }))
          );
        }

        // Fetch orders
        const ordRes = await api.getOrders({ status: 'open' });
        if (ordRes.success && ordRes.data) {
          setOrders(
            ordRes.data.map((o: any) => ({
              id: o.id || o.order_id,
              platform: o.platform,
              marketId: o.market_id,
              side: o.side,
              action: o.action,
              price: o.price,
              quantity: o.quantity || o.size,
              status: o.status,
              createdAt: o.created_at,
            }))
          );
        }

        // Fetch balances
        const balRes = await api.getBalances();
        if (balRes.success && balRes.data) {
          setBalances({
            polymarket: balRes.data.polymarket || 0,
            kalshi: balRes.data.kalshi || 0,
          });
        }
      } catch (err) {
        console.error('Failed to fetch portfolio:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPortfolio();
  }, [isConnected, router]);

  const handleCancelOrder = async (orderId: string, platform: string) => {
    try {
      const res = await api.cancelOrder(orderId, platform);
      if (res.success) {
        setOrders(orders.filter((o) => o.id !== orderId));
      } else {
        alert('Failed to cancel order: ' + res.error);
      }
    } catch (err: any) {
      alert('Failed to cancel order: ' + err.message);
    }
  };

  const totalBalance = balances.polymarket + balances.kalshi;
  const totalPnL = positions.reduce((sum, p) => sum + p.profit, 0);

  if (!isConnected) {
    return null;
  }

  return (
    <Layout title="Portfolio - Mimiq">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio</h1>
        <p className="text-gray-600">Manage your positions and orders</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Total Balance</div>
          <div className="text-2xl font-bold text-gray-900">
            ${totalBalance.toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Polymarket</div>
          <div className="text-2xl font-bold text-purple-600">
            ${balances.polymarket.toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Kalshi</div>
          <div className="text-2xl font-bold text-blue-600">
            ${balances.kalshi.toFixed(2)}
          </div>
        </div>
        <div className="card">
          <div className="text-sm text-gray-500 mb-1">Unrealized P&L</div>
          <div
            className={`text-2xl font-bold ${
              totalPnL >= 0 ? 'text-green-600' : 'text-red-600'
            }`}
          >
            {totalPnL >= 0 ? '+' : ''}${totalPnL.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {(['positions', 'orders', 'history'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
              {tab === 'orders' && orders.length > 0 && (
                <span className="ml-2 bg-primary-100 text-primary-600 px-2 py-0.5 rounded-full text-xs">
                  {orders.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="card animate-pulse">
          <div className="h-40 bg-gray-200 rounded"></div>
        </div>
      ) : activeTab === 'positions' ? (
        <div className="card overflow-hidden">
          {positions.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No open positions
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Side
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Avg Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    P&L
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span
                          className={`mr-2 px-2 py-0.5 text-xs rounded ${
                            pos.platform === 'polymarket'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {pos.platform === 'polymarket' ? 'Poly' : 'Kalshi'}
                        </span>
                        <span className="font-medium text-gray-900 truncate max-w-xs">
                          {pos.marketTitle}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          pos.side === 'yes'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {pos.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {pos.quantity}
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {(pos.avgPrice * 100).toFixed(0)}¢
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          pos.profit >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {pos.profit >= 0 ? '+' : ''}${pos.profit.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : activeTab === 'orders' ? (
        <div className="card overflow-hidden">
          {orders.length === 0 ? (
            <div className="p-8 text-center text-gray-500">No open orders</div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Market
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Qty
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span
                          className={`mr-2 px-2 py-0.5 text-xs rounded ${
                            order.platform === 'polymarket'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {order.platform === 'polymarket' ? 'Poly' : 'Kalshi'}
                        </span>
                        <span className="text-gray-900 truncate max-w-xs">
                          {order.marketId}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium ${
                          order.action === 'buy'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {order.action.toUpperCase()} {order.side.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {(order.price * 100).toFixed(0)}¢
                    </td>
                    <td className="px-6 py-4 text-right text-gray-900">
                      {order.quantity}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleCancelOrder(order.id, order.platform)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="card">
          <div className="p-8 text-center text-gray-500">
            Trade history coming soon
          </div>
        </div>
      )}
    </Layout>
  );
}
