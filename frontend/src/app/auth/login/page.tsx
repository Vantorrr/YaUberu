'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Phone, Send } from 'lucide-react';
import { api } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleAuth = async () => {
    try {
      setLoading(true);
      // При входе используем тот же механизм, что и при регистрации
      // Если ID сохранился в браузере - мы попадем в свой аккаунт
      await api.login('User'); 
      router.push('/app');
    } catch (error) {
      console.error(error);
      alert('Ошибка входа. Проверьте соединение с бэкендом.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0f1714] px-5 py-6">
      {/* Back */}
      <button onClick={() => router.back()} className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-white mb-8">
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-2">Вход</h1>
      <p className="text-gray-500 mb-8">Рады видеть вас снова</p>

      {/* Auth */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-blue-500 rounded-xl flex items-center justify-center">
            <Send className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Telegram</p>
            <p className="text-gray-500 text-sm">Мгновенный вход</p>
          </div>
        </div>
        <Button fullWidth onClick={handleAuth} disabled={loading}>
          {loading ? (
            <span className="flex items-center gap-2">
              <span className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Авторизация...
            </span>
          ) : (
            <>
              <Phone className="w-5 h-5" />
              Поделиться контактом
            </>
          )}
        </Button>
      </Card>

      {/* Register */}
      <p className="text-center text-gray-500 mt-8">
        Нет аккаунта?{' '}
        <button onClick={() => router.push('/auth/register')} className="text-emerald-400 font-semibold">
          Зарегистрироваться
        </button>
      </p>
    </div>
  );
}
