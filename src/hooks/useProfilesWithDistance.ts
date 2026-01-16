import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "./useGeolocation";

export interface ProfileWithDistance {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  location: string;
  distance: string;
  distanceKm: number;
  bio: string;
  photos: string[];
  isOnline: boolean;
  isVerified: boolean;
  interests: string[];
  latitude?: number | null;
  longitude?: number | null;
}

interface UseProfilesWithDistanceOptions {
  pageSize?: number;
  maxDistance?: number;
  ageMin?: number;
  ageMax?: number;
  genders?: string[];
}

// Haversine formula to calculate distance between two coordinates
const calculateDistanceKm = (
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const formatDistance = (km: number): string => {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
};

export const useProfilesWithDistance = (options: UseProfilesWithDistanceOptions = {}) => {
  const { pageSize = 10, maxDistance = 500, ageMin = 18, ageMax = 99, genders = ["all"] } = options;
  
  const { user } = useAuth();
  const { latitude: userLat, longitude: userLng } = useGeolocation();
  
  const [profiles, setProfiles] = useState<ProfileWithDistance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const pageRef = useRef(0);
  const allProfilesRef = useRef<ProfileWithDistance[]>([]);

  // Update user's location in database
  useEffect(() => {
    const updateUserLocation = async () => {
      if (!user || userLat === null || userLng === null) return;
      
      try {
        await supabase
          .from("profiles")
          .update({ latitude: userLat, longitude: userLng })
          .eq("user_id", user.id);
      } catch (err) {
        console.error("Error updating user location:", err);
      }
    };
    
    updateUserLocation();
  }, [user, userLat, userLng]);

  // Fetch and process profiles
  const fetchProfiles = useCallback(async (reset = false) => {
    if (!user) return;
    
    if (reset) {
      pageRef.current = 0;
      allProfilesRef.current = [];
      setProfiles([]);
      setHasMore(true);
    }
    
    const isInitialLoad = pageRef.current === 0;
    if (isInitialLoad) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    
    try {
      // Build query
      let query = supabase
        .from("profiles")
        .select("*")
        .neq("user_id", user.id)
        .not("avatar_url", "is", null)
        .not("display_name", "is", null);
      
      // Apply age filters
      if (ageMin > 18) {
        query = query.gte("age", ageMin);
      }
      if (ageMax < 99) {
        query = query.lte("age", ageMax);
      }
      
      // Apply gender filter
      if (!genders.includes("all") && genders.length > 0) {
        const genderFilter = genders.map(g => g === "male" ? "homme" : g === "female" ? "femme" : g);
        query = query.in("gender", genderFilter);
      }
      
      // Paginate - fetch more than needed to allow for distance filtering
      const from = pageRef.current * pageSize * 2;
      const to = from + pageSize * 2 - 1;
      query = query.range(from, to);
      
      const { data, error: fetchError } = await query;
      
      if (fetchError) {
        setError(fetchError.message);
        return;
      }
      
      if (!data || data.length === 0) {
        setHasMore(false);
        return;
      }
      
      // Transform and calculate distances
      const transformedProfiles: ProfileWithDistance[] = await Promise.all(
        data.map(async (p) => {
          let distanceKm = 9999;
          
          // Calculate real distance if both have coordinates
          if (userLat !== null && userLng !== null && p.latitude && p.longitude) {
            distanceKm = calculateDistanceKm(userLat, userLng, p.latitude, p.longitude);
          }
          
          // Fetch all photos from storage for this user
          let photos: string[] = [];
          try {
            const { data: photoFiles } = await supabase.storage
              .from("profile-photos")
              .list(p.user_id);
            
            if (photoFiles && photoFiles.length > 0) {
              photos = photoFiles
                .filter(file => !file.name.startsWith('.'))
                .map((file) => {
                  const { data: { publicUrl } } = supabase.storage
                    .from("profile-photos")
                    .getPublicUrl(`${p.user_id}/${file.name}`);
                  return publicUrl;
                });
            }
          } catch (err) {
            console.error("Error fetching photos for user:", p.user_id, err);
          }
          
          // Fallback to avatar_url if no photos in storage
          if (photos.length === 0 && p.avatar_url) {
            photos = [p.avatar_url];
          }
          
          return {
            id: p.user_id,
            name: p.display_name || "Utilisateur",
            age: p.age || 25,
            gender: (p.gender === "homme" ? "male" : p.gender === "femme" ? "female" : "female") as 'male' | 'female',
            location: p.location || "Non spécifié",
            distance: distanceKm < 9999 ? formatDistance(distanceKm) : "Distance inconnue",
            distanceKm,
            bio: p.bio || "",
            photos,
            isOnline: p.is_online || false,
            isVerified: p.is_verified || false,
            interests: p.interests || [],
            latitude: p.latitude,
            longitude: p.longitude,
          };
        })
      );
      
      // Filter by max distance (only if we have user coordinates)
      const filteredByDistance = userLat !== null && userLng !== null
        ? transformedProfiles.filter(p => p.distanceKm <= maxDistance)
        : transformedProfiles;
      
      // Sort by distance (closest first)
      filteredByDistance.sort((a, b) => a.distanceKm - b.distanceKm);
      
      // Merge with existing profiles, avoiding duplicates
      const existingIds = new Set(allProfilesRef.current.map(p => p.id));
      const newProfiles = filteredByDistance.filter(p => !existingIds.has(p.id));
      
      allProfilesRef.current = [...allProfilesRef.current, ...newProfiles];
      
      // Re-sort the entire list
      allProfilesRef.current.sort((a, b) => a.distanceKm - b.distanceKm);
      
      // Get the next page of profiles
      const startIdx = pageRef.current * pageSize;
      const endIdx = startIdx + pageSize;
      const pageProfiles = allProfilesRef.current.slice(0, endIdx);
      
      setProfiles(pageProfiles);
      pageRef.current += 1;
      
      // Check if we have more to load
      if (data.length < pageSize * 2 && pageProfiles.length >= allProfilesRef.current.length) {
        setHasMore(false);
      }
      
    } catch (err) {
      console.error("Error fetching profiles:", err);
      setError("Erreur lors du chargement des profils");
    } finally {
      setIsLoading(false);
      setIsLoadingMore(false);
    }
  }, [user, userLat, userLng, pageSize, maxDistance, ageMin, ageMax, genders]);

  // Track if initial fetch has been done to prevent constant refetching
  const hasFetchedRef = useRef(false);
  const lastParamsRef = useRef<string>("");
  const geoReadyRef = useRef(false);

  // Get geolocation loading status
  const { loading: geoLoading } = useGeolocation();

  // Initial fetch - fetch profiles even without GPS, refetch when filters change or GPS becomes available
  useEffect(() => {
    // Create a stable params key for comparison
    const paramsKey = `${maxDistance}-${ageMin}-${ageMax}-${JSON.stringify(genders)}`;
    const coordsReady = userLat !== null && userLng !== null;
    const geoFinished = !geoLoading; // Geo has finished attempting (success or error)
    
    // Fetch on first load when:
    // 1. Geo finished (either got coords or gave up) AND we have a user
    // 2. Or when filters change
    if (!hasFetchedRef.current && geoFinished && user) {
      hasFetchedRef.current = true;
      lastParamsRef.current = paramsKey;
      geoReadyRef.current = coordsReady;
      fetchProfiles(true);
    } else if (hasFetchedRef.current && paramsKey !== lastParamsRef.current) {
      // Filters changed, refetch
      lastParamsRef.current = paramsKey;
      fetchProfiles(true);
    } else if (hasFetchedRef.current && coordsReady && !geoReadyRef.current) {
      // GPS became available after initial fetch without coords, refetch to calculate distances
      geoReadyRef.current = true;
      fetchProfiles(true);
    }
  }, [user, userLat, userLng, geoLoading, maxDistance, ageMin, ageMax, JSON.stringify(genders), fetchProfiles]);

  const loadMore = useCallback(() => {
    if (!isLoading && !isLoadingMore && hasMore) {
      fetchProfiles(false);
    }
  }, [isLoading, isLoadingMore, hasMore, fetchProfiles]);

  const refresh = useCallback(() => {
    fetchProfiles(true);
  }, [fetchProfiles]);

  return {
    profiles,
    isLoading,
    isLoadingMore,
    hasMore,
    error,
    loadMore,
    refresh,
    userLocation: { latitude: userLat, longitude: userLng },
  };
};
