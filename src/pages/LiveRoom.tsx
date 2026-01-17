import { useState, useEffect, useRef, useCallback } from "react";
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
  Coins,
  Wand2,
  Hand,
  Settings2,
  RefreshCw,
  Volume2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLives, type Live } from "@/hooks/useLives";
import { useGifts, type VirtualGift } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { useLocalStream } from "@/hooks/useLocalStream";
import { useLiveKit } from "@/hooks/useLiveKit";
import { useSnapchatFilters } from "@/hooks/useSnapchatFilters";
import { useFaceTracking } from "@/hooks/useFaceTracking";
import { useLiveStage } from "@/hooks/useLiveStage";
import { useStageWebRTC } from "@/hooks/useStageWebRTC";
import { useLiveAccess } from "@/hooks/useLiveAccess";
import { useLiveJoinRequests } from "@/hooks/useLiveJoinRequests";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import GiftPanel from "@/components/live/GiftPanel";
import GiftAnimation from "@/components/live/GiftAnimation";
import LocalVideoPlayer from "@/components/live/LocalVideoPlayer";
import StreamControls from "@/components/live/StreamControls";
import SnapchatFilterPanel from "@/components/live/SnapchatFilterPanel";
import FaceTrackingOverlay from "@/components/live/FaceTrackingOverlay";
import StageRequestButton from "@/components/live/StageRequestButton";
import StageRequestQueue from "@/components/live/StageRequestQueue";
import GuestPipView from "@/components/live/GuestPipView";
import SplitScreenView from "@/components/live/SplitScreenView";
import GuestViewModeSelector, { type GuestViewMode } from "@/components/live/GuestViewModeSelector";
import JoinLiveModal from "@/components/live/JoinLiveModal";
import LiveDebugPanel from "@/components/live/LiveDebugPanel";
import JoinRequestButton from "@/components/live/JoinRequestButton";
import { JoinRequestQueue } from "@/components/live/JoinRequestNotification";
import LiveEndedScreen from "@/components/live/LiveEndedScreen";
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
  
  // Live access control
  const { 
    hasAccess, 
    loading: accessLoading, 
    isStreamer: accessIsStreamer,
    checkAccess,
  } = useLiveAccess(id || "");
  const [showJoinModal, setShowJoinModal] = useState(false);

  const [live, setLive] = useState<Live | null>(null);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [showGiftPanel, setShowGiftPanel] = useState(false);
  const [showBeautyPanel, setShowBeautyPanel] = useState(false);
  const [showStageQueue, setShowStageQueue] = useState(false);
  const [showViewModeSelector, setShowViewModeSelector] = useState(false);
  const [guestViewMode, setGuestViewMode] = useState<GuestViewMode>("pip");
  const [realtimeViewers, setRealtimeViewers] = useState(0);
  const [activeGift, setActiveGift] = useState<{
    gift: VirtualGift;
    senderName: string;
  } | null>(null);
  const [hasIncrementedViewer, setHasIncrementedViewer] = useState(false);
  const [hasShownStageToast, setHasShownStageToast] = useState(false);
  const [liveEnded, setLiveEnded] = useState(false);
  const [showEndedScreen, setShowEndedScreen] = useState(false);
  const [isEndingLive, setIsEndingLive] = useState(false);
  const [endedLiveData, setEndedLiveData] = useState<{
    startedAt: string | null;
    endedAt: string | null;
    maxViewers: number;
    streamerName: string | null;
    streamerAvatar: string | null;
  } | null>(null);
  
  // SECURITY: Ultra simple - only compare IDs directly
  const isStreamer = live?.streamer_id === user?.id;
  
  // Alias for UI controls
  const showStreamerControls = !!isStreamer;
  
  // Debug logging for streamer verification
  console.log("LiveRoom - SECURITY CHECK:", {
    isStreamer,
    showStreamerControls,
    userId: user?.id,
    streamerId: live?.streamer_id,
    isLoading
  });

  // Snapchat-style filters for streamer
  const {
    state: filterState,
    filterString,
    vignetteStyle,
    grainStyle,
    updateColorFilter,
    updateFaceFilter,
    updateBackground,
    applyColorPreset,
    applyFacePreset,
    setOverlay,
    toggleFilters,
    resetAll: resetFilters,
  } = useSnapchatFilters();

  // Local stream for streamer
  const {
    stream,
    isMuted: localIsMuted,
    isVideoOff: localIsVideoOff,
    isInitialized,
    initCamera,
    stopStream,
    toggleMute: localToggleMute,
    toggleVideo: localToggleVideo,
    switchCamera: localSwitchCamera,
    setVideoRef,
    videoRef,
  } = useLocalStream();

  // LiveKit for streaming to viewers
  // Use live's livekit_room_name if available, otherwise use the live id
  const roomName = live?.livekit_room_name || live?.id || id || "";
  const {
    isConnected: liveKitConnected,
    isConnecting: liveKitConnecting,
    error: liveKitError,
    isMuted: liveKitMuted,
    isVideoOff: liveKitVideoOff,
    remoteVideoTrack,
    needsAudioUnlock,
    debugInfo: liveKitDebugInfo,
    connect: connectLiveKit,
    disconnect: disconnectLiveKit,
    toggleMute: liveKitToggleMute,
    toggleVideo: liveKitToggleVideo,
    switchCamera: liveKitSwitchCamera,
    setLocalVideoRef,
    setRemoteVideoRef,
    forceReconnect: liveKitForceReconnect,
    forceResyncTracks: liveKitResyncTracks,
    unlockAudio,
  } = useLiveKit({
    roomName,
    isStreamer,
    // Streamer: reuse the already-open camera stream to publish to LiveKit.
    publishStream: isStreamer ? stream : null,
  });

  // Auto-reconnect state for viewers
  const [showReconnectButton, setShowReconnectButton] = useState(false);
  const reconnectTimerRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttemptRef = useRef(0);

  // Use LiveKit controls when connected, otherwise use local controls
  const isMuted = liveKitConnected ? liveKitMuted : localIsMuted;
  const isVideoOff = liveKitConnected ? liveKitVideoOff : localIsVideoOff;
  const toggleMute = liveKitConnected ? liveKitToggleMute : localToggleMute;
  const toggleVideo = liveKitConnected ? liveKitToggleVideo : localToggleVideo;
  const switchCamera = liveKitConnected ? liveKitSwitchCamera : localSwitchCamera;

  // Face tracking for AR overlays
  const {
    isLoading: faceTrackingLoading,
    isTracking,
    landmarks: faceLandmarks,
  } = useFaceTracking({
    videoRef,
    enabled: isStreamer && isInitialized && !isVideoOff && filterState.activeOverlay !== null,
  });

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
    isMuted: guestMuted,
    toggleMute: toggleGuestMute,
    getPeerConnection,
  } = useStageWebRTC({
    liveId: id || "",
    guestId: currentGuest?.user_id || null,
    isStreamer: !!isStreamer,
    isOnStage,
  });

  // Join requests with coins (for viewers requesting to join, and streamers managing requests)
  const {
    requests: joinRequests,
    myRequest: myJoinRequest,
    sendingRequest: sendingJoinRequest,
    sendJoinRequest,
    cancelRequest: cancelJoinRequest,
    acceptRequest: acceptJoinRequest,
    rejectRequest: rejectJoinRequest,
  } = useLiveJoinRequests(id || "", live?.streamer_id);

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
      console.log("LiveRoom - streamer check:", { 
        streamerId: liveData.streamer_id, 
        userId: user?.id, 
        isMatch: liveData.streamer_id === user?.id 
      });
      setIsLoading(false);

      // Check access for non-streamers
      if (liveData.streamer_id !== user?.id) {
        // Wait for access check to complete
        await checkAccess();
      }

      // Increment viewer count (only if we have access, checked later)
      if (liveData.streamer_id !== user?.id) {
        // We'll increment after access check
      }
    };

    fetchLive();

  }, [id, user]);

  // Show join modal if no access
  useEffect(() => {
    if (!accessLoading && hasAccess === false && !isStreamer && live) {
      setShowJoinModal(true);
    } else if (hasAccess === true && !isStreamer && id && !hasIncrementedViewer) {
      // Increment viewer count when access is confirmed (only once)
      updateViewerCount(id, true);
      setHasIncrementedViewer(true);
    }
  }, [hasAccess, accessLoading, isStreamer, live, id, hasIncrementedViewer]);

  // Cleanup: decrement viewer count and disconnect on unmount
  useEffect(() => {
    return () => {
      if (id && hasIncrementedViewer) {
        updateViewerCount(id, false);
      }
      stopStream();
      disconnectLiveKit();
    };
  }, [id, hasIncrementedViewer, disconnectLiveKit]);

  // Show toast for stage request button after joining
  useEffect(() => {
    if (!isStreamer && hasAccess && !isOnStage && !hasShownStageToast) {
      const timer = setTimeout(() => {
        toast.info("Appuyez sur ✋ pour demander à rejoindre le streamer !", {
          duration: 5000,
        });
        setHasShownStageToast(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [isStreamer, hasAccess, isOnStage, hasShownStageToast]);

  // Auto-start camera for streamer (for local preview and face tracking)
  useEffect(() => {
    if (live && isStreamer && !isInitialized) {
      initCamera();
    }
  }, [live, isStreamer, isInitialized, initCamera]);

  // Auto-connect to LiveKit when live is loaded and has access
  useEffect(() => {
    if (!live || !roomName) return;
    if (liveKitConnected || liveKitConnecting || liveKitError) return;

    if (isStreamer) {
      // STREAMER: Wait for local camera stream to be ready before connecting
      // This ensures we have tracks to publish to LiveKit
      if (!stream || !isInitialized) {
        console.log("LiveRoom - Streamer waiting for local stream before connecting to LiveKit");
        return;
      }
      console.log("LiveRoom - Streamer connecting to LiveKit with local stream ready");
      connectLiveKit();
    } else {
      // VIEWER: Connect when access is granted
      if (hasAccess === true) {
        console.log("LiveRoom - Viewer connecting to LiveKit");
        connectLiveKit();
      }
    }
  }, [live, roomName, isStreamer, hasAccess, stream, isInitialized, liveKitConnected, liveKitConnecting, liveKitError, connectLiveKit]);

  // Log LiveKit connection status and handle auto-reconnect for viewers
  useEffect(() => {
    if (liveKitError) {
      console.error("LiveKit error:", liveKitError);
    }
    if (liveKitConnected) {
      console.log("LiveRoom - LiveKit connected successfully");
      reconnectAttemptRef.current = 0;
      setShowReconnectButton(false);
      
      // Clear any pending reconnect timer
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    }
  }, [liveKitConnected, liveKitError]);

  // Proactive audio unlock on first user interaction (mobile autoplay policies)
  // - Viewers: needed for the main LiveKit stream audio
  // - Streamer: needed when a guest is on stage (DUO) so guest audio can play on iOS/Android
  useEffect(() => {
    if (!user) return;

    // Streamer only needs this when there's a stage guest (DUO)
    if (isStreamer && !currentGuest) return;

    const handleFirstInteraction = () => {
      console.log("[LiveRoom] First user interaction detected -> unlocking audio...", {
        isStreamer,
        hasGuest: !!currentGuest,
      });
      unlockAudio();
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };

    document.addEventListener("touchstart", handleFirstInteraction, { once: true, passive: true });
    document.addEventListener("click", handleFirstInteraction, { once: true });

    return () => {
      document.removeEventListener("touchstart", handleFirstInteraction);
      document.removeEventListener("click", handleFirstInteraction);
    };
  }, [user, isStreamer, currentGuest?.user_id, unlockAudio]);

  // Auto-reconnect for viewers if connected but no video after 10 seconds
  // IMPORTANT: Skip reconnect logic entirely if live is ended or doesn't exist
  useEffect(() => {
    // If live is ended or user is streamer, don't auto-reconnect
    if (isStreamer || liveEnded) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setShowReconnectButton(false);
      return;
    }

    // If we have video or not connected yet, no need for reconnect timer
    if (!liveKitConnected || remoteVideoTrack) {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      setShowReconnectButton(false);
      return;
    }

    // Viewer is connected but has no video track - start timer
    console.log("[LiveRoom] Viewer connected but no video - starting 10s timer (attempt", reconnectAttemptRef.current + 1, "of 3)");

    reconnectTimerRef.current = setTimeout(async () => {
      // Before reconnecting, check if live still exists and is active
      const { data: liveCheck } = await supabase
        .from("lives")
        .select("id, status")
        .eq("id", id)
        .maybeSingle();

      if (!liveCheck || liveCheck.status === "ended") {
        console.log("[LiveRoom] Live ended or not found, stopping reconnect attempts");
        // Store minimal data for ended screen (viewer case)
        setEndedLiveData({
          startedAt: live?.started_at || null,
          endedAt: new Date().toISOString(),
          maxViewers: live?.max_viewers || 0,
          streamerName: live?.streamer?.display_name || null,
          streamerAvatar: live?.streamer?.avatar_url || null,
        });
        setLiveEnded(true);
        setShowEndedScreen(true);
        return;
      }

      if (reconnectAttemptRef.current < 3) {
        // Auto-reconnect up to 3 times
        console.log("[LiveRoom] Auto-reconnecting (attempt", reconnectAttemptRef.current + 1, "of 3)");
        toast.info("Vidéo non reçue, reconnexion...", { duration: 2000 });
        reconnectAttemptRef.current++;
        handleLiveKitReconnect();
      } else {
        // Show manual reconnect button after 3 attempts
        console.log("[LiveRoom] Auto-reconnect limit reached (3 attempts), showing manual button");
        setShowReconnectButton(true);
        toast.warning("Impossible de recevoir la vidéo. Vérifiez votre connexion.", { duration: 5000 });
      }
    }, 10000);

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
    };
  }, [isStreamer, liveKitConnected, remoteVideoTrack, liveEnded, id, navigate]);

  // Handler for manual reconnect - also checks if live is still active
  const handleLiveKitReconnect = useCallback(async () => {
    // First check if live is still active
    const { data: liveCheck } = await supabase
      .from("lives")
      .select("id, status")
      .eq("id", id)
      .maybeSingle();

    if (!liveCheck || liveCheck.status === "ended") {
      console.log("[LiveRoom] Live ended, cannot reconnect");
      setEndedLiveData({
        startedAt: live?.started_at || null,
        endedAt: new Date().toISOString(),
        maxViewers: live?.max_viewers || 0,
        streamerName: live?.streamer?.display_name || null,
        streamerAvatar: live?.streamer?.avatar_url || null,
      });
      setLiveEnded(true);
      setShowEndedScreen(true);
      return;
    }

    console.log("[LiveRoom] Manual LiveKit reconnect triggered");
    setShowReconnectButton(false);
    await liveKitForceReconnect();
    // Wait a bit then reconnect
    setTimeout(() => {
      connectLiveKit();
    }, 1000);
  }, [liveKitForceReconnect, connectLiveKit, id, navigate]);

  // Maximum messages to keep in memory for performance
  const MAX_LIVE_MESSAGES = 100;

  // Fetch and subscribe to messages with pagination
  useEffect(() => {
    if (!id) return;

    const fetchMessages = async () => {
      const { data: messagesData } = await supabase
        .from("live_messages")
        .select("*")
        .eq("live_id", id)
        .order("created_at", { ascending: false })
        .limit(MAX_LIVE_MESSAGES);

      if (messagesData && messagesData.length > 0) {
        // Reverse to show oldest first
        const orderedMessages = [...messagesData].reverse();
        
        // Fetch profiles for all message authors
        const userIds = [...new Set(orderedMessages.map((m) => m.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(
          profiles?.map((p) => [p.user_id, p]) || []
        );

        const messagesWithProfiles: LiveMessage[] = orderedMessages.map((msg) => ({
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

          // Add new message and trim to max limit to prevent memory bloat
          setMessages((prev) => {
            const updated = [...prev, messageWithProfile];
            if (updated.length > MAX_LIVE_MESSAGES) {
              return updated.slice(-MAX_LIVE_MESSAGES);
            }
            return updated;
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id]);

  // Ref to store presence channel for cleanup
  const presenceChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Subscribe to live updates and realtime presence
  useEffect(() => {
    if (!id || !user) return;

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
            console.log("[LiveRoom] Live ended via realtime update");
            // Store live data for ended screen
            setEndedLiveData({
              startedAt: updated.started_at,
              endedAt: updated.ended_at,
              maxViewers: updated.max_viewers,
              streamerName: live?.streamer?.display_name || null,
              streamerAvatar: live?.streamer?.avatar_url || null,
            });
            setLiveEnded(true);
            setShowEndedScreen(true);
          } else {
            setLive((prev) =>
              prev ? { ...prev, ...updated } : null
            );
          }
        }
      )
      .subscribe();

    // Presence channel for realtime viewer count with proper tracking
    const presenceChannel = supabase.channel(`presence-live-${id}`, {
      config: { presence: { key: user.id } },
    });
    presenceChannelRef.current = presenceChannel;

    presenceChannel
      .on("presence", { event: "sync" }, () => {
        const state = presenceChannel.presenceState();
        const count = Object.keys(state).length;
        console.log("[Presence] Sync - viewers:", count, "state:", state);
        setRealtimeViewers(count);
      })
      .on("presence", { event: "join" }, ({ key, newPresences }) => {
        console.log("[Presence] User joined:", key, newPresences);
      })
      .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
        console.log("[Presence] User left:", key, leftPresences);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          console.log("[Presence] Subscribed, tracking user:", user.id);
          await presenceChannel.track({ 
            user_id: user.id,
            joined_at: new Date().toISOString(),
          });
        }
      });

    // Cleanup function - explicitly untrack before removing channel
    const cleanup = async () => {
      console.log("[Presence] Cleanup - untracking user:", user.id);
      try {
        await presenceChannel.untrack();
      } catch (e) {
        console.warn("[Presence] Untrack failed:", e);
      }
      supabase.removeChannel(channel);
      supabase.removeChannel(presenceChannel);
      presenceChannelRef.current = null;
    };

    return () => {
      cleanup();
    };
  }, [id, user]);

  // Handle beforeunload to ensure presence is cleaned up on page close/refresh
  useEffect(() => {
    if (!id || !user) return;

    const handleBeforeUnload = () => {
      console.log("[Presence] beforeunload - cleaning up presence");
      // Use sendBeacon for reliable cleanup on page unload
      if (presenceChannelRef.current) {
        try {
          presenceChannelRef.current.untrack();
        } catch (e) {
          console.warn("[Presence] beforeunload untrack failed:", e);
        }
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && presenceChannelRef.current) {
        console.log("[Presence] Page hidden - untracking");
        presenceChannelRef.current.untrack();
      } else if (document.visibilityState === "visible" && presenceChannelRef.current && user) {
        console.log("[Presence] Page visible - re-tracking");
        presenceChannelRef.current.track({ 
          user_id: user.id,
          joined_at: new Date().toISOString(),
        });
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [id, user]);

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

  const handleEndLive = useCallback(async () => {
    if (!id || !live || isEndingLive) return;
    
    setIsEndingLive(true);
    console.log("[LiveRoom] handleEndLive called - ending live:", id);

    // Store live data before ending for the ended screen
    const endedAt = new Date().toISOString();
    setEndedLiveData({
      startedAt: live.started_at,
      endedAt,
      maxViewers: Math.max(live.max_viewers, realtimeViewers),
      streamerName: live.streamer?.display_name || null,
      streamerAvatar: live.streamer?.avatar_url || null,
    });

    try {
      const { error } = await endLive(id);
      if (error) {
        console.error("[LiveRoom] Error ending live:", error);
        toast.error("Erreur lors de la fin du live");
        setEndedLiveData(null);
        setIsEndingLive(false);
        return;
      }

      console.log("[LiveRoom] Live ended successfully");
      // Show the ended screen instead of navigating directly
      setLiveEnded(true);
      setShowEndedScreen(true);
    } catch (err) {
      console.error("[LiveRoom] Exception ending live:", err);
      toast.error("Erreur lors de la fin du live");
      setEndedLiveData(null);
      setIsEndingLive(false);
    }
  }, [id, live, isEndingLive, realtimeViewers, endLive]);

  // Auto-end live if streamer closes/leaves the page
  useEffect(() => {
    if (!isStreamer || !id || !live) return;

    const handleStreamerLeave = () => {
      console.log("[LiveRoom] Streamer leaving page - auto-ending live");
      // Use sendBeacon for reliable cleanup on page unload
      const payload = JSON.stringify({
        status: "ended",
        ended_at: new Date().toISOString(),
      });
      
      // Try sendBeacon first (most reliable for unload)
      const beaconUrl = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/lives?id=eq.${id}`;
      const beaconSent = navigator.sendBeacon?.(
        beaconUrl,
        new Blob([payload], { type: "application/json" })
      );
      
      if (!beaconSent) {
        // Fallback: try synchronous fetch (less reliable but better than nothing)
        console.log("[LiveRoom] sendBeacon failed, trying fetch");
        fetch(beaconUrl, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            "Authorization": `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            "Prefer": "return=minimal",
          },
          body: payload,
          keepalive: true,
        }).catch((e) => console.warn("[LiveRoom] Fetch fallback failed:", e));
      }
    };

    const handleVisibilityChange = () => {
      // On mobile, when app goes to background for extended time, try to end live
      if (document.visibilityState === "hidden" && isStreamer) {
        console.log("[LiveRoom] Streamer page hidden - scheduling auto-end");
        // Give 10 seconds grace period, then end if still hidden
        const timeoutId = setTimeout(() => {
          if (document.visibilityState === "hidden") {
            console.log("[LiveRoom] Still hidden after 10s - ending live via API");
            endLive(id).catch((e) => console.warn("[LiveRoom] Auto-end failed:", e));
          }
        }, 10000);
        
        // Clear timeout if page becomes visible again
        const clearOnVisible = () => {
          if (document.visibilityState === "visible") {
            clearTimeout(timeoutId);
            document.removeEventListener("visibilitychange", clearOnVisible);
          }
        };
        document.addEventListener("visibilitychange", clearOnVisible);
      }
    };

    window.addEventListener("beforeunload", handleStreamerLeave);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("beforeunload", handleStreamerLeave);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isStreamer, id, live, endLive]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!live) return null;

  const defaultAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${live.streamer_id}`;

  // Show ended screen with stats and animations
  if (showEndedScreen && endedLiveData) {
    return (
      <AnimatePresence mode="wait">
        <LiveEndedScreen
          liveId={id || ""}
          streamerId={live.streamer_id}
          streamerName={endedLiveData.streamerName}
          streamerAvatar={endedLiveData.streamerAvatar}
          startedAt={endedLiveData.startedAt}
          endedAt={endedLiveData.endedAt}
          maxViewers={endedLiveData.maxViewers}
          isStreamer={isStreamer}
          onClose={() => navigate("/live")}
        />
      </AnimatePresence>
    );
  }

  return (
    <div className="fixed inset-0 bg-black">
      {/* Debug Panel (dev only) */}
      <LiveDebugPanel
        liveKitDebug={liveKitDebugInfo}
        stageConnected={stageConnected}
        stageConnecting={stageConnecting}
        isOnStage={isOnStage}
        onReconnectLiveKit={handleLiveKitReconnect}
        onResyncTracks={liveKitResyncTracks}
      />

      {/* Join Request Notifications for Streamer */}
      {isStreamer && (
        <JoinRequestQueue
          liveId={id || ""}
          streamerId={live.streamer_id}
          requests={joinRequests}
          onAccept={acceptJoinRequest}
          onReject={rejectJoinRequest}
        />
      )}

      <AnimatePresence>
        {showReconnectButton && !isStreamer && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-32 left-1/2 -translate-x-1/2 z-50"
          >
            <Button
              variant="destructive"
              size="sm"
              onClick={handleLiveKitReconnect}
              className="shadow-lg"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reconnecter la vidéo
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* PROMINENT Audio unlock overlay for iOS/Android mobile */}
      <AnimatePresence>
        {needsAudioUnlock && !isStreamer && liveKitConnected && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={unlockAudio}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="flex flex-col items-center gap-4 p-8"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Animated speaker icon */}
              <motion.div
                animate={{ 
                  scale: [1, 1.1, 1],
                }}
                transition={{ 
                  duration: 1.5,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center"
              >
                <Volume2 className="w-12 h-12 text-primary" />
              </motion.div>
              
              {/* Main text */}
              <div className="text-center">
                <h3 className="text-xl font-bold text-white mb-2">
                  Activer le son
                </h3>
                <p className="text-white/70 text-sm max-w-[250px]">
                  Appuyez sur le bouton ci-dessous pour entendre le stream
                </p>
              </div>
              
              {/* Big prominent button */}
              <Button
                variant="default"
                size="lg"
                onClick={unlockAudio}
                className="shadow-xl bg-primary hover:bg-primary/90 text-lg px-8 py-6 rounded-full animate-pulse"
              >
                <Volume2 className="w-6 h-6 mr-3" />
                Activer le son
              </Button>
              
              {/* Skip option */}
              <button
                onClick={() => {
                  // Force dismiss without unlocking (rare case)
                  console.log("[LiveRoom] User dismissed audio unlock overlay");
                }}
                className="text-white/50 text-xs mt-2 underline"
              >
                Continuer sans son
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Area - Full Screen or Split Screen */}
      <div className="absolute inset-0">
        {currentGuest && guestViewMode === "split" ? (
          <SplitScreenView
            streamerStream={isStreamer ? stream : null}
            streamerRemoteVideoTrack={!isStreamer ? remoteVideoTrack : null}
            streamerName={live.streamer?.display_name || null}
            streamerAvatar={live.streamer?.avatar_url || null}
            streamerId={live.streamer_id}
            isVideoOff={isVideoOff}
            filterString={isStreamer ? filterString : undefined}
            guestName={currentGuest.profile?.display_name || null}
            guestAvatar={currentGuest.profile?.avatar_url || null}
            guestId={currentGuest.user_id}
            guestStream={
              isStreamer
                ? guestStream
                : isOnStage
                  ? guestLocalStream
                  : null
            }
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
              remoteVideoTrack={remoteVideoTrack}
              isLiveKitConnected={liveKitConnected}
              isLiveKitConnecting={liveKitConnecting}
              setRemoteVideoRef={setRemoteVideoRef}
            />

            {/* Guest PiP View (Picture-in-Picture) */}
            <AnimatePresence>
              {currentGuest && (
                <GuestPipView
                  guestName={currentGuest.profile?.display_name || null}
                  guestAvatar={currentGuest.profile?.avatar_url || null}
                  guestId={currentGuest.user_id}
                  guestStream={
                    isOnStage && !isStreamer
                      ? guestLocalStream
                      : isStreamer
                        ? guestStream
                        : null
                  }
                  isStreamer={isStreamer}
                  isGuest={isOnStage}
                  isMuted={guestMuted}
                  onToggleMute={isOnStage ? toggleGuestMute : undefined}
                  onRemoveGuest={removeFromStage}
                  isConnecting={stageConnecting}
                  isConnected={stageConnected}
                  peerConnection={getPeerConnection()}
                />
              )}
            </AnimatePresence>
          </>
        )}

        {/* Filter Overlays (vignette, grain, AR masks with face tracking) - STREAMER ONLY */}
        {showStreamerControls && (
          <FaceTrackingOverlay
            overlay={filterState.activeOverlay}
            landmarks={faceLandmarks}
            isTracking={isTracking}
            vignetteStyle={vignetteStyle}
            grainStyle={grainStyle}
          />
        )}

        {/* Snapchat Filter Button for Streamer - STREAMER ONLY */}
        {showStreamerControls && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowBeautyPanel(true)}
            className="absolute top-28 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 border border-primary/30"
          >
            <Wand2 className="w-5 h-5 text-primary" />
          </motion.button>
        )}

        {/* Guest View Mode Button for Streamer - STREAMER ONLY */}
        {showStreamerControls && (
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setShowViewModeSelector(true)}
            className="absolute top-40 right-4 w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center z-20 border border-primary/30"
          >
            <Settings2 className="w-5 h-5 text-primary" />
          </motion.button>
        )}

        {/* Stream Controls for Streamer - STREAMER ONLY */}
        <StreamControls
          isMuted={isMuted}
          isVideoOff={isVideoOff}
          onToggleMute={toggleMute}
          onToggleVideo={toggleVideo}
          onSwitchCamera={switchCamera}
          onEndStream={handleEndLive}
          isStreamer={showStreamerControls}
        />

        {/* Top Bar */}
        <div className="absolute top-0 left-0 right-0 pt-[env(safe-area-inset-top)] px-4 pb-4 flex items-center justify-between bg-gradient-to-b from-background/80 to-transparent">
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
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {realtimeViewers || live.viewer_count}
                </span>
                <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-destructive/90 rounded text-white font-semibold">
                  <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                  LIVE
                </span>
              </div>
            </div>
          </div>

          {/* Coin Balance & Actions */}
          <div className="flex items-center gap-1.5">
            {!isStreamer && (
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20">
                <Coins className="w-3.5 h-3.5 text-primary" />
                <span className="font-semibold text-primary text-xs">{balance}</span>
              </div>
            )}
            {showStreamerControls ? (
              <Button
                variant="destructive"
                onClick={handleEndLive}
                disabled={isEndingLive}
                className="h-7 px-2 text-xs"
              >
                {isEndingLive ? "Fermeture..." : "Terminer"}
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
        <div className="absolute right-4 bottom-56 flex flex-col gap-3 z-20">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toast.success("❤️ Vous aimez ce live !")}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-destructive/80 transition-colors"
          >
            <Heart className="w-5 h-5 text-foreground" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.9 }}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors"
            onClick={() => setShowGiftPanel(true)}
          >
            <Gift className="w-5 h-5 text-primary" />
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
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors"
          >
            <Share2 className="w-5 h-5 text-foreground" />
          </motion.button>

          {/* Stage Queue Button for Streamer - STREAMER ONLY */}
          {showStreamerControls && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => setShowStageQueue(true)}
              className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors relative"
            >
              <Hand className="w-5 h-5 text-primary" />
              {stageRequests.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  key={stageRequests.length}
                  className="absolute -top-1.5 -right-1.5 min-w-5 h-5 px-1 bg-destructive rounded-full flex items-center justify-center text-[11px] text-white font-bold shadow-lg animate-pulse"
                >
                  {stageRequests.length > 9 ? "9+" : stageRequests.length}
                </motion.span>
              )}
            </motion.button>
          )}

          {/* Stage Request Button for Viewers (après Share) */}
          {!isStreamer && hasAccess && (
            <StageRequestButton
              hasRequest={!!myRequest}
              isOnStage={isOnStage}
              isLoading={stageLoading}
              onRequest={requestStage}
              onCancel={cancelRequest}
              onLeave={leaveStage}
            />
          )}

          {/* Join Request Button (50 coins) for viewers without access */}
          {!isStreamer && !hasAccess && !showJoinModal && (
            <JoinRequestButton
              liveId={id || ""}
              streamerId={live.streamer_id}
            />
          )}

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => toast.info("Plus d'options bientôt disponibles")}
            className="w-10 h-10 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-muted transition-colors"
          >
            <MoreVertical className="w-5 h-5 text-foreground" />
          </motion.button>
        </div>
      </div>

      {/* Chat Area - Compact overlay */}
      <div className="absolute bottom-0 left-0 right-0 pb-[env(safe-area-inset-bottom)] bg-gradient-to-t from-background/95 via-background/80 to-transparent">
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

      {/* Snapchat Filter Panel - STREAMER ONLY */}
      {showStreamerControls && (
        <SnapchatFilterPanel
          isOpen={showBeautyPanel}
          onClose={() => setShowBeautyPanel(false)}
          state={filterState}
          onUpdateColorFilter={updateColorFilter}
          onUpdateFaceFilter={updateFaceFilter}
          onUpdateBackground={updateBackground}
          onApplyColorPreset={applyColorPreset}
          onApplyFacePreset={applyFacePreset}
          onSetOverlay={setOverlay}
          onToggleFilters={toggleFilters}
          onReset={resetFilters}
        />
      )}

      {/* Stage Request Queue for Streamer - STREAMER ONLY */}
      {showStreamerControls && (
        <StageRequestQueue
          isOpen={showStageQueue}
          onClose={() => setShowStageQueue(false)}
          requests={stageRequests}
          onAccept={acceptRequest}
          onReject={rejectRequest}
        />
      )}

      {/* Guest View Mode Selector for Streamer - STREAMER ONLY */}
      {showStreamerControls && (
        <GuestViewModeSelector
          isOpen={showViewModeSelector}
          onClose={() => setShowViewModeSelector(false)}
          currentMode={guestViewMode}
          onModeChange={setGuestViewMode}
        />
      )}

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

      {/* Join Live Modal - Access Control */}
      {live && (
        <JoinLiveModal
          isOpen={showJoinModal}
          onClose={() => {
            setShowJoinModal(false);
            navigate("/live");
          }}
          liveId={id!}
          streamerId={live.streamer_id}
          streamerName={live.streamer?.display_name || null}
          streamerAvatar={live.streamer?.avatar_url || null}
          onAccessGranted={() => {
            setShowJoinModal(false);
            toast.success("Bienvenue dans le live !");
          }}
        />
      )}
    </div>
  );
};

export default LiveRoom;
