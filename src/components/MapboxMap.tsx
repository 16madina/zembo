import { useEffect, useMemo, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Profile } from "@/data/mockProfiles";

const MAPBOX_TOKEN: string | undefined = import.meta.env.VITE_MAPBOX_TOKEN;

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());
  const userMarkerRef = useRef<mapboxgl.Marker | null>(null);

  const canRender = useMemo(
    () => Number.isFinite(latitude) && Number.isFinite(longitude) && !!MAPBOX_TOKEN,
    [latitude, longitude]
  );

  // Init map once
  useEffect(() => {
    if (!canRender) return;
    if (!containerRef.current) return;
    if (mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN as string;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [longitude, latitude],
      zoom: 14,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "bottom-right");

    mapRef.current = map;

    return () => {
      markersRef.current.forEach((m) => m.remove());
      markersRef.current.clear();
      userMarkerRef.current?.remove();
      userMarkerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [canRender, latitude, longitude]);

  // Recenter when user position changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;

    map.flyTo({ center: [longitude, latitude], duration: 800 });
  }, [latitude, longitude]);

  // User marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    userMarkerRef.current?.remove();

    const el = document.createElement("div");
    el.className = "relative";
    el.innerHTML = `
      <div class="absolute inset-0 w-10 h-10 -m-2 rounded-full bg-primary/30 animate-ping"></div>
      <div class="w-6 h-6 rounded-full bg-primary border-[3px] border-white shadow-lg flex items-center justify-center" style="box-shadow: 0 0 20px rgba(202, 138, 4, 0.5);">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polygon points="12,2 19,21 12,17 5,21"></polygon>
        </svg>
      </div>
    `;

    userMarkerRef.current = new mapboxgl.Marker({ element: el, anchor: "center" })
      .setLngLat([longitude, latitude])
      .addTo(map);
  }, [latitude, longitude]);

  // Profile markers
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Clear + rebuild (simple + reliable)
    markersRef.current.forEach((m) => m.remove());
    markersRef.current.clear();

    profiles.forEach((profile) => {
      const pos = profilePositions[profile.id];
      if (!pos) return;

      const wrapper = document.createElement("div");
      wrapper.className = "relative cursor-pointer transform transition-transform hover:scale-110";

      const glowClass = profile.isOnline ? "bg-green-400/40" : "bg-gray-400/20";
      const borderClass = profile.isOnline ? "border-green-400" : "border-gray-400";
      const boxShadow = profile.isOnline
        ? "0 0 15px rgba(74, 222, 128, 0.4)"
        : "0 4px 12px rgba(0,0,0,0.3)";

      wrapper.innerHTML = `
        <div class="absolute inset-0 w-14 h-14 -m-2 rounded-full blur-md animate-pulse ${glowClass}"></div>
        <div class="relative w-10 h-10 rounded-full overflow-hidden border-2 shadow-lg ${borderClass}" style="box-shadow: ${boxShadow};">
          <img src="${profile.photos[0]}" alt="${profile.name}" class="w-full h-full object-cover" />
        </div>
        ${
          profile.isOnline
            ? `<div class="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-white"><div class="w-full h-full rounded-full bg-green-300 animate-pulse"></div></div>`
            : ""
        }
        ${
          profile.isVerified
            ? `<div class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-amber-500 flex items-center justify-center"><svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none"><path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" /></svg></div>`
            : ""
        }
      `;

      wrapper.addEventListener("click", (e) => {
        e.stopPropagation();
        onProfileSelect(profile);
      });

      const marker = new mapboxgl.Marker({ element: wrapper, anchor: "center" })
        .setLngLat([pos.lng, pos.lat])
        .addTo(map);

      markersRef.current.set(profile.id, marker);
    });
  }, [profiles, profilePositions, onProfileSelect]);

  if (!MAPBOX_TOKEN) {
    return (
      <div className="w-full h-full flex items-center justify-center glass-strong">
        <p className="text-sm text-muted-foreground">Token Mapbox manquant.</p>
      </div>
    );
  }

  return <div ref={containerRef} className="w-full h-full" />;
};

export default MapboxMap;

