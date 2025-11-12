import React, { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

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

const WasteMap: React.FC<WasteMapProps> = ({ 
  locations, 
  center = [67.0011, 24.8607], // Karachi, Pakistan
  zoom = 12 
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map
    mapboxgl.accessToken = 'pk.eyJ1IjoibG92YWJsZSIsImEiOiJjbTk5MnN4d2cwMDBwMm5xdnJrN2dsMWEyIn0.yUlEqnJt4L4HsSGWXwjE-g';
    
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center: center,
      zoom: zoom,
    });

    // Add navigation controls
    map.current.addControl(
      new mapboxgl.NavigationControl(),
      'top-right'
    );

    // Cleanup
    return () => {
      markersRef.current.forEach(marker => marker.remove());
      map.current?.remove();
    };
  }, []);

  useEffect(() => {
    if (!map.current) return;

    // Remove existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    locations.forEach(location => {
      if (!location.latitude || !location.longitude) return;

      const el = document.createElement('div');
      el.className = 'custom-marker';
      el.style.width = '30px';
      el.style.height = '30px';
      el.style.borderRadius = '50%';
      el.style.cursor = 'pointer';
      
      // Color based on status
      if (location.status === 'completed') {
        el.style.backgroundColor = '#22c55e';
      } else if (location.status === 'assigned') {
        el.style.backgroundColor = '#f59e0b';
      } else {
        el.style.backgroundColor = '#3b82f6';
      }
      
      el.style.border = '3px solid white';
      el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div style="padding: 8px;">
          <p style="font-weight: bold; margin: 0 0 4px 0;">${location.address || 'Location'}</p>
          ${location.status ? `<p style="margin: 0; font-size: 12px;">Status: ${location.status}</p>` : ''}
          ${location.number_of_bags ? `<p style="margin: 0; font-size: 12px;">Bags: ${location.number_of_bags}</p>` : ''}
        </div>
      `);

      const marker = new mapboxgl.Marker(el)
        .setLngLat([location.longitude, location.latitude])
        .setPopup(popup)
        .addTo(map.current!);

      markersRef.current.push(marker);
    });

    // Fit map to markers if multiple locations
    if (locations.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      locations.forEach(loc => {
        if (loc.latitude && loc.longitude) {
          bounds.extend([loc.longitude, loc.latitude]);
        }
      });
      map.current.fitBounds(bounds, { padding: 50 });
    } else if (locations.length === 1 && locations[0].latitude && locations[0].longitude) {
      map.current.flyTo({
        center: [locations[0].longitude, locations[0].latitude],
        zoom: 14
      });
    }
  }, [locations]);

  return (
    <div ref={mapContainer} className="w-full h-[400px] rounded-lg shadow-lg" />
  );
};

export default WasteMap;
