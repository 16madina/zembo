import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Waves, Navigation, X, MessageCircle, Heart, Shield } from "lucide-react";
import { Profile } from "@/data/mockProfiles";

interface NearbyMapProps {
  profiles: Profile[];
  onProfileClick: (profile: Profile) => void;
}

// Positions des utilisateurs sur la carte (simulées)
const userPositions: Record<string, { x: number; y: number }> = {
  "1": { x: 35, y: 25 },
  "2": { x: 72, y: 45 },
  "3": { x: 20, y: 60 },
  "4": { x: 55, y: 70 },
  "5": { x: 80, y: 20 },
};

const NearbyMap = ({ profiles, onProfileClick }: NearbyMapProps) => {
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const onlineProfiles = profiles.filter((p) => p.isOnline);

  const handlePinClick = (profile: Profile) => {
    setSelectedProfile(profile);
  };

  const handleClosePopup = () => {
    setSelectedProfile(null);
  };

  const handleProfileAction = (profile: Profile) => {
    onProfileClick(profile);
    setSelectedProfile(null);
  };

  return (
    <div className="relative w-full h-full rounded-3xl overflow-hidden">
      {/* Carte stylisée avec dégradé */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-400/30 via-cyan-500/20 to-blue-600/30" />
      
      {/* Motif de grille subtil */}
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)
          `,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Cercles de distance */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[1, 2, 3].map((ring) => (
          <motion.div
            key={ring}
            className="absolute rounded-full border border-white/10"
            style={{
              width: `${ring * 30}%`,
              height: `${ring * 30}%`,
            }}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: ring * 0.1 }}
          />
        ))}
      </div>

      {/* Effet d'eau/vagues animées */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-blue-500/20 to-transparent"
        animate={{ 
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        <Waves className="absolute bottom-4 left-1/4 w-12 h-12 text-blue-400/30" />
        <Waves className="absolute bottom-8 right-1/3 w-8 h-8 text-cyan-400/20" />
      </motion.div>

      {/* Indicateur de position centrale (vous) */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", delay: 0.3 }}
      >
        <div className="relative">
          {/* Pulse effect */}
          <motion.div
            className="absolute inset-0 rounded-full bg-primary/30"
            animate={{ 
              scale: [1, 2, 1],
              opacity: [0.6, 0, 0.6]
            }}
            transition={{ 
              duration: 2, 
              repeat: Infinity,
              ease: "easeOut"
            }}
            style={{ width: 40, height: 40, marginLeft: -8, marginTop: -8 }}
          />
          <div className="w-6 h-6 rounded-full bg-primary border-3 border-white shadow-lg shadow-primary/50 flex items-center justify-center">
            <Navigation className="w-3 h-3 text-primary-foreground" />
          </div>
        </div>
      </motion.div>

      {/* Pins des utilisateurs en ligne */}
      {onlineProfiles.map((profile, index) => {
        const position = userPositions[profile.id] || { x: 50, y: 50 };
        
        return (
          <motion.div
            key={profile.id}
            className="absolute cursor-pointer z-20"
            style={{
              left: `${position.x}%`,
              top: `${position.y}%`,
            }}
            initial={{ scale: 0, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ 
              type: "spring", 
              delay: 0.4 + index * 0.1,
              stiffness: 300,
              damping: 20
            }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => handlePinClick(profile)}
          >
            <div className="relative">
              {/* Glow effect */}
              <motion.div
                className="absolute inset-0 rounded-full bg-green-400/40 blur-md"
                animate={{ 
                  scale: [1, 1.3, 1],
                  opacity: [0.5, 0.8, 0.5]
                }}
                transition={{ 
                  duration: 2, 
                  repeat: Infinity,
                  delay: index * 0.3
                }}
                style={{ width: 56, height: 56, marginLeft: -8, marginTop: -8 }}
              />
              
              {/* Photo avec bordure */}
              <div className="relative w-10 h-10 rounded-full overflow-hidden border-2 border-green-400 shadow-lg shadow-green-400/30">
                <img
                  src={profile.photos[0]}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              
              {/* Online indicator */}
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-400 border-2 border-background">
                <motion.div
                  className="w-full h-full rounded-full bg-green-300"
                  animate={{ opacity: [1, 0.5, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>

              {/* Verified badge */}
              {profile.isVerified && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                  <Shield className="w-2.5 h-2.5 text-primary-foreground" />
                </div>
              )}
            </div>
          </motion.div>
        );
      })}

      {/* Popup de profil */}
      <AnimatePresence>
        {selectedProfile && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            className="absolute bottom-4 left-4 right-4 z-30"
          >
            <div className="glass-strong rounded-2xl p-4 shadow-xl">
              <button
                onClick={handleClosePopup}
                className="absolute top-2 right-2 p-1.5 rounded-full glass hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="flex items-center gap-3">
                <div className="relative w-14 h-14 rounded-xl overflow-hidden border-2 border-green-400">
                  <img
                    src={selectedProfile.photos[0]}
                    alt={selectedProfile.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0.5 right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-background" />
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
                    <span className="text-green-400 font-medium ml-1">• En ligne</span>
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

      {/* Légende */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.6 }}
        className="absolute top-4 left-4 glass rounded-xl p-3 z-10"
      >
        <div className="flex items-center gap-2 text-sm">
          <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
          <span className="text-foreground font-medium">{onlineProfiles.length} en ligne</span>
        </div>
      </motion.div>

      {/* Bouton de recentrage */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        whileTap={{ scale: 0.95 }}
        className="absolute top-4 right-4 p-3 glass rounded-xl z-10"
      >
        <Navigation className="w-5 h-5 text-primary" />
      </motion.button>
    </div>
  );
};

export default NearbyMap;
