import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Users,
  Heart,
  Gift,
  Share2,
  MoreVertical,
  Send,
  Flag,
  Coins,
  Sparkles,
  Hand,
  Settings2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLives, type Live } from "@/hooks/useLives";
import { useGifts, type VirtualGift } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { useLocalStream } from "@/hooks/useLocalStream";
import { useBeautyFilters } from "@/hooks/useBeautyFilters";
import { useLiveStage } from "@/hooks/useLiveStage";
import { useStageWebRTC } from "@/hooks/useStageWebRTC";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import GiftPanel from "@/components/live/GiftPanel";
import GiftAnimation from "@/components/live/GiftAnimation";
import LocalVideoPlayer from "@/components/live/LocalVideoPlayer";
import StreamControls from "@/components/live/StreamControls";
import BeautyFilterPanel from "@/components/live/BeautyFilterPanel";
import StageRequestButton from "@/components/live/StageRequestButton";
import StageRequestQueue from "@/components/live/StageRequestQueue";
import GuestPipView from "@/components/live/GuestPipView";
import SplitScreenView from "@/components/live/SplitScreenView";
import GuestViewModeSelector, { type GuestViewMode } from "@/components/live/GuestViewModeSelector";
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
  const { recentGifts } = useGifts(id);
  const { balance } = useCoins();

  const [live, setLive] = useState<Live | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showBeautyPanel, setShowBeautyPanel] = useState(false);
  const [showStageQueue, setShowStageQueue] = useState(false);
  const [showViewModeSelector, setShowViewModeSelector] = useState(false);
  const [guestViewMode, setGuestViewMode] = useState<GuestViewMode>("pip");
  const [isStreamer, setIsStreamer] = useState(false);
  const [activeGift, setActiveGift] = useState<{
    gift: VirtualGift;
    senderName: string;
  } | null>(null);

  // Beauty filters for streamer
  const {
    settings: beautySettings,
    isEnabled: beautyEnabled,
    filterString,
    updateSetting: updateBeautySetting,
    resetSettings: resetBeautySettings,
    toggleFilters: toggleBeautyFilters,
    applyPreset: applyBeautyPreset,
  } = useBeautyFilters();

  // Local stream for streamer (fallback without LiveKit)
  const {
    stream,
    isMuted,
    isVideoOff,
    isInitialized,
    initCamera,
    stopStream,
    toggleMute,
    toggleVideo,
    switchCamera,
    setVideoRef,
  } = useLocalStream();

  // Live stage (bring viewer on stage)
  const {
    requests: stageRequests,
    currentGuest,
    myRequest,
    isOnStage,
    isLoading: stageLoading,
    requestStage,
    cancelRequest,
    acceptRequest,
    rejectRequest,
    removeFromStage,
    leaveStage,
  } = useLiveStage({
    liveId: id || "",
    streamerId: live?.streamer_id || "",
    isStreamer,
  });

  // WebRTC for stage video connection
  const {
    guestStream,
    localStream: guestLocalStream,
    isConnected: stageConnected,
    isConnecting: stageConnecting,
  } = useStageWebRTC({
    liveId: id || "",
    guestId: currentGuest?.user_id || null,
    isStreamer,
    isOnStage,
  });

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

    // Cleanup: decrement viewer count and stop stream
    return () => {
      if (id && user && !isStreamer) {
        updateViewerCount(id, false);
      }
      stopStream();
    };
  }, [id, user]);

  // Auto-start camera for streamer
  useEffect(() => {
    if (live && isStreamer && !isInitialized) {
      initCamera();
    }
  }, [live, isStreamer, isInitialized, initCamera]);

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
    <div className="fixed inset-0 bg-black">
      {/* Video Area - Full Screen or Split Screen */}
      <div className="absolute inset-0">
        {currentGuest && guestViewMode === "split" ? (
          <SplitScreenView
            streamerStream={stream}
            streamerName={live.streamer?.display_name || null}
            streamerAvatar={live.streamer?.avatar_url || null}
            streamerId={live.streamer_id}
            isVideoOff={isVideoOff}
            filterString={isStreamer ? filterString : undefined}
            guestName={currentGuest.profile?.display_name || null}
            guestAvatar={currentGuest.profile?.avatar_url || null}
            guestId={currentGuest.user_id}
            guestStream={guestStream}
            isStreamer={isStreamer}
            onRemoveGuest={removeFromStage}
            isConnecting={stageConnecting}
            isConnected={stageConnected}
          />
        ) : (
          <>
            <LocalVideoPlayer
              isStreamer={isStreamer}
              isVideoOff={isVideoOff}
              isInitialized={isInitialized}
              stream={stream}
              streamerId={live.streamer_id}
              streamerName={live.streamer?.display_name}
              streamerAvatar={live.streamer?.avatar_url}
              setVideoRef={setVideoRef}
              filterString={isStreamer ? filterString : undefined}
            />

            {/* Guest PiP View (Picture-in-Picture) */}
            <AnimatePresence>
              {currentGuest && (
                <GuestPipView
                  guestName={currentGuest.profile?.display_name || null}
                  guestAvatar={currentGuest.profile?.avatar_url || null}
                  guestId={currentGuest.user_id}
                  guestStream={guestStream}
                  isStreamer={isStreamer}
                  onRemoveGuest={removeFromStage}
                  isConnecting={stageConnecting}
                  isConnected={stageConnected}
                />
              )}
            </AnimatePresence>
          </>
        )}

        {/* Beauty Filter Button for Streamer */}
        {isStreamer && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBeautyPanel(true)}
            className="absolute top-16 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 border border-primary/30"
          >
            <Sparkles className="w-5 h-5 text-primary" />
          </motion.button>
        )}

        {/* Guest View Mode Button for Streamer */}
        {isStreamer && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowViewModeSelector(true)}
            className="absolute top-28 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 border border-primary/30"
          >
            <Settings2 className="w-5 h-5 text-primary" />
          </motion.button>
        )}

        {/* Stream Controls for Streamer */}
        <StreamControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onEndStream={handleEndLive}
          isStreamer={isStreamer}
        />

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

          {/* Coin Balance & Actions */}
          <div className="flex items-center gap-2">
            {!isStreamer && (
              <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/20">
                <Coins className="w-4 h-4 text-primary" />
                <span className="font-semibold text-primary text-sm">{balance}</span>
              </div>
            )}
            {!isStreamer && (
              <Button size="icon" variant="ghost">
                <Flag className="w-5 h-5" />
              </Button>
            )}
            {isStreamer ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={handleEndLive}
              >
                Terminer
              </Button>
            ) : (
              <Button
                size="icon"
                variant="ghost"
                onClick={() => navigate("/live")}
              >
                <X className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Side Actions - Always visible */}
        <div className="absolute right-4 bottom-56 flex flex-col gap-4 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toast.success("❤️ Vous aimez ce live !")}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-destructive/80 transition-colors"
          >
            <Heart className="w-6 h-6 text-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors"
            onClick={() => setShowGiftPanel(true)}
          >
            <Gift className="w-6 h-6 text-primary" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={async () => {
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: live.title,
                    text: `Regardez le live de ${live.streamer?.display_name || "ce streamer"} !`,
                    url: window.location.href,
                  });
                } catch (e) {
                  navigator.clipboard.writeText(window.location.href);
                  toast.success("Lien copié !");
                }
              } else {
                navigator.clipboard.writeText(window.location.href);
                toast.success("Lien copié !");
              }
            }}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors"
          >
            <Share2 className="w-6 h-6 text-foreground" />
          </motion.button>

          {/* Stage Queue Button for Streamer (après Share) */}
          {isStreamer && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowStageQueue(true)}
              className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors relative"
            >
              <Hand className="w-6 h-6 text-primary" />
              {stageRequests.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-destructive rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {stageRequests.length}
                </span>
              )}
            </motion.button>
          )}

          {/* Stage Request Button for Viewers (après Share) */}
          {!isStreamer && (
            <StageRequestButton
              hasRequest={!!myRequest}
              isOnStage={isOnStage}
              isLoading={stageLoading}
              onRequest={requestStage}
              onCancel={cancelRequest}
              onLeave={leaveStage}
            />
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toast.info("Plus d'options bientôt disponibles")}
            className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-muted transition-colors"
          >
            <MoreVertical className="w-6 h-6 text-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Chat Area - Compact overlay */}
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-background/95 via-background/80 to-transparent">
        {/* Messages */}
        <div className="h-32 overflow-y-auto px-4 pt-4 space-y-2">
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
        <div className="px-4 pb-4 flex gap-2">
          <Input
            placeholder="Envoyer un message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            className="flex-1 bg-background/50 backdrop-blur-sm border-border/50"
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

      {/* Gift Panel */}
      <GiftPanel
        isOpen={showGiftPanel}
        onClose={() => setShowGiftPanel(false)}
        streamerId={live.streamer_id}
        liveId={id!}
        onGiftSent={(gift) => {
          setShowGiftPanel(false);
          // Trigger animation locally for sender
          setActiveGift({
            gift,
            senderName: "Vous",
          });
        }}
      />

      {/* Gift Animation Overlay */}
      <GiftAnimation
        gift={activeGift?.gift || null}
        senderName={activeGift?.senderName}
        onComplete={() => setActiveGift(null)}
      />

      {/* Beauty Filter Panel */}
      <BeautyFilterPanel
        isOpen={showBeautyPanel}
        onClose={() => setShowBeautyPanel(false)}
        settings={beautySettings}
        isEnabled={beautyEnabled}
        onUpdateSetting={updateBeautySetting}
        onResetSettings={resetBeautySettings}
        onToggleFilters={toggleBeautyFilters}
        onApplyPreset={applyBeautyPreset}
      />

      {/* Stage Request Queue for Streamer */}
      <StageRequestQueue
        isOpen={showStageQueue}
        onClose={() => setShowStageQueue(false)}
        requests={stageRequests}
        onAccept={acceptRequest}
        onReject={rejectRequest}
      />

      {/* Guest View Mode Selector for Streamer */}
      <GuestViewModeSelector
        isOpen={showViewModeSelector}
        onClose={() => setShowViewModeSelector(false)}
        currentMode={guestViewMode}
        onModeChange={setGuestViewMode}
      />

      {/* Recent Gifts Display */}
      <AnimatePresence>
        {recentGifts.slice(0, 3).map((transaction, index) => (
          <motion.div
            key={transaction.id}
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ delay: index * 0.1 }}
            className="absolute left-4 z-30"
            style={{ bottom: `${320 + index * 50}px` }}
          >
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border">
              <span className="text-lg">{transaction.gift?.emoji}</span>
              <span className="text-xs">
                <span className="font-semibold text-primary">
                  {transaction.sender_name}
                </span>{" "}
                <span className="text-muted-foreground">a envoyé</span>{" "}
                <span className="font-medium text-foreground">
                  {transaction.gift?.name}
                </span>
              </span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveRoom;
