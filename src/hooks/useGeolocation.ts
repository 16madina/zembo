import { useState, useEffect, useCallback, useRef } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  error: string | null;
  loading: boolean;
}

interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

const defaultOptions: UseGeolocationOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 60000, // Cache position for 1 minute
};

// Round coordinates to 4 decimal places (~11m precision) to avoid constant updates
const roundCoord = (coord: number): number => Math.round(coord * 10000) / 10000;

export const useGeolocation = (options: UseGeolocationOptions = {}) => {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    error: null,
    loading: true,
  });

  // Track last stable coordinates to prevent unnecessary updates
  const lastCoordsRef = useRef<{ lat: number | null; lng: number | null }>({
    lat: null,
    lng: null,
  });

  const mergedOptions = { ...defaultOptions, ...options };

  const updatePosition = useCallback((position: GeolocationPosition) => {
    const newLat = roundCoord(position.coords.latitude);
    const newLng = roundCoord(position.coords.longitude);
    
    // Only update state if coordinates have meaningfully changed
    if (
      lastCoordsRef.current.lat === newLat &&
      lastCoordsRef.current.lng === newLng
    ) {
      // Coordinates haven't changed significantly, skip update
      return;
    }
    
    lastCoordsRef.current = { lat: newLat, lng: newLng };
    
    setState({
      latitude: newLat,
      longitude: newLng,
      accuracy: position.coords.accuracy,
      error: null,
      loading: false,
    });
  }, []);

  const handleError = useCallback((error: GeolocationPositionError) => {
    let errorMessage = "Impossible d'obtenir votre position";
    
    switch (error.code) {
      case error.PERMISSION_DENIED:
        errorMessage = "Accès à la localisation refusé";
        break;
      case error.POSITION_UNAVAILABLE:
        errorMessage = "Position non disponible";
        break;
      case error.TIMEOUT:
        errorMessage = "Délai d'attente dépassé";
        break;
    }
    
    setState((prev) => ({
      ...prev,
      error: errorMessage,
      loading: false,
    }));
  }, []);

  const requestPosition = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "La géolocalisation n'est pas supportée",
        loading: false,
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      updatePosition,
      handleError,
      mergedOptions
    );
  }, [updatePosition, handleError, mergedOptions]);

  useEffect(() => {
    requestPosition();

    // Watch position for updates (with stabilization to prevent constant re-renders)
    const watchId = navigator.geolocation?.watchPosition(
      updatePosition,
      handleError,
      mergedOptions
    );

    return () => {
      if (watchId !== undefined) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return {
    ...state,
    requestPosition,
  };
};
