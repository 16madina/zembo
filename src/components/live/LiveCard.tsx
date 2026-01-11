import { motion } from "framer-motion";
import { Users } from "lucide-react";
import type { Live } from "@/hooks/useLives";

interface LiveCardProps {
  live: Live;
  onClick?: () => void;
}

const LiveCard = ({ live, onClick }: LiveCardProps) => {
  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.streamer_id}`;
  const defaultThumbnail = `https://images.unsplash.com/photo-1516321497487-e288fb19713f?w=400&h=300&fit=crop`;

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className="relative rounded-2xl overflow-hidden glass cursor-pointer"
      onClick={onClick}
    >
      {/* Thumbnail */}
      <div className="relative aspect-[4/5]">
        <img
          src={live.thumbnail_url || defaultThumbnail}
          alt={live.title}
          className="w-full h-full object-cover"
        />

        {/* Live Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 bg-destructive/90 backdrop-blur-sm rounded-lg">
          <span className="relative w-2 h-2">
            <span className="absolute inset-0 bg-foreground rounded-full animate-ping" />
            <span className="relative block w-2 h-2 bg-foreground rounded-full" />
          </span>
          <span className="text-xs font-bold text-foreground">LIVE</span>
        </div>

        {/* Viewers */}
        <div className="absolute top-3 right-3 flex items-center gap-1.5 px-2 py-1 glass rounded-lg">
          <Users className="w-3 h-3 text-foreground" />
          <span className="text-xs font-semibold text-foreground">
            {live.viewer_count}
          </span>
        </div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-28 bg-gradient-to-t from-background/90 to-transparent" />

        {/* Streamer Info */}
        <div className="absolute bottom-3 left-3 right-3">
          <div className="flex items-center gap-2 mb-1.5">
            <img
              src={live.streamer?.avatar_url || defaultAvatar}
              alt={live.streamer?.display_name || "Streamer"}
              className="w-7 h-7 rounded-full border-2 border-primary object-cover"
            />
            <span className="text-sm font-semibold text-foreground">
              {live.streamer?.display_name || "Anonyme"}
            </span>
          </div>
          <p className="text-xs text-foreground/90 line-clamp-2 mb-2 leading-relaxed">
            {live.title}
          </p>
          {live.tags && live.tags.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {live.tags.map((tag) => (
                <span
                  key={tag}
                  className="text-[10px] px-2 py-0.5 glass rounded-full text-foreground/80 font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default LiveCard;
