import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Profile } from "@/data/mockProfiles";

// Fix for default marker icons in Leaflet with Vite
// (Guarded to avoid issues in dev/HMR and double-initialization scenarios.)
let leafletDefaultIconsConfigured = false;
const configureLeafletDefaultIcons = () => {
  if (leafletDefaultIconsConfigured) return;
  leafletDefaultIconsConfigured = true;

  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
    iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
    shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
  });
};
configureLeafletDefaultIcons();

interface LeafletMapProps {
  latitude: number;
  longitude: number;
  profiles: Profile[];
  profilePositions: Record<string, { lat: number; lng: number }>;
  onProfileSelect: (profile: Profile) => void;
  onRecenter: () => void;
  maxDistance?: number;
}

// Calculate distance between two coordinates in km
const calculateDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Format distance for display
const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

// Custom user marker icon
const createUserIcon = () => {
  return L.divIcon({
    className: "user-location-marker",
    html: `
      <div class="relative">
        <div class="absolute inset-0 rounded-full bg-primary/30 animate-ping" style="width: 40px; height: 40px; margin-left: -8px; margin-top: -8px;"></div>
        <div class="w-6 h-6 rounded-full bg-primary border-3 border-white shadow-lg flex items-center justify-center" style="box-shadow: 0 0 20px rgba(202, 138, 4, 0.5);">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12,2 19,21 12,17 5,21" />
          </svg>
        </div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

// Custom profile marker icon - smaller and with distance
const createProfileIcon = (photoUrl: string, isOnline: boolean, isVerified: boolean, distance: string) => {
  return L.divIcon({
    className: "profile-marker",
    html: `
      <div class="relative group cursor-pointer transform transition-transform hover:scale-110">
        <div class="relative w-8 h-8 rounded-full overflow-hidden border-2 ${isOnline ? 'border-green-400' : 'border-gray-400/60'} shadow-md">
          <img src="${photoUrl}" alt="Profile" class="w-full h-full object-cover" />
        </div>
        ${isOnline ? `
          <div class="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border border-white"></div>
        ` : ''}
        ${isVerified ? `
          <div class="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center">
            <svg width="7" height="7" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        ` : ''}
        <div class="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white text-[9px] px-1 py-0.5 rounded whitespace-nowrap">
          ${distance}
        </div>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    popupAnchor: [0, -16],
  });
};

// Map recenter component
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();

  useEffect(() => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

    let cancelled = false;

    map.whenReady(() => {
      if (cancelled) return;
      // Avoid animation to reduce jank and potential race conditions.
      map.setView([lat, lng], map.getZoom(), { animate: false });
    });

    return () => {
      cancelled = true;
    };
  }, [lat, lng, map]);

  return null;
};

const LeafletMap = ({ 
  latitude, 
  longitude, 
  profiles, 
  profilePositions, 
  onProfileSelect,
  maxDistance = 100
}: LeafletMapProps) => {
  // Filter profiles by distance
  const filteredProfiles = profiles.filter((profile) => {
    const position = profilePositions[profile.id];
    if (!position) return false;
    const distance = calculateDistance(latitude, longitude, position.lat, position.lng);
    return distance <= maxDistance;
  });
  return (
    <MapContainer
      center={[latitude, longitude]}
      zoom={14}
      style={{ height: "100%", width: "100%" }}
      zoomControl={false}
      attributionControl={false}
    >
      {/* Colorful OpenStreetMap tiles */}
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        maxZoom={19}
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Recenter on user location */}
      <RecenterMap lat={latitude} lng={longitude} />

      {/* Distance circles */}
      <Circle
        center={[latitude, longitude]}
        radius={500}
        pathOptions={{
          color: "rgba(202, 138, 4, 0.3)",
          fillColor: "rgba(202, 138, 4, 0.05)",
          fillOpacity: 0.5,
          weight: 1,
        }}
      />
      <Circle
        center={[latitude, longitude]}
        radius={1000}
        pathOptions={{
          color: "rgba(202, 138, 4, 0.2)",
          fillColor: "transparent",
          weight: 1,
          dashArray: "5, 10",
        }}
      />
      <Circle
        center={[latitude, longitude]}
        radius={2000}
        pathOptions={{
          color: "rgba(202, 138, 4, 0.1)",
          fillColor: "transparent",
          weight: 1,
          dashArray: "5, 10",
        }}
      />

      {/* User location marker */}
      <Marker position={[latitude, longitude]} icon={createUserIcon()}>
        <Popup className="custom-popup">
          <div className="text-center p-1">
            <p className="font-semibold text-foreground">Vous êtes ici</p>
          </div>
        </Popup>
      </Marker>

      {/* Profile markers */}
      {filteredProfiles.map((profile) => {
        const position = profilePositions[profile.id];
        if (!position) return null;

        const distance = calculateDistance(latitude, longitude, position.lat, position.lng);
        const distanceStr = formatDistance(distance);

        return (
          <Marker
            key={profile.id}
            position={[position.lat, position.lng]}
            icon={createProfileIcon(profile.photos[0], profile.isOnline, profile.isVerified, distanceStr)}
            eventHandlers={{
              click: () => onProfileSelect(profile),
            }}
          />
        );
      })}
    </MapContainer>
  );
};

export default LeafletMap;
