'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { CheckCircle, ArrowRight, Bell } from 'lucide-react';
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
      <p className="text-gray-500 text-center mb-8 max-w-xs">
        Мы заберем мусор в выбранное время. Вы получите уведомление, когда курьер будет рядом.
      </p>

      {/* Reminder */}
      <div className="w-full max-w-sm bg-orange-950/30 border border-orange-800/30 rounded-2xl p-4 mb-8 flex items-start gap-3">
        <Bell className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
        <p className="text-orange-200 text-sm">
          <span className="font-semibold">Напоминание:</span> Выставьте пакет у двери за 10 минут до начала слота.
        </p>
      </div>

      {/* Buttons */}
      <div className="w-full max-w-sm space-y-3">
        <Button fullWidth onClick={() => router.push('/app')}>
          На главную
          <ArrowRight className="w-5 h-5" />
        </Button>
        <Button variant="secondary" fullWidth onClick={() => router.push('/app/orders')}>
          Мои заказы
        </Button>
      </div>
    </div>
  );
}
