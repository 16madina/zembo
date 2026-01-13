import { motion } from "framer-motion";
import { Users, Play, Sparkles, Crown, Star } from "lucide-react";
import type { Live } from "@/hooks/useLives";

interface LiveCardProps {
  live: Live & { isPremium?: boolean; isVip?: boolean };
  onClick?: () => void;
}

const LiveCard = ({ live, onClick }: LiveCardProps) => {
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.streamer_id}`;
  const defaultThumbnail = `https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop`;

  return (
    <motion.div
      whileHover={{ scale: 1.03, y: -8 }}
      whileTap={{ scale: 0.97 }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="group relative rounded-2xl overflow-hidden cursor-pointer"
      onClick={onClick}
    >
      {/* Glow effect on hover */}
      <div className="absolute -inset-1 bg-gradient-to-r from-primary via-primary/50 to-primary rounded-2xl opacity-0 group-hover:opacity-75 blur-xl transition-opacity duration-500 z-0" />
      
      {/* Card container */}
      <div className="relative z-10 rounded-2xl overflow-hidden bg-card border border-border/50 group-hover:border-primary/50 transition-colors duration-300">
        {/* Thumbnail */}
        <div className="relative aspect-[4/5] overflow-hidden">
          <motion.img
            src={live.thumbnail_url || defaultThumbnail}
            alt={live.title}
            className="w-full h-full object-cover"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
          
          {/* Animated overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
          
          {/* Shimmer effect */}
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out" />
          </div>

          {/* Live Badge - Animated */}
          <motion.div 
            className="absolute top-3 left-3 flex items-center gap-1.5 px-3 py-1.5 bg-destructive rounded-full shadow-lg shadow-destructive/30"
            animate={{ 
              boxShadow: [
                "0 4px 15px rgba(239, 68, 68, 0.3)",
                "0 4px 25px rgba(239, 68, 68, 0.6)",
                "0 4px 15px rgba(239, 68, 68, 0.3)"
              ]
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="relative w-2 h-2">
              <span className="absolute inset-0 bg-white rounded-full animate-ping" />
              <span className="relative block w-2 h-2 bg-white rounded-full" />
            </span>
            <span className="text-xs font-bold text-white tracking-wider">LIVE</span>
          </motion.div>

          {/* Premium/VIP Badge */}
          {(live.isPremium || live.isVip) && (
            <motion.div 
              className={`absolute top-3 right-3 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-md border ${
                live.isVip 
                  ? "bg-gradient-to-r from-primary/90 to-yellow-500/90 border-primary/50" 
                  : "bg-purple-500/90 border-purple-400/50"
              }`}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
            >
              {live.isVip ? (
                <Star className="w-3 h-3 text-white fill-white" />
              ) : (
                <Crown className="w-3 h-3 text-white" />
              )}
              <span className="text-[10px] font-bold text-white">
                {live.isVip ? "VIP" : "PREMIUM"}
              </span>
            </motion.div>
          )}

          {/* Viewers - Enhanced */}
          <motion.div 
            className={`absolute ${(live.isPremium || live.isVip) ? "top-12" : "top-3"} right-3 flex items-center gap-1.5 px-2.5 py-1.5 bg-background/80 backdrop-blur-md rounded-full border border-border/50`}
            whileHover={{ scale: 1.1 }}
          >
            <Users className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-foreground">
              {live.viewer_count}
            </span>
          </motion.div>

          {/* Play button overlay on hover */}
          <motion.div 
            className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            initial={{ scale: 0.8 }}
            whileHover={{ scale: 1 }}
          >
            <motion.div 
              className="w-16 h-16 rounded-full bg-primary/90 backdrop-blur-sm flex items-center justify-center shadow-2xl shadow-primary/50"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-7 h-7 text-primary-foreground fill-primary-foreground ml-1" />
            </motion.div>
          </motion.div>

          {/* Streamer Info - Enhanced */}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <div className="flex items-center gap-3 mb-2">
              {/* Avatar with glow */}
              <div className="relative">
                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-primary/50 rounded-full opacity-75 blur-sm group-hover:opacity-100 transition-opacity" />
                <img
                  src={live.streamer?.avatar_url || defaultAvatar}
                  alt={live.streamer?.display_name || "Streamer"}
                  className="relative w-10 h-10 rounded-full border-2 border-primary object-cover"
                />
                {/* Online indicator */}
                <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-background" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-foreground truncate">
                    {live.streamer?.display_name || "Anonyme"}
                  </span>
                  <Sparkles className="w-3.5 h-3.5 text-primary flex-shrink-0" />
                </div>
                <p className="text-xs text-foreground/70 line-clamp-1">
                  {live.title}
                </p>
              </div>
            </div>
            
            {/* Tags - Enhanced */}
            {live.tags && live.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {live.tags.slice(0, 3).map((tag, index) => (
                  <motion.span
                    key={tag}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.1 }}
                    className="text-[10px] px-2.5 py-1 bg-primary/20 backdrop-blur-sm rounded-full text-primary font-semibold border border-primary/30"
                  >
                    #{tag}
                  </motion.span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default LiveCard;
