'use client';

import { useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  initialLat?: number;
  initialLon?: number;
  onLocationSelect: (lat: number, lon: number, address: string) => void;
  onClose: () => void;
  embedded?: boolean;
}

function LocationMarker({ initialPosition, onLocationSelect }: { initialPosition: [number, number]; onLocationSelect: (lat: number, lon: number) => void }) {
  const [position, setPosition] = useState<[number, number]>(initialPosition);

  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      setPosition([lat, lng]);
      onLocationSelect(lat, lng);
    },
  });

  return <Marker position={position} />;
}

export function MapPicker({ initialLat = 55.7558, initialLon = 37.6173, onLocationSelect, onClose, embedded = false }: MapPickerProps) {
  const [loading, setLoading] = useState(false);
  const [currentAddress, setCurrentAddress] = useState('');

  console.log('[MAP] Rendering MapPicker', { initialLat, initialLon, embedded });

  const handleLocationSelect = async (lat: number, lon: number) => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&accept-language=ru`,
        {
          headers: {
            'User-Agent': 'YaUberu-App/1.0'
          }
        }
      );

      if (!response.ok) throw new Error('Geocoding failed');

      const data = await response.json();
      const addr = data.address || {};
      const street = addr.road || addr.street || '';
      const house = addr.house_number || '';
      const fullAddress = `${street}${house ? ', д. ' + house : ''}`;
      
      setCurrentAddress(fullAddress);
      onLocationSelect(lat, lon, fullAddress);
    } catch (error) {
      console.error('[MAP] Geocoding error:', error);
      setCurrentAddress(`${lat.toFixed(6)}, ${lon.toFixed(6)}`);
    } finally {
      setLoading(false);
    }
  };

  // Embedded режим - просто карта
  if (embedded) {
    return (
      <div className="w-full h-full relative bg-teal-950/20">
        <MapContainer
          center={[initialLat, initialLon]}
          zoom={16}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
          scrollWheelZoom={true}
          key={`${initialLat}-${initialLon}`}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <LocationMarker 
            initialPosition={[initialLat, initialLon]}
            onLocationSelect={handleLocationSelect} 
          />
        </MapContainer>
        {currentAddress && (
          <div className="absolute top-2 left-2 right-2 z-[1000] bg-teal-950/95 backdrop-blur-sm px-3 py-2 rounded-xl border border-teal-600/30">
            <p className="text-teal-400 text-xs font-medium">
              {loading ? '🔄 Определяю адрес...' : `📌 ${currentAddress}`}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Модальный режим - полный интерфейс
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="bg-zinc-900 rounded-2xl overflow-hidden max-w-2xl w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="p-4 bg-teal-950/50 border-b border-teal-800/30">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-white font-bold text-lg">📍 Укажите точное место</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>
          {currentAddress && (
            <p className="text-teal-400 text-sm">
              {loading ? '🔄 Определяю адрес...' : `📌 ${currentAddress}`}
            </p>
          )}
          <p className="text-gray-500 text-xs mt-1">Нажмите на карту или перетащите маркер</p>
        </div>

        {/* Map */}
        <div className="flex-1 relative">
          <MapContainer
            center={[initialLat, initialLon]}
            zoom={16}
            style={{ height: '100%', width: '100%' }}
            className="z-0"
            scrollWheelZoom={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
              initialPosition={[initialLat, initialLon]}
              onLocationSelect={handleLocationSelect} 
            />
          </MapContainer>
        </div>

        {/* Footer */}
        <div className="p-4 bg-teal-950/50 border-t border-teal-800/30">
          <button
            onClick={onClose}
            disabled={!currentAddress}
            className="w-full py-3 px-4 bg-teal-600 hover:bg-teal-500 disabled:bg-gray-700 disabled:text-gray-500 text-white font-bold rounded-xl transition-all"
          >
            {currentAddress ? '✓ Выбрать этот адрес' : 'Нажмите на карту'}
          </button>
        </div>
      </div>
    </div>
  );
}

