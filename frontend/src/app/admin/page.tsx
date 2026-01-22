'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { RefreshCw, Package, CheckCircle, TrendingUp, XCircle, Truck, X, Users, Building, Plus, Trash2, Coins, Edit, Search } from 'lucide-react';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'couriers' | 'complexes' | 'clients' | 'tariffs'>('orders');
  
  const [stats, setStats] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [couriers, setCouriers] = useState<any[]>([]);
  const [complexes, setComplexes] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clientSearch, setClientSearch] = useState('');
  
  // Modals / Forms
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  
  const [showAddCreditsModal, setShowAddCreditsModal] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [creditsAmount, setCreditsAmount] = useState('1');
  const [creditsType, setCreditsType] = useState<'subscription' | 'single'>('subscription');

  const [showEditTariffModal, setShowEditTariffModal] = useState(false);
  const [selectedTariff, setSelectedTariff] = useState<any>(null);
  const [tariffForm, setTariffForm] = useState<any>({});

  const [newCourierName, setNewCourierName] = useState('');
  const [newCourierId, setNewCourierId] = useState('');
  
  const [newComplexName, setNewComplexName] = useState('');
  const [newComplexBuildings, setNewComplexBuildings] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const [statsData, ordersData, couriersData, complexesData, clientsData, tariffsData] = await Promise.all([
        api.getAdminStats(),
        api.getTodayOrders(),
        api.getCouriers(),
        api.getAdminComplexes(),
        api.getClients(),
        api.getTariffs()
      ]);
      setStats(statsData);
      setOrders(ordersData);
      setCouriers(couriersData);
      setComplexes(complexesData);
      setClients(clientsData);
      setTariffs(tariffsData);
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
    
    // Parse buildings from textarea (split by newlines, filter empty)
    const buildings = newComplexBuildings
      .split('\n')
      .map(b => b.trim())
      .filter(b => b.length > 0);
    
    try {
      await api.createComplex(newComplexName, buildings);
      setNewComplexName('');
      setNewComplexBuildings('');
      loadData();
    } catch (e) {
      alert('Ошибка добавления ЖК');
    }
  };

  const handleDeleteComplex = async (id: number) => {
    if (confirm('Удалить ЖК и все его дома?')) {
      try {
        await api.deleteComplex(id);
        loadData();
      } catch (e) {
        alert('Ошибка удаления');
      }
    }
  };

  const openAddCreditsModal = (client: any) => {
    setSelectedClient(client);
    setCreditsAmount('1');
    setCreditsType('subscription');
    setShowAddCreditsModal(true);
  };

  const handleAddCredits = async () => {
    if (!selectedClient || !creditsAmount) return;
    const amount = parseInt(creditsAmount, 10);
    if (isNaN(amount) || amount <= 0) {
      alert('Введите корректное количество');
      return;
    }
    
    // Prevent double-click
    const submitButton = document.querySelector('[data-add-credits-btn]') as HTMLButtonElement;
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = 'Добавляем...';
    }
    
    try {
      console.log(`[ADMIN] Adding ${amount} ${creditsType} credits to user ${selectedClient.id}`);
      
      if (creditsType === 'single') {
        const result = await api.addSingleCreditsToClient(selectedClient.id, amount, `Разовые выносы (+${amount})`);
        console.log('[ADMIN] Single credits added:', result);
      } else {
        const result = await api.addCreditsToClient(selectedClient.id, amount, `Пополнение подписки (+${amount})`);
        console.log('[ADMIN] Subscription credits added:', result);
      }
      
      setShowAddCreditsModal(false);
      setCreditsAmount('1');
      setCreditsType('subscription');
      setSelectedClient(null);
      loadData();
    } catch (e) {
      console.error('[ADMIN] Error adding credits:', e);
      alert('Ошибка пополнения');
    } finally {
      // Re-enable button
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = 'Добавить';
      }
    }
  };

  const openEditTariffModal = (tariff: any) => {
    setSelectedTariff(tariff);
    setTariffForm({
      name: tariff.name,
      price: tariff.price,
      old_price: tariff.old_price || '',
      period: tariff.period || '',
      description: tariff.description,
    });
    setShowEditTariffModal(true);
  };

  const handleUpdateTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTariff) return;
    try {
      await api.updateTariff(selectedTariff.tariff_id, {
        name: tariffForm.name,
        price: parseInt(tariffForm.price, 10),
        old_price: tariffForm.old_price ? parseInt(tariffForm.old_price, 10) : null,
        period: tariffForm.period || null,
        description: tariffForm.description,
      });
      setShowEditTariffModal(false);
      loadData();
    } catch (error) {
      alert('Ошибка обновления тарифа');
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
      <div className="grid grid-cols-2 gap-4 mb-4">
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

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <TrendingUp className="w-4 h-4" />
            <span className="text-xs">Активные (все)</span>
          </div>
          <p className="text-3xl font-bold text-yellow-400">{stats?.total_active_future || 0}</p>
        </div>
        <div className="bg-gray-800/50 p-4 rounded-2xl border border-gray-700">
          <div className="flex items-center gap-2 mb-2 text-gray-400">
            <Coins className="w-4 h-4" />
            <span className="text-xs">Выручка (мес)</span>
          </div>
          <p className="text-xl font-bold text-green-400">{stats?.total_revenue_month?.toLocaleString('ru-RU') || 0} ₽</p>
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
            onClick={() => setActiveTab('clients')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'clients' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
            <Users className="w-4 h-4" />
            Клиенты
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
        <button 
            onClick={() => setActiveTab('tariffs')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap flex items-center gap-2 ${activeTab === 'tariffs' ? 'bg-teal-600 text-white' : 'bg-gray-800 text-gray-400'}`}
        >
            <Coins className="w-4 h-4" />
            Тарифы
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

        {/* CLIENTS TAB */}
        {activeTab === 'clients' && (() => {
          const filteredClients = clients.filter(client => {
            if (!clientSearch.trim()) return true;
            const search = clientSearch.toLowerCase();
            return (
              client.name?.toLowerCase().includes(search) ||
              client.telegram_id?.toString().includes(search) ||
              client.phone?.includes(search)
            );
          });
          
          return (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-teal-500" />
              Все клиенты ({clientSearch.trim() 
                ? `${filteredClients.length} из ${clients.length}` 
                : clients.length})
            </h3>
            
            {/* Search Input */}
            <div className="bg-gray-800/40 p-3 rounded-xl border border-gray-800">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  placeholder="Поиск по имени, ID или телефону..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-lg pl-10 pr-10 py-3 text-sm focus:border-teal-500 outline-none placeholder:text-gray-600"
                />
                {clientSearch && (
                  <button
                    onClick={() => setClientSearch('')}
                    className="absolute right-3 text-gray-500 hover:text-gray-300"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
            
            <div className="space-y-3">
              {filteredClients.map(client => (
                <div key={client.id} className="bg-gray-800/30 p-4 rounded-xl border border-gray-800">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-teal-900/50 flex items-center justify-center text-teal-400 font-bold text-lg">
                        {client.name?.[0] || 'U'}
                      </div>
                      <div>
                        <a
                          href={`tg://user?id=${client.telegram_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-bold text-white hover:text-teal-400 transition flex items-center gap-1 group"
                        >
                          {client.name === 'User' ? `User #${client.telegram_id}` : client.name}
                          <span className="text-teal-500 opacity-0 group-hover:opacity-100 transition">💬</span>
                        </a>
                        <p className="text-xs text-gray-500">ID: {client.telegram_id}</p>
                        {client.phone && <p className="text-xs text-gray-500">📱 {client.phone}</p>}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold text-teal-400">{client.balance}</p>
                      <p className="text-xs text-gray-500">выносов</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mb-3 text-xs">
                    <div className="bg-gray-900/50 p-2 rounded-lg">
                      <p className="text-gray-500">Подписок</p>
                      <p className="text-white font-bold">{client.active_subscriptions}</p>
                    </div>
                    <div className="bg-gray-900/50 p-2 rounded-lg">
                      <p className="text-gray-500">Заказов</p>
                      <p className="text-white font-bold">{client.total_orders}</p>
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => openAddCreditsModal(client)}
                    className="w-full py-2 bg-teal-900/40 text-teal-400 text-sm font-medium rounded-lg border border-teal-800/50 hover:bg-teal-900/60 flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Добавить выносы
                  </button>
                </div>
              ))}
              
              {filteredClients.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-gray-800/20 rounded-2xl border border-gray-800/50 border-dashed">
                  <p>{clientSearch.trim() ? '🔍 Клиенты не найдены' : 'Пока нет клиентов'}</p>
                </div>
              )}
            </div>
          </div>
          );
        })()}

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
                        placeholder="Название ЖК (например: ЖК Мещерский лес)"
                        value={newComplexName}
                        onChange={(e) => setNewComplexName(e.target.value)}
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-teal-500 outline-none"
                    />
                    <textarea
                        placeholder="Номера домов (каждый с новой строки)&#10;Например:&#10;2к4&#10;2к5&#10;2к6&#10;2к7"
                        value={newComplexBuildings}
                        onChange={(e) => setNewComplexBuildings(e.target.value)}
                        rows={5}
                        className="bg-gray-900 border border-gray-700 text-white rounded-lg p-3 text-sm focus:border-teal-500 outline-none resize-none"
                    />
                    <button type="submit" className="bg-teal-600 text-white py-2 rounded-lg font-medium hover:bg-teal-500 transition-colors">
                        Создать зону
                    </button>
                </form>
             </div>

             <h3 className="font-bold text-gray-300 mt-6">Обслуживаемые зоны</h3>
             <div className="grid gap-3">
                {complexes.map(c => (
                    <div key={c.id} className="p-4 bg-gray-800/30 rounded-xl border border-gray-800">
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <span className="text-white font-bold text-lg">{c.name}</span>
                                {c.is_active ? (
                                    <span className="ml-2 text-xs text-green-400 inline-flex items-center gap-1">
                                        <CheckCircle className="w-3 h-3" /> Работаем
                                    </span>
                                ) : (
                                    <span className="ml-2 text-xs text-gray-500">Не активен</span>
                                )}
                            </div>
                            <button 
                                onClick={() => handleDeleteComplex(c.id)}
                                className="p-2 text-gray-500 hover:text-red-400 transition"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                        
                        {c.buildings && c.buildings.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-gray-700">
                                <p className="text-xs text-gray-500 mb-2">Номера домов:</p>
                                <div className="flex flex-wrap gap-2">
                                    {c.buildings.map((b: string, idx: number) => (
                                        <span key={idx} className="px-2 py-1 bg-gray-900/50 text-teal-400 text-xs rounded-lg border border-gray-700">
                                            {b}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
             </div>
          </div>
        )}

        {/* TARIFFS TAB */}
        {activeTab === 'tariffs' && (
          <div className="space-y-4">
            <h3 className="font-bold text-gray-300 mb-4 flex items-center gap-2">
              <Coins className="w-5 h-5 text-teal-500" />
              Управление тарифами
            </h3>
            
            <div className="space-y-3">
              {tariffs.map((tariff) => (
                <div key={tariff.id} className="bg-gray-800/30 p-4 rounded-xl border border-gray-800">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="text-white font-bold text-lg">{tariff.name}</h4>
                      <p className="text-gray-400 text-sm mt-1">{tariff.description}</p>
                    </div>
                    <button
                      onClick={() => {
                        openEditTariffModal(tariff);
                      }}
                      className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <span className="text-teal-500 font-bold text-2xl">₽</span>
                      <span className="text-white font-bold text-xl">{tariff.price} ₽</span>
                      {tariff.old_price && (
                        <span className="text-gray-500 line-through">{tariff.old_price} ₽</span>
                      )}
                    </div>
                    {tariff.period && (
                      <span className="text-gray-400">• {tariff.period}</span>
                    )}
                  </div>
                </div>
              ))}
              
              {tariffs.length === 0 && (
                <div className="text-center py-10 text-gray-500 bg-gray-800/20 rounded-2xl border border-gray-800/50 border-dashed">
                  <p>Тарифы не загружены</p>
                </div>
              )}
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
      
      {/* Add Credits Modal */}
      {showAddCreditsModal && selectedClient && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-800 p-5">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Пополнение баланса</h3>
              <button onClick={() => setShowAddCreditsModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <div className="mb-4">
              <p className="text-gray-400 text-sm mb-1">Клиент:</p>
              <p className="text-white font-bold">{selectedClient.name}</p>
              <p className="text-gray-500 text-xs">Текущий баланс: {selectedClient.balance} выносов</p>
            </div>

            {/* Balance Type Selection */}
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Тип баланса:</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setCreditsType('subscription')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition ${
                    creditsType === 'subscription'
                      ? 'bg-teal-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  📦 Подписка
                </button>
                <button
                  type="button"
                  onClick={() => setCreditsType('single')}
                  className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition ${
                    creditsType === 'single'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  🎁 Разовые
                </button>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 text-sm mb-2">Количество выносов:</label>
              <input
                type="number"
                min="1"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 text-lg font-bold focus:border-teal-500 outline-none text-center"
                placeholder="1"
              />
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddCreditsModal(false)}
                className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-lg font-medium hover:bg-gray-700"
              >
                Отмена
              </button>
              <button
                onClick={handleAddCredits}
                data-add-credits-btn
                className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Tariff Modal */}
      {showEditTariffModal && selectedTariff && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-gray-900 rounded-2xl border border-gray-800 p-5 max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Редактировать тариф</h3>
              <button onClick={() => setShowEditTariffModal(false)}><X className="w-5 h-5 text-gray-500" /></button>
            </div>
            
            <form onSubmit={handleUpdateTariff} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">Название</label>
                <input
                  type="text"
                  value={tariffForm.name}
                  onChange={(e) => setTariffForm({ ...tariffForm, name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:border-teal-500 outline-none"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Цена (₽)</label>
                  <input
                    type="number"
                    value={tariffForm.price}
                    onChange={(e) => setTariffForm({ ...tariffForm, price: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:border-teal-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-2">Старая цена (₽)</label>
                  <input
                    type="number"
                    value={tariffForm.old_price}
                    onChange={(e) => setTariffForm({ ...tariffForm, old_price: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:border-teal-500 outline-none"
                    placeholder="Необязательно"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Период</label>
                <input
                  type="text"
                  value={tariffForm.period}
                  onChange={(e) => setTariffForm({ ...tariffForm, period: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:border-teal-500 outline-none"
                  placeholder="Например: 2 недели"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">Описание</label>
                <textarea
                  value={tariffForm.description}
                  onChange={(e) => setTariffForm({ ...tariffForm, description: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 focus:border-teal-500 outline-none resize-none"
                  rows={3}
                  required
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditTariffModal(false)}
                  className="flex-1 py-3 bg-gray-800 text-gray-400 rounded-lg font-medium hover:bg-gray-700"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-500 flex items-center justify-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
