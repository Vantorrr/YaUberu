'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Trash2, Clock, Sparkles, ArrowRight } from 'lucide-react';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';
import { api } from '@/lib/api';

import 'swiper/css';
import 'swiper/css/pagination';

export default function WelcomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if already logged in
    const checkAuth = async () => {
        try {
            const user = await api.getMe();
            if (user) router.push('/app');
        } catch {}
    };
    checkAuth();
  }, [router]);

  const handleStart = () => {
    router.push('/auth/contact');
  };

  const slides = [
    {
      id: 1,
      icon: Trash2,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      title: 'Оставьте у двери',
      desc: 'Просто выставьте мусор за дверь. Мы заберем его в удобное для вас время.',
    },
    {
      id: 2,
      icon: Clock,
      color: 'text-emerald-400',
      bg: 'bg-emerald-500/10 border-emerald-500/20',
      title: '4 слота времени',
      desc: 'Утро, день, вечер или ночь. Выбирайте удобный интервал при заказе.',
    },
    {
      id: 3,
      icon: Sparkles,
      color: 'text-orange-400',
      bg: 'bg-orange-500/10 border-orange-500/20',
      title: 'Банк выносов',
      desc: 'Покупайте пакеты выносов. Списываем по факту: 1 мешок = 1 кредит.',
    },
  ];

  return (
    <div className="min-h-screen relative flex flex-col bg-[#0f1714] overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
         <div className="absolute top-[-20%] left-[-20%] w-[80%] h-[80%] bg-emerald-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-20%] right-[-20%] w-[80%] h-[80%] bg-emerald-900/10 rounded-full blur-[120px]" />
      </div>

      {/* Header Logo */}
      <div className="pt-12 pb-4 text-center z-10">
        <h1 className="text-4xl font-bold tracking-tight mb-2">
          <span className="text-white">Я</span>
          <span className="text-emerald-500">.</span>
          <span className="text-emerald-500">УБЕРУ</span>
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
                <div className={`w-24 h-24 ${slide.bg} rounded-3xl flex items-center justify-center border mb-8 shadow-2xl backdrop-blur-sm`}>
                  <slide.icon className={`w-12 h-12 ${slide.color}`} />
                </div>
                <h2 className="text-2xl font-bold text-white mb-4">{slide.title}</h2>
                <p className="text-gray-400 leading-relaxed max-w-[280px] mx-auto">
                  {slide.desc}
                </p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* Fixed Footer */}
      <div className="px-6 pb-10 space-y-3 relative z-20">
        <Button fullWidth onClick={handleStart} className="shadow-2xl shadow-orange-500/20">
          Начать
          <ArrowRight className="w-5 h-5" />
        </Button>
        
        <p className="text-center text-gray-600 text-[10px] pt-4 uppercase tracking-widest opacity-60">
          Сервис комфорта
        </p>
      </div>
    </div>
  );
}
