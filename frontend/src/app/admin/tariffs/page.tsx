'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { ArrowLeft, Edit, DollarSign, Save } from 'lucide-react';

export default function TariffsAdminPage() {
  const router = useRouter();
  const [tariffs, setTariffs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTariff, setEditingTariff] = useState<any>(null);
  const [form, setForm] = useState<any>({});

  const loadTariffs = async () => {
    setLoading(true);
    try {
      const data = await api.getTariffs();
      setTariffs(data);
    } catch (error) {
      console.error(error);
      alert('Ошибка загрузки тарифов');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTariffs();
  }, []);

  const startEdit = (tariff: any) => {
    setEditingTariff(tariff);
    setForm({
      name: tariff.name,
      price: tariff.price,
      old_price: tariff.old_price || '',
      period: tariff.period || '',
      description: tariff.description,
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTariff) return;
    
    try {
      await api.updateTariff(editingTariff.tariff_id, {
        name: form.name,
        price: parseInt(form.price, 10),
        old_price: form.old_price ? parseInt(form.old_price, 10) : null,
        period: form.period || null,
        description: form.description,
      });
      setEditingTariff(null);
      loadTariffs();
    } catch (error) {
      alert('Ошибка сохранения');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0f1714] text-white flex items-center justify-center">
        <p>Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0f1714] text-white p-6 pb-20">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => router.back()}
          className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center hover:bg-gray-700 transition"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Управление тарифами</h1>
          <p className="text-gray-500 text-sm">Редактируйте цены и описания</p>
        </div>
      </div>

      {/* Tariffs List */}
      <div className="space-y-4">
        {tariffs.map((tariff) => (
          <div key={tariff.id} className="bg-gray-800/30 p-5 rounded-xl border border-gray-800">
            {editingTariff?.id === tariff.id ? (
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">Название</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Цена (₽)</label>
                    <input
                      type="number"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-400 mb-2">Старая цена (₽)</label>
                    <input
                      type="number"
                      value={form.old_price}
                      onChange={(e) => setForm({ ...form, old_price: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3"
                      placeholder="Необязательно"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Период</label>
                  <input
                    type="text"
                    value={form.period}
                    onChange={(e) => setForm({ ...form, period: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3"
                    placeholder="Например: 2 недели"
                  />
                </div>

                <div>
                  <label className="block text-sm text-gray-400 mb-2">Описание</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-gray-800 border border-gray-700 text-white rounded-lg p-3 resize-none"
                    rows={3}
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="submit"
                    className="flex-1 bg-teal-600 text-white py-3 rounded-lg font-medium hover:bg-teal-500 flex items-center justify-center gap-2"
                  >
                    <Save className="w-4 h-4" />
                    Сохранить
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingTariff(null)}
                    className="flex-1 bg-gray-700 text-white py-3 rounded-lg font-medium hover:bg-gray-600"
                  >
                    Отмена
                  </button>
                </div>
              </form>
            ) : (
              <div>
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-white">{tariff.name}</h3>
                    <p className="text-gray-400 text-sm mt-1">{tariff.description}</p>
                  </div>
                  <button
                    onClick={() => startEdit(tariff)}
                    className="p-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-4 h-4 text-teal-500" />
                    <span className="text-white font-bold">{tariff.price} ₽</span>
                    {tariff.old_price && (
                      <span className="text-gray-500 line-through">{tariff.old_price} ₽</span>
                    )}
                  </div>
                  {tariff.period && (
                    <span className="text-gray-400">• {tariff.period}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

