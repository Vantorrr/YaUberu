'use client';

import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay, EffectFade } from 'swiper/modules';
import { motion } from 'framer-motion';
import { Trash2, Clock, Sparkles } from 'lucide-react';

import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  {
    icon: Trash2,
    title: 'Оставьте у двери',
    subtitle: 'Мы заберем',
    description: 'Просто выставьте пакет за дверь. Никаких лишних действий.',
    gradient: 'from-[#059669] to-[#34D399]',
    glow: 'rgba(5, 150, 105, 0.4)',
  },
  {
    icon: Clock,
    title: 'Выберите время',
    subtitle: 'Мы подстроимся',
    description: 'Четыре временных слота. Утро, день, вечер — как удобно вам.',
    gradient: 'from-[#34D399] to-[#6EE7B7]',
    glow: 'rgba(52, 211, 153, 0.4)',
  },
  {
    icon: Sparkles,
    title: 'Забудьте о мусоре',
    subtitle: 'Навсегда',
    description: 'Подписка работает автоматически. Вы просто живете.',
    gradient: 'from-[#EA580C] to-[#F97316]',
    glow: 'rgba(234, 88, 12, 0.4)',
  },
];

export function WelcomeSlider() {
  return (
    <div className="flex-1 flex flex-col justify-center px-6 py-8">
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="text-center mb-12"
      >
        <h1 className="text-5xl font-bold tracking-tight font-['Space_Grotesk',sans-serif]">
          <span className="bg-gradient-to-r from-[#34D399] to-[#059669] bg-clip-text text-transparent">Я</span>
          <span className="text-[#F0FDF4]"> </span>
          <span className="bg-gradient-to-r from-[#F97316] to-[#EA580C] bg-clip-text text-transparent">УБЕРУ</span>
        </h1>
        <p className="text-[rgba(240,253,244,0.5)] mt-3 text-sm tracking-widest uppercase">
          Сервис выноса мусора
        </p>
      </motion.div>

      {/* Swiper */}
      <Swiper
        modules={[Pagination, Autoplay]}
        pagination={{ clickable: true }}
        autoplay={{ delay: 5000, disableOnInteraction: false }}
        loop={true}
        spaceBetween={30}
        className="w-full max-w-sm mx-auto"
      >
        {slides.map((slide, index) => (
          <SwiperSlide key={index}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
              className="flex flex-col items-center text-center pb-14"
            >
              {/* Icon Container */}
              <div
                className="relative mb-10"
                style={{ filter: `drop-shadow(0 0 40px ${slide.glow})` }}
              >
                <div
                  className={`
                    w-28 h-28 rounded-3xl
                    bg-gradient-to-br ${slide.gradient}
                    flex items-center justify-center
                    animate-float
                    relative
                  `}
                >
                  {/* Inner glow */}
                  <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-white/20 to-transparent" />
                  <slide.icon className="w-14 h-14 text-white relative z-10" strokeWidth={1.5} />
                </div>
                
                {/* Orbital ring */}
                <div className="absolute inset-[-12px] rounded-[36px] border border-dashed border-[rgba(52,211,153,0.2)] animate-spin" style={{ animationDuration: '20s' }} />
              </div>

              {/* Text */}
              <p className="text-[rgba(52,211,153,0.8)] text-sm uppercase tracking-widest mb-2">
                {slide.subtitle}
              </p>
              <h2 className="text-3xl font-bold text-[#F0FDF4] mb-4 font-['Space_Grotesk',sans-serif]">
                {slide.title}
              </h2>
              <p className="text-[rgba(240,253,244,0.6)] text-base leading-relaxed max-w-xs">
                {slide.description}
              </p>
            </motion.div>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
}
