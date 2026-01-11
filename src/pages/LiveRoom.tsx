import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Heart,
  MessageCircle,
  Gift,
  Share2,
  MoreVertical,
  Send,
  Flag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLives, type Live } from "@/hooks/useLives";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type LiveMessage = Tables<"live_messages"> & {
  profile?: {
    display_name: string | null;
    avatar_url: string | null;
  };
};

const LiveRoom = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { endLive, updateViewerCount } = useLives();

  const [live, setLive] = useState<Live | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [isStreamer, setIsStreamer] = useState(false);

  // Fetch live data
  useEffect(() => {
    const fetchLive = async () => {
      if (!id) return;

      const { data: liveData, error } = await supabase
        .from("lives")
        .select("*")
        .eq("id", id)
        .maybeSingle();

      if (error || !liveData) {
        toast.error("Live introuvable");
        navigate("/live");
        return;
      }

      // Fetch streamer profile separately
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("user_id", liveData.streamer_id)
        .maybeSingle();

      const liveWithStreamer: Live = {
        ...liveData,
        streamer: profile || { display_name: null, avatar_url: null },
      };

      setLive(liveWithStreamer);
      setIsStreamer(liveData.streamer_id === user?.id);
      setIsLoading(false);

      // Increment viewer count
      if (liveData.streamer_id !== user?.id) {
        updateViewerCount(id, true);
      }
    };

    fetchLive();

    // Cleanup: decrement viewer count
    return () => {
      if (id && user && !isStreamer) {
        updateViewerCount(id, false);
      }
    };
  }, [id, user]);

  // Fetch and subscribe to messages
  useEffect(() => {
    if (!id) return;

    const fetchMessages = async () => {
      const { data: messagesData } = await supabase
        .from("live_messages")
        .select("*")
        .eq("live_id", id)
        .order("created_at", { ascending: true })
        .limit(100);

      if (messagesData && messagesData.length > 0) {
        // Fetch profiles for all message authors
        const userIds = [...new Set(messagesData.map((m) => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        const messagesWithProfiles: LiveMessage[] = messagesData.map((msg) => ({
          ...msg,
          profile: profileMap.get(msg.user_id) || {
            display_name: null,
            avatar_url: null,
          },
        }));

        setMessages(messagesWithProfiles);
      }
    };

    fetchMessages();

    const channel = supabase
      .channel(`live-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_messages",
          filter: `live_id=eq.${id}`,
        },
        async (payload) => {
          const newMsg = payload.new as Tables<"live_messages">;
          
          // Fetch profile for new message
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name, avatar_url")
            .eq("user_id", newMsg.user_id)
            .maybeSingle();

          const messageWithProfile: LiveMessage = {
            ...newMsg,
            profile: profile || { display_name: null, avatar_url: null },
          };

          setMessages((prev) => [...prev, messageWithProfile]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Subscribe to live updates
  useEffect(() => {
    if (!id) return;

    const channel = supabase
      .channel(`live-${id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "lives",
          filter: `id=eq.${id}`,
        },
        (payload) => {
          const updated = payload.new as Tables<"lives">;
          if (updated.status === "ended") {
            toast.info("Le live est terminé");
            navigate("/live");
          } else {
            setLive((prev) =>
              prev ? { ...prev, ...updated } : null
            );
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user || !id) return;

    const { error } = await supabase.from("live_messages").insert({
      live_id: id,
      user_id: user.id,
      content: newMessage.trim(),
    });

    if (error) {
      toast.error("Erreur lors de l'envoi du message");
      return;
    }

    setNewMessage("");
  };

  const handleEndLive = async () => {
    if (!id) return;

    const { error } = await endLive(id);
    if (error) {
      toast.error("Erreur lors de la fin du live");
      return;
    }

    toast.success("Live terminé");
    navigate("/live");
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!live) return null;

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.streamer_id}`;

  return (
    <div className="fixed inset-0 bg-background flex flex-col">
      {/* Video Area - Placeholder for LiveKit integration */}
      <div className="flex-1 relative bg-gradient-to-br from-muted to-background">
        {/* Placeholder Video */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <Avatar className="w-24 h-24 mx-auto mb-4 border-4 border-primary">
              <AvatarImage src={live.streamer?.avatar_url || defaultAvatar} />
              <AvatarFallback>
                {live.streamer?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <p className="text-muted-foreground">
              Streaming vidéo (LiveKit à intégrer)
            </p>
          </div>
        </div>

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent">
          {/* Streamer Info */}
          <div className="flex items-center gap-3">
            <Avatar className="w-10 h-10 border-2 border-primary">
              <AvatarImage src={live.streamer?.avatar_url || defaultAvatar} />
              <AvatarFallback>
                {live.streamer?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold text-foreground text-sm">
                {live.streamer?.display_name || "Anonyme"}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {live.viewer_count}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 bg-destructive rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {isStreamer ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEndLive}
              >
                Terminer
              </Button>
            ) : (
              <Button size="icon" variant="ghost">
                <Flag className="w-5 h-5" />
              </Button>
            )}
            <Button
              size="icon"
              variant="ghost"
              onClick={() => navigate("/live")}
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Side Actions */}
        <div className="absolute right-4 bottom-32 flex flex-col gap-4">
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full glass flex items-center justify-center"
          >
            <Heart className="w-6 h-6 text-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full glass flex items-center justify-center"
            onClick={() => setShowGiftPanel(true)}
          >
            <Gift className="w-6 h-6 text-primary" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full glass flex items-center justify-center"
          >
            <Share2 className="w-6 h-6 text-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full glass flex items-center justify-center"
          >
            <MoreVertical className="w-6 h-6 text-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Chat Area */}
      <div className="h-64 bg-background/95 backdrop-blur-sm border-t border-border">
        {/* Messages */}
        <div className="h-48 overflow-y-auto p-4 space-y-3">
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-2"
            >
              <Avatar className="w-6 h-6">
                <AvatarImage
                  src={
                    msg.profile?.avatar_url ||
                    `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.user_id}`
                  }
                />
                <AvatarFallback>
                  {msg.profile?.display_name?.[0] || "?"}
                </AvatarFallback>
              </Avatar>
              <div>
                <span className="text-xs font-semibold text-primary">
                  {msg.profile?.display_name || "Anonyme"}
                </span>
                <p className="text-sm text-foreground">{msg.content}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Message Input */}
        <div className="p-4 border-t border-border flex gap-2">
          <Input
            placeholder="Envoyer un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1"
            disabled={!user}
          />
          <Button
            size="icon"
            onClick={handleSendMessage}
            disabled={!newMessage.trim() || !user}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Gift Panel - To be implemented */}
      <AnimatePresence>
        {showGiftPanel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="absolute bottom-0 left-0 right-0 h-72 glass rounded-t-3xl p-4"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-foreground">Envoyer un cadeau</h3>
              <button onClick={() => setShowGiftPanel(false)}>
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>
            <p className="text-sm text-muted-foreground text-center py-8">
              Fonctionnalité bientôt disponible
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LiveRoom;
