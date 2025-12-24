'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Info, FileText } from 'lucide-react';

export default function TermsPage() {
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
            <FileText className="w-6 h-6 text-teal-500" />
            <h1 className="text-lg font-bold text-gray-900">Правовая информация</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 space-y-6 pb-24">
        <div className="bg-teal-50 border border-teal-200 rounded-2xl p-5">
          <p className="text-teal-700 text-sm">
            Условия использования сервиса «Я УБЕРУ»
          </p>
          <p className="text-gray-400 text-xs mt-1">
            Последнее обновление: {new Date().toLocaleDateString('ru-RU')}
          </p>
        </div>

        <div className="space-y-6 text-gray-300">
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">1. Общие положения</h2>
            <p className="text-sm leading-relaxed">
              Настоящее пользовательское соглашение (далее — Соглашение) регулирует отношения между 
              ИП ЕСАЯН ЭДГАР АШОТОВИЧ (далее — Исполнитель) и пользователем сервиса «Я УБЕРУ» (далее — Заказчик).
            </p>
            <p className="text-sm leading-relaxed mt-2">
              Используя сервис, вы соглашаетесь с условиями данного Соглашения.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">2. Предмет соглашения</h2>
            <p className="text-sm leading-relaxed">
              Исполнитель предоставляет Заказчику услуги по вывозу бытового мусора от двери квартиры/дома. 
              Услуга предоставляется через мобильное приложение и сайт.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">3. Регистрация</h2>
            <p className="text-sm leading-relaxed mb-2">
              Для использования сервиса необходимо:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Иметь аккаунт в Telegram</li>
              <li>Предоставить достоверную контактную информацию</li>
              <li>Указать адрес выноса мусора</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Заказчик несёт ответственность за достоверность предоставленных данных.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">4. Порядок оказания услуг</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900 mb-1">4.1. Оформление заказа</p>
                <p>Заказчик оформляет заказ через приложение, указывая адрес, дату и время выноса.</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">4.2. Выполнение заказа</p>
                <p>Курьер забирает мусор в указанное время. Мусор должен быть упакован в пакеты и выставлен согласно выбранному способу передачи (у двери или в руки).</p>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">4.3. Оплата</p>
                <p>Оплата производится через сервис или по реквизитам. При использовании подписки списание происходит автоматически.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">5. Стоимость услуг</h2>
            <p className="text-sm leading-relaxed mb-2">
              Стоимость услуг указана в приложении и включает:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm">
              <li>Разовый вывоз — 150 ₽ за вынос</li>
              <li>Пробный тариф — 199 ₽ за неделю (3 выноса)</li>
              <li>Месячная подписка — 1350 ₽ в месяц (до 15 выносов)</li>
            </ul>
            <p className="text-sm leading-relaxed mt-2">
              Исполнитель оставляет за собой право изменять стоимость услуг с уведомлением Заказчика.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">6. Права и обязанности Заказчика</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Заказчик обязан:</p>
                <ul className="list-disc list-inside space-y-1 ml-3">
                  <li>Предоставлять достоверную информацию</li>
                  <li>Своевременно оплачивать услуги</li>
                  <li>Упаковывать мусор в прочные пакеты</li>
                  <li>Выставлять мусор в согласованное время</li>
                  <li>Не передавать опасные, токсичные или запрещённые отходы</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Заказчик имеет право:</p>
                <ul className="list-disc list-inside space-y-1 ml-3">
                  <li>Отменить или перенести заказ (не позднее чем за 2 часа)</li>
                  <li>Получить информацию о статусе заказа</li>
                  <li>Обратиться в службу поддержки</li>
                  <li>Отказаться от подписки</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">7. Права и обязанности Исполнителя</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-semibold text-gray-900 mb-1">Исполнитель обязан:</p>
                <ul className="list-disc list-inside space-y-1 ml-3">
                  <li>Оказывать услуги надлежащего качества</li>
                  <li>Соблюдать конфиденциальность информации Заказчика</li>
                  <li>Уведомлять об изменениях в работе сервиса</li>
                </ul>
              </div>
              <div>
                <p className="font-semibold text-gray-900 mb-1">Исполнитель имеет право:</p>
                <ul className="list-disc list-inside space-y-1 ml-3">
                  <li>Отказать в выполнении заказа при нарушении условий</li>
                  <li>Приостановить работу сервиса для технического обслуживания</li>
                  <li>Заблокировать аккаунт при нарушении правил</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">8. Ответственность сторон</h2>
            <p className="text-sm leading-relaxed">
              Исполнитель не несёт ответственности за повреждение или утрату имущества Заказчика, 
              произошедшие не по вине Исполнителя. Заказчик несёт ответственность за передачу запрещённых к вывозу отходов.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">9. Возврат средств</h2>
            <p className="text-sm leading-relaxed">
              Возврат средств возможен в случае невыполнения услуги по вине Исполнителя. 
              Возврат осуществляется в течение 7 рабочих дней на тот же способ оплаты.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">10. Форс-мажор</h2>
            <p className="text-sm leading-relaxed">
              Стороны освобождаются от ответственности за неисполнение обязательств, вызванное обстоятельствами непреодолимой силы 
              (стихийные бедствия, военные действия, изменения законодательства и т.д.).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">11. Разрешение споров</h2>
            <p className="text-sm leading-relaxed">
              Все споры решаются путём переговоров. При невозможности достижения соглашения спор передаётся в суд 
              по месту нахождения Исполнителя в соответствии с законодательством РФ.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-3">12. Заключительные положения</h2>
            <p className="text-sm leading-relaxed">
              Соглашение вступает в силу с момента начала использования сервиса и действует бессрочно. 
              Исполнитель оставляет за собой право изменять условия Соглашения с уведомлением Заказчика.
            </p>
          </section>
        </div>

        {/* Реквизиты */}
        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-5">
          <h3 className="text-gray-900 font-bold mb-3">Реквизиты Исполнителя</h3>
          <div className="space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">Наименование:</span> ИП ЕСАЯН ЭДГАР АШОТОВИЧ</p>
            <p><span className="text-gray-500">ИНН:</span> 504710511280</p>
            <p><span className="text-gray-500">Email:</span> <span className="text-teal-700">support@yauberu.ru</span></p>
          </div>
        </div>
      </div>
    </div>
  );
}

