import { motion } from "framer-motion";
import { Users, Mic, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Room } from "@/hooks/useRooms";

const THEME_LABEL: Record<Room["theme"], { label: string; emoji: string; color: string }> = {
  music: { label: "Musique", emoji: "🎵", color: "text-pink-400" },
  business: { label: "Business", emoji: "💼", color: "text-blue-400" },
  debate: { label: "Débats", emoji: "🗣️", color: "text-orange-400" },
  chill: { label: "Chill", emoji: "🌙", color: "text-indigo-400" },
  culture: { label: "Culture", emoji: "🎨", color: "text-purple-400" },
  sport: { label: "Sport", emoji: "⚽", color: "text-green-400" },
  other: { label: "Autre", emoji: "✨", color: "text-primary" },
};

interface Props {
  room: Room;
  onClick: () => void;
}

const RoomCard = ({ room, onClick }: Props) => {
  const themeInfo = THEME_LABEL[room.theme];
  const participants = room.participants ?? [];
  const shown = participants.slice(0, 4);
  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onClick={onClick}
      className="w-full text-left glass-strong rounded-2xl p-4 border border-white/10 hover:border-primary/40 transition"
    >
      <div className="flex items-start justify-between mb-2">
        <div className={`text-xs font-medium ${themeInfo.color}`}>
          {themeInfo.emoji} {themeInfo.label}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {room.mode === "video" ? <Video className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          {room.mode === "video" ? "Vidéo" : "Audio"}
        </div>
      </div>
      <h3 className="text-base font-bold text-foreground leading-tight mb-3 line-clamp-2">
        {room.title}
      </h3>
      <div className="flex items-center gap-2 mb-3">
        <Avatar className="w-7 h-7 border border-primary/40">
          <AvatarImage src={room.host_profile?.avatar_url || undefined} />
          <AvatarFallback>{room.host_profile?.display_name?.[0] ?? "?"}</AvatarFallback>
        </Avatar>
        <span className="text-xs text-muted-foreground truncate">
          Hôte : <span className="text-foreground font-medium">{room.host_profile?.display_name ?? "?"}</span>
        </span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex -space-x-2">
          {shown.map((p) => (
            <Avatar key={p.user_id} className="w-6 h-6 border-2 border-background">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="text-[10px]">{p.display_name?.[0] ?? "?"}</AvatarFallback>
            </Avatar>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          {participants.length}
        </div>
      </div>
    </motion.button>
  );
};

export default RoomCard;
