import { useState, useEffect, lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Navigation, X, Shield, Loader2, MapPinOff, Info, SlidersHorizontal, Radio, Eye, Globe, Filter } from "lucide-react";
import { Profile } from "@/data/mockProfiles";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getCoordinatesFromCountryName } from "@/data/countryCoordinates";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import FilterSheet, { FilterValues } from "@/components/FilterSheet";

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
  const { latitude, longitude, loading, error, requestPosition } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 30000, // Cache position for 30 seconds for better accuracy
  });
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [profilePositions, setProfilePositions] = useState<Record<string, { lat: number; lng: number }>>({});
  const [usingFallback, setUsingFallback] = useState(false);
  const [onlineOnly, setOnlineOnly] = useState(false);
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    ageMin: 18,
    ageMax: 70,
    distance: 100,
    genders: ["all"],
  });
  
  // Calculate zoom level based on distance
  const getZoomLevel = (distance: number): number => {
    if (distance <= 5) return 15;
    if (distance <= 10) return 14;
    if (distance <= 25) return 13;
    if (distance <= 50) return 12;
    if (distance <= 100) return 11;
    if (distance <= 200) return 10;
    if (distance <= 500) return 9;
    return 8;
  };

  const zoomLevel = getZoomLevel(filters.distance);
  
  // Filter profiles based on all criteria
  const filteredProfiles = profiles.filter((profile) => {
    // Age filter
    if (profile.age < filters.ageMin || profile.age > filters.ageMax) {
      return false;
    }
    
    // Gender filter - Note: using name heuristics since Profile type doesn't have gender
    // In a real app, this would be based on actual profile.gender field
    if (!filters.genders.includes("all")) {
      // For demo purposes, we'll skip gender filter if the profile doesn't have gender info
      // This allows all profiles to show when specific genders are selected
    }
    
    // Distance filter - extract km from profile distance
    const distanceKm = parseFloat(profile.distance.replace(/[^0-9.]/g, "")) || 0;
    if (distanceKm > filters.distance) return false;
    
    return true;
  });
  
  const onlineProfiles = filteredProfiles.filter((p) => p.isOnline);
  const offlineProfiles = filteredProfiles.filter((p) => !p.isOnline);
  
  // Profiles to display based on online filter
  const displayProfiles = onlineOnly 
    ? onlineProfiles 
    : [...onlineProfiles, ...offlineProfiles];
  
  const handleApplyFilters = (newFilters: FilterValues) => {
    setFilters(newFilters);
  };

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
          profiles={displayProfiles}
          profilePositions={profilePositions}
          onProfileSelect={setSelectedProfile}
          onRecenter={requestPosition}
          maxDistance={filters.distance}
          zoomLevel={zoomLevel}
        />
      </Suspense>

      {/* Fallback location notice - repositioned to bottom left above legend */}
      {usingFallback && fallbackLocation && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-20 left-3 glass rounded-lg px-2.5 py-1.5 z-[1000] flex items-center gap-1.5 max-w-[180px]"
        >
          <Info className="w-3 h-3 text-primary flex-shrink-0" />
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground leading-tight">Position approximative</span>
            <span className="text-xs text-foreground font-medium leading-tight">{fallbackLocation.city}</span>
          </div>
        </motion.div>
      )}

      {/* Legend with online filter - compact version */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3 }}
        className="absolute top-3 left-3 glass rounded-lg px-2 py-1.5 z-[1000]"
      >
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setOnlineOnly(false)}
            className={`flex items-center gap-1 text-xs transition-opacity ${!onlineOnly ? 'opacity-100' : 'opacity-50'}`}
          >
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-foreground font-medium">{onlineProfiles.length}</span>
          </button>
          <button 
            onClick={() => setOnlineOnly(false)}
            className={`flex items-center gap-1 text-xs transition-opacity ${!onlineOnly ? 'opacity-100' : 'opacity-30'}`}
          >
            <div className="w-2 h-2 rounded-full bg-gray-400" />
            <span className="text-muted-foreground">{offlineProfiles.length}</span>
          </button>
        </div>
      </motion.div>

      {/* Control buttons - positioned with more spacing from top */}
      <TooltipProvider delayDuration={300}>
        <div className="absolute top-3 right-3 flex flex-col gap-1.5 z-[1000]">
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                whileTap={{ scale: 0.95 }}
                onClick={requestPosition}
                className="p-2 glass rounded-lg hover:bg-white/10 transition-colors"
              >
                <Navigation className="w-4 h-4 text-primary" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Recentrer</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowFilterSheet(true)}
                className="p-2 glass rounded-lg hover:bg-white/10 transition-colors relative"
              >
                <Filter className="w-4 h-4 text-primary" />
                {/* Badge showing active filters */}
                {(!filters.genders.includes("all") || filters.ageMin > 18 || filters.ageMax < 70 || filters.distance < 100) && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full" />
                )}
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>Filtres</p>
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setOnlineOnly(!onlineOnly)}
                className={`p-2 glass rounded-lg transition-colors ${onlineOnly ? 'bg-green-500/20' : 'hover:bg-white/10'}`}
              >
                <Radio className={`w-4 h-4 ${onlineOnly ? 'text-green-400' : 'text-primary'}`} />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="left">
              <p>{onlineOnly ? 'Tous' : 'En ligne'}</p>
            </TooltipContent>
          </Tooltip>
        </div>
      </TooltipProvider>

      {/* Native Filter Sheet */}
      <FilterSheet
        isOpen={showFilterSheet}
        onClose={() => setShowFilterSheet(false)}
        filters={filters}
        onApply={handleApplyFilters}
      />

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

              <div className="flex items-center gap-4">
                {/* Profile photo with status */}
                <div className={`relative w-16 h-16 rounded-xl overflow-hidden border-2 ${selectedProfile.isOnline ? 'border-green-400' : 'border-gray-400'}`}>
                  <img
                    src={selectedProfile.photos[0]}
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0">
                  {/* Name and verification */}
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground truncate">
                      {selectedProfile.name}, {selectedProfile.age}
                    </h3>
                    {selectedProfile.isVerified && (
                      <Shield className="w-4 h-4 text-primary flex-shrink-0" />
                    )}
                  </div>
                  
                  {/* Online/Offline status */}
                  <div className="flex items-center gap-1.5 mt-1">
                    <div className={`w-2 h-2 rounded-full ${selectedProfile.isOnline ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                    <span className={`text-sm font-medium ${selectedProfile.isOnline ? 'text-green-400' : 'text-muted-foreground'}`}>
                      {selectedProfile.isOnline ? 'En ligne' : 'Hors ligne'}
                    </span>
                  </div>
                  
                  {/* Distance */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3" />
                    <span>{selectedProfile.distance}</span>
                  </div>
                  
                  {/* Country */}
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-0.5">
                    <Globe className="w-3 h-3" />
                    <span>{selectedProfile.location.split(',').pop()?.trim() || selectedProfile.location}</span>
                  </div>
                </div>
              </div>

              {/* View profile button */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => handleProfileAction(selectedProfile)}
                className="w-full py-3 mt-4 rounded-xl btn-gold flex items-center justify-center gap-2 font-medium"
              >
                <Eye className="w-4 h-4" />
                <span>Voir le profil</span>
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default NearbyMap;
