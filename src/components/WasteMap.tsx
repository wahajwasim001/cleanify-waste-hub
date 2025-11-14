import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface WasteMapProps {
  locations: Array<{
    id: string;
    latitude: number;
    longitude: number;
    address?: string;
    status?: string;
    number_of_bags?: number;
  }>;
  center?: [number, number];
  zoom?: number;
}

function createCircleIcon(color: string) {
  return L.divIcon({
    className: 'custom-marker',
    html: `<span style="display:block;width:24px;height:24px;border-radius:50%;background:${color};border:3px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,0.2)"></span>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
}

const WasteMap: React.FC<WasteMapProps> = ({
  locations,
  center = [67.0011, 24.8607],
  zoom = 12,
}) => {
  // Leaflet expects [lat, lng]
  const mapCenter: [number, number] = [center[1], center[0]];

  const getMarkerColor = (status?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'assigned') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="w-full h-[400px]">
      {/* @ts-ignore - react-leaflet type definitions issue */}
      <MapContainer
        center={mapCenter}
        zoom={zoom}
        scrollWheelZoom={true}
        style={{ width: '100%', height: '100%', borderRadius: '0.5rem' }}
      >
        {/* @ts-ignore - react-leaflet type definitions issue */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {locations.map((location) => {
          if (!location.latitude || !location.longitude) return null;
          const pos: [number, number] = [location.latitude, location.longitude];
          const fill = getMarkerColor(location.status);

          return (
            // @ts-ignore - react-leaflet type definitions issue
            <Marker key={location.id} position={pos} icon={createCircleIcon(fill)}>
              <Popup>
                <div className="p-2">
                  <p className="font-bold mb-1">{location.address || 'Location'}</p>
                  {location.status && <p className="text-sm">Status: {location.status}</p>}
                  {location.number_of_bags && <p className="text-sm">Bags: {location.number_of_bags}</p>}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
};

export default WasteMap;
