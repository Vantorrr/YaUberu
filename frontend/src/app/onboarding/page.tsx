'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay, Pagination } from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/pagination';

const slides = [
  { image: '/11111111.jpg' },
  { image: '/22222222.jpg' },
  { image: '/333333333.jpg' },
];

export default function OnboardingPage() {
  const router = useRouter();

  const handleComplete = () => {
    // Redirect to share phone page
    router.push('/auth/share-phone');
  };

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
            onClick={handleComplete}
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

