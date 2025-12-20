'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { User, MapPin, History, HelpCircle, Info, ChevronRight, LogOut, Phone, Shield, MessageCircle } from 'lucide-react';
import { api } from '@/lib/api';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await api.getMe();
      setUser(userData);
    } catch (e) {
      console.error(e);
    }
  };

  const handleLogout = () => {
    api.logout();
    router.push('/');
  };

  const openSupport = () => {
    window.open('https://t.me/YaUberu_AppBot', '_blank');
  };

  return (
    <div className="px-5 py-6 space-y-6 pb-24">
      {/* Header */}
      <h1 className="text-3xl font-bold text-white">Профиль</h1>

      {/* User */}
      <Card>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-600 rounded-full flex items-center justify-center">
            <span className="text-2xl font-bold text-white uppercase">
                {user?.name?.[0] || 'Я'}
            </span>
          </div>
          <div className="flex-1">
            <p className="text-white font-bold text-lg">{user?.name || 'Загрузка...'}</p>
            <div className="flex items-center gap-1.5 text-gray-500 text-sm mt-1">
              <Phone className="w-4 h-4" />
              <span>{user?.phone || 'Не указан'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-2">
              <span className="inline-flex items-center gap-1 text-green-500 text-xs font-semibold bg-green-900/30 px-2 py-0.5 rounded-full">
                <Shield className="w-3 h-3" />
                Верифицирован
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Actions */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
          Управление
        </h2>
        <div className="bg-emerald-950/30 rounded-2xl border border-emerald-800/20 overflow-hidden">
          <button 
            onClick={() => router.push('/app/orders')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-emerald-900/30 transition-colors border-b border-emerald-800/20"
          >
            <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-400">
              <History className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Мои заказы</p>
              <p className="text-gray-500 text-xs truncate">История и предстоящие</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          <button 
            onClick={() => router.push('/app/order')}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-emerald-900/30 transition-colors"
          >
            <div className="w-10 h-10 bg-orange-900/50 rounded-xl flex items-center justify-center text-orange-400">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Новый заказ</p>
              <p className="text-gray-500 text-xs truncate">Оформить вывоз</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Support */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
          Помощь
        </h2>
        <div className="bg-emerald-950/30 rounded-2xl border border-emerald-800/20 overflow-hidden">
          <button 
            onClick={openSupport}
            className="w-full flex items-center gap-4 p-4 text-left hover:bg-emerald-900/30 transition-colors border-b border-emerald-800/20"
          >
            <div className="w-10 h-10 bg-blue-900/50 rounded-xl flex items-center justify-center text-blue-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white font-medium text-sm">Поддержка</p>
              <p className="text-gray-500 text-xs truncate">Написать в Telegram</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>

          <div className="p-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-emerald-400">
                <Info className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white font-medium text-sm">О сервисе</p>
                <p className="text-gray-500 text-xs">Мы забираем мусор от вашей двери в удобное время. Просто оставьте пакет — мы всё сделаем!</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Logout */}
      <button 
        onClick={handleLogout}
        className="w-full flex items-center justify-center gap-2 py-4 text-red-500 font-semibold bg-red-950/20 rounded-2xl border border-red-900/30 hover:bg-red-950/30 transition-colors"
      >
        <LogOut className="w-5 h-5" />
        Выйти из аккаунта
      </button>
    </div>
  );
}
