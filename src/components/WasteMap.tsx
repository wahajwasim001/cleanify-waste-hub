import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Workaround for TS prop typing variance across react-leaflet versions
const AnyMapContainer = MapContainer as any;
const AnyTileLayer = TileLayer as any;
const AnyMarker = Marker as any;

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

// Switched to OpenStreetMap + Leaflet (no API key required)
const WasteMap: React.FC<WasteMapProps> = ({
  locations,
  center = [67.0011, 24.8607], // Karachi, Pakistan (lng, lat)
  zoom = 12,
}) => {
  // Leaflet expects [lat, lng]
  const mapCenter = useMemo(() => [center[1], center[0]] as [number, number], [center]);

  const getMarkerColor = (status?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'assigned') return '#f59e0b';
    return '#3b82f6';
  };

  return (
    <div className="w-full">
      <AnyMapContainer
        center={mapCenter}
        zoom={zoom}
        style={{ width: '100%', height: '400px', borderRadius: '0.5rem' }}
      >
        <AnyTileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />

        {locations.map((location) => {
          if (!location.latitude || !location.longitude) return null;
          const pos: [number, number] = [location.latitude, location.longitude];
          const fill = getMarkerColor(location.status);

          return (
            <AnyMarker key={location.id} position={pos} icon={createCircleIcon(fill)}>
              <Popup>
                <div className="p-2">
                  <p className="font-bold mb-1">{location.address || 'Location'}</p>
                  {location.status && <p className="text-sm">Status: {location.status}</p>}
                  {location.number_of_bags && <p className="text-sm">Bags: {location.number_of_bags}</p>}
                </div>
              </Popup>
            </AnyMarker>
          );
        })}
      </AnyMapContainer>
    </div>
  );
};

export default WasteMap;
