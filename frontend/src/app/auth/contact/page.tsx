'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Phone, ArrowLeft } from 'lucide-react';

export default function ContactAuthPage() {
  const router = useRouter();

  const handleShareContact = () => {
    // Открываем бота для регистрации
    window.open('https://t.me/yauberuhelp?start=auth', '_blank');
  };

  return (
    <div className="min-h-screen bg-[#0f1714] px-5 py-6">
      {/* Back */}
      <button 
        onClick={() => router.back()} 
        className="w-10 h-10 bg-teal-900/50 rounded-xl flex items-center justify-center text-white mb-8"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Header */}
      <h1 className="text-3xl font-bold text-white mb-2">Регистрация</h1>
      <p className="text-gray-500 mb-8">
        Для использования сервиса необходимо поделиться номером телефона
      </p>

      {/* Contact Request Card */}
      <Card>
        <div className="flex items-center gap-4 mb-4">
          <div className="w-14 h-14 bg-teal-600 rounded-xl flex items-center justify-center">
            <Phone className="w-7 h-7 text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-lg">Шаг 1</p>
            <p className="text-gray-500 text-sm">Откройте чат с ботом</p>
          </div>
        </div>
        <p className="text-gray-400 text-sm mb-6">
          Нажмите кнопку ниже. Бот попросит вас поделиться телефоном через безопасную кнопку Telegram. После этого вы автоматически вернетесь в приложение.
        </p>
        <Button 
          fullWidth 
          onClick={handleShareContact}
        >
          <Phone className="w-5 h-5" />
          Поделиться телефоном
        </Button>
      </Card>

      <p className="text-center text-gray-600 text-xs mt-8">
        Нажимая кнопку, вы соглашаетесь на обработку персональных данных
      </p>
    </div>
  );
}

