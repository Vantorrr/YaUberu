'use client';

import { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix default marker icon issue with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapPickerProps {
  center: { lat: number; lon: number };
  onLocationSelect: (lat: number, lon: number, address: string) => void;
}

function LocationMarker({ onLocationSelect }: { onLocationSelect: (lat: number, lon: number, address: string) => void }) {
  const [position, setPosition] = useState<L.LatLng | null>(null);
  const [loading, setLoading] = useState(false);

  const map = useMapEvents({
    click(e) {
      setPosition(e.latlng);
      setLoading(true);
      
      // Geocode the clicked location using OpenStreetMap Nominatim
      fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${e.latlng.lat}&lon=${e.latlng.lng}&accept-language=ru&addressdetails=1`)
        .then(res => res.json())
        .then(data => {
          console.log('[MAP] Geocoded:', data);
          
          const addr = data.address || {};
          
          // Extract street (улица)
          let street = addr.road || addr.street || addr.pedestrian || addr.cycleway || addr.footway || '';
          
          // Extract building number (номер дома)
          let building = addr.house_number || '';
          
          // Build full address string for display
          let fullAddress = '';
          if (street && building) {
            fullAddress = `${street}, ${building}`;
          } else if (street) {
            fullAddress = street;
          } else if (data.display_name) {
            // Fallback to display_name and try to parse it
            const parts = data.display_name.split(',');
            if (parts.length > 0) {
              fullAddress = parts[0].trim();
              // Try to extract building from first part
              const buildingMatch = fullAddress.match(/\b(\d+[а-яА-Яa-zA-Z\/\-]*)\b/);
              if (buildingMatch) {
                building = buildingMatch[1];
                street = fullAddress.replace(buildingMatch[0], '').replace(/,/g, '').trim();
              } else {
                street = fullAddress;
              }
            }
          }
          
          if (!fullAddress) {
            fullAddress = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
          }
          
          onLocationSelect(e.latlng.lat, e.latlng.lng, fullAddress);
          setLoading(false);
        })
        .catch(err => {
          console.error('[MAP] Geocoding error:', err);
          const fallbackAddress = `${e.latlng.lat.toFixed(6)}, ${e.latlng.lng.toFixed(6)}`;
          onLocationSelect(e.latlng.lat, e.latlng.lng, fallbackAddress);
          setLoading(false);
        });
    },
  });

  return position === null ? null : (
    <Marker position={position}>
      {loading && <div>Загрузка...</div>}
    </Marker>
  );
}

export default function MapPicker({ center, onLocationSelect }: MapPickerProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] rounded-2xl bg-teal-950/20 border-2 border-teal-700/50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-6 h-6 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-teal-400 text-sm font-medium">Загрузка карты...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      <MapContainer
        center={[center.lat, center.lon]}
        zoom={16}
        scrollWheelZoom={true}
        style={{ height: '400px', width: '100%', borderRadius: '1rem', zIndex: 0 }}
        className="rounded-2xl border-2 border-teal-700/50"
        attributionControl={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <LocationMarker onLocationSelect={onLocationSelect} />
      </MapContainer>
      
      <div className="absolute top-3 left-3 bg-teal-900/90 backdrop-blur-sm text-white text-xs px-3 py-2 rounded-lg z-[1000] pointer-events-none shadow-lg">
        👆 Нажмите на карту для выбора адреса
      </div>
    </div>
  );
}
