'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, MapPin, Clock, Check, Building, Home, DoorOpen, Hash, Zap, AlertCircle, User, Package, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';

type Step = 'address' | 'volume' | 'time' | 'confirm';

const timeSlots = [
  { id: 1, time: '08:00 — 10:00', label: 'Утро', status: 'past' },
  { id: 2, time: '12:00 — 14:00', label: 'День', status: 'current' },
  { id: 3, time: '16:00 — 18:00', label: 'Вечер', status: 'available' },
  { id: 4, time: '20:00 — 22:00', label: 'Ночь', status: 'available' },
];

// Dynamic steps based on tariff
const getStepsForTariff = (tariffId: string): Step[] => {
  if (tariffId === 'single') {
    return ['address', 'time', 'confirm']; // Разовый: адрес → время → подтверждение
  } else if (tariffId === 'trial') {
    return ['address', 'confirm']; // Пробная: адрес → подтверждение (без времени, со след дня)
  } else if (tariffId === 'monthly') {
    return ['address', 'volume', 'confirm']; // Месячная: адрес → объём → подтверждение
  }
  return ['address', 'confirm'];
};

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tariffId = searchParams.get('tariff') || 'single';
  
  const steps = getStepsForTariff(tariffId);

  const [step, setStep] = useState<Step>('address');
  const [slot, setSlot] = useState<number | 'urgent' | null>(null);
  const [address, setAddress] = useState({ complexId: '0', building: '', entrance: '', floor: '', apartment: '', intercom: '' });
  const [pickupMethod, setPickupMethod] = useState<'door' | 'hand'>('door');
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [saveAddress, setSaveAddress] = useState(true); // Save address by default
  
  // Volume/Duration for dynamic pricing
  const [bagsCount, setBagsCount] = useState(1);
  const [duration, setDuration] = useState<14 | 30>(14);
  
  // Dynamic Complexes
  const [complexes, setComplexes] = useState<any[]>([]);
  
  useEffect(() => {
    // Expand to full screen
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      console.log('[TG] WebApp expanded to full screen');
    }
    
    // Load complexes and saved addresses
    Promise.all([
      api.getResidentialComplexes(),
      api.getAddresses()
    ])
      .then(([complexesData, addressesData]) => {
        console.log('[ORDER] Loaded complexes:', complexesData);
        console.log('[ORDER] Loaded addresses:', addressesData);
        setComplexes(complexesData);
        
        // Auto-fill if user has a default address
        const defaultAddr = addressesData.find((a: any) => a.is_default);
        if (defaultAddr) {
          console.log('[ORDER] Auto-filling default address:', defaultAddr);
          setAddress({
            complexId: String(defaultAddr.complex_id || '0'),
            building: defaultAddr.building || '',
            entrance: defaultAddr.entrance || '',
            floor: defaultAddr.floor || '',
            apartment: defaultAddr.apartment || '',
            intercom: defaultAddr.intercom || '',
          });
        }
      })
      .catch(err => {
        console.error('[ORDER] Failed to load data:', err);
        alert('Ошибка загрузки данных. Проверьте соединение.');
      });
  }, []);


  const stepIndex = steps.indexOf(step);

  const next = async () => {
    // Validation for address step
    if (step === 'address') {
      if (!address.complexId || address.complexId === '0') {
        alert('⚠️ Выберите ЖК');
        return;
      }
      if (!address.building || address.building.trim() === '') {
        alert('⚠️ Укажите номер дома');
        return;
      }
      if (!address.apartment || address.apartment.trim() === '') {
        alert('⚠️ Укажите квартиру');
        return;
      }
    }
    
    // Validation for volume step (always passes - defaults are set)
    if (step === 'volume') {
      // Volume step has defaults, so always valid
    }
    
    // Validation for time step
    if (step === 'time' && !slot) {
      alert('Выберите время вывоза');
      return;
    }
    
    if (stepIndex < steps.length - 1) {
      setStep(steps[stepIndex + 1]);
    } else {
      // CONFIRM STEP -> SUBMIT TO BACKEND
      try {
        setLoading(true);
        
        console.log('[ORDER] Creating address:', address);
        
        // Get selected complex name for street
        const selectedComplex = complexes.find(c => c.id === Number(address.complexId));
        const streetName = selectedComplex ? selectedComplex.name : '';
        
        // 1. Create Address
        const addressRes = await api.createAddress({
          complex_id: Number(address.complexId),
          street: streetName,
          building: address.building,
          entrance: address.entrance || '1',
          floor: address.floor || '1',
          apartment: address.apartment,
          intercom: address.intercom || '0',
          is_default: saveAddress, // Save as default if checkbox is checked
        });
        
        console.log('[ORDER] Address created:', addressRes);

        // 2. Prepare Data
        let timeSlotStr = '';
        let isUrgent = false;

        // For subscriptions, use default time slot (no user choice)
        if (tariffId === 'trial' || tariffId === 'monthly') {
          timeSlotStr = '12:00-14:00'; // Default time for subscriptions
        } else {
          // For single orders, user selects time
          if (slot === 'urgent') {
            isUrgent = true;
            timeSlotStr = '12:00-14:00'; 
          } else {
            const mapping: Record<number, string> = {
              1: '08:00-10:00',
              2: '12:00-14:00',
              3: '16:00-18:00',
              4: '20:00-22:00',
            };
            if (typeof slot === 'number') {
               timeSlotStr = mapping[slot];
            }
          }
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        // For subscriptions, always 'door' method
        const effectivePickupMethod = (tariffId === 'trial' || tariffId === 'monthly') ? 'door' : pickupMethod;
        const pickupComment = effectivePickupMethod === 'hand' ? 'Передать лично в руки, позвонить в дверь/телефон' : 'Оставить у двери';
        const finalComment = comment ? `${comment}. ${pickupComment}` : pickupComment;

        // 3. Create Order
        await api.createOrder({
          address_id: addressRes.id,
          date: dateStr,
          time_slot: timeSlotStr,
          is_urgent: isUrgent,
          comment: finalComment
        });

        router.push('/app/order/success');
      } catch (err: any) {
        console.error(err);
        alert(err.message || 'Ошибка создания заказа. Проверьте баланс.');
        setLoading(false);
      }
    }
  };

  const back = () => {
    if (stepIndex === 0) router.back();
    else setStep(steps[stepIndex - 1]);
  };
  
  const selectedComplexName = complexes.find(c => c.id === Number(address.complexId))?.name;

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 px-5 py-4">
        <div className="flex items-center gap-4">
          <button onClick={back} className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-gray-900 hover:bg-gray-200 transition">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900">Оформление</h1>
            <p className="text-gray-500 text-sm">Шаг {stepIndex + 1} из {steps.length}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex gap-2 mt-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-teal-600' : 'bg-gray-200'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 pb-40 space-y-6">
        {/* Step 1: Address */}
        {step === 'address' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Адрес</h2>
                <p className="text-gray-500 text-sm">Куда приехать?</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* ЖК (Residential Complex) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  🏢 Выберите ЖК <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-600" />
                  <select
                    value={address.complexId}
                    onChange={(e) => setAddress({ ...address, complexId: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none"
                    required
                  >
                    <option value="0">-- Выберите ЖК --</option>
                    {complexes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {complexes.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">⏳ Загрузка списка ЖК...</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Дом <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder=""
                      value={address.building}
                      onChange={(e) => setAddress({ ...address, building: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Подъезд</label>
                  <div className="relative">
                    <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder=""
                      value={address.entrance}
                      onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Этаж</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder=""
                    value={address.floor}
                    onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Квартира <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder=""
                      value={address.apartment}
                      onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Код домофона
                  <span className="text-gray-500 ml-2">(необязательно)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder=""
                  value={address.intercom}
                  onChange={(e) => setAddress({ ...address, intercom: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Если домофона нет, оставьте пустым
                </p>
              </div>

              {/* SAVE ADDRESS CHECKBOX */}
              <div 
                onClick={() => setSaveAddress(!saveAddress)}
                className="flex items-center gap-3 p-4 rounded-xl bg-teal-50 border-2 border-teal-200 cursor-pointer hover:border-teal-400 transition-all"
              >
                <div className={`
                  w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all
                  ${saveAddress 
                    ? 'bg-teal-600 border-teal-600' 
                    : 'bg-white border-gray-300'
                  }
                `}>
                  {saveAddress && (
                    <Check className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-gray-900 font-semibold text-sm">Сохранить адрес</p>
                  <p className="text-gray-600 text-xs mt-0.5">Использовать для следующих заказов</p>
                </div>
              </div>
            </div>

            {/* Validation warning - MOVED HERE */}
            {(address.complexId === '0' || !address.building || !address.apartment) && (
              <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
                <p className="text-orange-900 text-sm font-semibold text-center">
                  ⚠️ Заполните обязательные поля:{' '}
                  {address.complexId === '0' && 'ЖК'}{address.complexId === '0' && (!address.building || !address.apartment) && ', '}
                  {!address.building && 'Дом'}{!address.building && !address.apartment && ', '}
                  {!address.apartment && 'Квартира'}
                </p>
              </div>
            )}
          </>
        )}

        {/* Step 2: Volume/Duration - ONLY FOR MONTHLY */}
        {step === 'volume' && tariffId === 'monthly' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Объём и срок</h2>
                <p className="text-gray-500 text-sm">Настройте детали</p>
              </div>
            </div>

            <div className="space-y-4">
              <p className="text-gray-700 font-semibold">Выберите срок</p>
              <div className="space-y-3">
                {/* 2 WEEKS OPTION */}
                <div
                  onClick={() => setDuration(14)}
                  className={`
                    p-5 rounded-2xl border-2 cursor-pointer transition-all
                    ${duration === 14
                      ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-900 font-bold text-lg">2 недели</p>
                      <p className="text-gray-600 text-sm">Вынос через день</p>
                    </div>
                    <div className="text-right">
                      <p className="text-gray-400 line-through text-sm">756 ₽</p>
                      <p className="text-teal-600 font-bold text-2xl">199 ₽</p>
                    </div>
                  </div>
                </div>

                {/* 30 DAYS OPTION */}
                <div
                  onClick={() => setDuration(30)}
                  className={`
                    p-5 rounded-2xl border-2 cursor-pointer transition-all
                    ${duration === 30
                      ? 'bg-teal-50 border-teal-600 ring-2 ring-teal-600/30'
                      : 'bg-white border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-gray-900 font-bold text-lg">30 дней</p>
                      <p className="text-gray-600 text-sm">Регулярный вынос по расписанию</p>
                    </div>
                    <p className="text-teal-600 font-bold text-2xl">1 350 ₽</p>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}

             {/* Step 3: Time */}
        {step === 'time' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Время</h2>
                <p className="text-gray-500 text-sm">Выберите слот</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* URGENT OPTION - Only for single */}
              {tariffId === 'single' && (
                <>
                  <div 
                    onClick={() => setSlot('urgent')}
                    className={`
                      relative overflow-hidden rounded-2xl p-5 border transition-all cursor-pointer
                      ${slot === 'urgent' 
                        ? 'bg-orange-500/20 border-orange-500 ring-2 ring-orange-500/30' 
                        : 'bg-gradient-to-br from-orange-900/40 to-red-900/40 border-orange-500/30 hover:border-orange-500/60'
                      }
                    `}
                  >
                    <div className="flex items-center justify-between relative z-10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center animate-pulse">
                          <Zap className="w-6 h-6 text-gray-900 fill-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-gray-900 font-bold text-lg">СРОЧНО</p>
                            <span className="bg-orange-500 text-gray-900 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                              Hot
                            </span>
                          </div>
                          <p className="text-orange-900 text-sm">Приедем в течение часа</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-900 font-bold text-xl">450 ₽</p>
                      </div>
                    </div>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/20 rounded-full blur-[40px] -mr-10 -mt-10" />
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-3 py-2">
                    <div className="h-px bg-teal-900/30 flex-1" />
                    <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Или по расписанию</span>
                    <div className="h-px bg-teal-900/30 flex-1" />
                  </div>
                </>
              )}

              {/* STANDARD SLOTS */}
              <div className="space-y-3">
                {timeSlots.map((s) => {
                  const isAvailable = s.status === 'available';
                  return (
                    <Card 
                      key={s.id} 
                      onClick={isAvailable ? () => setSlot(s.id) : undefined}
                      className={`
                        ${!isAvailable ? 'opacity-40 grayscale cursor-not-allowed' : ''} 
                        ${slot === s.id ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-100' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900 font-semibold text-lg">{s.time}</p>
                          <p className="text-gray-500 text-sm">{s.label}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${slot === s.id ? 'bg-teal-500 border-teal-500' : 'border-gray-600'}`}>
                          {slot === s.id && <Check className="w-4 h-4 text-gray-900" />}
                        </div>
                      </div>
                      {s.status === 'past' && <p className="text-red-500 text-xs mt-2">Время вышло</p>}
                      {s.status === 'current' && <p className="text-orange-400 text-xs mt-2">Идет сейчас (только срочно)</p>}
                    </Card>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === 'confirm' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center">
                <Check className="w-6 h-6 text-gray-900" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Проверьте</h2>
                <p className="text-gray-500 text-sm">Детали заказа</p>
              </div>
            </div>

            <Card className="bg-white border-2 border-gray-200">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Адрес</p>
                    <p className="text-gray-900 font-semibold text-base leading-snug">
                      {complexes.find(c => c.id === Number(address.complexId))?.name || 'ЖК'}, д. {address.building}
                      {address.entrance && `, подъезд ${address.entrance}`}
                      {address.floor && `, эт. ${address.floor}`}
                      , кв. {address.apartment}
                    </p>
                    {address.intercom && (
                      <p className="text-gray-600 text-sm mt-1">Домофон: {address.intercom}</p>
                    )}
                  </div>
                </div>
                
                {/* TIME - only for single orders */}
                {tariffId === 'single' && (
                  <>
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Время</p>
                        <p className={`font-bold text-base ${slot === 'urgent' ? 'text-orange-600' : 'text-gray-900'}`}>
                          {slot === 'urgent' ? '⚡ СРОЧНО (в течение часа!)' : timeSlots.find((s) => s.id === slot)?.time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-gray-200" />
                  </>
                )}
                
                <div className="flex items-center justify-between bg-teal-50 p-4 rounded-xl border border-teal-200">
                  <span className="text-gray-700 font-semibold">Итого к оплате</span>
                  <span className="text-teal-600 font-bold text-3xl">
                    {(() => {
                      if (slot === 'urgent') return '450';
                      if (tariffId === 'single') return String(150 * bagsCount);
                      if (tariffId === 'trial') return duration === 14 ? '199' : '1350';
                      if (tariffId === 'monthly') return duration === 14 ? '199' : '1350';
                      return '150';
                    })()} ₽
                  </span>
                </div>
              </div>
            </Card>

            {/* COMMENT FIELD */}
            <div className="space-y-2">
              <label className="text-gray-700 text-sm font-semibold ml-1 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                Комментарий курьеру
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Например: позвонить перед приездом, оставить у консьержа..."
                className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                rows={3}
              />
            </div>

            {/* PICKUP METHOD TOGGLE - only for single orders */}
            {tariffId === 'single' && (
              <>
                <div className="space-y-2">
                  <p className="text-gray-700 text-sm font-semibold ml-1">Как забрать мусор?</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div 
                      onClick={() => setPickupMethod('door')}
                      className={`
                        flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all
                        ${pickupMethod === 'door' 
                          ? 'bg-teal-50 border-teal-500 shadow-lg' 
                          : 'bg-white border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <DoorOpen className={`w-6 h-6 ${pickupMethod === 'door' ? 'text-teal-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${pickupMethod === 'door' ? 'text-teal-600' : 'text-gray-600'}`}>У двери</span>
                    </div>

                    <div 
                      onClick={() => setPickupMethod('hand')}
                      className={`
                        flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 cursor-pointer transition-all
                        ${pickupMethod === 'hand' 
                          ? 'bg-orange-50 border-orange-500 shadow-lg' 
                          : 'bg-white border-gray-200 hover:border-gray-300'}
                      `}
                    >
                      <User className={`w-6 h-6 ${pickupMethod === 'hand' ? 'text-orange-600' : 'text-gray-400'}`} />
                      <span className={`text-sm font-semibold ${pickupMethod === 'hand' ? 'text-orange-600' : 'text-gray-600'}`}>В руки</span>
                    </div>
                  </div>
                  
                  {pickupMethod === 'hand' && (
                    <p className="text-orange-600 text-xs text-center font-medium animate-in fade-in slide-in-from-top-1 bg-orange-50 py-2 px-3 rounded-lg border border-orange-200">
                      ⚠️ Курьер будет назначен мгновенно.
                    </p>
                  )}
                </div>

                {slot === 'urgent' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex gap-3">
                    <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                    <p className="text-orange-900 text-sm">
                      Курьер будет назначен мгновенно.
                    </p>
                  </div>
                )}
              </>
            )}
            
            {/* For subscriptions, show info */}
            {(tariffId === 'trial' || tariffId === 'monthly') && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="text-teal-900 text-sm">
                  📅 Вынос начнется со следующего дня по расписанию через день. Курьер заберет мусор у двери.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-24 bg-gradient-to-t from-white via-white/95 to-transparent z-50 border-t border-gray-200">
        {/* Validation hint for TIME step only */}
        {step === 'time' && !slot && (
          <div className="mb-3 bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
            <p className="text-orange-900 text-sm font-semibold text-center">
              ⚠️ Выберите время вывоза
            </p>
          </div>
        )}

        <Button
          fullWidth
          onClick={next}
          disabled={((step === 'address' && (address.complexId === '0' || !address.building || !address.apartment)) || (step === 'time' && !slot)) || loading}
          className={
            ((step === 'address' && (address.complexId === '0' || !address.building || !address.apartment)) || (step === 'time' && !slot))
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }
        >
          {loading ? '⏳ Обработка...' : step === 'confirm' ? '✅ Подтвердить и вызвать' : '➡️ Продолжить'}
        </Button>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center text-teal-600">Загрузка...</div>}>
      <OrderContent />
    </Suspense>
  );
}
