import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X, MessageCircle, Heart, Shield, Loader2, MapPinOff, Info, SlidersHorizontal } from "lucide-react";
import { Profile } from "@/data/mockProfiles";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getCoordinatesFromCountryName } from "@/data/countryCoordinates";
import { Slider } from "@/components/ui/slider";

interface NearbyMapProps {
  profiles: Profile[];
  onProfileClick: (profile: Profile) => void;
  userCountry?: string | null;
}

// Lazy load the map component to avoid SSR issues with Leaflet
const LeafletMap = lazy(() => import("./LeafletMap"));

// Generate random positions near user location
const generateNearbyPositions = (
  userLat: number,
  userLng: number,
  profiles: Profile[]
): Record<string, { lat: number; lng: number }> => {
  const positions: Record<string, { lat: number; lng: number }> = {};
  
  profiles.forEach((profile) => {
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

const NearbyMap = ({ profiles, onProfileClick, userCountry }: NearbyMapProps) => {
  const { latitude, longitude, loading, error, requestPosition } = useGeolocation();
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profilePositions, setProfilePositions] = useState<Record<string, { lat: number; lng: number }>>({});
  const [usingFallback, setUsingFallback] = useState(false);
  const [maxDistance, setMaxDistance] = useState(50);
  const [showDistanceFilter, setShowDistanceFilter] = useState(false);
  
  const onlineProfiles = profiles.filter((p) => p.isOnline);
  const offlineProfiles = profiles.filter((p) => !p.isOnline);

  // Get fallback coordinates from user's country
  const fallbackLocation = userCountry ? getCoordinatesFromCountryName(userCountry) : null;

  // Determine actual position to use
  const hasRealLocation = latitude !== null && longitude !== null && !error;
  const effectiveLat: number | null = hasRealLocation ? latitude : (fallbackLocation?.lat ?? null);
  const effectiveLng: number | null = hasRealLocation ? longitude : (fallbackLocation?.lng ?? null);

  // Generate positions when location is available
  useEffect(() => {
    if (effectiveLat !== null && effectiveLng !== null && Number.isFinite(effectiveLat) && Number.isFinite(effectiveLng)) {
      setProfilePositions(generateNearbyPositions(effectiveLat, effectiveLng, profiles));
      setUsingFallback(!hasRealLocation);
    }
  }, [effectiveLat, effectiveLng, profiles, hasRealLocation]);

  const handleProfileAction = (profile: Profile) => {
    onProfileClick(profile);
    setSelectedProfile(null);
  };

  // Loading state (only when no fallback available)
  if (loading && !fallbackLocation) {
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

  // Error state only if no fallback location available
  if (effectiveLat === null || effectiveLng === null) {
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
      <Suspense fallback={
        <div className="w-full h-full flex items-center justify-center glass-strong">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      }>
        <LeafletMap
          latitude={effectiveLat}
          longitude={effectiveLng}
          profiles={[...onlineProfiles, ...offlineProfiles]}
          profilePositions={profilePositions}
          onProfileSelect={setSelectedProfile}
          onRecenter={requestPosition}
          maxDistance={maxDistance}
        />
      </Suspense>

      {/* Fallback location notice */}
      {usingFallback && fallbackLocation && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute top-4 left-1/2 -translate-x-1/2 glass rounded-xl px-3 py-2 z-[1000] flex items-center gap-2"
        >
          <Info className="w-4 h-4 text-primary" />
          <span className="text-xs text-foreground">
            Position approximative : {fallbackLocation.city}
          </span>
          <button
            onClick={requestPosition}
            className="text-xs text-primary font-medium hover:underline"
          >
            Activer GPS
          </button>
        </motion.div>
      )}

      {/* Overlay UI */}
      {/* Legend */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className={`absolute ${usingFallback ? 'top-16' : 'top-4'} left-4 glass rounded-xl p-3 z-[1000]`}
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

      {/* Control buttons */}
      <div className="absolute top-4 right-4 flex flex-col gap-2 z-[1000]">
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.95 }}
          onClick={requestPosition}
          className="p-2.5 glass rounded-xl hover:bg-white/10 transition-colors"
        >
          <Navigation className="w-4 h-4 text-primary" />
        </motion.button>
        <motion.button
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowDistanceFilter(!showDistanceFilter)}
          className={`p-2.5 glass rounded-xl transition-colors ${showDistanceFilter ? 'bg-primary/20' : 'hover:bg-white/10'}`}
        >
          <SlidersHorizontal className="w-4 h-4 text-primary" />
        </motion.button>
      </div>

      {/* Distance filter popup */}
      <AnimatePresence>
        {showDistanceFilter && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-4 right-16 glass rounded-xl p-3 z-[1000] w-48"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-foreground">Distance</span>
              <span className="text-xs text-primary font-semibold">{maxDistance} km</span>
            </div>
            <Slider
              value={[maxDistance]}
              onValueChange={(values) => setMaxDistance(values[0])}
              min={1}
              max={100}
              step={1}
              className="w-full"
            />
          </motion.div>
        )}
      </AnimatePresence>

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
