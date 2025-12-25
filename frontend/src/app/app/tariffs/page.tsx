'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { api } from '@/lib/api';
import { useEffect, useState } from 'react';

interface Tariff {
  id: number;
  tariff_type: string;
  name: string;
  price: string;
  old_price: string | null;
  period: string | null;
  description: string | null;
}

export default function TariffsPage() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<Tariff[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTariffs = async () => {
      try {
        const data = await api.getPublicTariffs();
        setTariffs(data);
      } catch (error) {
        console.error('Failed to load tariffs:', error);
      } finally {
        setLoading(false);
      }
    };
    loadTariffs();
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-900 hover:bg-gray-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Выберите подписку</h1>
            <p className="text-gray-500 text-sm">Оформите удобный тариф</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-4 pb-24">
        {loading ? (
          <div className="text-center py-10">
            <p className="text-gray-500">Загрузка тарифов...</p>
          </div>
        ) : (
          tariffs.map((t) => {
            const isUrgent = t.tariff_type === 'single';
            return (
              <div
                key={t.id}
                onClick={() => router.push(`/app/order?tariff=${t.tariff_type}`)}
                className="relative p-6 rounded-2xl border-2 bg-white border-gray-200 hover:border-gray-300 transition-all cursor-pointer hover:shadow-lg"
              >
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-gray-900 font-bold text-xl">{t.name}</h3>
                    {isUrgent && (
                      <div className="inline-flex items-center gap-1 mt-2 text-orange-600 text-xs font-semibold">
                        <Zap className="w-4 h-4" />
                        Срочный вынос
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    {t.old_price && (
                      <p className="text-gray-400 line-through text-sm">{t.old_price} ₽</p>
                    )}
                    <p className="text-gray-900 text-2xl">{t.price} ₽</p>
                    {t.period && (
                      <p className="text-gray-500 text-xs mt-1">{t.period}</p>
                    )}
                  </div>
                </div>

                {/* Description */}
                {t.description && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <div className="w-5 h-5 bg-teal-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                      <span>{t.description}</span>
                    </div>
                  </div>
                )}

                {/* CTA Arrow */}
                <div className="mt-4 flex justify-end">
                  <div className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-100 text-gray-900">
                    Выбрать →
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Info message */}
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mt-6">
          <p className="text-blue-900 text-sm">
            💡 После оплаты вы сможете управлять подпиской во вкладке <strong>"Заказы"</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

