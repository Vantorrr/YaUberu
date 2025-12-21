'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Package, CheckCircle, TrendingUp, XCircle, Truck, X, Users, Building, Plus, Trash2 } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'couriers' | 'complexes'>('orders');
  
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [complexes, setComplexes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modals / Forms
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);

  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierId, setNewCourierId] = useState('');
  
  const [newComplexName, setNewComplexName] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, ordersData, couriersData, complexesData] = await Promise.all([
        api.getAdminStats(),
        api.getTodayOrders(),
        api.getCouriers(),
        api.getAdminComplexes()
      ]);
      setStats(statsData);
      setOrders(ordersData);
      setCouriers(couriersData);
      setComplexes(complexesData);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleCancel = async (id: number) => {
    if (confirm('Отменить заказ и вернуть средства?')) {
      try {
        await api.cancelOrderAdmin(id);
        loadData();
      } catch (e) {
        alert('Ошибка отмены');
      }
    }
  };

  const openAssignModal = (order: any) => {
    setSelectedOrder(order);
    setShowAssignModal(true);
  };

  const handleAssign = async (courierId: number) => {
    try {
      await api.assignCourier(selectedOrder.id, courierId);
      setShowAssignModal(false);
      loadData();
    } catch (e) {
      alert('Ошибка назначения');
    }
  };

  const handleAddCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCourierName || !newCourierId) return;
    try {
      await api.addCourier({ name: newCourierName, telegram_id: Number(newCourierId) });
      setNewCourierName('');
      setNewCourierId('');
      loadData();
    } catch (e) {
      alert('Ошибка добавления курьера');
    }
  };

  const handleDeleteCourier = async (id: number) => {
    if (confirm('Удалить курьера?')) {
        try {
            await api.deleteCourier(id);
            loadData();
        } catch(e) {
            alert('Ошибка удаления');
        }
    }
  }

  const handleAddComplex = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComplexName) return;
    try {
      await api.createComplex(newComplexName);
      setNewComplexName('');
      loadData();
    } catch (e) {
      alert('Ошибка добавления ЖК');
    }
  };

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <RefreshCw className="w-8 h-8 animate-spin text-teal-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1714] text-white p-6 pb-20">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Панель Владельца</h1>
        <button onClick={loadData} className="p-2 bg-gray-800 rounded-lg hover:bg-gray-700">
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Package className="w-4 h-4" />
            <span className="text-xs">Заказов сегодня</span>
          </div>
          <p className="text-3xl font-bold text-white">{stats?.total_orders_today || 0}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-xs">Выполнено</span>
          </div>
          <p className="text-3xl font-bold text-teal-400">{stats?.completed_today || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button 
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'orders' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
            <Package className="w-4 h-4" />
            Заказы
        </button>
        <button 
            onClick={() => setActiveTab('couriers')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'couriers' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
            <Users className="w-4 h-4" />
            Курьеры
        </button>
        <button 
            onClick={() => setActiveTab('complexes')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'complexes' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
            <Building className="w-4 h-4" />
            ЖК и Адреса
        </button>
      </div>

      {/* Content */}
      <div className="space-y-4">
        
        {/* ORDERS TAB */}
        {activeTab === 'orders' && (
          <div className="space-y-3">
            <h2 className="text-lg font-bold mb-4 text-gray-300">Маршрутный лист</h2>
            {orders.map((order) => (
              <div key={order.id} className="bg-gray-800/30 p-4 rounded-xl border border-gray-800">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-white font-bold mr-2">#{order.id}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === 'completed' ? 'bg-green-900 text-green-400' : 
                      order.status === 'cancelled' ? 'bg-red-900 text-red-400' :
                      order.status === 'in_progress' ? 'bg-orange-900 text-orange-400' :
                      'bg-blue-900 text-blue-400'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  <span className="text-gray-400 text-sm font-mono">{order.time_slot}</span>
                </div>
                
                <p className="text-gray-500 text-xs mb-3">
                  {order.courier_id ? `Курьер: ID ${order.courier_id}` : 'Курьер не назначен'}
                </p>

                {order.comment && (
                  <div className="mb-3 bg-yellow-900/20 text-yellow-500 text-xs p-2 rounded-lg border border-yellow-900/30">
                    ⚠️ {order.comment}
                  </div>
                )}

                {order.status !== 'cancelled' && order.status !== 'completed' && (
                  <div className="flex gap-2">
                    <button 
                      onClick={() => openAssignModal(order)}
                      className="flex-1 py-2 bg-teal-900/40 text-teal-400 text-xs font-medium rounded-lg border border-teal-800/50 hover:bg-teal-900/60 flex items-center justify-center gap-1"
                    >
                      <Truck className="w-3 h-3" />
                      Назначить
                    </button>
                    <button 
                      onClick={() => handleCancel(order.id)}
                      className="p-2 bg-red-900/20 text-red-400 rounded-lg border border-red-900/30 hover:bg-red-900/40"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {orders.length === 0 && (
              <div className="text-center py-10 text-gray-500 bg-gray-800/20 rounded-2xl border border-gray-800/50 border-dashed">
                <p>Нет активных заказов</p>
              </div>
            )}
          </div>
        )}

        {/* COURIERS TAB */}
        {activeTab === 'couriers' && (
          <div className="space-y-4">
             <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-500" />
                    Добавить курьера
                </h3>
                <form onSubmit={handleAddCourier} className="flex flex-col gap-3">
                    <input 
                        type="text" 
                        placeholder="Имя курьера"
                        value={newCourierName}
                        onChange={(e) => setNewCourierName(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-teal-500 outline-none"
                    />
                    <input 
                        type="number" 
                        placeholder="Telegram ID (число)"
                        value={newCourierId}
                        onChange={(e) => setNewCourierId(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-teal-500 outline-none"
                    />
                    <button type="submit" className="bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-500 transition-colors">
                        Добавить
                    </button>
                </form>
             </div>

             <h3 className="font-bold text-gray-300 mt-6">Список курьеров</h3>
             <div className="space-y-2">
                {couriers.map(c => (
                    <div key={c.id} className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl border border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-400 font-bold">
                                {c.name[0]}
                            </div>
                            <div>
                                <p className="font-medium text-white">{c.name}</p>
                                <p className="text-xs text-gray-500">ID: {c.telegram_id}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {c.is_active && <span className="text-[10px] bg-green-900/50 text-green-400 px-2 py-1 rounded">Активен</span>}
                            <button onClick={() => handleDeleteCourier(c.id)} className="p-2 text-gray-500 hover:text-red-400">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                ))}
                {couriers.length === 0 && <p className="text-gray-500 text-center text-sm">Список пуст</p>}
             </div>
          </div>
        )}

        {/* COMPLEXES TAB */}
        {activeTab === 'complexes' && (
          <div className="space-y-4">
             <div className="bg-gray-800/40 p-4 rounded-2xl border border-gray-800">
                <h3 className="font-bold text-gray-300 mb-3 flex items-center gap-2">
                    <Plus className="w-4 h-4 text-teal-500" />
                    Добавить Жилой Комплекс
                </h3>
                <form onSubmit={handleAddComplex} className="flex flex-col gap-3">
                    <input 
                        type="text" 
                        placeholder="Название ЖК"
                        value={newComplexName}
                        onChange={(e) => setNewComplexName(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-teal-500 outline-none"
                    />
                    <button type="submit" className="bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-500 transition-colors">
                        Создать зону
                    </button>
                </form>
             </div>

             <h3 className="font-bold text-gray-300 mt-6">Обслуживаемые зоны</h3>
             <div className="grid gap-2">
                {complexes.map(c => (
                    <div key={c.id} className="p-4 bg-gray-800/30 rounded-xl border border-gray-800 flex justify-between items-center">
                        <span className="text-white font-medium">{c.name}</span>
                        {c.is_active ? (
                            <span className="text-xs text-green-400 flex items-center gap-1">
                                <CheckCircle className="w-3 h-3" /> Работаем
                            </span>
                        ) : (
                            <span className="text-xs text-gray-500">Не активен</span>
                        )}
                    </div>
                ))}
             </div>
          </div>
        )}

      </div>

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Выбор курьера</h3>
              <button onClick={() => setShowAssignModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {couriers.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAssign(c.id)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-gray-800 hover:bg-gray-700 transition-colors text-left"
                >
                  <div>
                    <p className="text-white font-medium">{c.name}</p>
                    <p className="text-gray-500 text-xs">ID: {c.telegram_id}</p>
                  </div>
                  {c.is_active && <div className="w-2 h-2 rounded-full bg-green-500" />}
                </button>
              ))}
              {couriers.length === 0 && <p className="text-gray-500 text-center py-4">Нет доступных курьеров</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
