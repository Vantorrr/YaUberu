'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, MapPin, Clock, CheckCircle } from 'lucide-react';

const steps = [
  {
    icon: MapPin,
    title: 'Укажите адрес',
    description: 'Выберите точку на карте или введите адрес вручную. Мы приедем именно туда, где вам удобно.',
    color: 'from-blue-500 to-blue-600'
  },
  {
    icon: Clock,
    title: 'Выберите время',
    description: 'Выберите удобный временной слот: утро, день, вечер или ночь. Или закажите срочный вывоз — приедем в течение часа!',
    color: 'from-teal-500 to-teal-600'
  },
  {
    icon: CheckCircle,
    title: 'Мы заберём мусор',
    description: 'Выставьте пакет у двери или передайте курьеру лично. После вывоза получите уведомление — готово!',
    color: 'from-green-500 to-green-600'
  }
];

export default function HowItWorksPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-900 hover:bg-gray-200 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Как работает сервис</h1>
            <p className="text-gray-500 text-sm">Всего 3 простых шага</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-8 space-y-8 pb-24">
        {/* Hero */}
        <div className="text-center space-y-3">
          <h2 className="text-3xl font-bold text-gray-900">
            ПОКА ВЫ ЗАНЯТЫ ВАЖНЫМ —
          </h2>
          <h3 className="text-4xl font-black text-teal-600">
            Я УБЕРУ
          </h3>
          <p className="text-gray-600 text-sm max-w-sm mx-auto mt-4">
            Мы забираем ваш мусор от двери в удобное время — по подписке или разово
          </p>
        </div>

        {/* Steps */}
        <div className="space-y-6">
          {steps.map((step, index) => (
            <div key={index} className="relative">
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="absolute left-[52px] top-[100px] w-0.5 h-12 bg-gradient-to-b from-gray-300 to-transparent" />
              )}
              
              <div className="bg-white border-2 border-gray-200 rounded-3xl p-6 shadow-sm hover:shadow-md transition-shadow">
                {/* Icon */}
                <div className={`w-24 h-24 rounded-3xl bg-gradient-to-br ${step.color} flex items-center justify-center mb-5 shadow-lg`}>
                  <step.icon className="w-12 h-12 text-white" strokeWidth={2} />
                </div>

                {/* Step number */}
                <div className="inline-flex items-center gap-2 bg-gray-100 px-3 py-1 rounded-full mb-3">
                  <span className="text-gray-900 font-bold text-sm">Шаг {index + 1}</span>
                </div>

                {/* Content */}
                <h3 className="text-gray-900 font-bold text-xl mb-2">{step.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{step.description}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Features */}
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-3xl p-6 space-y-4">
          <h3 className="text-gray-900 font-bold text-lg">✨ Преимущества</h3>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Удобные временные слоты</p>
                <p className="text-gray-600 text-xs">4 окна на выбор: 8-10, 12-14, 16-18, 20-22</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Гибкие тарифы</p>
                <p className="text-gray-600 text-xs">Разовые заказы или подписка с выгодой</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Уведомления в реальном времени</p>
                <p className="text-gray-600 text-xs">Знайте, когда курьер выехал и забрал мусор</p>
              </div>
            </li>
            <li className="flex items-start gap-3">
              <div className="w-6 h-6 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <CheckCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-gray-900 font-semibold text-sm">Без контакта или лично</p>
                <p className="text-gray-600 text-xs">Оставьте у двери или передайте в руки</p>
              </div>
            </li>
          </ul>
        </div>

        {/* CTA */}
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

