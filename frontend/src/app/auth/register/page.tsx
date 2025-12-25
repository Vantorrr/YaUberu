'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, User, Phone, Send } from 'lucide-react';
import { api } from '@/lib/api';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    try {
      setLoading(true);
      const mockPhone = "+79990000000"; 
      const user = await api.login(name, mockPhone);
      
      // If no phone - show onboarding first
      if (!user || !user.phone || user.phone === '') {
        router.push('/onboarding');
      } else {
        router.push('/app');
      }
    } catch (error) {
      console.error(error);
      alert('Ошибка соединения с сервером. Убедитесь, что бэкенд запущен на порту 8080.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1714] px-5 py-6">
      {/* Back */}
      <button onClick={() => router.back()} className="w-10 h-10 bg-teal-900/50 rounded-xl flex items-center justify-center text-white mb-8">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-2">Регистрация</h1>
      <p className="text-gray-500 mb-8">Создайте аккаунт за пару секунд</p>

      {/* Form */}
      <div className="space-y-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Ваше имя</label>
          <div className="relative">
            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
            <input
              type="text"
              placeholder="Как к вам обращаться?"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600"
            />
          </div>
        </div>

        <Card>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
              <Send className="w-6 h-6 text-white" />
            </div>
            <div>
              <p className="text-white font-semibold">Telegram</p>
              <p className="text-gray-500 text-sm">Быстрая авторизация</p>
            </div>
          </div>
          <p className="text-gray-500 text-sm mb-4">Мы используем Telegram для авторизации и уведомлений.</p>
          <Button fullWidth onClick={handleAuth} disabled={!name || loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Подключение к базе...
              </span>
            ) : (
              <>
                <Phone className="w-5 h-5" />
                Поделиться контактом
              </>
            )}
          </Button>
        </Card>

        <p className="text-center text-gray-600 text-xs">
          Нажимая кнопку, вы соглашаетесь на обработку данных
        </p>
      </div>
    </div>
  );
}
