import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseStageWebRTCProps {
  liveId: string;
  guestId: string | null;
  isStreamer: boolean;
  isOnStage: boolean;
  onGuestStreamReady?: (stream: MediaStream) => void;
  onGuestDisconnected?: () => void;
}

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const useStageWebRTC = ({
  liveId,
  guestId,
  isStreamer,
  isOnStage,
  onGuestStreamReady,
  onGuestDisconnected,
}: UseStageWebRTCProps) => {
  const { user } = useAuth();
  const [guestStream, setGuestStream] = useState<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const pendingCandidatesRef = useRef<RTCIceCandidate[]>([]);

  // Cleanup function
  const cleanup = useCallback(() => {
    console.log("[StageWebRTC] Cleaning up...");
    
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    setLocalStream(null);

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    pendingCandidatesRef.current = [];
    setGuestStream(null);
    setIsConnected(false);
    setIsConnecting(false);
    onGuestDisconnected?.();
  }, [localStream, onGuestDisconnected]);

  // Send signaling data
  const sendSignal = useCallback(async (signalType: string, signalData: any, receiverId: string) => {
    if (!liveId || !user) return;

    try {
      await supabase.from("live_stage_signals").insert({
        live_id: liveId,
        sender_id: user.id,
        receiver_id: receiverId,
        signal_type: signalType,
        signal_data: signalData,
      });
      console.log(`[StageWebRTC] Sent ${signalType} to ${receiverId}`);
    } catch (err) {
      console.error("[StageWebRTC] Error sending signal:", err);
    }
  }, [liveId, user]);

  // Process pending ICE candidates
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    for (const candidate of pendingCandidatesRef.current) {
      try {
        await pc.addIceCandidate(candidate);
        console.log("[StageWebRTC] Added pending ICE candidate");
      } catch (err) {
        console.error("[StageWebRTC] Error adding pending candidate:", err);
      }
    }
    pendingCandidatesRef.current = [];
  }, []);

  // Handle incoming signals
  const handleSignal = useCallback(async (signalType: string, signalData: any, senderId: string) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log("[StageWebRTC] No peer connection, ignoring signal");
      return;
    }

    try {
      console.log(`[StageWebRTC] Handling ${signalType} from ${senderId}`);
      
      if (signalType === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer, senderId);
        
      } else if (signalType === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
      } else if (signalType === "ice-candidate" && signalData) {
        const candidate = new RTCIceCandidate(signalData);
        if (pc.remoteDescription) {
          await pc.addIceCandidate(candidate);
        } else {
          pendingCandidatesRef.current.push(candidate);
          console.log("[StageWebRTC] Queued ICE candidate");
        }
      }
    } catch (err) {
      console.error("[StageWebRTC] Error handling signal:", err);
    }
  }, [sendSignal, processPendingCandidates]);

  // Start connection as streamer (receives guest video)
  const startAsStreamer = useCallback(async (targetGuestId: string) => {
    if (!user || !liveId) return;

    console.log("[StageWebRTC] Starting as streamer, waiting for guest:", targetGuestId);
    setIsConnecting(true);
    setError(null);

    try {
      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle remote stream (guest video)
      pc.ontrack = (event) => {
        console.log("[StageWebRTC] Received track from guest");
        const [remoteStream] = event.streams;
        setGuestStream(remoteStream);
        onGuestStreamReady?.(remoteStream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", event.candidate, targetGuestId);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[StageWebRTC] Connection state:", state);
        
        if (state === "connected") {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === "disconnected" || state === "failed") {
          setIsConnected(false);
          cleanup();
        }
      };

      // Subscribe to signals
      const channel = supabase
        .channel(`stage-webrtc-${liveId}-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_stage_signals",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const signal = payload.new as any;
            if (signal.live_id === liveId) {
              handleSignal(signal.signal_type, signal.signal_data, signal.sender_id);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Create and send offer to guest
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true,
      });
      await pc.setLocalDescription(offer);
      await sendSignal("offer", offer, targetGuestId);

    } catch (err: any) {
      console.error("[StageWebRTC] Error starting as streamer:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      cleanup();
    }
  }, [user, liveId, sendSignal, handleSignal, cleanup, onGuestStreamReady]);

  // Start connection as guest (sends video to streamer)
  const startAsGuest = useCallback(async (streamerId: string) => {
    if (!user || !liveId) return;

    console.log("[StageWebRTC] Starting as guest, sending video to:", streamerId);
    setIsConnecting(true);
    setError(null);

    try {
      // Get local video/audio stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", event.candidate, streamerId);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[StageWebRTC] Connection state:", state);
        
        if (state === "connected") {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === "disconnected" || state === "failed") {
          setIsConnected(false);
          cleanup();
        }
      };

      // Subscribe to signals
      const channel = supabase
        .channel(`stage-webrtc-${liveId}-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "live_stage_signals",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const signal = payload.new as any;
            if (signal.live_id === liveId) {
              handleSignal(signal.signal_type, signal.signal_data, signal.sender_id);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // Check for existing offer from streamer
      const { data: existingSignals } = await supabase
        .from("live_stage_signals")
        .select("*")
        .eq("live_id", liveId)
        .eq("receiver_id", user.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (existingSignals && existingSignals.length > 0) {
        await handleSignal("offer", existingSignals[0].signal_data, existingSignals[0].sender_id);
      }

    } catch (err: any) {
      console.error("[StageWebRTC] Error starting as guest:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      cleanup();
    }
  }, [user, liveId, sendSignal, handleSignal, cleanup]);

  // Effect: Start connection when guest is on stage
  useEffect(() => {
    if (!guestId || !user || !liveId) return;

    if (isStreamer && guestId) {
      // Streamer initiates connection when guest is accepted
      startAsStreamer(guestId);
    }

    return () => {
      // Cleanup signals when connection ends
      if (user) {
        supabase
          .from("live_stage_signals")
          .delete()
          .eq("live_id", liveId)
          .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
          .then(() => console.log("[StageWebRTC] Cleaned up signals"));
      }
    };
  }, [isStreamer, guestId, user, liveId, startAsStreamer]);

  // Effect: Guest starts connection when they go on stage
  useEffect(() => {
    if (!isOnStage || isStreamer || !user) return;

    // We need the streamer ID - fetch from the live
    const fetchStreamerAndConnect = async () => {
      const { data: live } = await supabase
        .from("lives")
        .select("streamer_id")
        .eq("id", liveId)
        .maybeSingle();

      if (live?.streamer_id) {
        startAsGuest(live.streamer_id);
      }
    };

    fetchStreamerAndConnect();

    return () => {
      cleanup();
    };
  }, [isOnStage, isStreamer, user, liveId, startAsGuest, cleanup]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, []);

  // Toggle mute for guest
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(!isMuted);
      console.log("[StageWebRTC] Mute toggled:", !isMuted);
    }
  }, [localStream, isMuted]);

  return {
    guestStream,
    localStream,
    isConnected,
    isConnecting,
    isMuted,
    error,
    cleanup,
    toggleMute,
  };
};
