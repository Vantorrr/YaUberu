'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Clock, MapPin, Pencil, CheckCircle, Package, ChevronRight, AlertCircle } from 'lucide-react';
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
    <div className="min-h-screen bg-white px-5 py-6 space-y-6 pb-24">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Мои заказы</h1>
        <p className="text-gray-500 text-sm mt-1">Управляйте расписанием</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Upcoming Orders */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              Предстоящие
            </h2>
            
            {upcomingOrders.length > 0 ? (
              <div className="space-y-3">
                {upcomingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
                  >
                    {/* Status Badge */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center gap-2 bg-blue-100 px-3 py-1 rounded-full">
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-700 text-xs font-semibold">
                          {order.status === 'in_progress' ? 'Курьер выехал' : 'Запланировано'}
                        </span>
                      </div>
                      <span className="text-gray-500 text-xs">№{order.id}</span>
                    </div>

                    {/* Date & Time */}
                    <div className="flex items-start gap-3 mb-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 font-semibold text-sm">
                          {new Date(order.scheduled_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">{order.time_slot}</p>
                      </div>
                    </div>

                    {/* Address */}
                    {order.address && (
                      <div className="flex items-start gap-3 mb-4">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <p className="text-gray-600 text-sm">
                          {order.address.street && `${order.address.street}, `}
                          д. {order.address.building}, кв. {order.address.apartment}
                        </p>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2 pt-3 border-t border-gray-200">
                      <button
                        onClick={() => openEditModal(order)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-100 text-gray-900 font-medium rounded-xl hover:bg-gray-200 transition text-sm"
                      >
                        <Pencil className="w-4 h-4" />
                        Перенести
                      </button>
                      <button
                        onClick={() => handleCancel(order.id)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-red-50 text-red-600 font-medium rounded-xl hover:bg-red-100 transition text-sm"
                      >
                        Отменить
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-200 rounded-3xl p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm">
                  <Package className="w-10 h-10 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Нет запланированных заказов</h3>
                <p className="text-gray-600 text-sm">
                  Закажите первый вынос через главную страницу
                </p>
              </div>
            )}
          </div>

          {/* Completed Orders */}
          <div>
            <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
              Выполненные
            </h2>
            
            {completedOrders.length > 0 ? (
              <div className="space-y-3">
                {completedOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white border-2 border-gray-200 rounded-2xl p-5 shadow-sm opacity-75"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="inline-flex items-center gap-2 bg-green-100 px-3 py-1 rounded-full">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-700 text-xs font-semibold">Выполнено</span>
                      </div>
                      <span className="text-gray-500 text-xs">№{order.id}</span>
                    </div>

                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                      <div>
                        <p className="text-gray-900 font-semibold text-sm">
                          {new Date(order.scheduled_date).toLocaleDateString('ru-RU', {
                            day: 'numeric',
                            month: 'long'
                          })}
                        </p>
                        <p className="text-gray-600 text-xs mt-0.5">{order.time_slot}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 text-center">
                <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-4 mx-auto shadow-sm">
                  <CheckCircle className="w-10 h-10 text-green-500" />
                </div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Пока нет выполненных заказов</h3>
                <p className="text-gray-600 text-sm">
                  Здесь появится история после первого вывоза
                </p>
              </div>
            )}
          </div>

        </>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-end justify-center z-50 p-5">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-4 animate-slideUp">
            <h3 className="text-gray-900 font-bold text-xl">Перенести заказ</h3>
            
            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Новая дата</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-teal-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-gray-700 text-sm font-medium mb-2">Новое время</label>
              <select
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-gray-900 focus:border-teal-500 focus:outline-none"
              >
                <option value="08:00-10:00">08:00 - 10:00</option>
                <option value="12:00-14:00">12:00 - 14:00</option>
                <option value="16:00-18:00">16:00 - 18:00</option>
                <option value="20:00-22:00">20:00 - 22:00</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-gray-100 text-gray-900 font-semibold rounded-xl hover:bg-gray-200 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleReschedule}
                disabled={editLoading}
                className="flex-1 py-3 bg-teal-600 text-white font-semibold rounded-xl hover:bg-teal-700 transition disabled:opacity-50"
              >
                {editLoading ? 'Сохранение...' : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
