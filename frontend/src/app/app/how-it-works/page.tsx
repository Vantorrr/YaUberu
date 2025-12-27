'use client';

import { useRouter } from 'next/navigation';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Pagination, Autoplay } from 'swiper/modules';

import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  {
    image: '/11111111.jpg',
    title: 'Оформите заказ',
    description: 'Укажите адрес, выберите удобное время и количество пакетов'
  },
  {
    image: '/22222222.jpg',
    title: 'Курьер получит заказ',
    description: 'Ближайший курьер получит уведомление и поедет к вам'
  },
  {
    image: '/333333333.jpg',
    title: 'Заберём мусор',
    description: 'Курьер заберёт мусор у двери или из рук — как вам удобно'
  }
];

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="text-center pt-12 pb-6 px-5">
        <h2 className="text-3xl font-bold text-gray-900">
          ПОКА ВЫ ЗАНЯТЫ ВАЖНЫМ
        </h2>
        <h3 className="text-4xl font-black text-teal-600 mt-2">
          Я УБЕРУ
        </h3>
        <p className="text-gray-600 text-sm max-w-sm mx-auto mt-4">
          Мы забираем ваш мусор от двери в удобное время — по подписке или разово
        </p>
      </div>

      {/* Swiper Slider */}
      <div className="flex-1 flex items-center px-5 pb-32">
        <Swiper
          modules={[Pagination, Autoplay]}
          pagination={{ clickable: true }}
          autoplay={{ delay: 6000, disableOnInteraction: false }}
          loop={true}
          spaceBetween={30}
          className="w-full max-w-md mx-auto"
        >
          {slides.map((slide, index) => (
            <SwiperSlide key={index}>
              <div className="flex flex-col items-center text-center pb-16">
                {/* Image */}
                <div className="w-full h-64 mb-6 rounded-3xl overflow-hidden bg-gray-50 shadow-lg">
                  <img 
                    src={slide.image} 
                    alt={slide.title} 
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* Step number */}
                <div className="inline-flex items-center gap-2 bg-teal-100 px-4 py-1.5 rounded-full mb-4">
                  <span className="text-teal-900 font-bold text-sm">Шаг {index + 1}</span>
                </div>

                {/* Content */}
                <h3 className="text-2xl font-bold text-gray-900 mb-3">
                  {slide.title}
                </h3>
                <p className="text-gray-600 text-base leading-relaxed max-w-xs px-4">
                  {slide.description}
                </p>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>

      {/* CTA Button - Fixed at bottom */}
      <div className="fixed bottom-8 left-0 right-0 px-5">
        <button
          onClick={() => router.push('/app/tariffs')}
          className="w-full bg-gradient-to-r from-teal-600 to-teal-700 text-white font-bold py-5 rounded-2xl shadow-xl hover:shadow-2xl transition-all"
        >
          Начать пользоваться →
        </button>
      </div>
    </div>
  );
}

