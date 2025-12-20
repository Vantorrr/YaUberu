'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Phone, ArrowLeft } from 'lucide-react';
import { api } from '@/lib/api';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        initData: string;
        requestContact: (callback: (success: boolean, contact?: {
          phone_number: string;
          first_name: string;
          last_name?: string;
        }) => void) => void;
      };
    };
  }
}

export default function ContactAuthPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleShareContact = () => {
    if (!window.Telegram?.WebApp) {
      alert('Это приложение работает только в Telegram');
      return;
    }

    setLoading(true);

    window.Telegram.WebApp.requestContact((success, contact) => {
      if (success && contact) {
        // Send contact data to backend
        saveContact(contact);
      } else {
        setLoading(false);
        alert('Необходимо поделиться контактом для продолжения');
      }
    });
  };

  const saveContact = async (contact: {
    phone_number: string;
    first_name: string;
    last_name?: string;
  }) => {
    try {
      const initData = window.Telegram?.WebApp?.initData || '';
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'}/auth/telegram-contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          init_data: initData,
          phone: contact.phone_number,
          first_name: contact.first_name,
          last_name: contact.last_name || '',
        }),
      });

      if (!response.ok) {
        throw new Error('Ошибка авторизации');
      }

      const data = await response.json();
      
      // Save token
      api.setToken(data.access_token);
      
      // Redirect to app
      router.push('/app');
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1714] px-5 py-6">
      {/* Back */}
      <button 
        onClick={() => router.back()} 
        className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-white mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-2">Авторизация</h1>
      <p className="text-gray-500 mb-8">
        Чтобы мы могли связываться с вами, поделитесь номером телефона
      </p>

      {/* Contact Request Card */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-emerald-600 rounded-xl flex items-center justify-center">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Ваш телефон</p>
            <p className="text-gray-500 text-sm">Безопасно и быстро</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mb-6">
          Мы используем номер для уведомлений о статусе заказа и связи с курьером.
        </p>
        <Button 
          fullWidth 
          onClick={handleShareContact} 
          disabled={loading}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Обработка...
            </span>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              Поделиться телефоном
            </>
          )}
        </Button>
      </Card>

      <p className="text-center text-gray-600 text-xs mt-8">
        Нажимая кнопку, вы соглашаетесь на обработку персональных данных
      </p>
    </div>
  );
}

