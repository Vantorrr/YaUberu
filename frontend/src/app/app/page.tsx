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
    const checkOnboarding = async () => {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.CloudStorage) {
        const cloudStorage = (window as any).Telegram.WebApp.CloudStorage;
        
        // Step 1: Check CloudStorage
        cloudStorage.getItem('onboarding_seen', async (err: any, value: string) => {
          if (err) {
            console.error('[ONBOARDING] CloudStorage error:', err);
            setShowOnboarding(false);
            return;
          }
          
          // If flag exists in CloudStorage - skip
          if (value === 'true') {
            console.log('[ONBOARDING] CloudStorage flag found - SKIP');
            setShowOnboarding(false);
            return;
          }
          
          // Step 2: No flag in CloudStorage - check via API if user is new
          console.log('[ONBOARDING] No CloudStorage flag - checking API...');
          try {
            await new Promise(resolve => setTimeout(resolve, 1000));
            const user = await api.getMe();
            console.log('[ONBOARDING] API response:', user);
            
            if (user && user.is_new_user === true) {
              // NEW USER - show onboarding
              console.log('[ONBOARDING] NEW USER (0 orders) - SHOW SLIDER');
              setShowOnboarding(true);
            } else {
              // EXISTING USER - skip onboarding
              console.log('[ONBOARDING] EXISTING USER (has orders) - SKIP');
              setShowOnboarding(false);
            }
            
            // Mark as seen in CloudStorage for future
            cloudStorage.setItem('onboarding_seen', 'true', (err: any) => {
              if (err) console.error('[ONBOARDING] Failed to save flag:', err);
              else console.log('[ONBOARDING] Flag saved to CloudStorage');
            });
          } catch (error) {
            console.error('[ONBOARDING] API error:', error);
            // On API error, skip onboarding to avoid annoyance
            setShowOnboarding(false);
          }
        });
      } else {
        console.log('[ONBOARDING] Not in Telegram - skip');
        setShowOnboarding(false);
      }
    };
    
    setTimeout(checkOnboarding, 500);
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
