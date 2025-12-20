'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2, Zap, Crown, Package, ChevronRight, Check } from 'lucide-react';
import { api } from '@/lib/api';

const tariffs = [
  { 
    id: 'single', 
    name: 'Разовый визит', 
    price: '150 ₽', 
    period: 'за вынос',
    desc: 'Идеально для теста',
    features: ['Заберем сегодня', 'В любое время']
  },
  { 
    id: 'trial', 
    name: 'Пробный старт', 
    price: '199 ₽', 
    period: 'на неделю',
    desc: 'Попробуйте сервис',
    popular: true,
    features: ['3 выноса включено', 'Приоритет']
  },
  { 
    id: 'monthly', 
    name: 'Комфорт Месяц', 
    price: '1 350 ₽', 
    period: 'в месяц',
    desc: 'Полная свобода',
    features: ['Регулярный вывоз', 'До 15 пакетов', 'Личный курьер']
  },
];

export default function HomePage() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    api.getBalance()
       .then(res => setBalance(res.credits))
       .catch(err => console.error(err));
  }, []);

  return (
    <div className="px-5 py-6 space-y-8 min-h-screen pb-24">
      {/* Header */}
      <div>
        <p className="text-emerald-500 text-sm font-medium mb-1">Добро пожаловать 👋</p>
        <h1 className="text-3xl font-bold text-white">Главная</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-emerald-900 to-emerald-950 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-emerald-500/20">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <p className="text-emerald-400/80 text-sm font-medium mb-1">Ваш баланс</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white tracking-tight">
                {balance !== null ? balance : '...'}
              </span>
              <span className="text-emerald-400 text-lg font-medium">выносов</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-emerald-500/20">
            <Package className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <Button 
                onClick={() => router.push('/app/order')} 
                className="flex-1 bg-white text-emerald-950 hover:bg-gray-100 font-bold"
            >
                <Trash2 className="w-4 h-4 mr-2" />
                Вызвать
            </Button>
        </div>

        {/* Decor */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-500/10 rounded-full blur-3xl" />
      </div>

      {/* Subscriptions (Apple Style) */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">Подписки</h2>
          <button className="text-emerald-400 text-sm font-medium">Восстановить</button>
        </div>
        
        <div className="flex flex-col gap-4">
          {tariffs.map((t) => (
            <div 
                key={t.id} 
                onClick={() => router.push(`/app/order?tariff=${t.id}`)}
                className={`
                    relative p-5 rounded-2xl border transition-all cursor-pointer overflow-hidden group
                    ${t.popular 
                        ? 'bg-zinc-900 border-emerald-500/50 ring-1 ring-emerald-500/20' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
                `}
            >
              {t.popular && (
                <div className="absolute top-0 right-0 bg-emerald-500 text-emerald-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                  POPULAR
                </div>
              )}
              
              <div className="flex justify-between items-start mb-2">
                <div>
                    <h3 className="text-white font-bold text-lg">{t.name}</h3>
                    <p className="text-zinc-400 text-sm">{t.desc}</p>
                </div>
                <div className="text-right">
                    <p className="text-white font-bold text-lg">{t.price}</p>
                    <p className="text-zinc-500 text-xs">{t.period}</p>
                </div>
              </div>

              {/* Features as clean text or bullets */}
              <div className="mt-3 flex flex-wrap gap-2">
                  {t.features.map((f, i) => (
                      <span key={i} className="text-xs text-zinc-400 flex items-center gap-1 bg-zinc-800/50 px-2 py-1 rounded-md">
                          <Check className="w-3 h-3 text-emerald-500" />
                          {f}
                      </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
