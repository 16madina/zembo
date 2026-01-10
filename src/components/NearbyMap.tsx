import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X, MessageCircle, Heart, Shield, Loader2, MapPinOff } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Profile } from "@/data/mockProfiles";
import { useGeolocation } from "@/hooks/useGeolocation";

interface NearbyMapProps {
  profiles: Profile[];
  onProfileClick: (profile: Profile) => void;
}

// Fix for default marker icons in Leaflet with Vite
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

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

// Custom profile marker icon
const createProfileIcon = (photoUrl: string, isOnline: boolean, isVerified: boolean) => {
  return L.divIcon({
    className: "profile-marker",
    html: `
      <div class="relative group cursor-pointer transform transition-transform hover:scale-110">
        <div class="absolute inset-0 rounded-full ${isOnline ? 'bg-green-400/40' : 'bg-gray-400/20'} blur-md animate-pulse" style="width: 56px; height: 56px; margin-left: -8px; margin-top: -8px;"></div>
        <div class="relative w-10 h-10 rounded-full overflow-hidden border-2 ${isOnline ? 'border-green-400' : 'border-gray-400'} shadow-lg" style="box-shadow: ${isOnline ? '0 0 15px rgba(74, 222, 128, 0.4)' : '0 4px 12px rgba(0,0,0,0.3)'};">
          <img src="${photoUrl}" alt="Profile" class="w-full h-full object-cover" />
        </div>
        ${isOnline ? `
          <div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white">
            <div class="w-full h-full rounded-full bg-green-300 animate-pulse"></div>
          </div>
        ` : ''}
        ${isVerified ? `
          <div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
          </div>
        ` : ''}
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

// Map recenter component
const RecenterMap = ({ lat, lng }: { lat: number; lng: number }) => {
  const map = useMap();
  
  useEffect(() => {
    map.setView([lat, lng], map.getZoom());
  }, [lat, lng, map]);
  
  return null;
};

// Generate random positions near user location
const generateNearbyPositions = (
  userLat: number,
  userLng: number,
  profiles: Profile[]
): Record<string, { lat: number; lng: number }> => {
  const positions: Record<string, { lat: number; lng: number }> = {};
  
  profiles.forEach((profile, index) => {
    // Extract distance from profile (e.g., "2 km" -> 2)
    const distanceKm = parseFloat(profile.distance.replace(/[^0-9.]/g, "")) || 1;
    
    // Convert km to degrees (roughly)
    const latOffset = (Math.random() - 0.5) * (distanceKm / 55.5);
    const lngOffset = (Math.random() - 0.5) * (distanceKm / 55.5);
    
    positions[profile.id] = {
      lat: userLat + latOffset,
      lng: userLng + lngOffset,
    };
  });
  
  return positions;
};

const NearbyMap = ({ profiles, onProfileClick }: NearbyMapProps) => {
  const { latitude, longitude, loading, error, requestPosition } = useGeolocation();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profilePositions, setProfilePositions] = useState<Record<string, { lat: number; lng: number }>>({});
  
  const onlineProfiles = profiles.filter((p) => p.isOnline);
  const offlineProfiles = profiles.filter((p) => !p.isOnline);

  // Generate positions when user location is available
  useEffect(() => {
    if (latitude && longitude) {
      setProfilePositions(generateNearbyPositions(latitude, longitude, profiles));
    }
  }, [latitude, longitude, profiles]);

  const handleProfileAction = (profile: Profile) => {
    onProfileClick(profile);
    setSelectedProfile(null);
  };

  // Loading state
  if (loading) {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-strong flex flex-col items-center justify-center gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        >
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
        <p className="text-muted-foreground text-sm">Localisation en cours...</p>
      </div>
    );
  }

  // Error state
  if (error || !latitude || !longitude) {
    return (
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-strong flex flex-col items-center justify-center gap-4 p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/20 flex items-center justify-center">
          <MapPinOff className="w-8 h-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold text-foreground">
          Localisation indisponible
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {error || "Activez la géolocalisation pour voir les profils à proximité"}
        </p>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={requestPosition}
          className="px-6 py-2.5 btn-gold rounded-xl text-sm font-medium"
        >
          Réessayer
        </motion.button>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden">
      <MapContainer
        center={[latitude, longitude]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
        zoomControl={false}
        attributionControl={false}
      >
        {/* Custom dark map tiles */}
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          maxZoom={19}
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

        {/* Profile markers - Online first */}
        {[...onlineProfiles, ...offlineProfiles].map((profile) => {
          const position = profilePositions[profile.id];
          if (!position) return null;

          return (
            <Marker
              key={profile.id}
              position={[position.lat, position.lng]}
              icon={createProfileIcon(profile.photos[0], profile.isOnline, profile.isVerified)}
              eventHandlers={{
                click: () => setSelectedProfile(profile),
              }}
            />
          );
        })}
      </MapContainer>

      {/* Overlay UI */}
      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-4 left-4 glass rounded-xl p-3 z-[1000]"
      >
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
            <span className="text-foreground font-medium">{onlineProfiles.length} en ligne</span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-3 h-3 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">{offlineProfiles.length} hors ligne</span>
          </div>
        </div>
      </motion.div>

      {/* Recenter button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        whileTap={{ scale: 0.95 }}
        onClick={requestPosition}
        className="absolute top-4 right-4 p-3 glass rounded-xl z-[1000] hover:bg-white/10 transition-colors"
      >
        <Navigation className="w-5 h-5 text-primary" />
      </motion.button>

      {/* Profile popup */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-4 left-4 right-4 z-[1000]"
          >
            <div className="glass-strong rounded-2xl p-4 shadow-xl">
              <button
                onClick={() => setSelectedProfile(null)}
                className="absolute top-2 right-2 p-1.5 rounded-full glass hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3">
                <div className={`relative w-14 h-14 rounded-xl overflow-hidden border-2 ${selectedProfile.isOnline ? 'border-green-400' : 'border-gray-400'}`}>
                  <img
                    src={selectedProfile.photos[0]}
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                  {selectedProfile.isOnline && (
                    <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {selectedProfile.name}, {selectedProfile.age}
                    </h3>
                    {selectedProfile.isVerified && (
                      <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedProfile.distance}</span>
                    {selectedProfile.isOnline && (
                      <span className="text-green-400 font-medium ml-1">• En ligne</span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground line-clamp-2 mt-3">
                {selectedProfile.bio}
              </p>

              <div className="flex gap-2 mt-3">
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleProfileAction(selectedProfile)}
                  className="flex-1 py-2.5 rounded-xl btn-gold flex items-center justify-center gap-2 font-medium"
                >
                  <Heart className="w-4 h-4" />
                  <span>J'aime</span>
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleProfileAction(selectedProfile)}
                  className="flex-1 py-2.5 rounded-xl glass flex items-center justify-center gap-2 font-medium text-foreground"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Message</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NearbyMap;
