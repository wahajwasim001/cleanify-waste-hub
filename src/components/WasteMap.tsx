import React, { useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { useState } from 'react';

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

// Read Google Maps API key from env (public VITE_ var)
// Create VITE_GOOGLE_MAPS_API_KEY via the prompt below
const GOOGLE_MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string) || '';

const WasteMap: React.FC<WasteMapProps> = ({ 
  locations, 
  center = [67.0011, 24.8607], // Karachi, Pakistan (lng, lat)
  zoom = 12 
}) => {
  const [selectedMarker, setSelectedMarker] = useState<string | null>(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: GOOGLE_MAPS_API_KEY
  });

  const mapCenter = useMemo(() => ({
    lat: center[1],
    lng: center[0]
  }), [center]);

  const mapContainerStyle = {
    width: '100%',
    height: '400px',
    borderRadius: '0.5rem'
  };

  const getMarkerColor = (status?: string) => {
    if (status === 'completed') return '#22c55e';
    if (status === 'assigned') return '#f59e0b';
    return '#3b82f6';
  };

  if (!GOOGLE_MAPS_API_KEY) {
    return (
      <div className="w-full h-[400px] rounded-lg shadow-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Google Maps API key missing. Add VITE_GOOGLE_MAPS_API_KEY to enable the map.</p>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] rounded-lg shadow-lg bg-muted flex items-center justify-center">
        <p className="text-muted-foreground">Loading map...</p>
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      center={mapCenter}
      zoom={zoom}
      options={{
        zoomControl: true,
        streetViewControl: false,
        mapTypeControl: false,
        fullscreenControl: true,
      }}
    >
      {locations.map((location) => {
        if (!location.latitude || !location.longitude) return null;

        return (
          <React.Fragment key={location.id}>
            <Marker
              position={{
                lat: location.latitude,
                lng: location.longitude
              }}
              onClick={() => setSelectedMarker(location.id)}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: getMarkerColor(location.status),
                fillOpacity: 1,
                strokeColor: '#ffffff',
                strokeWeight: 3,
                scale: 12,
              }}
            />
            {selectedMarker === location.id && (
              <InfoWindow
                position={{
                  lat: location.latitude,
                  lng: location.longitude
                }}
                onCloseClick={() => setSelectedMarker(null)}
              >
                <div className="p-2">
                  <p className="font-bold mb-1">{location.address || 'Location'}</p>
                  {location.status && (
                    <p className="text-sm">Status: {location.status}</p>
                  )}
                  {location.number_of_bags && (
                    <p className="text-sm">Bags: {location.number_of_bags}</p>
                  )}
                </div>
              </InfoWindow>
            )}
          </React.Fragment>
        );
      })}
    </GoogleMap>
  );
};

export default WasteMap;
