import React, { useEffect, useMemo, useRef } from 'react';
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
  center?: [number, number]; // [lng, lat]
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
  center = [67.0011, 24.8607], // Karachi, Pakistan (lng, lat)
  zoom = 12,
}) => {
  const mapEl = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  const mapCenter = useMemo<[number, number]>(() => [center[1], center[0]], [center]);

  const getMarkerColor = (status?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'assigned') return '#f59e0b';
    return '#3b82f6';
  };

  // Initialize map once
  useEffect(() => {
    if (!mapEl.current) return;
    if (mapRef.current) return; // already initialized (avoid double init in StrictMode)

    const map = L.map(mapEl.current, {
      zoomControl: true,
      attributionControl: true,
    }).setView(mapCenter, zoom);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    const layer = L.layerGroup().addTo(map);

    mapRef.current = map;
    markersLayerRef.current = layer;

    return () => {
      map.remove();
      mapRef.current = null;
      markersLayerRef.current = null;
    };
  }, []);

  // Update view if center/zoom change
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.setView(mapCenter, zoom);
  }, [mapCenter, zoom]);

  // Render markers when locations change
  useEffect(() => {
    if (!markersLayerRef.current) return;
    const layer = markersLayerRef.current;
    layer.clearLayers();

    locations.forEach((loc) => {
      if (!loc.latitude || !loc.longitude) return;
      const pos: [number, number] = [loc.latitude, loc.longitude];
      const color = getMarkerColor(loc.status);

      const marker = L.marker(pos, { icon: createCircleIcon(color) });

      const popupHtml = `
        <div style="padding: 6px 4px;">
          <div style="font-weight:600;margin-bottom:4px;">${loc.address || 'Location'}</div>
          ${loc.status ? `<div style="font-size:12px;">Status: ${loc.status}</div>` : ''}
          ${loc.number_of_bags ? `<div style="font-size:12px;">Bags: ${loc.number_of_bags}</div>` : ''}
        </div>
      `;

      marker.bindPopup(popupHtml);
      marker.addTo(layer);
    });
  }, [locations]);

  return (
    <div className="w-full" style={{ height: '400px', borderRadius: '0.5rem', overflow: 'hidden' }}>
      <div ref={mapEl} style={{ width: '100%', height: '100%' }} />
    </div>
  );
};

export default WasteMap;
