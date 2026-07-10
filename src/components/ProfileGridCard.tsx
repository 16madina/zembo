import { motion } from "framer-motion";
import { MapPin, BadgeCheck } from "lucide-react";
import { Profile } from "@/pages/Home";
import { useLanguage } from "@/contexts/LanguageContext";

interface ProfileGridCardProps {
  profile: Profile;
  onClick: (profile: Profile) => void;
  index?: number;
}

const ProfileGridCard = ({ profile, onClick, index = 0 }: ProfileGridCardProps) => {
  const { t } = useLanguage();
  return (
    <motion.button
      onClick={() => onClick(profile)}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.03, 0.3), duration: 0.25 }}
      whileTap={{ scale: 0.97 }}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted tap-highlight text-left group"
    >
      <img
        src={profile.photos[0]}
        alt={profile.name}
        loading="lazy"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      />
      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* Online badge */}
      {profile.isOnline && (
        <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/90 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          <span className="text-[10px] font-semibold text-white">
            {t.online ?? "En ligne"}
          </span>
        </div>
      )}

      {/* Verified badge */}
      {profile.isVerified && (
        <div className="absolute top-2 right-2 p-1 rounded-full bg-primary/90 backdrop-blur-sm">
          <BadgeCheck className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
      )}

      {/* Info */}
      <div className="absolute bottom-0 left-0 right-0 p-2.5 z-10">
        <div className="flex items-baseline gap-1 mb-0.5">
          <h3 className="font-bold text-white text-sm truncate drop-shadow">
            {profile.name}
          </h3>
          <span className="text-white/90 text-sm font-medium">{profile.age}</span>
        </div>
        {profile.location && (
          <div className="flex items-center gap-1 text-[10px] text-white/80">
            <MapPin className="w-2.5 h-2.5 flex-shrink-0" />
            <span className="truncate">{profile.distance || profile.location}</span>
          </div>
        )}
      </div>
    </motion.button>
  );
};

export default ProfileGridCard;
