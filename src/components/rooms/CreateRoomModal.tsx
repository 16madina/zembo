import { useState } from "react";
import { motion } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { RoomTheme, RoomMode } from "@/hooks/useRooms";

interface CreateRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (payload: { title: string; theme: RoomTheme; mode: RoomMode }) => Promise<any>;
}

const THEMES: { id: RoomTheme; label: string; emoji: string }[] = [
  { id: "music", label: "Musique", emoji: "🎵" },
  { id: "business", label: "Business", emoji: "💼" },
  { id: "debate", label: "Débats", emoji: "🗣️" },
  { id: "chill", label: "Chill", emoji: "🌙" },
  { id: "culture", label: "Culture", emoji: "🎨" },
  { id: "sport", label: "Sport", emoji: "⚽" },
  { id: "other", label: "Autre", emoji: "✨" },
];

const CreateRoomModal = ({ isOpen, onClose, onCreate }: CreateRoomModalProps) => {
  const [title, setTitle] = useState("");
  const [theme, setTheme] = useState<RoomTheme>("chill");
  const [mode, setMode] = useState<RoomMode>("audio");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Donne un titre à ton salon");
      return;
    }
    setLoading(true);
    const res = await onCreate({ title: title.trim(), theme, mode });
    setLoading(false);
    if (!res?.error) {
      setTitle("");
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-end justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: "100%" }}
        animate={{ y: 0 }}
        exit={{ y: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-background rounded-t-3xl p-6 pb-10 max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground">Créer un salon</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Titre</label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex : Chill vendredi soir 🎧"
              maxLength={100}
            />
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Thème</label>
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`p-3 rounded-xl flex items-center gap-2 transition-all ${
                    theme === t.id ? "bg-primary/20 border-2 border-primary" : "glass"
                  }`}
                >
                  <span className="text-lg">{t.emoji}</span>
                  <span className="text-sm font-medium">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm text-muted-foreground mb-2 block">Mode</label>
            <div className="grid grid-cols-2 gap-2">
              {(["audio", "video"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`p-3 rounded-xl transition-all ${
                    mode === m ? "bg-primary/20 border-2 border-primary" : "glass"
                  }`}
                >
                  <span className="font-medium">{m === "audio" ? "🎙️ Audio" : "🎥 Vidéo"}</span>
                </button>
              ))}
            </div>
          </div>

          <Button onClick={handleCreate} disabled={loading} className="w-full">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Créer et rejoindre"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default CreateRoomModal;
