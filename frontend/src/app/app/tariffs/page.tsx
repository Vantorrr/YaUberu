'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

export default function TariffsPage() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<any>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTariffs = async () => {
      try {
        const data = await api.getPublicTariffs();
        // Convert array to object keyed by tariff_id
        const tariffsMap = data.reduce((acc: any, t: any) => {
          acc[t.tariff_id] = t;
          return acc;
        }, {});
        setTariffs(tariffsMap);
      } catch (error) {
        console.error('Failed to load tariffs:', error);
        // Use fallback prices if API fails
        setTariffs({
          single: { price: 139, name: 'Разовый вынос' },
          trial: { price: 199, old_price: 756, name: 'Первая подписка', description: 'Две недели будем выносить ваш мусор через день' },
          monthly_14: { price: 756, name: 'Комфорт 2 недели', description: 'Регулярный вынос мусора в течение 14 дней' },
          monthly_30: { price: 1350, name: 'Комфорт месяц', description: 'Регулярный вынос мусора в течение 30 дней' },
        });
      } finally {
        setLoading(false);
      }
    };
    loadTariffs();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Загрузка тарифов...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="w-9 h-9 bg-gray-100 rounded-lg flex items-center justify-center"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-bold text-gray-900">Заказ</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-4 space-y-3 pb-24">
        {/* 1. Разовый вынос */}
        <button
          onClick={() => router.push('/app/order?tariff=single')}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900">{tariffs.single?.name || 'Разовый вынос'}</h3>
            </div>
            <div className="text-right ml-3">
              <p className="text-gray-900 font-bold text-lg">от {tariffs.single?.price || 139} ₽</p>
            </div>
          </div>
        </button>

        {/* 2. Пробный старт - ВЫДЕЛЕННЫЙ */}
        <button
          onClick={() => router.push('/app/order?tariff=trial')}
          className="w-full bg-gradient-to-br from-teal-400 to-teal-500 rounded-xl p-4 text-left shadow-md"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-bold text-lg text-white">{tariffs.trial?.name || 'Первая подписка'}</h3>
              <p className="text-white/80 text-xs font-medium mt-0.5">Для новых пользователей</p>
              <p className="text-white/90 text-sm mt-2">{tariffs.trial?.description || 'Две недели будем выносить ваш мусор через день'}</p>
            </div>
            <div className="text-right ml-3">
              {tariffs.trial?.old_price && (
                <p className="text-white/70 line-through text-sm">{tariffs.trial.old_price} ₽</p>
              )}
              <p className="text-white font-bold text-2xl">{tariffs.trial?.price || 199} ₽</p>
            </div>
          </div>
        </button>

        {/* 3. Комфорт 2 недели */}
        <button
          onClick={() => router.push('/app/order?tariff=monthly&duration=14')}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900">{tariffs.monthly_14?.name || 'Комфорт 2 недели'}</h3>
            </div>
            <div className="text-right ml-3">
              <p className="text-gray-900 font-bold text-lg">от {tariffs.monthly_14?.price || 756}₽</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            {tariffs.monthly_14?.description || 'Регулярный вынос мусора в течение 14 дней'}
          </p>
        </button>

        {/* 4. Комфорт месяц */}
        <button
          onClick={() => router.push('/app/order?tariff=monthly&duration=30')}
          className="w-full bg-white rounded-xl border border-gray-200 p-4 text-left"
        >
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-bold text-base text-gray-900">{tariffs.monthly_30?.name || 'Комфорт месяц'}</h3>
            </div>
            <div className="text-right ml-3">
              <p className="text-gray-900 font-bold text-lg">от {tariffs.monthly_30?.price || 1350} ₽</p>
            </div>
          </div>
          <p className="text-gray-600 text-sm">
            {tariffs.monthly_30?.description || 'Регулярный вынос мусора в течение 30 дней'}
          </p>
        </button>

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mt-4">
          <p className="text-blue-900 text-xs">
            💡 После оплаты вы сможете управлять подпиской во вкладке <strong>"Заказы"</strong>
          </p>
        </div>
      </div>
    </div>
  );
}
