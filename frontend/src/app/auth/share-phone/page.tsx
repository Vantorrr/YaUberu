'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Phone } from 'lucide-react';

export default function SharePhonePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSharePhone = () => {
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      
      // Request phone number from Telegram
      tg.requestContact((shared: boolean) => {
        if (shared) {
          // Phone shared successfully, redirect to app
          router.push('/app');
        }
      });
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6">
      <div className="max-w-md text-center space-y-6">
        <div className="w-20 h-20 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <Phone className="w-10 h-10 text-teal-600" />
        </div>
        
        <h1 className="text-2xl font-bold text-gray-900">
          Поделитесь номером телефона
        </h1>
        
        <p className="text-gray-600">
          Это нужно для связи с курьером и уведомлений о выполнении заказа
        </p>
        
        <Button
          onClick={handleSharePhone}
          fullWidth
          disabled={loading}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 text-lg rounded-2xl"
        >
          <Phone className="w-5 h-5" />
          Поделиться номером
        </Button>
        
        <button
          onClick={() => router.push('/app')}
          className="text-gray-500 text-sm underline"
        >
          Пропустить
        </button>
      </div>
    </div>
  );
}

