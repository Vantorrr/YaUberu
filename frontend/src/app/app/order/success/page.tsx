'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckCircle, Calendar, Clock, MapPin, ArrowRight } from 'lucide-react';
import confetti from 'canvas-confetti';

export default function SuccessPage() {
  const router = useRouter();

  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#059669', '#34D399', '#EA580C', '#F97316'],
    });
  }, []);

  return (
    <div className="min-h-screen bg-[#0f1714] flex flex-col items-center justify-center px-5 py-10">
      {/* Icon */}
      <div className="w-24 h-24 bg-green-500 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-green-500/30">
        <CheckCircle className="w-12 h-12 text-white" />
      </div>

      {/* Title */}
      <h1 className="text-2xl font-bold text-white mb-2 text-center">Заказ оформлен!</h1>
      <p className="text-gray-500 text-center mb-8">Мы заберем мусор в указанное время</p>

      {/* Details */}
      <div className="w-full max-w-sm space-y-4">
        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center">
                <Calendar className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Дата</p>
                <p className="text-white font-semibold">Завтра, 20 декабря</p>
              </div>
            </div>

            <div className="h-px bg-emerald-900/30" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center">
                <Clock className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Время</p>
                <p className="text-white font-semibold">08:00 — 10:00</p>
              </div>
            </div>

            <div className="h-px bg-emerald-900/30" />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center">
                <MapPin className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-gray-500 text-xs">Адрес</p>
                <p className="text-white font-semibold">ЖК Маяк, д. 2к4, кв. 45</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Reminder */}
        <div className="bg-orange-950/30 border border-orange-800/30 rounded-2xl p-4">
          <p className="text-orange-400 text-sm">
            <span className="font-semibold">Напоминание:</span> Выставьте пакет у двери за 10 минут до начала.
          </p>
        </div>

        {/* Buttons */}
        <div className="space-y-3 pt-4">
          <Button fullWidth onClick={() => router.push('/app')}>
            На главную
            <ArrowRight className="w-5 h-5" />
          </Button>
          <Button variant="secondary" fullWidth onClick={() => router.push('/app/orders')}>
            Мои заказы
          </Button>
        </div>
      </div>
    </div>
  );
}
