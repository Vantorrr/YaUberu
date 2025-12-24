'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Building2 } from 'lucide-react';

export default function CompanyInfoPage() {
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
          <div className="flex items-center gap-3">
            <Building2 className="w-6 h-6 text-teal-600" />
            <h1 className="text-lg font-bold text-gray-900">Реквизиты компании</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-6 pb-24">
        <div className="bg-gradient-to-br from-teal-50 to-blue-50 border-2 border-teal-200 rounded-3xl p-6 shadow-sm">
          <p className="text-teal-700 text-sm mb-4">
            💳 Для юридических лиц и оплаты по безналичному расчёту
          </p>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-2xl p-6 space-y-4 shadow-sm">
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">Наименование</p>
            <p className="text-gray-900 text-sm font-semibold">Индивидуальный предприниматель ЕСАЯН ЭДГАР АШОТОВИЧ</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-gray-500 text-xs mb-2 font-medium">ИНН</p>
              <p className="text-gray-900 text-sm font-mono font-semibold">504710511280</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-2 font-medium">БИК</p>
              <p className="text-gray-900 text-sm font-mono font-semibold">044525411</p>
            </div>
          </div>
          
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">Банк</p>
            <p className="text-gray-900 text-sm font-semibold">ФИЛИАЛ "ЦЕНТРАЛЬНЫЙ" БАНКА ВТБ (ПАО)</p>
          </div>
          
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">Корреспондентский счёт</p>
            <p className="text-gray-900 text-sm font-mono font-semibold">30101810145250000411</p>
          </div>
          
          <div>
            <p className="text-gray-500 text-xs mb-2 font-medium">Расчётный счёт</p>
            <p className="text-gray-900 text-sm font-mono font-semibold">40802810400810057684</p>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
          <p className="text-blue-900 text-sm">
            📞 Для выставления счёта или заключения договора свяжитесь с нами в Telegram: <strong>@YaUberu_AppBot</strong>
          </p>
        </div>
      </div>
    </div>
  );
}

