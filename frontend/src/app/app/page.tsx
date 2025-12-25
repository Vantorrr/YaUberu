'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

export default function HomePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkOnboarding = async () => {
      try {
        await new Promise(resolve => setTimeout(resolve, 800));
        const user = await api.getMe();
        
        // SIMPLE: If user has phone = OLD (shared contact) = NO onboarding
        // If user has NO phone = NEW = show onboarding
        if (!user.phone) {
          router.push('/onboarding');
        } else {
          setChecking(false);
        }
      } catch (error) {
        setChecking(false);
      }
    };
    
    checkOnboarding();
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-teal-600">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 pb-32">
      {/* Main content - centered */}
      <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 max-w-md">
        {/* Hero text */}
        <div className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 leading-tight">
            ПОКА ВЫ ЗАНЯТЫ ВАЖНЫМ
          </h1>
          <h2 className="text-4xl md:text-5xl font-black text-teal-600">
            Я УБЕРУ
          </h2>
        </div>

        {/* Main CTA Button */}
        <div className="w-full space-y-3">
          <Button
            onClick={() => router.push('/app/tariffs')}
            fullWidth
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-6 text-lg rounded-2xl shadow-xl shadow-teal-600/30 hover:shadow-teal-600/50 transition-all"
          >
            <Trash2 className="w-6 h-6" />
            УБРАТЬ МУСОР
          </Button>
          
          {/* Subtitle */}
          <p className="text-gray-600 text-sm px-4">
            Я могу вынести мусор в удобный промежуток времени
          </p>
        </div>
      </div>
    </div>
  );
}
