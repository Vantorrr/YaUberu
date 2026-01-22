'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<any>(null);
  const [balance, setBalance] = useState(0);
  const [singleBalance, setSingleBalance] = useState(0); // Баланс разовых выносов

  useEffect(() => {
    // Load user data
    const loadUserData = async () => {
      try {
        const [subscriptionsData, balanceData] = await Promise.all([
          api.getSubscriptions(),
          api.getBalance()
        ]);
        
        console.log('[HOME] Subscriptions:', subscriptionsData);
        console.log('[HOME] Balance:', balanceData);
        
        // Set active subscription (first one)
        if (subscriptionsData && subscriptionsData.length > 0) {
          setSubscription(subscriptionsData[0]);
        }
        
        setBalance(balanceData.credits || 0);
        setSingleBalance(balanceData.single_credits || 0);
        setLoading(false);
      } catch (error) {
        console.error('[HOME] Error loading user data:', error);
        setLoading(false);
      }
    };

    loadUserData();
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-teal-600 font-semibold">Загрузка...</div>
      </div>
    );
  }

  // If user has active subscription - show subscription info
  if (subscription) {
    const tariffNames: Record<string, string> = {
      trial: 'Пробная подписка',
      monthly: 'Месячная подписка',
      single: 'Разовый'
    };

    return (
      <div className="min-h-screen bg-white px-6 pt-8 pb-32">
        <div className="max-w-md mx-auto space-y-6">
          {/* Active Subscription Card */}
          <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-3xl p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="text-xs text-teal-700 font-medium uppercase tracking-wide mb-1">Активна</p>
                <h2 className="text-2xl font-bold text-gray-900">{tariffNames[subscription.tariff] || subscription.tariff}</h2>
              </div>
              <div className="bg-teal-600 text-white px-3 py-1 rounded-full text-xs font-bold">
                Подписка
              </div>
            </div>
            
            {/* Balance - Subscription */}
            <div className="bg-white/70 rounded-2xl p-4 mb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-teal-600 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Баланс выносов по подписке</p>
                    <p className="text-3xl font-bold text-gray-900">{balance}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Balance - Single (always show) */}
            <div className="bg-white/70 rounded-2xl p-4 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                    <Trash2 className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-600">Разовые выносы</p>
                    <p className="text-3xl font-bold text-gray-900">{singleBalance}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Subscription Details */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center justify-between text-gray-700">
                <span>Начало:</span>
                <span className="font-medium">{new Date(subscription.start_date).toLocaleDateString('ru-RU')}</span>
              </div>
              {subscription.end_date && (
                <div className="flex items-center justify-between text-gray-700">
                  <span>Окончание:</span>
                  <span className="font-medium">{new Date(subscription.end_date).toLocaleDateString('ru-RU')}</span>
                </div>
              )}
              {subscription.frequency && (
                <div className="flex items-center justify-between text-gray-700">
                  <span>Частота:</span>
                  <span className="font-medium">
                    {subscription.frequency === 'every_other_day' ? 'Через день' : 
                     subscription.frequency === 'daily' ? 'Каждый день' : subscription.frequency}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="space-y-3">
            <Button
              onClick={() => router.push('/app/orders')}
              fullWidth
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 text-base rounded-2xl"
            >
              Управление подпиской
            </Button>
            
            <button
              onClick={() => router.push('/app/tariffs')}
              className="w-full text-teal-600 font-semibold py-3 text-sm"
            >
              Изменить или купить выносы
            </button>
          </div>
        </div>
      </div>
    );
  }

  // No subscription - show default page
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-32">
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md">
        {/* Hero text */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            ПОКА ВЫ ЗАНЯТЫ ВАЖНЫМ
          </h1>
          <h2 className="text-4xl md:text-5xl font-black text-teal-600">
            Я УБЕРУ
          </h2>
        </div>

        {/* Balances if exist */}
        {(balance > 0 || singleBalance > 0) && (
          <div className="w-full space-y-3">
            {balance > 0 && (
              <div className="bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
                <p className="text-xs text-teal-700 font-medium uppercase tracking-wide mb-1">Баланс выносов по подписке</p>
                <p className="text-3xl font-bold text-teal-900">{balance} выносов</p>
              </div>
            )}
            {singleBalance > 0 && (
              <div className="bg-orange-50 border-2 border-orange-200 rounded-2xl p-4">
                <p className="text-xs text-orange-700 font-medium uppercase tracking-wide mb-1">Разовые выносы</p>
                <p className="text-3xl font-bold text-orange-900">{singleBalance} доступно</p>
              </div>
            )}
          </div>
        )}

        {/* Main CTA Button */}
        <div className="w-full space-y-3">
          <Button
            onClick={() => router.push('/app/tariffs')}
            fullWidth
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl shadow-teal-600/30 hover:shadow-teal-600/50 transition-all"
          >
            <Trash2 className="w-6 h-6" />
            УБРАТЬ МУСОР
          </Button>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-sm px-4">
            Я могу вынести мусор в удобный промежуток времени
          </p>
        </div>
      </div>
    </div>
  );
}
