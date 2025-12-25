'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { api } from '@/lib/api';

import 'swiper/css';
import 'swiper/css/pagination';

export default function WelcomePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    
    try {
      // Check if already logged in
      const user = await api.getMe();
      if (user) {
        router.push('/app');
        return;
      }
    } catch {
      // Not logged in, try Telegram auto-login
      try {
        if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.initData) {
          // We're in Telegram, try auto-login
          await api.login('User');
          router.push('/app');
          return;
        }
      } catch {
        // Auto-login failed
      }
    }
    
    // No valid auth, go to registration
    router.push('/auth/contact');
  };

  const slides = [
    {
      id: 1,
      image: '/11111111.jpg',
      title: 'Оформите заказ',
      desc: 'Оформите подписку или разовый вынос. Вы оставляете мусор у двери и наш курьер заберет его.',
    },
    {
      id: 2,
      image: '/22222222.jpg',
      title: 'Курьер заберет',
      desc: 'В указанный промежуток времени курьер заберет ваш мусорный мешок!',
    },
    {
      id: 3,
      image: '/333333333.jpg',
      title: 'Выполнено!',
      desc: 'Курьер отнесет ваш мусор в контейнер.',
    },
  ];

  return (
    <div className="min-h-screen relative flex flex-col bg-white overflow-hidden">
      {/* Background Gradient */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none bg-gradient-to-b from-teal-50 to-white">
      </div>

      {/* Header Logo */}
      <div className="pt-12 pb-4 text-center z-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          <span className="text-gray-900">Я</span>
          <span className="text-teal-500">.</span>
          <span className="text-teal-500">УБЕРУ</span>
        </h1>
      </div>

      {/* Slider */}
      <div className="flex-1 flex flex-col justify-center min-h-0 relative z-10">
        <Swiper
          modules={[Pagination, Autoplay]}
          spaceBetween={30}
          slidesPerView={1}
          pagination={{ clickable: true, dynamicBullets: true }}
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          className="w-full max-w-sm !pb-12"
        >
          {slides.map((slide) => (
            <SwiperSlide key={slide.id}>
              <div className="px-6 flex flex-col items-center text-center">
                {/* Image */}
                <div className="w-full aspect-square max-w-[320px] mb-6 rounded-3xl overflow-hidden shadow-xl">
                  <img 
                    src={slide.image} 
                    alt={slide.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                
                {/* Title & Description */}
                <h2 className="text-2xl font-bold text-gray-900 mb-4">{slide.title}</h2>
                <p className="text-gray-600 leading-relaxed max-w-[300px] mx-auto text-base">
                  {slide.desc}
                </p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 pb-10 space-y-3 relative z-20">
        <Button 
          fullWidth 
          onClick={handleStart} 
          disabled={loading}
          className="shadow-2xl shadow-teal-500/20"
        >
          {loading ? '⏳ Загрузка...' : 'Открыть ЯУБЕРУ'}
          {!loading && <ArrowRight className="w-5 h-5" />}
        </Button>
        
        <p className="text-center text-gray-500 text-xs pt-4">
          Сервис вывоза мусора
        </p>
      </div>
    </div>
  );
}
