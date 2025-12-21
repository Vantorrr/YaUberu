'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, MapPin, Clock, Check, Building, Home, DoorOpen, Hash, Zap, AlertCircle, User } from 'lucide-react';
import { api } from '@/lib/api';

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
  const [address, setAddress] = useState({ complexId: '', building: '', entrance: '', floor: '', apartment: '', intercom: '' });
  const [pickupMethod, setPickupMethod] = useState<'door' | 'hand'>('door');
  const [loading, setLoading] = useState(false);
  
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

  const stepIndex = steps.indexOf(step);

  const next = async () => {
    // Validation for address step
    if (step === 'address') {
      if (!address.complexId) {
        alert('Выберите жилой комплекс');
        return;
      }
      if (!address.building) {
        alert('Укажите номер дома');
        return;
      }
      if (!address.apartment) {
        alert('Укажите квартиру');
        return;
      }
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
          complex_id: Number(address.complexId),
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
      <div className="sticky top-0 z-10 bg-[#0f1714]/95 backdrop-blur border-b border-emerald-900/30 px-5 py-4">
        <div className="flex items-center gap-4">
          <button onClick={back} className="w-10 h-10 bg-emerald-900/50 rounded-xl flex items-center justify-center text-white">
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
            <div key={i} className={`h-1 flex-1 rounded-full ${i <= stepIndex ? 'bg-emerald-500' : 'bg-emerald-900/30'}`} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="px-5 py-6 pb-28 space-y-6">
        {/* Step 1: Address */}
        {step === 'address' && (
          <>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                <MapPin className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Адрес</h2>
                <p className="text-gray-500 text-sm">Куда приехать?</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-2">Жилой комплекс</label>
                
                {complexes.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <Building className="w-12 h-12 mx-auto mb-2 opacity-30" />
                    <p>Загрузка ЖК...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {complexes.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setAddress({ ...address, complexId: String(c.id) })}
                        className={`
                          p-4 rounded-xl border-2 transition-all text-left flex items-center gap-3
                          ${address.complexId === String(c.id)
                            ? 'bg-emerald-600 border-emerald-500 text-white' 
                            : 'bg-emerald-950/30 border-emerald-800/30 text-gray-300 hover:border-emerald-600/50'
                          }
                        `}
                      >
                        <Building className={`w-5 h-5 flex-shrink-0 ${
                          address.complexId === String(c.id) ? 'text-white' : 'text-emerald-500'
                        }`} />
                        <div className="flex-1">
                          <p className="font-semibold">{c.name}</p>
                          {c.short_name && <p className="text-sm opacity-70">{c.short_name}</p>}
                        </div>
                        {address.complexId === String(c.id) && (
                          <Check className="w-5 h-5 text-white" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Дом</label>
                  <div className="relative">
                    <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input
                      type="text"
                      placeholder="2к4"
                      value={address.building}
                      onChange={(e) => setAddress({ ...address, building: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-white placeholder-gray-600"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Подъезд</label>
                  <div className="relative">
                    <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input
                      type="text"
                      placeholder="5"
                      value={address.entrance}
                      onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-white placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Этаж</label>
                  <input
                    type="text"
                    placeholder="9"
                    value={address.floor}
                    onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                    className="w-full px-4 py-4 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-white placeholder-gray-600"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Квартира</label>
                  <div className="relative">
                    <Hash className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-emerald-500" />
                    <input
                      type="text"
                      placeholder="45"
                      value={address.apartment}
                      onChange={(e) => setAddress({ ...address, apartment: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-white placeholder-gray-600"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-2">Код домофона</label>
                <input
                  type="text"
                  placeholder="1234"
                  value={address.intercom}
                  onChange={(e) => setAddress({ ...address, intercom: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl bg-emerald-950/50 border border-emerald-800/30 text-white placeholder-gray-600"
                />
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
                <div className="h-px bg-emerald-900/30 flex-1" />
                <span className="text-gray-500 text-xs font-medium uppercase tracking-wider">Или по расписанию</span>
                <div className="h-px bg-emerald-900/30 flex-1" />
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
                        ${slot === s.id ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-emerald-900/40' : ''}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white font-semibold text-lg">{s.time}</p>
                          <p className="text-gray-500 text-sm">{s.label}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${slot === s.id ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
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

            <Card>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-500">Адрес</span>
                  <span className="text-white text-right">{selectedComplexName || 'ЖК'}, д. {address.building}, кв. {address.apartment}</span>
                </div>
                <div className="h-px bg-emerald-900/30" />
                <div className="flex justify-between">
                  <span className="text-gray-500">Время</span>
                  <span className={`text-white font-medium ${slot === 'urgent' ? 'text-orange-500' : ''}`}>
                    {slot === 'urgent' ? '⚡️ СРОЧНО (1 час)' : timeSlots.find((s) => s.id === slot)?.time}
                  </span>
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
                      ? 'bg-emerald-900/60 border-emerald-500/50 shadow-lg shadow-emerald-900/20' 
                      : 'bg-emerald-950/30 border-emerald-800/30 opacity-60 hover:opacity-100'}
                  `}
                >
                  <DoorOpen className={`w-6 h-6 ${pickupMethod === 'door' ? 'text-emerald-400' : 'text-gray-500'}`} />
                  <span className={`text-sm font-medium ${pickupMethod === 'door' ? 'text-white' : 'text-gray-400'}`}>У двери</span>
                </div>

                <div 
                  onClick={() => setPickupMethod('hand')}
                  className={`
                    flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border cursor-pointer transition-all
                    ${pickupMethod === 'hand' 
                      ? 'bg-orange-900/40 border-orange-500/50 shadow-lg shadow-orange-900/20' 
                      : 'bg-emerald-950/30 border-emerald-800/30 opacity-60 hover:opacity-100'}
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
      <div className="fixed bottom-0 left-0 right-0 p-5 bg-gradient-to-t from-[#0f1714] to-transparent z-20">
        <Button
          fullWidth
          onClick={next}
          disabled={((step === 'address' && !address.complexId) || (step === 'time' && !slot)) || loading}
        >
          {step === 'confirm' ? (loading ? 'Обработка...' : 'Подтвердить и вызвать') : 'Продолжить'}
        </Button>
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0f1714] flex items-center justify-center text-emerald-500">Загрузка...</div>}>
      <OrderContent />
    </Suspense>
  );
}
