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
  
  // Edit Modal State
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [newDate, setNewDate] = useState('');
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [editLoading, setEditLoading] = useState(false);

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

  const openEditModal = (order: Order) => {
    setSelectedOrder(order);
    setNewDate(order.scheduled_date);
    setNewTimeSlot(order.time_slot);
    setShowEditModal(true);
  };

  const handleReschedule = async () => {
    if (!selectedOrder) return;
    
    setEditLoading(true);
    try {
      await api.rescheduleOrder(selectedOrder.id, newDate, newTimeSlot);
      alert('✅ Заказ перенесён!');
      setShowEditModal(false);
      loadOrders(); // Reload orders
    } catch (e: any) {
      alert(e.message || '❌ Ошибка переноса заказа');
    } finally {
      setEditLoading(false);
    }
  };

  const handleCancel = async (orderId: number) => {
    if (!confirm('❌ Отменить заказ? Средства вернутся на баланс.')) return;
    
    try {
      await api.cancelOrder(orderId);
      alert('✅ Заказ отменён, средства возвращены!');
      loadOrders();
    } catch (e: any) {
      alert(e.message || '❌ Ошибка отмены заказа');
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
        <h2 className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
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
                    <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="text-white font-semibold text-lg">{order.scheduled_date}</p>
                      <p className="text-gray-500 text-sm">{order.time_slot}</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => openEditModal(order)}
                    className="p-2 rounded-lg bg-teal-900/50 text-teal-400 hover:bg-teal-900 transition-colors"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <Clock className="w-4 h-4 text-teal-500" />
                    <span>{order.time_slot}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-400 text-sm">
                    <MapPin className="w-4 h-4 text-teal-500" />
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
          <h2 className="text-sm font-semibold text-teal-500 uppercase tracking-wider mb-3">
            История
          </h2>
          <div className="bg-teal-950/30 rounded-2xl border border-teal-800/20 overflow-hidden">
            {completedOrders.map((order, i) => (
              <div 
                key={order.id} 
                className={`flex items-center justify-between p-4 ${i !== completedOrders.length - 1 ? 'border-b border-teal-800/20' : ''}`}
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

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4">
          <div className="bg-zinc-900 rounded-3xl w-full max-w-md p-6 space-y-6 border border-teal-700/30">
            {/* Header */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-white">Изменить время</h2>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Warning */}
            <div className="p-4 bg-orange-900/20 border border-orange-700/30 rounded-xl">
              <p className="text-orange-400 text-sm">
                ⚠️ Изменить можно за 24+ часа до выноса
              </p>
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">📅 Новая дата</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                min={new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-teal-950/30 border border-teal-700/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Time Slot */}
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">🕐 Новое время</label>
              <select
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="w-full px-4 py-3 bg-teal-950/30 border border-teal-700/30 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-teal-500"
              >
                <option value="08-10">08:00 - 10:00</option>
                <option value="12-14">12:00 - 14:00</option>
                <option value="16-18">16:00 - 18:00</option>
                <option value="20-22">20:00 - 22:00</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleReschedule}
                disabled={editLoading || !newDate || !newTimeSlot}
                className="flex-1 py-3 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-colors"
              >
                {editLoading ? '⏳ Сохраняю...' : '✓ Сохранить'}
              </button>
            </div>

            {/* Cancel Order */}
            <button
              onClick={() => {
                setShowEditModal(false);
                handleCancel(selectedOrder.id);
              }}
              className="w-full py-3 px-4 bg-red-950/30 hover:bg-red-950/50 border border-red-700/30 text-red-400 font-semibold rounded-xl transition-colors"
            >
              🗑️ Отменить заказ
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
