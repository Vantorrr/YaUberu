'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, MapPin, Pencil, CheckCircle, Plus, Package } from 'lucide-react';
import { api, Order } from '@/lib/api';

export default function OrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const data = await api.getOrders();
      setOrders(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const upcomingOrders = orders.filter(o => o.status === 'scheduled' || o.status === 'in_progress');
  const completedOrders = orders.filter(o => o.status === 'completed');

  return (
    <div className="px-5 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Мои заказы</h1>
        <p className="text-gray-500 text-sm mt-1">Управляйте расписанием</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
          Предстоящие
        </h2>
        
        {loading ? (
          <div className="text-center py-8 text-gray-500">Загрузка...</div>
        ) : upcomingOrders.length === 0 ? (
          <Card>
            <div className="flex flex-col items-center py-6">
              <Package className="w-12 h-12 text-gray-600 mb-3" />
              <p className="text-gray-400">Нет запланированных выносов</p>
              <p className="text-gray-600 text-sm mt-1">Закажите первый вынос!</p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {upcomingOrders.map((order) => (
              <Card key={order.id}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{order.scheduled_date}</p>
                      <p className="text-gray-500 text-sm">{order.time_slot}</p>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900">
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span>{order.time_slot}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 text-emerald-500" />
                    <span>{order.address_details}</span>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Add button */}
      <div>
        <Button 
          variant="secondary" 
          fullWidth
          onClick={() => router.push('/app/order')}
        >
          <Plus className="w-5 h-5" />
          Заказать вынос
        </Button>
        <p className="text-center text-gray-600 text-xs mt-2">Будет списан 1 кредит</p>
      </div>

      {/* History */}
      {completedOrders.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
            История
          </h2>
          <div className="bg-emerald-950/30 rounded-2xl border border-emerald-800/20 overflow-hidden">
            {completedOrders.map((order, i) => (
              <div 
                key={order.id} 
                className={`flex items-center justify-between p-4 ${i !== completedOrders.length - 1 ? 'border-b border-emerald-800/20' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 bg-green-900/50 rounded-full flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-white font-medium text-sm">{order.scheduled_date}</p>
                    <p className="text-gray-500 text-xs">{order.time_slot}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-500 text-xs font-semibold">Выполнен</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
