import { useRef, useEffect, useCallback } from "react";
import Map, { Marker, NavigationControl, GeolocateControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Profile } from "@/data/mockProfiles";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN;

interface MapboxMapProps {
  latitude: number;
  longitude: number;
  profiles: Profile[];
  profilePositions: Record<string, { lat: number; lng: number }>;
  onProfileSelect: (profile: Profile) => void;
  onRecenter: () => void;
}

const MapboxMap = ({
  latitude,
  longitude,
  profiles,
  profilePositions,
  onProfileSelect,
}: MapboxMapProps) => {
  const mapRef = useRef<any>(null);

  // Recenter map when user position changes
  useEffect(() => {
    if (mapRef.current && Number.isFinite(latitude) && Number.isFinite(longitude)) {
      mapRef.current.flyTo({
        center: [longitude, latitude],
        duration: 1000,
      });
    }
  }, [latitude, longitude]);

  return (
    <Map
      ref={mapRef}
      initialViewState={{
        longitude: longitude,
        latitude: latitude,
        zoom: 14,
      }}
      style={{ width: "100%", height: "100%" }}
      mapStyle="mapbox://styles/mapbox/dark-v11"
      mapboxAccessToken={MAPBOX_TOKEN}
      attributionControl={false}
    >
      {/* Navigation controls */}
      <NavigationControl position="bottom-right" showCompass={false} />
      
      {/* Geolocate control */}
      <GeolocateControl
        position="bottom-right"
        trackUserLocation
        showUserHeading
      />

      {/* User location marker */}
      <Marker longitude={longitude} latitude={latitude} anchor="center">
        <div className="relative">
          <div className="absolute inset-0 w-10 h-10 -m-2 rounded-full bg-primary/30 animate-ping" />
          <div 
            className="w-6 h-6 rounded-full bg-primary border-[3px] border-white shadow-lg flex items-center justify-center"
            style={{ boxShadow: "0 0 20px rgba(202, 138, 4, 0.5)" }}
          >
            <svg 
              width="12" 
              height="12" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="white" 
              strokeWidth="3" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <polygon points="12,2 19,21 12,17 5,21" />
            </svg>
          </div>
        </div>
      </Marker>

      {/* Profile markers */}
      {profiles.map((profile) => {
        const position = profilePositions[profile.id];
        if (!position) return null;

        return (
          <Marker
            key={profile.id}
            longitude={position.lng}
            latitude={position.lat}
            anchor="center"
            onClick={(e) => {
              e.originalEvent.stopPropagation();
              onProfileSelect(profile);
            }}
          >
            <div className="relative cursor-pointer transform transition-transform hover:scale-110">
              {/* Glow effect */}
              <div 
                className={`absolute inset-0 w-14 h-14 -m-2 rounded-full blur-md animate-pulse ${
                  profile.isOnline ? 'bg-green-400/40' : 'bg-gray-400/20'
                }`} 
              />
              
              {/* Profile image */}
              <div 
                className={`relative w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg ${
                  profile.isOnline ? 'border-green-400' : 'border-gray-400'
                }`}
                style={{ 
                  boxShadow: profile.isOnline 
                    ? '0 0 15px rgba(74, 222, 128, 0.4)' 
                    : '0 4px 12px rgba(0,0,0,0.3)' 
                }}
              >
                <img 
                  src={profile.photos[0]} 
                  alt={profile.name}
                  className="w-full h-full object-cover" 
                />
              </div>

              {/* Online indicator */}
              {profile.isOnline && (
                <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white">
                  <div className="w-full h-full rounded-full bg-green-300 animate-pulse" />
                </div>
              )}

              {/* Verified badge */}
              {profile.isVerified && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
                  <svg 
                    width="10" 
                    height="10" 
                    viewBox="0 0 24 24" 
                    fill="white" 
                    stroke="none"
                  >
                    <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                  </svg>
                </div>
              )}
            </div>
          </Marker>
        );
      })}
    </Map>
  );
};

export default MapboxMap;
