import { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Plus, Loader2 } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { Button } from "@/components/ui/button";
import { useRooms, type RoomTheme } from "@/hooks/useRooms";
import RoomCard from "@/components/rooms/RoomCard";
import CreateRoomModal from "@/components/rooms/CreateRoomModal";
import { tapHaptics } from "@/hooks/useHaptics";

const THEMES: { id: "all" | RoomTheme; label: string; emoji: string }[] = [
  { id: "all", label: "Tous", emoji: "🌟" },
  { id: "music", label: "Musique", emoji: "🎵" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "debate", label: "Débats", emoji: "🗣️" },
  { id: "chill", label: "Chill", emoji: "🌙" },
  { id: "culture", label: "Culture", emoji: "🎨" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "other", label: "Autre", emoji: "✨" },
];

const Rooms = () => {
  const navigate = useNavigate();
  const { rooms, loading, createRoom, joinRoom } = useRooms();
  const [filter, setFilter] = useState<"all" | RoomTheme>("all");
  const [showCreate, setShowCreate] = useState(false);

  const filtered = filter === "all" ? rooms : rooms.filter((r) => r.theme === filter);

  const handleCreate = async (payload: { title: string; theme: RoomTheme; mode: "audio" | "video" }) => {
    const res = await createRoom(payload);
    if (res?.data) {
      navigate(`/rooms/${res.data.id}`);
    }
    return res;
  };

  const handleOpen = async (roomId: string) => {
    tapHaptics.impact("MEDIUM");
    await joinRoom(roomId);
    navigate(`/rooms/${roomId}`);
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))]">
      <motion.header
        className="flex items-center justify-between px-4 md:px-6 py-3 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo size="sm" animate={false} />
        <Button size="sm" onClick={() => { tapHaptics.impact("LIGHT"); setShowCreate(true); }} className="gap-2">
          <Plus className="w-4 h-4" />
          Créer
        </Button>
      </motion.header>

      <div className="px-4 md:px-6 pb-2 flex-shrink-0">
        <h1 className="text-2xl font-black mb-1">
          <span className="text-primary">Salons</span>
        </h1>
        <p className="text-xs text-muted-foreground">
          Rejoins une conversation de groupe par thème.
        </p>
      </div>

      <div className="px-4 md:px-6 py-2 flex-shrink-0 overflow-x-auto no-scrollbar">
        <div className="flex gap-2 pb-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { tapHaptics.selection(); setFilter(t.id); }}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition ${
                filter === t.id
                  ? "bg-primary text-primary-foreground"
                  : "glass text-muted-foreground"
              }`}
            >
              {t.emoji} {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-3">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16 text-muted-foreground">
            <p className="mb-4">Aucun salon actif dans ce thème.</p>
            <Button onClick={() => { tapHaptics.impact("LIGHT"); setShowCreate(true); }} variant="outline" className="gap-2">
              <Plus className="w-4 h-4" />
              Créer le premier salon
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-4xl mx-auto">
            {filtered.map((room) => (
              <RoomCard key={room.id} room={room} onClick={() => handleOpen(room.id)} />
            ))}
          </div>
        )}
      </div>

      <CreateRoomModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={handleCreate}
      />

      <BottomNavigation />
    </div>
  );
};

export default Rooms;
