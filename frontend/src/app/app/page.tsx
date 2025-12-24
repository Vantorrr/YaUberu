'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2, Zap, Crown, Package, ChevronRight, Check, Building2, FileText, Shield, Info } from 'lucide-react';
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
      <div className="animate-fadeIn">
        <p className="text-teal-500 text-sm font-medium mb-1">Добро пожаловать 👋</p>
        <h1 className="text-3xl font-bold text-white">Главная</h1>
      </div>

      {/* Balance Card */}
      <div className="bg-gradient-to-br from-teal-900 to-teal-950 rounded-3xl p-6 shadow-xl relative overflow-hidden border border-teal-500/20 animate-slideUp">
        <div className="flex items-center justify-between mb-6 relative z-10">
          <div>
            <p className="text-teal-400/80 text-sm font-medium mb-1">Ваш баланс</p>
            <div className="flex items-baseline gap-2">
              <span className="text-5xl font-bold text-white tracking-tight">
                {balance !== null ? balance : '...'}
              </span>
              <span className="text-teal-400 text-lg font-medium">выносов</span>
            </div>
          </div>
          <div className="w-14 h-14 bg-teal-500/10 rounded-2xl flex items-center justify-center backdrop-blur-sm border border-teal-500/20">
            <Package className="w-7 h-7 text-teal-400" />
          </div>
        </div>
        
        <div className="flex items-center gap-3">
            <Button 
                onClick={() => router.push('/app/order')} 
                fullWidth
                className="bg-teal-500 hover:bg-teal-600 text-white font-bold py-4 shadow-lg shadow-teal-500/30 hover:shadow-teal-500/50 transition-all"
            >
                <Trash2 className="w-5 h-5" />
                Вызвать курьера
            </Button>
        </div>

        {/* Decor */}
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-teal-500/10 rounded-full blur-3xl" />
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
                        ? 'bg-zinc-900 border-teal-500/50 ring-1 ring-teal-500/20' 
                        : 'bg-zinc-900/50 border-zinc-800 hover:border-zinc-700'}
                `}
            >
              {t.popular && (
                <div className="absolute top-0 right-0 bg-teal-500 text-teal-950 text-[10px] font-bold px-3 py-1 rounded-bl-xl">
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
                          <Check className="w-3 h-3 text-teal-500" />
                          {f}
                      </span>
                  ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Реквизиты компании */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-5 h-5 text-teal-500" />
          <h2 className="text-xl font-bold text-white">Реквизиты компании</h2>
        </div>
        
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5 space-y-3">
          <div>
            <p className="text-zinc-500 text-xs mb-1">Наименование</p>
            <p className="text-white text-sm font-medium">Индивидуальный предприниматель ЕСАЯН ЭДГАР АШОТОВИЧ</p>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-zinc-500 text-xs mb-1">ИНН</p>
              <p className="text-white text-sm font-mono">504710511280</p>
            </div>
            <div>
              <p className="text-zinc-500 text-xs mb-1">БИК</p>
              <p className="text-white text-sm font-mono">044525411</p>
            </div>
          </div>
          
          <div>
            <p className="text-zinc-500 text-xs mb-1">Банк</p>
            <p className="text-white text-sm">ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)</p>
          </div>
          
          <div>
            <p className="text-zinc-500 text-xs mb-1">Корреспондентский счёт</p>
            <p className="text-white text-sm font-mono">30101810145250000411</p>
          </div>
          
          <div>
            <p className="text-zinc-500 text-xs mb-1">Расчётный счёт</p>
            <p className="text-white text-sm font-mono">40802810400810057684</p>
          </div>
          
          <div className="pt-3 border-t border-zinc-800">
            <p className="text-zinc-400 text-xs">
              💳 Для оплаты по реквизитам свяжитесь с нами
            </p>
          </div>
        </div>
      </div>

      {/* Правовая информация */}
      <div className="pb-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-teal-500" />
          <h2 className="text-xl font-bold text-white">Правовая информация</h2>
        </div>
        
        <div className="space-y-3">
          <div 
            onClick={() => router.push('/app/privacy')}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Политика конфиденциальности</p>
                <p className="text-zinc-500 text-xs">Как мы защищаем ваши данные</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
          
          <div 
            onClick={() => router.push('/app/security')}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Безопасность</p>
                <p className="text-zinc-500 text-xs">Меры защиты информации</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
          
          <div 
            onClick={() => router.push('/app/terms')}
            className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:border-zinc-700 transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-teal-500/10 rounded-xl flex items-center justify-center">
                <Info className="w-5 h-5 text-teal-500" />
              </div>
              <div>
                <p className="text-white font-medium text-sm">Правовая информация</p>
                <p className="text-zinc-500 text-xs">Условия использования сервиса</p>
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-zinc-600" />
          </div>
        </div>
      </div>
    </div>
  );
}
