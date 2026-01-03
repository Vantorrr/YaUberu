'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, MapPin, Clock, Check, Building, Home, DoorOpen, Hash, Zap, AlertCircle, User, Package, MessageSquare, Layers } from 'lucide-react';
import { api } from '@/lib/api';

type Step = 'address' | 'volume' | 'time' | 'confirm';

const timeSlots = [
  { id: 1, time: '08:00 — 10:00', label: 'Утро ☀️' },
  { id: 2, time: '12:00 — 14:00', label: 'День ☀️' },
  { id: 3, time: '16:00 — 18:00', label: 'Вечер 🌙' },
  { id: 4, time: '20:00 — 22:00', label: 'Ночь 🌙' },
];

// Dynamic steps based on tariff
const getStepsForTariff = (tariffId: string): Step[] => {
  if (tariffId === 'single') {
    return ['address', 'time', 'confirm']; // Разовый: адрес → время → подтверждение
  } else if (tariffId === 'trial') {
    return ['address', 'time', 'confirm']; // Пробная: адрес → время/дата/метод → подтверждение
  } else if (tariffId === 'monthly') {
    return ['address', 'volume', 'time', 'confirm']; // Месячная: адрес → объём → время/дата/метод → подтверждение
  }
  return ['address', 'confirm'];
};

function OrderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tariffId = searchParams.get('tariff') || 'single';
  const urlDuration = searchParams.get('duration');
  const urlUrgent = searchParams.get('urgent');
  
  const steps = getStepsForTariff(tariffId);

  const [step, setStep] = useState<Step>('address');
  const [slot, setSlot] = useState<number | 'urgent' | null>(urlUrgent === 'true' ? 'urgent' : null);
  const [address, setAddress] = useState({ complexId: '0', building: '', entrance: '', floor: '', apartment: '', intercom: '' });
  const [pickupMethod, setPickupMethod] = useState<'door' | 'hand'>('door');
  const [loading, setLoading] = useState(false);
  const [comment, setComment] = useState('');
  const [saveAddress, setSaveAddress] = useState(true); // Save address by default
  const [deliveryDate, setDeliveryDate] = useState<string>(''); // For trial tariff date selection
  
  // Volume/Duration for dynamic pricing
  const [bagsCount, setBagsCount] = useState(1);
  const [duration, setDuration] = useState<number>(urlDuration ? parseInt(urlDuration) : 14); // days from URL or default 14
  const [frequency, setFrequency] = useState<'daily' | 'every_other_day' | 'twice_week'>('every_other_day');
  
  // Dynamic Complexes
  const [complexes, setComplexes] = useState<any[]>([]);
  const [selectedComplexBuildings, setSelectedComplexBuildings] = useState<string[]>([]);
  
  // Balance for payment logic
  const [balance, setBalance] = useState<number>(0);
  
  // Check if user has any subscriptions (for first-time pricing)
  const [hasSubscriptions, setHasSubscriptions] = useState<boolean>(false);
  
  // Tariff prices from DB
  const [tariffPrices, setTariffPrices] = useState<any>({
    single: { price: 150, urgent_price: 250 },
    trial: { price: 199 },
    monthly: { base_price: 150 }
  });
  
  useEffect(() => {
    // Expand to full screen
    if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
      const tg = (window as any).Telegram.WebApp;
      tg.ready();
      tg.expand();
      console.log('[TG] WebApp expanded to full screen');
    }
    
    // Load complexes, saved addresses, balance, tariff prices, and subscriptions
    Promise.all([
      api.getResidentialComplexes(),
      api.getAddresses(),
      api.getBalance(),
      api.getPublicTariffs(),
      api.getSubscriptions()
    ])
      .then(([complexesData, addressesData, balanceData, tariffsData, subscriptionsData]) => {
        console.log('[ORDER] Loaded complexes:', complexesData);
        console.log('[ORDER] Loaded addresses:', addressesData);
        console.log('[ORDER] Loaded balance:', balanceData);
        console.log('[ORDER] Loaded tariffs:', tariffsData);
        console.log('[ORDER] Loaded subscriptions:', subscriptionsData);
        setComplexes(complexesData);
        setBalance(balanceData.credits || 0);
        setHasSubscriptions(subscriptionsData && subscriptionsData.length > 0);
        
        // Parse tariff prices
        const prices: any = {
          single: { price: 150, urgent_price: 250 },
          trial: { price: 199 },
          monthly: { base_price: 150 }
        };
        
        tariffsData.forEach((t: any) => {
          if (t.tariff_type === 'single') {
            prices.single.price = parseInt(t.price);
            // Urgent price is fixed at 250 ₽
            prices.single.urgent_price = 250;
          } else if (t.tariff_type === 'trial') {
            prices.trial.price = parseInt(t.price);
          } else if (t.tariff_type === 'monthly') {
            // For monthly, the price in DB is the starting price
            // We use it as base_price for calculations
            prices.monthly.base_price = Math.floor(parseInt(t.price) / 7); // Approximate base per pickup
          }
        });
        
        setTariffPrices(prices);
        console.log('[ORDER] Parsed tariff prices:', prices);
        
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

        // 2. Prepare Time Slot
        let timeSlotStr = '';
        let isUrgent = false;

        const mapping: Record<number, string> = {
          1: '08:00-10:00',
          2: '12:00-14:00',
          3: '16:00-18:00',
          4: '20:00-22:00',
        };

        if (slot === 'urgent') {
          isUrgent = true;
          // Urgent is usually within hour, but we pass a slot for backend compat
          timeSlotStr = '12:00-14:00'; 
        } else if (typeof slot === 'number') {
           timeSlotStr = mapping[slot];
        } else {
           // Fallback if slot is missing (should not happen due to validation)
           timeSlotStr = '12:00-14:00';
        }

        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];

        // For subscriptions, always 'door' method
        const effectivePickupMethod = (tariffId === 'trial' || tariffId === 'monthly') ? 'door' : pickupMethod;
        // No automatic pickup comment - user writes their own comment if needed
        const finalComment = comment || '';

        // 3. Create Order OR Payment
        // Cost in credits (for balance check)
        const creditsCost = (tariffId === 'single' && isUrgent) ? 2 : 1; 
        
        // Use user selected date
        const finalDate = deliveryDate || dateStr;

        console.log(`[ORDER] Submitting: tariff=${tariffId}, date=${finalDate}, slot=${timeSlotStr}, balance=${balance}`);

        // Logic:
        // 1. If Subscription (trial or monthly) -> ALWAYS Payment (no matter balance)
        // 2. If Single tariff AND User has balance -> Direct Order (deduct balance)
        // 3. Otherwise -> Payment
        
        if (tariffId === 'trial' || tariffId === 'monthly') {
            // Subscriptions ALWAYS require payment
            console.log('[ORDER] Subscription - redirecting to payment');
            const paymentRes = await api.createPayment({
              address_id: addressRes.id,
              date: finalDate,
              time_slot: timeSlotStr,
              is_urgent: isUrgent,
              comment: finalComment,
              tariff_type: tariffId,
              tariff_details: tariffId === 'monthly' ? { bags_count: bagsCount, duration, frequency } : undefined
            });
            
            if (paymentRes.confirmation_url) {
                window.location.href = paymentRes.confirmation_url;
            } else {
                 router.push('/app/order/success');
            }
        } else if (tariffId === 'single' && balance >= creditsCost) {
            // Single order with sufficient balance - pay with balance
            console.log('[ORDER] Single order - paying with balance');
            await api.createOrder({
              address_id: addressRes.id,
              date: finalDate,
              time_slot: timeSlotStr,
              is_urgent: isUrgent,
              comment: finalComment,
              tariff_type: tariffId
            });
            router.push('/app/order/success');
        } else {
            // Single order without balance - payment required
            console.log('[ORDER] Single order - redirecting to payment');
            const paymentRes = await api.createPayment({
              address_id: addressRes.id,
              date: finalDate,
              time_slot: timeSlotStr,
              is_urgent: isUrgent,
              comment: finalComment,
              tariff_type: tariffId
            });
            
            if (paymentRes.confirmation_url) {
                window.location.href = paymentRes.confirmation_url;
            } else {
                 router.push('/app/order/success');
            }
        }
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
                    onChange={(e) => {
                      const complexId = e.target.value;
                      setAddress({ ...address, complexId, building: '' });
                      // Update available buildings for selected complex
                      const complex = complexes.find((c) => c.id === parseInt(complexId));
                      setSelectedComplexBuildings(complex?.buildings || []);
                    }}
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
                  {selectedComplexBuildings.length > 0 ? (
                    <div className="relative">
                      <Home className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                      <select
                        value={address.building}
                        onChange={(e) => setAddress({ ...address, building: e.target.value })}
                        className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none"
                        required
                      >
                        <option value="">-- Выберите дом --</option>
                        {selectedComplexBuildings.map((building, idx) => (
                          <option key={idx} value={building}>
                            {building}
                          </option>
                        ))}
                      </select>
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  ) : (
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
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Подъезд <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <DoorOpen className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="text"
                      placeholder=""
                      value={address.entrance}
                      onChange={(e) => setAddress({ ...address, entrance: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Этаж <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Layers className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-teal-500" />
                    <input
                      type="number"
                      inputMode="numeric"
                      placeholder=""
                      value={address.floor}
                      onChange={(e) => setAddress({ ...address, floor: e.target.value })}
                      className="w-full pl-12 pr-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                      required
                    />
                  </div>
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
                </label>
                <input
                  type="text"
                  inputMode="text"
                  placeholder=""
                  value={address.intercom}
                  onChange={(e) => setAddress({ ...address, intercom: e.target.value })}
                  className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-600 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                />
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
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center">
                <Package className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Объём и длительность</h2>
                <p className="text-gray-500 text-sm">Настройте детали подписки</p>
              </div>
            </div>

            <div className="space-y-6">
              {/* BAGS COUNT */}
              <div className="bg-gradient-to-br from-teal-50 to-emerald-50 rounded-2xl p-6 border-2 border-teal-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-gray-700 font-semibold text-base">Объем пакета до 70л</p>
                  </div>
                  <div className="w-16 h-20 bg-teal-600 rounded-2xl flex flex-col items-center justify-center text-white relative shadow-lg">
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-8 h-3 bg-teal-700 rounded-t-full"></div>
                    <p className="text-2xl font-black">10</p>
                    <p className="text-[10px] font-semibold">КГ</p>
                  </div>
                </div>
                
                <div className="flex items-center justify-between bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-gray-700 font-semibold">Кол-во пакетов</p>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setBagsCount(Math.max(1, bagsCount - 1))}
                      className="w-10 h-10 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-900 font-bold text-xl transition-all active:scale-95"
                    >
                      −
                    </button>
                    <span className="text-2xl font-bold text-gray-900 w-8 text-center">{bagsCount}</span>
                    <button
                      onClick={() => setBagsCount(Math.min(10, bagsCount + 1))}
                      className="w-10 h-10 rounded-xl bg-teal-600 hover:bg-teal-700 flex items-center justify-center text-white font-bold text-xl transition-all active:scale-95"
                    >
                      +
                    </button>
                  </div>
                </div>
              </div>

              {/* DURATION - only show if not fixed from URL */}
              {!urlDuration ? (
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Длительность</label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(Number(e.target.value))}
                    className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none cursor-pointer"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                      backgroundRepeat: 'no-repeat',
                      backgroundPosition: 'right 1rem center',
                      backgroundSize: '1.5rem'
                    }}
                  >
                    <option value={14}>14 дней</option>
                    <option value={30}>30 дней</option>
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-gray-700 font-semibold mb-2">Длительность</label>
                  <div className="w-full px-4 py-4 rounded-xl bg-gray-50 border-2 border-gray-200 text-gray-900 font-semibold">
                    {duration} дней
                  </div>
                </div>
              )}

              {/* FREQUENCY */}
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Курьер будет забирать мусор</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value as any)}
                  className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 font-semibold focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all appearance-none cursor-pointer"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%239ca3af'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 1rem center',
                    backgroundSize: '1.5rem'
                  }}
                >
                  <option value="every_other_day">Через день</option>
                  <option value="daily">Каждый день</option>
                </select>
              </div>

              {/* PRICE CALCULATION */}
              {(() => {
                // Special price for first-time subscribers with trial-like parameters
                const isTrialEquivalent = duration === 14 && frequency === 'every_other_day' && bagsCount === 1;
                if (!hasSubscriptions && isTrialEquivalent) {
                  const trialPrice = tariffPrices.trial.price;
                  return (
                    <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl p-5 border-2 border-teal-300">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <span className="text-gray-700 font-semibold text-lg">Стоимость</span>
                        </div>
                        <div className="text-right">
                          <p className="text-teal-600 font-bold text-3xl">{trialPrice} ₽</p>
                        </div>
                      </div>
                      <p className="text-gray-500 text-xs">
                        🎉 Специальная цена для первой подписки!
                      </p>
                    </div>
                  );
                }
                
                const basePrice = tariffPrices.monthly.base_price; // base price per pickup from DB
                const frequencyMultiplier = {
                  daily: 1,
                  every_other_day: 0.5,
                  twice_week: 2/7
                };
                const daysInPeriod = duration;
                const pickupsCount = Math.ceil(daysInPeriod * frequencyMultiplier[frequency]);
                const totalPrice = basePrice * pickupsCount * bagsCount;
                const discount = duration >= 60 ? 0.3 : duration >= 30 ? 0.2 : duration >= 14 ? 0.1 : 0;
                const discountedPrice = Math.round(totalPrice * (1 - discount));
                const savingsPercent = Math.round(discount * 100);

                return (
                  <div className="bg-white rounded-2xl border-2 border-teal-200 p-5 space-y-3">
                    {savingsPercent > 0 && (
                      <div className="inline-block bg-teal-600 text-white px-3 py-1 rounded-full text-sm font-bold">
                        ⚡ Выгода {savingsPercent}%
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-gray-700 font-semibold text-lg">Стоимость</span>
                      <div className="text-right">
                        {discount > 0 && (
                          <p className="text-gray-400 line-through text-sm">{totalPrice} ₽</p>
                        )}
                        <p className="text-teal-600 font-bold text-3xl">{discountedPrice} ₽</p>
                      </div>
                    </div>
                    <p className="text-gray-500 text-xs">
                      {pickupsCount} выносов × {bagsCount} пакет{bagsCount > 1 ? (bagsCount < 5 ? 'а' : 'ов') : ''}
                    </p>
                  </div>
                );
              })()}
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
                <h2 className="text-xl font-bold text-gray-900">Детали</h2>
                <p className="text-gray-500 text-sm">Настройте вынос</p>
              </div>
            </div>

            <div className="space-y-4">
              {/* DATE PICKER - For all tariffs */}
              <div className={slot === 'urgent' ? 'hidden' : ''}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Дата <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={deliveryDate}
                    onChange={(e) => {
                      const selectedDate = e.target.value;
                      const today = new Date().toISOString().split('T')[0];
                      // Block past dates
                      if (selectedDate >= today) {
                        setDeliveryDate(selectedDate);
                      } else {
                        // If user somehow selected a past date, reset to today
                        setDeliveryDate(today);
                      }
                    }}
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-4 rounded-xl bg-white border-2 border-gray-200 text-gray-900 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all"
                    style={{ colorScheme: 'light' }}
                    required={slot !== 'urgent'}
                  />
                </div>
              </div>

              {/* URGENT OPTION - Only for single */}
              {tariffId === 'single' && (
                <>
                  <div 
                    onClick={() => {
                      setSlot('urgent');
                      setDeliveryDate(new Date().toISOString().split('T')[0]);
                    }}
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
                        <p className="text-gray-900 font-bold text-xl">{tariffPrices.single.urgent_price} ₽</p>
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

              {/* TIME SLOTS */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Время <span className="text-red-500">*</span>
                </label>
                <div className="space-y-3">
                  {timeSlots.map((s) => (
                    <Card 
                      key={s.id} 
                      onClick={() => setSlot(s.id)}
                      className={`
                        cursor-pointer hover:border-teal-300 transition-all
                        ${slot === s.id ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50' : 'border-gray-200'}
                      `}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-gray-900 font-semibold text-lg">{s.time}</p>
                          <p className="text-gray-500 text-sm">{s.label}</p>
                        </div>
                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${slot === s.id ? 'bg-teal-500 border-teal-500' : 'border-gray-300'}`}>
                          {slot === s.id && <Check className="w-4 h-4 text-white" />}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>

              {/* PICKUP METHOD - For trial and monthly */}
              {(tariffId === 'trial' || tariffId === 'monthly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Способ передачи <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <Card 
                      onClick={() => setPickupMethod('door')}
                      className={`
                        cursor-pointer hover:border-teal-300 transition-all
                        ${pickupMethod === 'door' ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50' : 'border-gray-200'}
                      `}
                    >
                      <div className="text-center py-4">
                        <div className="text-2xl mb-2">🚪</div>
                        <p className="text-gray-900 font-semibold">За дверью</p>
                      </div>
                    </Card>
                    <Card 
                      onClick={() => setPickupMethod('hand')}
                      className={`
                        cursor-pointer hover:border-teal-300 transition-all
                        ${pickupMethod === 'hand' ? 'border-teal-500 ring-2 ring-teal-500/30 bg-teal-50' : 'border-gray-200'}
                      `}
                    >
                      <div className="text-center py-4">
                        <div className="text-2xl mb-2">🤝</div>
                        <p className="text-gray-900 font-semibold">В руки</p>
                      </div>
                    </Card>
                  </div>
                </div>
              )}

              {/* COMMENT - For trial and monthly */}
              {(tariffId === 'trial' || tariffId === 'monthly') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Комментарий курьеру
                  </label>
                  <textarea
                    placeholder="Например: оставьте у двери, не звоните"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-4 rounded-xl bg-white border border-gray-300 text-gray-900 placeholder-gray-500 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                  />
                </div>
              )}
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
                
                {/* DATE AND TIME - for single orders */}
                {tariffId === 'single' && (
                  <>
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Дата и время</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {new Date(deliveryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className={`font-bold text-base mt-1 ${slot === 'urgent' ? 'text-orange-600' : 'text-gray-900'}`}>
                          {slot === 'urgent' ? '⚡ СРОЧНО (в течение часа!)' : timeSlots.find((s) => s.id === slot)?.time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-gray-200" />
                  </>
                )}

                {/* TRIAL DETAILS - date, time, method, comment */}
                {tariffId === 'trial' && (
                  <>
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Дата и время</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {new Date(deliveryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-gray-900 font-semibold text-base mt-1">
                          {timeSlots.find((s) => s.id === slot)?.time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Способ передачи</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {pickupMethod === 'door' ? '🚪 За дверью' : '🤝 В руки'}
                        </p>
                      </div>
                    </div>
                    
                    {comment && (
                      <>
                        <div className="h-px bg-gray-200" />
                        
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Комментарий</p>
                            <p className="text-gray-900 text-base">{comment}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="h-px bg-gray-200" />
                  </>
                )}

                {/* SUBSCRIPTION DETAILS - only for monthly */}
                {tariffId === 'monthly' && (
                  <>
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <Package className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Детали подписки</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {bagsCount} пакет{bagsCount > 1 ? (bagsCount < 5 ? 'а' : 'ов') : ''} × {duration} дней
                        </p>
                        <p className="text-gray-600 text-sm mt-1">
                          Частота: {frequency === 'daily' ? 'Каждый день' : frequency === 'every_other_day' ? 'Через день' : '2 раза в неделю'}
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <Clock className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Дата и время</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {new Date(deliveryDate).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' })}
                        </p>
                        <p className="text-gray-900 font-semibold text-base mt-1">
                          {timeSlots.find((s) => s.id === slot)?.time}
                        </p>
                      </div>
                    </div>
                    
                    <div className="h-px bg-gray-200" />
                    
                    <div className="flex items-start gap-3">
                      <User className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                      <div className="flex-1">
                        <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Способ передачи</p>
                        <p className="text-gray-900 font-semibold text-base">
                          {pickupMethod === 'door' ? '🚪 За дверью' : '🤝 В руки'}
                        </p>
                      </div>
                    </div>
                    
                    {comment && (
                      <>
                        <div className="h-px bg-gray-200" />
                        
                        <div className="flex items-start gap-3">
                          <MessageSquare className="w-5 h-5 text-teal-600 mt-1 flex-shrink-0" />
                          <div className="flex-1">
                            <p className="text-gray-500 text-xs mb-1 font-medium uppercase tracking-wide">Комментарий</p>
                            <p className="text-gray-900 text-base">{comment}</p>
                          </div>
                        </div>
                      </>
                    )}
                    
                    <div className="h-px bg-gray-200" />
                  </>
                )}
                
                <div className="flex items-center justify-between bg-teal-50 p-4 rounded-xl border border-teal-200">
                  <span className="text-gray-700 font-semibold">Итого к оплате</span>
                  <span className="text-teal-600 font-bold text-3xl">
                    {(() => {
                      if (slot === 'urgent') return String(tariffPrices.single.urgent_price);
                      if (tariffId === 'single') return String(tariffPrices.single.price * bagsCount);
                      if (tariffId === 'trial') return String(tariffPrices.trial.price); // Fixed trial price from DB
                      if (tariffId === 'monthly') {
                        // Special price for first-time subscribers with trial-like parameters
                        const isTrialEquivalent = duration === 14 && frequency === 'every_other_day' && bagsCount === 1;
                        if (!hasSubscriptions && isTrialEquivalent) {
                          return String(tariffPrices.trial.price); // 199 руб - trial price
                        }
                        
                        // Dynamic calculation for monthly
                        const basePrice = tariffPrices.monthly.base_price; // From DB
                        const frequencyMultiplier = {
                          daily: 1,
                          every_other_day: 0.5,
                          twice_week: 2/7
                        };
                        const daysInPeriod = duration;
                        const pickupsCount = Math.ceil(daysInPeriod * frequencyMultiplier[frequency]);
                        const totalPrice = basePrice * pickupsCount * bagsCount;
                        const discount = duration >= 60 ? 0.3 : duration >= 30 ? 0.2 : duration >= 14 ? 0.1 : 0;
                        const discountedPrice = Math.round(totalPrice * (1 - discount));
                        return String(discountedPrice);
                      }
                      return String(tariffPrices.single.price);
                    })()} ₽
                  </span>
                </div>
              </div>
            </Card>

            {/* COMMENT FIELD - only for single orders */}
            {tariffId === 'single' && (
              <div className="space-y-2">
                <label className="text-gray-700 text-sm font-semibold ml-1 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-teal-600" />
                  Комментарий курьеру
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Например: позвонить перед приездом, оставить у двери"
                  className="w-full px-4 py-3 rounded-xl bg-white border-2 border-gray-200 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-500/20 outline-none transition-all resize-none"
                  rows={3}
                />
              </div>
            )}

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
                </div>
              </>
            )}
            
            {/* For subscriptions, show info */}
            {tariffId === 'trial' && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="text-teal-900 text-sm">
                  📅 Это пробный старт! После первого выноса подписка активируется автоматически на 2 недели (через день).
                </p>
              </div>
            )}
            {tariffId === 'monthly' && (
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-teal-600 shrink-0" />
                <p className="text-teal-900 text-sm">
                  🗓️ Вынос начнется с выбранной даты по расписанию {
                    frequency === 'daily' ? 'каждый день' :
                    frequency === 'twice_week' ? '2 раза в неделю' :
                    'через день'
                  }. Курьер заберёт мусор у двери.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom */}
      <div className="fixed bottom-0 left-0 right-0 p-5 pb-24 bg-gradient-to-t from-white via-white/95 to-transparent z-50 border-t border-gray-200">
        {/* Validation hint for TIME step only */}
        {step === 'time' && (!deliveryDate || !slot) && (
          <div className="mb-3 bg-orange-50 border-2 border-orange-300 rounded-xl p-3">
            <p className="text-orange-900 text-sm font-semibold text-center">
              {!deliveryDate && !slot ? '⚠️ Выберите дату и время' : !deliveryDate ? '⚠️ Выберите дату' : '⚠️ Выберите время'}
            </p>
          </div>
        )}

        <Button
          fullWidth
          onClick={next}
          disabled={((step === 'address' && (address.complexId === '0' || !address.building || !address.apartment)) || (step === 'time' && (!deliveryDate || !slot))) || loading}
          className={
            ((step === 'address' && (address.complexId === '0' || !address.building || !address.apartment)) || (step === 'time' && (!deliveryDate || !slot)))
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
