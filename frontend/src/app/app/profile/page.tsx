'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { User, History, HelpCircle, Info, ChevronRight, LogOut, Phone, Shield, MessageCircle, Building2, FileText, Package } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<{credits: number; single_credits: number} | null>(null);

  useEffect(() => {
    loadUser();
    loadBalance();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) {
      console.error(e);
    }
  };

  const loadBalance = async () => {
    try {
      const res = await api.getBalance();
      setBalance({ credits: res.credits, single_credits: res.single_credits });
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  const openSupport = () => {
    window.open('https://t.me/yauberuhelp', '_blank');
  };

  return (
    <div className="min-h-screen bg-white px-5 py-6 space-y-6 pb-24">
      {/* Header */}
      <h1 className="text-3xl font-bold text-gray-900">Профиль</h1>

      {/* User Card */}
      <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-16 h-16 bg-teal-600 rounded-full flex items-center justify-center shadow-md">
            <span className="text-2xl font-bold text-white uppercase">
              {user?.name?.[0] || 'Я'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-gray-900 font-bold text-xl">{user?.name || 'Загрузка...'}</p>
            <div className="flex items-center gap-1.5 text-gray-600 text-sm mt-1">
              <Phone className="w-4 h-4" />
              <span>{user?.phone || 'Не указан'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-green-700 text-xs font-semibold bg-green-100 px-2 py-1 rounded-full">
                <Shield className="w-3 h-3" />
                Верифицирован
              </span>
            </div>
          </div>
        </div>
        
        {/* Balances */}
        <div className="space-y-3">
          {/* Subscription Balance */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-teal-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-1">Баланс выносов по подписке</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-900 font-bold text-4xl">{balance !== null ? balance.credits : '...'}</span>
                  <span className="text-gray-600 font-medium text-lg">выносов</span>
                </div>
              </div>
            </div>
          </div>

          {/* Single Credits Balance */}
          <div className="flex items-center justify-between bg-white rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-4 flex-1">
              <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-orange-600" />
              </div>
              <div className="flex-1">
                <p className="text-gray-500 text-xs mb-1">Разовые выносы</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-gray-900 font-bold text-4xl">{balance !== null ? balance.single_credits : '...'}</span>
                  <span className="text-gray-600 font-medium text-lg">доступно</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Управление
        </h2>
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
          <button 
            onClick={() => router.push('/app/orders')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="w-10 h-10 bg-teal-100 rounded-xl flex items-center justify-center text-teal-600">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Мои заказы</p>
              <p className="text-gray-500 text-xs truncate">История и подписки</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => router.push('/app/tariffs')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600">
              <Package className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Новый заказ</p>
              <p className="text-gray-500 text-xs truncate">Оформить вывоз</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Info */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Информация
        </h2>
        <div className="bg-white rounded-2xl border-2 border-gray-200 overflow-hidden shadow-sm">
          <button 
            onClick={() => router.push('/app/how-it-works')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Как работает сервис</p>
              <p className="text-gray-500 text-xs truncate">Инструкция для пользователей</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => router.push('/app/company-info')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-purple-600">
              <Building2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Реквизиты компании</p>
              <p className="text-gray-500 text-xs truncate">Для юр. оплат</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => router.push('/app/privacy')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors border-b border-gray-200"
          >
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600">
              <Shield className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Политика конфиденциальности</p>
              <p className="text-gray-500 text-xs truncate">Защита данных</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>

          <button 
            onClick={() => router.push('/app/terms')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-600">
              <FileText className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-gray-900 font-semibold text-sm">Правовая информация</p>
              <p className="text-gray-500 text-xs truncate">Условия использования</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400" />
          </button>
        </div>
      </div>

      {/* Support */}
      <div>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          Помощь
        </h2>
        <button 
          onClick={openSupport}
          className="w-full flex items-center gap-4 p-4 text-left hover:bg-gray-50 transition-colors bg-white rounded-2xl border-2 border-gray-200 shadow-sm"
        >
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-gray-900 font-semibold text-sm">Поддержка</p>
            <p className="text-gray-500 text-xs truncate">Написать в Telegram</p>
          </div>
          <ChevronRight className="w-5 h-5 text-gray-400" />
        </button>
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-600 font-semibold bg-red-50 rounded-2xl border-2 border-red-200 hover:bg-red-100 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Выйти из аккаунта
      </button>
    </div>
  );
}
