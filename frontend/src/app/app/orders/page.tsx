'use client';

import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Calendar, Clock, MapPin, Pencil, CheckCircle, Plus } from 'lucide-react';

const upcoming = [
  { id: 1, day: 'Завтра', date: '20 декабря', time: '08:00 — 10:00', address: 'ЖК Маяк, д. 2к4, кв. 45' },
  { id: 2, day: 'Воскресенье', date: '22 декабря', time: '12:00 — 14:00', address: 'ЖК Маяк, д. 2к4, кв. 45' },
  { id: 3, day: 'Вторник', date: '24 декабря', time: '08:00 — 10:00', address: 'ЖК Маяк, д. 2к4, кв. 45' },
];

const history = [
  { id: 101, date: '18 декабря', time: '08:00', bags: 1 },
  { id: 102, date: '16 декабря', time: '12:00', bags: 2 },
  { id: 103, date: '14 декабря', time: '08:00', bags: 1 },
];

export default function OrdersPage() {
  return (
    <div className="px-5 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Мои заказы</h1>
        <p className="text-gray-500 text-sm mt-1">Управляйте расписанием</p>
      </div>

      {/* Upcoming */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
          Предстоящие
        </h2>
        <div className="space-y-3">
          {upcoming.map((order) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-semibold text-lg">{order.day}</p>
                    <p className="text-gray-500 text-sm">{order.date}</p>
                  </div>
                </div>
                <button className="p-2 rounded-lg bg-emerald-900/50 text-emerald-400 hover:bg-emerald-900">
                  <Pencil className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <Clock className="w-4 h-4 text-emerald-500" />
                  <span>{order.time}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-400 text-sm">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  <span>{order.address}</span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Add button */}
      <div>
        <Button variant="secondary" fullWidth>
          <Plus className="w-5 h-5" />
          Внеплановый вынос
        </Button>
        <p className="text-center text-gray-600 text-xs mt-2">Будет списан 1 кредит</p>
      </div>

      {/* History */}
      <div>
        <h2 className="text-sm font-semibold text-emerald-500 uppercase tracking-wider mb-3">
          История
        </h2>
        <div className="bg-emerald-950/30 rounded-2xl border border-emerald-800/20 overflow-hidden">
          {history.map((order, i) => (
            <div 
              key={order.id} 
              className={`flex items-center justify-between p-4 ${i !== history.length - 1 ? 'border-b border-emerald-800/20' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-900/50 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{order.date}</p>
                  <p className="text-gray-500 text-xs">{order.time}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-white text-sm font-medium">{order.bags} пакет</p>
                <p className="text-green-500 text-xs font-semibold">Выполнен</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
