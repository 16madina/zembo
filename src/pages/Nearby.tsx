import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import { MapPin, Users, Loader2, Navigation, RefreshCw } from "lucide-react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import BottomNavigation from "@/components/BottomNavigation";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface OnlineUser {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
  is_online: boolean | null;
  is_verified: boolean | null;
  // Simulated coordinates for demo (in real app, store in DB)
  lat: number;
  lng: number;
}

// Custom marker icon for online users
const createUserIcon = (avatarUrl: string | null, isOnline: boolean) => {
  const markerHtml = `
    <div class="relative">
      <div class="w-12 h-12 rounded-full border-3 ${isOnline ? 'border-green-500' : 'border-gray-400'} overflow-hidden bg-background shadow-lg">
        <img src="${avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}" 
             class="w-full h-full object-cover" 
             onerror="this.src='https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'" />
      </div>
      ${isOnline ? '<div class="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>' : ''}
    </div>
  `;
  
  return L.divIcon({
    html: markerHtml,
    className: 'custom-user-marker',
    iconSize: [48, 48],
    iconAnchor: [24, 48],
    popupAnchor: [0, -48],
  });
};

// My location marker
const myLocationIcon = L.divIcon({
  html: `
    <div class="relative">
      <div class="w-6 h-6 bg-primary rounded-full border-3 border-white shadow-lg animate-pulse"></div>
      <div class="absolute inset-0 w-6 h-6 bg-primary/30 rounded-full animate-ping"></div>
    </div>
  `,
  className: 'my-location-marker',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to recenter map
const RecenterMap = ({ position }: { position: [number, number] }) => {
  const map = useMap();
  
  const handleRecenter = () => {
    map.flyTo(position, 14, { duration: 1 });
  };
  
  return (
    <Button
      onClick={handleRecenter}
      size="icon"
      className="absolute bottom-24 right-4 z-[1000] bg-background/90 backdrop-blur-sm shadow-lg hover:bg-background"
    >
      <Navigation className="w-5 h-5 text-primary" />
    </Button>
  );
};

const Nearby = () => {
  const { user } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [myPosition, setMyPosition] = useState<[number, number]>([48.8566, 2.3522]); // Default: Paris
  const [locationError, setLocationError] = useState<string | null>(null);

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMyPosition([position.coords.latitude, position.coords.longitude]);
          setLocationError(null);
        },
        (error) => {
          console.error("Geolocation error:", error);
          setLocationError("Impossible d'obtenir votre position. Vérifiez les permissions.");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
      );
    } else {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
    }
  }, []);

  // Fetch online users
  useEffect(() => {
    const fetchOnlineUsers = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, is_online, is_verified")
          .eq("is_online", true)
          .neq("user_id", user?.id || "")
          .limit(50);

        if (error) throw error;

        // Add simulated coordinates around user's position for demo
        const usersWithCoords: OnlineUser[] = (data || []).map((profile, index) => ({
          ...profile,
          lat: myPosition[0] + (Math.random() - 0.5) * 0.05,
          lng: myPosition[1] + (Math.random() - 0.5) * 0.05,
        }));

        setOnlineUsers(usersWithCoords);
      } catch (error) {
        console.error("Error fetching online users:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOnlineUsers();
  }, [user?.id, myPosition]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, is_online, is_verified")
        .eq("is_online", true)
        .neq("user_id", user?.id || "")
        .limit(50);

      if (error) throw error;

      const usersWithCoords: OnlineUser[] = (data || []).map((profile) => ({
        ...profile,
        lat: myPosition[0] + (Math.random() - 0.5) * 0.05,
        lng: myPosition[1] + (Math.random() - 0.5) * 0.05,
      }));

      setOnlineUsers(usersWithCoords);
    } catch (error) {
      console.error("Error refreshing:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-28 flex flex-col bg-background">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-40 glass-strong px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Proximité</h1>
              <p className="text-xs text-muted-foreground">Utilisateurs près de vous</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-500/20 text-green-400">
              <Users className="w-4 h-4" />
              <span className="text-sm font-medium">{onlineUsers.length} en ligne</span>
            </div>
            <Button
              onClick={handleRefresh}
              size="icon"
              variant="ghost"
              disabled={isLoading}
              className="rounded-full"
            >
              <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </motion.header>

      {/* Map Container */}
      <div className="flex-1 relative">
        {locationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-4 left-4 right-4 z-[1000] bg-destructive/90 text-destructive-foreground px-4 py-3 rounded-xl text-sm"
          >
            {locationError}
          </motion.div>
        )}

        {isLoading && onlineUsers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center h-[calc(100vh-200px)]">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-muted-foreground">Chargement de la carte...</p>
            </div>
          </div>
        ) : (
          <MapContainer
            center={myPosition}
            zoom={14}
            className="h-[calc(100vh-180px)] w-full"
            style={{ background: 'hsl(var(--background))' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* My location marker */}
            <Marker position={myPosition} icon={myLocationIcon}>
              <Popup className="custom-popup">
                <div className="text-center p-2">
                  <p className="font-semibold text-foreground">Ma position</p>
                </div>
              </Popup>
            </Marker>

            {/* Online users markers */}
            {onlineUsers.map((userProfile) => (
              <Marker
                key={userProfile.id}
                position={[userProfile.lat, userProfile.lng]}
                icon={createUserIcon(userProfile.avatar_url, userProfile.is_online || false)}
              >
                <Popup className="custom-popup">
                  <div className="flex flex-col items-center gap-2 p-2 min-w-[120px]">
                    <img
                      src={userProfile.avatar_url || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop'}
                      alt={userProfile.display_name || 'Utilisateur'}
                      className="w-16 h-16 rounded-full object-cover border-2 border-primary"
                    />
                    <div className="text-center">
                      <p className="font-semibold text-foreground">{userProfile.display_name || 'Utilisateur'}</p>
                      <div className="flex items-center justify-center gap-1 mt-1">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs text-green-500">En ligne</span>
                      </div>
                      {userProfile.is_verified && (
                        <span className="text-xs text-primary">✓ Vérifié</span>
                      )}
                    </div>
                    <Button size="sm" className="w-full mt-2 bg-gradient-to-r from-pink-500 to-rose-500">
                      Voir le profil
                    </Button>
                  </div>
                </Popup>
              </Marker>
            ))}

            <RecenterMap position={myPosition} />
          </MapContainer>
        )}
      </div>

      <BottomNavigation />

      {/* Custom styles for markers */}
      <style>{`
        .custom-user-marker {
          background: transparent !important;
          border: none !important;
        }
        .my-location-marker {
          background: transparent !important;
          border: none !important;
        }
        .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          border-radius: 16px;
          border: 1px solid hsl(var(--border));
          box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        }
        .leaflet-popup-tip {
          background: hsl(var(--card));
        }
        .leaflet-popup-content {
          margin: 8px;
        }
        .leaflet-container {
          font-family: inherit;
        }
      `}</style>
    </div>
  );
};

export default Nearby;