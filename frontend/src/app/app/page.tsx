'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  { image: '/11111111.jpg' },
  { image: '/22222222.jpg' },
  { image: '/333333333.jpg' },
];

export default function HomePage() {
  const router = useRouter();
  const [showOnboarding, setShowOnboarding] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 1. Check if we already showed onboarding on this device
      const hasSeen = localStorage.getItem('onboarding_shown_v2');
      if (hasSeen) {
        setShowOnboarding(false);
        return;
      }

      // 2. Check if user is already logged in (OLD USER)
      // If they have a token, they are an existing user -> skip onboarding
      const token = localStorage.getItem('token');
      if (token) {
        console.log('[ONBOARDING] Token found - returning user');
        setShowOnboarding(false);
        localStorage.setItem('onboarding_shown_v2', 'true'); // Mark as seen
        return;
      }

      // 3. No token + No flag = NEW USER -> Show onboarding
      console.log('[ONBOARDING] New user - showing onboarding');
      setShowOnboarding(true);
      // Mark as seen immediately so it doesn't show again on reload
      localStorage.setItem('onboarding_shown_v2', 'true');
    } else {
      setShowOnboarding(false);
    }
  }, []);

  const handleSkipOnboarding = () => {
    setShowOnboarding(false);
  };

  // Loading state (initial render)
  if (showOnboarding === null) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-teal-600 text-lg">Загрузка...</div>
      </div>
    );
  }

  // Show onboarding
  if (showOnboarding) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center">
        <div className="w-full max-w-md mx-auto">
          <Swiper
            modules={[Autoplay, Pagination]}
            pagination={{ clickable: true }}
            autoplay={{ delay: 6000, disableOnInteraction: false }}
            className="w-full h-[70vh]"
          >
            {slides.map((slide, i) => (
              <SwiperSlide key={i}>
                <div className="flex items-center justify-center h-full p-6">
                  <img src={slide.image} alt="" className="max-w-full max-h-full object-contain" />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>

          <div className="p-6">
            <Button
              onClick={handleSkipOnboarding}
              fullWidth
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 text-lg rounded-2xl"
            >
              Открыть Я УБЕРУ
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main screen for RETURNING users (has orders)
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
