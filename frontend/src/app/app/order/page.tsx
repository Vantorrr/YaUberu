'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, MapPin, Clock, Check, Building, Home, DoorOpen, Hash, Zap, AlertCircle, User } from 'lucide-react';
import { api } from '@/lib/api';
import dynamic from 'next/dynamic';

// Dynamic import to avoid SSR issues with Leaflet
const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false });

const steps = ['address', 'time', 'confirm'] as const;
type Step = typeof steps[number];

const timeSlots = [
  { id: 1, time: '08:00 — 10:00', label: 'Утро', status: 'past' },
  { id: 2, time: '12:00 — 14:00', label: 'День', status: 'current' },
  { id: 3, time: '16:00 — 18:00', label: 'Вечер', status: 'available' },
  { id: 4, time: '20:00 — 22:00', label: 'Ночь', status: 'available' },
];

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState<Step>('address');
  const [slot, setSlot] = useState<number | 'urgent' | null>(null);
  const [address, setAddress] = useState({ complexId: '0', building: '', entrance: '', floor: '', apartment: '', intercom: '', street: '' });
  const [pickupMethod, setPickupMethod] = useState<'door' | 'hand'>('door');
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 55.7558, lon: 37.6173 }); // Москва по умолчанию
  
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
    
    // Load complexes
    api.getResidentialComplexes()
      .then(data => {
        console.log('[ORDER] Loaded complexes:', data);
        setComplexes(data);
      })
      .catch(err => {
        console.error('[ORDER] Failed to load complexes:', err);
        alert('Ошибка загрузки ЖК. Проверьте соединение.');
      });
  }, []);

  // Центрирование карты на текущей геолокации
  const handleLocationRequest = async () => {
    if (!navigator.geolocation) {
      alert('❌ Ваш браузер не поддерживает геолокацию');
      return;
    }

    setLocationLoading(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        console.log('[LOCATION] Got coords:', latitude, longitude);
        
        setLocationLoading(false);
        setMapCenter({ lat: latitude, lon: longitude });
        alert(`📍 Ваше местоположение найдено!\n\nУточните адрес в полях ниже.`);
      },
      (error) => {
        setLocationLoading(false);
        console.error('[LOCATION] Error:', error);

        let errorMessage = '❌ Не удалось получить геолокацию';

        if (error.code === error.PERMISSION_DENIED) {
          errorMessage = '🚫 Доступ к геолокации запрещён';
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMessage = '📡 Не удалось определить местоположение';
        } else if (error.code === error.TIMEOUT) {
          errorMessage = '⏱ Превышено время ожидания';
        }

        alert(errorMessage);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );
  };

  const stepIndex = steps.indexOf(step);

  const next = async () => {
    // Validation for address step
    if (step === 'address') {
      console.log('[NEXT] Current address state:', address);
      console.log('[NEXT] street:', address.street, 'building:', address.building, 'apartment:', address.apartment);
      
      if (!address.street || address.street.trim() === '') {
        alert('⚠️ Укажите улицу');
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
      
      console.log('[NEXT] ✅ All fields valid, proceeding to next step');
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
        
        // 1. Create Address
        const addressRes = await api.createAddress({
          complex_id: address.complexId === '0' ? null : Number(address.complexId),
          street: address.street,
          building: address.building,
          entrance: address.entrance || '1',
          floor: address.floor || '1',
          apartment: address.apartment,
          intercom: address.intercom || '0',
          is_default: true,
        });
        
        console.log('[ORDER] Address created:', addressRes);

        // 2. Prepare Data
        let timeSlotStr = '';
        let isUrgent = false;

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

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        const comment = pickupMethod === 'hand' ? 'Передать лично в руки, позвонить в дверь/телефон' : 'Оставить у двери';

        // 3. Create Order
        await api.createOrder({
          address_id: addressRes.id,
          date: dateStr,
          time_slot: timeSlotStr,
          is_urgent: isUrgent,
          comment
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
    <div className="min-h-screen bg-[#0f1714]">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0f1714]/95 backdrop-blur border-b border-teal-900/30 px-5 py-4">
        <div className="flex items-center gap-4">
          <button onClick={back} className="w-10 h-10 bg-teal-900/50 rounded-xl flex items-center justify-center text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-white">Оформление</h1>
            <p className="text-gray-500 text-sm">Шаг {stepIndex + 1} из {steps.length}</p>
          </div>
        </div>
        
        {/* Progress */}
        <div className="flex gap-2 mt-4">
          {steps.map((_, i) => (
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-teal-500' : 'bg-teal-900/30'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 pb-40 space-y-6">
        {/* Step 1: Address */}
        {step === 'address' && (
          <>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center">
                  <MapPin className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">Адрес</h2>
                  <p className="text-gray-500 text-sm">Куда приехать?</p>
                </div>
              </div>
              
              <button
                type="button"
                onClick={handleLocationRequest}
                disabled={locationLoading}
                className="px-3 py-2 rounded-xl bg-teal-900/40 border border-teal-600/30 text-teal-400 text-sm font-medium hover:bg-teal-900/60 hover:border-teal-500/50 transition-all disabled:opacity-50 flex items-center gap-2 active:scale-95"
              >
                {locationLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Ищу...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs font-semibold">📍 Где я?</span>
                  </>
                )}
              </button>
            </div>

            <div className="space-y-4">
              {/* ИНТЕРАКТИВНАЯ КАРТА */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">📍 Нажмите на карту для выбора адреса</label>
                <MapPicker
                  center={mapCenter}
                  onLocationSelect={(data) => {
                    console.log('[ORDER] RECEIVED DATA:', JSON.stringify(data, null, 2));
                    
                    // ИСПРАВЛЯЕМ: используем функциональную форму setState!
                    setAddress((prevAddress) => {
                      const newAddress = {
                        ...prevAddress,
                        street: data.street,
                        building: data.building
                      };
                      console.log('[ORDER] Updating address from', JSON.stringify(prevAddress, null, 2), 'to', JSON.stringify(newAddress, null, 2));
                      return newAddress;
                    });
                    
                    alert(`📍 Адрес выбран!\n\n${data.fullAddress}\n\nУлица: ${data.street}\nДом: ${data.building}\n\nУточните детали ниже 👇`);
                  }}
                />
                <div className="flex items-center justify-between mt-3">
                  <button
                    type="button"
                    onClick={handleLocationRequest}
                    disabled={locationLoading}
                    className="px-4 py-2 rounded-xl bg-teal-900/40 border border-teal-600/30 text-teal-400 text-sm font-medium hover:bg-teal-900/60 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {locationLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
                        Ищу...
                      </>
                    ) : (
                      <>
                        <MapPin className="w-4 h-4" />
                        Где я?
                      </>
                    )}
                  </button>
                  <p className="text-xs text-gray-500">💡 Или введите вручную ниже</p>
                </div>
              </div>

              {/* УЛИЦА */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Улица <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                  <input
                    type="text"
                    placeholder="Ленина"
                    value={address.street}
                    onChange={(e) => setAddress({ ...address, street: e.target.value })}
                    className="w-full pl-12 pr-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Дом <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder="2к4"
                      value={address.building}
                      onChange={(e) => setAddress({ ...address, building: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Подъезд</label>
                  <div className="relative">
                    <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder="5"
                      value={address.entrance}
                      onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Этаж</label>
                  <input
                    type="number"
                    inputMode="numeric"
                    placeholder="9"
                    value={address.floor}
                    onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Квартира <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder="45"
                      value={address.apartment}
                      onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Код домофона
                  <span className="text-gray-500 ml-2">(необязательно)</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="1234 или КБ123"
                  value={address.intercom}
                  onChange={(e) => setAddress({ ...address, intercom: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl bg-teal-950/50 border border-teal-800/30 text-white placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
                     <p className="text-xs text-gray-500 mt-2">
                       💡 Если домофона нет, оставьте пустым
                     </p>
                   </div>
                   
                   {/* DEBUG: Show current values */}
                   <div className="mt-4 p-4 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                     <p className="text-blue-400 text-xs font-bold mb-2">🔧 ОТЛАДКА (для проверки):</p>
                     <div className="space-y-1 text-xs">
                       <p className="text-gray-300">
                         Улица: <span className={address.street ? 'text-green-400' : 'text-red-400'}>
                           {address.street || '❌ Не заполнено'}
                         </span>
                       </p>
                       <p className="text-gray-300">
                         Дом: <span className={address.building ? 'text-green-400' : 'text-red-400'}>
                           {address.building || '❌ Не заполнено'}
                         </span>
                       </p>
                       <p className="text-gray-300">
                         Квартира: <span className={address.apartment ? 'text-green-400' : 'text-red-400'}>
                           {address.apartment || '❌ Не заполнено'}
                         </span>
                       </p>
                     </div>
                   </div>
                 </div>

               </>
             )}

             {/* Step 2: Time */}
        {step === 'time' && (
          <>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Время</h2>
                <p className="text-gray-500 text-sm">Выберите слот</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* URGENT OPTION */}
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
                      <Zap className="w-6 h-6 text-white fill-white" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-white font-bold text-lg">СРОЧНО</p>
                        <span className="bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                          Hot
                        </span>
                      </div>
                      <p className="text-orange-200 text-sm">Приедем в течение часа</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-bold text-xl">450 ₽</p>
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
                        ${slot === s.id ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-900/40' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-lg">{s.time}</p>
                          <p className="text-gray-500 text-sm">{s.label}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${slot === s.id ? 'bg-teal-500 border-teal-500' : 'border-gray-600'}`}>
                          {slot === s.id && <Check className="w-4 h-4 text-white" />}
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
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Проверьте</h2>
                <p className="text-gray-500 text-sm">Детали заказа</p>
              </div>
            </div>

            <Card className="bg-gradient-to-br from-emerald-950/70 to-emerald-900/30 border-teal-700/50">
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <MapPin className="w-5 h-5 text-teal-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm mb-1">Адрес</p>
                    <p className="text-white font-medium">
                      {address.street}, д. {address.building}
                      {address.entrance && `, подъезд ${address.entrance}`}
                      {address.floor && `, эт. ${address.floor}`}
                      , кв. {address.apartment}
                    </p>
                    {address.intercom && (
                      <p className="text-gray-500 text-sm mt-1">Домофон: {address.intercom}</p>
                    )}
                  </div>
                </div>
                
                <div className="h-px bg-teal-900/30" />
                
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-teal-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-gray-400 text-sm mb-1">Время</p>
                    <p className={`font-medium ${slot === 'urgent' ? 'text-orange-500' : 'text-white'}`}>
                      {slot === 'urgent' ? '⚡️ СРОЧНО (в течение часа)' : timeSlots.find((s) => s.id === slot)?.time}
                    </p>
                  </div>
                </div>
                
                <div className="h-px bg-teal-900/30" />
                
                <div className="flex items-center justify-between bg-teal-900/40 p-4 rounded-xl">
                  <span className="text-gray-300 font-medium">Итого к оплате</span>
                  <span className="text-teal-400 font-bold text-3xl">{slot === 'urgent' ? '450' : '300'} ₽</span>
                </div>
              </div>
            </Card>

            {/* PICKUP METHOD TOGGLE */}
            <div className="space-y-2">
              <p className="text-gray-400 text-sm font-medium ml-1">Как забрать мусор?</p>
              <div className="grid grid-cols-2 gap-3">
                <div 
                  onClick={() => setPickupMethod('door')}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all
                    ${pickupMethod === 'door' 
                      ? 'bg-teal-900/60 border-teal-500/50 shadow-lg shadow-emerald-900/20' 
                      : 'bg-teal-950/30 border-teal-800/30 opacity-60 hover:opacity-100'}
                  `}
                >
                  <DoorOpen className={`w-6 h-6 ${pickupMethod === 'door' ? 'text-teal-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${pickupMethod === 'door' ? 'text-white' : 'text-gray-400'}`}>У двери</span>
                </div>

                <div 
                  onClick={() => setPickupMethod('hand')}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all
                    ${pickupMethod === 'hand' 
                      ? 'bg-orange-900/40 border-orange-500/50 shadow-lg shadow-orange-900/20' 
                      : 'bg-teal-950/30 border-teal-800/30 opacity-60 hover:opacity-100'}
                  `}
                >
                  <User className={`w-6 h-6 ${pickupMethod === 'hand' ? 'text-orange-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${pickupMethod === 'hand' ? 'text-white' : 'text-gray-400'}`}>В руки</span>
                </div>
              </div>
              
              {pickupMethod === 'hand' && (
                <p className="text-orange-400 text-xs text-center animate-in fade-in slide-in-from-top-1">
                  Курьер позвонит вам перед тем, как подойти к двери.
                </p>
              )}
            </div>

            {slot === 'urgent' && (
              <div className="bg-orange-950/30 border border-orange-800/30 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-orange-500 shrink-0" />
                <p className="text-orange-200 text-sm">
                  Курьер будет назначен мгновенно.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-24 bg-gradient-to-t from-[#0f1714] via-[#0f1714]/95 to-transparent z-50">
        {/* Validation hints */}
        {step === 'address' && (!address.street || !address.building || !address.apartment) && (
          <div className="mb-3 bg-orange-900/30 border border-orange-500/50 rounded-xl p-3 animate-pulse">
            <p className="text-orange-300 text-sm font-medium text-center">
              ⚠️ Заполните обязательные поля:{' '}
              {!address.street && 'Улица'}{!address.street && (!address.building || !address.apartment) && ', '}
              {!address.building && 'Дом'}{!address.building && !address.apartment && ', '}
              {!address.apartment && 'Квартира'}
            </p>
          </div>
        )}
        
        {step === 'time' && !slot && (
          <div className="mb-3 bg-orange-900/30 border border-orange-500/50 rounded-xl p-3 animate-pulse">
            <p className="text-orange-300 text-sm font-medium text-center">
              ⚠️ Выберите время вывоза
            </p>
          </div>
        )}

        <Button
          fullWidth
          onClick={next}
          disabled={((step === 'address' && (!address.street || !address.building || !address.apartment)) || (step === 'time' && !slot)) || loading}
          className={
            ((step === 'address' && (!address.street || !address.building || !address.apartment)) || (step === 'time' && !slot))
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
    <Suspense fallback={<div className="min-h-screen bg-[#0f1714] flex items-center justify-center text-teal-500">Загрузка...</div>}>
      <OrderContent />
    </Suspense>
  );
}
