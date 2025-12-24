'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Shield } from 'lucide-react';

export default function PrivacyPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0f1714]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1714]/95 backdrop-blur border-b border-teal-900/30 px-5 py-4">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.back()} 
            className="w-10 h-10 bg-teal-900/50 rounded-xl flex items-center justify-center text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-teal-500" />
            <h1 className="text-lg font-bold text-white">Политика конфиденциальности</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-6 pb-24">
        <div className="bg-teal-900/20 border border-teal-800/30 rounded-2xl p-5">
          <p className="text-teal-400 text-sm">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-white mb-3">1. Общие положения</h2>
            <p className="text-sm leading-relaxed">
              Настоящая Политика конфиденциальности персональной информации (далее — Политика) действует в отношении всей информации, 
              которую сервис «Я УБЕРУ» (ИП ЕСАЯН ЭДГАР АШОТОВИЧ) может получить о пользователе во время использования сайта и мобильного приложения.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">2. Собираемая информация</h2>
            <p className="text-sm leading-relaxed mb-2">
              Мы собираем следующую информацию:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Имя и контактные данные (телефон, email)</li>
              <li>Адрес доставки для выполнения заказа</li>
              <li>История заказов и транзакций</li>
              <li>Информация об устройстве и браузере</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">3. Цели сбора информации</h2>
            <p className="text-sm leading-relaxed mb-2">
              Собранная информация используется для:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Выполнения заказов на вывоз мусора</li>
              <li>Связи с клиентом по вопросам заказа</li>
              <li>Улучшения качества сервиса</li>
              <li>Персонализации предложений</li>
              <li>Обеспечения безопасности</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">4. Защита данных</h2>
            <p className="text-sm leading-relaxed">
              Мы применяем современные технологии защиты информации: шифрование данных, защищенные каналы связи (HTTPS), 
              регулярные проверки безопасности. Доступ к персональным данным имеют только уполномоченные сотрудники.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">5. Передача данных третьим лицам</h2>
            <p className="text-sm leading-relaxed">
              Мы не передаём ваши персональные данные третьим лицам, за исключением случаев, необходимых для выполнения заказа 
              (например, курьерам для доставки) или требуемых законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">6. Ваши права</h2>
            <p className="text-sm leading-relaxed mb-2">
              Вы имеете право:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Получать информацию о хранящихся данных</li>
              <li>Требовать исправления неточных данных</li>
              <li>Требовать удаления данных</li>
              <li>Отозвать согласие на обработку данных</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">7. Cookies</h2>
            <p className="text-sm leading-relaxed">
              Мы используем файлы cookie для улучшения работы сервиса, хранения настроек и аналитики. 
              Вы можете отключить cookie в настройках браузера, но это может ограничить функциональность.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">8. Изменения в политике</h2>
            <p className="text-sm leading-relaxed">
              Мы оставляем за собой право вносить изменения в настоящую Политику. При внесении изменений мы уведомим вас через приложение или email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-white mb-3">9. Контакты</h2>
            <p className="text-sm leading-relaxed">
              По вопросам обработки персональных данных обращайтесь:<br />
              <span className="text-teal-400">ИП ЕСАЯН ЭДГАР АШОТОВИЧ</span><br />
              ИНН: 504710511280<br />
              Email: support@yauberu.ru
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

