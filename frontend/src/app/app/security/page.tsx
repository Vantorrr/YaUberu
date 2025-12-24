'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield, Lock, Eye, Server, CheckCircle } from 'lucide-react';

export default function SecurityPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-teal-900/30 px-5 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-900"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-teal-500" />
            <h1 className="text-lg font-bold text-gray-900">Безопасность</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-6 pb-24">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
          <p className="text-teal-700 text-sm">
            🔒 Ваша безопасность — наш приоритет
          </p>
        </div>

        <div className="space-y-4">
          {/* Шифрование */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Lock className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Шифрование данных</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Все данные передаются по защищённому протоколу HTTPS с использованием современных алгоритмов шифрования. 
                  Ваши персональные данные и платёжная информация надёжно защищены.
                </p>
              </div>
            </div>
          </div>

          {/* Защита аккаунта */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Eye className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Защита аккаунта</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  Доступ к аккаунту осуществляется через Telegram — одну из самых безопасных платформ обмена сообщениями. 
                  Мы не храним пароли и не имеем доступа к вашему аккаунту Telegram.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>Авторизация через Telegram</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>Двухфакторная аутентификация (опционально)</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>Автоматический выход при подозрительной активности</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Безопасность платежей */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Server className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Безопасность платежей</h3>
                <p className="text-gray-400 text-sm leading-relaxed mb-3">
                  Все платежи обрабатываются через сертифицированные платёжные системы. 
                  Мы не храним данные вашей банковской карты.
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>Сертификация PCI DSS</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>3D-Secure защита</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle className="w-4 h-4 text-teal-500" />
                    <span>Токенизация платёжных данных</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Защита от мошенничества */}
          <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-teal-500/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Shield className="w-6 h-6 text-teal-500" />
              </div>
              <div>
                <h3 className="text-gray-900 font-bold text-lg mb-2">Защита от мошенничества</h3>
                <p className="text-gray-400 text-sm leading-relaxed">
                  Мы используем системы мониторинга для выявления подозрительной активности и защиты от мошеннических действий. 
                  Все операции проходят автоматическую проверку безопасности.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Советы по безопасности */}
        <div className="bg-orange-900/20 border border-orange-800/30 rounded-2xl p-5">
          <h3 className="text-orange-400 font-bold mb-3 flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Советы по безопасности
          </h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li>• Никогда не сообщайте код подтверждения из SMS третьим лицам</li>
            <li>• Проверяйте адрес сайта — он должен начинаться с https://</li>
            <li>• Используйте надёжные пароли для Telegram аккаунта</li>
            <li>• Не переходите по подозрительным ссылкам</li>
            <li>• При возникновении подозрений немедленно свяжитесь с поддержкой</li>
          </ul>
        </div>

        {/* Контакты */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-gray-900 font-bold mb-2">Сообщить о проблеме безопасности</h3>
          <p className="text-gray-400 text-sm">
            Если вы обнаружили уязвимость или подозрительную активность, сообщите нам:<br />
            <span className="text-teal-700">security@yauberu.ru</span>
          </p>
        </div>
      </div>
    </div>
  );
}

