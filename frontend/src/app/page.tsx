'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowRight, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Auto-redirect if already logged in
    const checkAuth = async () => {
      try {
        const user = await api.getMe();
        if (user) {
          router.push('/app');
          return;
        }
      } catch {
        // Not logged in
      }
      setLoading(false);
    };
    
    checkAuth();
  }, [router]);

  const handleStart = async () => {
    setLoading(true);
    
    try {
      // Try Telegram auto-login
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
        await api.login('User');
        router.push('/app');
        return;
      }
    } catch {
      // Auto-login failed
    }
    
    // No valid auth, go to login
    router.push('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-teal-600 text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative flex flex-col items-center justify-center bg-white px-6">
      <div className="text-center space-y-8 max-w-md">
        {/* Logo/Icon */}
        <div className="w-24 h-24 bg-teal-100 rounded-full flex items-center justify-center mx-auto">
          <Trash2 className="w-12 h-12 text-teal-600" />
        </div>
        
        {/* Title */}
        <div>
          <h1 className="text-4xl font-bold mb-2">
            <span className="text-gray-900">Я</span>
            <span className="text-teal-600">УБЕРУ</span>
          </h1>
          <p className="text-gray-600">Сервис вывоза мусора</p>
        </div>
        
        {/* Description */}
        <p className="text-gray-700 leading-relaxed">
          Мы забираем ваш мусор от двери в удобное время — по подписке или разово
        </p>
        
        {/* CTA */}
        <Button 
          fullWidth 
          onClick={handleStart}
          className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 text-lg rounded-2xl shadow-xl"
        >
          Открыть ЯУБЕРУ
          <ArrowRight className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
