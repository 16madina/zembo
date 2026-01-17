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
  const hasInitializedRef = useRef(false);
  const prevGuestIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  const liveIdRef = useRef<string | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  // Keep refs updated for cleanup
  useEffect(() => {
    userIdRef.current = user?.id || null;
    liveIdRef.current = liveId || null;
  }, [user?.id, liveId]);

  // Cleanup function - only cleans local resources, not signals
  const cleanup = useCallback(() => {
    console.log("[StageWebRTC] Cleaning up local resources...");

    // Stop local tracks (guest side)
    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
    }
    setLocalStream(null);

    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    // Remove realtime channel
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    // Reset refs/state
    pendingCandidatesRef.current = [];
    remoteStreamRef.current = null;
    hasInitializedRef.current = false;

    setGuestStream(null);
    setIsConnected(false);
    setIsConnecting(false);

    onGuestDisconnected?.();
  }, [localStream, onGuestDisconnected]);

  // Full cleanup including signals - only called on unmount
  const fullCleanup = useCallback(async () => {
    console.log("[StageWebRTC] Full cleanup with signal deletion...");
    cleanup();
    
    const userId = userIdRef.current;
    const currentLiveId = liveIdRef.current;
    
    if (userId && currentLiveId) {
      try {
        await supabase
          .from("live_stage_signals")
          .delete()
          .eq("live_id", currentLiveId)
          .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);
        console.log("[StageWebRTC] Cleaned up signals");
      } catch (err) {
        console.error("[StageWebRTC] Error cleaning signals:", err);
      }
    }
  }, [cleanup]);

  // Send signaling data
  const sendSignal = useCallback(async (signalType: string, signalData: any, receiverId: string) => {
    if (!liveId || !user) return;

    try {
      const { error: insertError } = await supabase.from("live_stage_signals").insert({
        live_id: liveId,
        sender_id: user.id,
        receiver_id: receiverId,
        signal_type: signalType,
        signal_data: signalData,
      });
      
      if (insertError) {
        console.error(`[StageWebRTC] Error inserting ${signalType}:`, insertError);
      } else {
        console.log(`[StageWebRTC] Sent ${signalType} to ${receiverId}`);
      }
    } catch (err) {
      console.error("[StageWebRTC] Error sending signal:", err);
    }
  }, [liveId, user]);

  // Process pending ICE candidates
  const processPendingCandidates = useCallback(async () => {
    const pc = peerConnectionRef.current;
    if (!pc || !pc.remoteDescription) return;

    console.log(`[StageWebRTC] Processing ${pendingCandidatesRef.current.length} pending candidates`);
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
      console.log("[StageWebRTC] No peer connection, ignoring signal:", signalType);
      return;
    }

    try {
      console.log(`[StageWebRTC] Handling ${signalType} from ${senderId}`, {
        signalingState: pc.signalingState,
        connectionState: pc.connectionState,
      });
      
      if (signalType === "offer") {
        console.log("[StageWebRTC] Guest received offer, SDP length:", signalData?.sdp?.length);
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        console.log("[StageWebRTC] Guest sending answer, SDP length:", answer.sdp?.length);
        await sendSignal("answer", { type: answer.type, sdp: answer.sdp }, senderId);
        
      } else if (signalType === "answer") {
        console.log("[StageWebRTC] Streamer received answer, SDP length:", signalData?.sdp?.length);
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        await processPendingCandidates();
        
      } else if (signalType === "ice-candidate" && signalData) {
        try {
          const candidate = new RTCIceCandidate(signalData);
          if (pc.remoteDescription) {
            await pc.addIceCandidate(candidate);
            console.log("[StageWebRTC] Added ICE candidate successfully");
          } else {
            pendingCandidatesRef.current.push(candidate);
            console.log("[StageWebRTC] Queued ICE candidate (no remote description yet), total queued:", pendingCandidatesRef.current.length);
          }
        } catch (candidateErr) {
          console.warn("[StageWebRTC] Failed to add ICE candidate:", candidateErr);
        }
      }
    } catch (err) {
      console.error("[StageWebRTC] Error handling signal:", err);
    }
  }, [sendSignal, processPendingCandidates]);

  // Start connection as streamer (receives guest video)
  const startAsStreamer = useCallback(async (targetGuestId: string) => {
    if (!user || !liveId) return;
    if (hasInitializedRef.current) {
      console.log("[StageWebRTC] Already initialized as streamer, skipping");
      return;
    }

    hasInitializedRef.current = true;
    console.log("[StageWebRTC] Starting as streamer, waiting for guest:", targetGuestId);
    setIsConnecting(true);
    setError(null);

    try {
      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Handle remote tracks (guest video + audio)
      // IMPORTANT: Safari/mobile can fire ontrack without event.streams[0].
      // We merge tracks into a stable stream ref, then emit a *fresh* MediaStream
      // to force <video>.srcObject reattachment when tracks arrive later.
      pc.ontrack = (event) => {
        const track = event.track;
        const incomingStream = event.streams?.[0] ?? null;

        console.log("[StageWebRTC] 🎥 ontrack from guest:", track.kind, {
          trackId: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
          hasIncomingStream: !!incomingStream,
          incomingTracks: incomingStream?.getTracks().map((t) => ({ kind: t.kind, id: t.id })) ?? [],
        });

        track.onunmute = () => {
          console.log("[StageWebRTC] Track unmuted:", track.kind, track.id);
        };
        track.onmute = () => {
          console.log("[StageWebRTC] Track muted:", track.kind, track.id);
        };
        track.onended = () => {
          console.log("[StageWebRTC] Track ended:", track.kind, track.id);
        };

        // Initialize / reconcile the remote stream
        if (!remoteStreamRef.current) {
          remoteStreamRef.current = incomingStream ?? new MediaStream();
        }

        // Ensure we capture ALL tracks if the browser provides a stream
        if (incomingStream) {
          for (const t of incomingStream.getTracks()) {
            const already = remoteStreamRef.current.getTracks().some((x) => x.id === t.id);
            if (!already) remoteStreamRef.current.addTrack(t);
          }
        }

        // Ensure the individual track is present too
        const hasTrack = remoteStreamRef.current.getTracks().some((t) => t.id === track.id);
        if (!hasTrack) remoteStreamRef.current.addTrack(track);

        const mergedTracks = remoteStreamRef.current.getTracks();
        console.log("[StageWebRTC] ✅ Remote stream merged tracks:", mergedTracks.map((t) => ({
          kind: t.kind,
          id: t.id,
          enabled: t.enabled,
          readyState: t.readyState,
        })));

        // Emit a fresh MediaStream so React effects re-run and video elements re-attach reliably.
        const freshStream = new MediaStream(mergedTracks);
        setGuestStream(freshStream);
        onGuestStreamReady?.(freshStream);
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[StageWebRTC] Streamer sending ICE candidate:", event.candidate.candidate?.substring(0, 50));
          sendSignal("ice-candidate", event.candidate.toJSON(), targetGuestId);
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
          setIsConnecting(false);
          if (state === "failed") {
            setError("Connection failed");
          }
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[StageWebRTC] ICE connection state:", pc.iceConnectionState);
      };

      pc.onicegatheringstatechange = () => {
        console.log("[StageWebRTC] ICE gathering state:", pc.iceGatheringState);
      };

      pc.onnegotiationneeded = () => {
        console.log("[StageWebRTC] Negotiation needed event");
      };

      // Add transceiver for receiving video (important for receive-only)
      pc.addTransceiver('video', { direction: 'recvonly' });
      pc.addTransceiver('audio', { direction: 'recvonly' });
      console.log("[StageWebRTC] Added recvonly transceivers for audio/video");

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
            console.log("[StageWebRTC] Streamer received signal:", signal.signal_type);
            if (signal.live_id === liveId) {
              handleSignal(signal.signal_type, signal.signal_data, signal.sender_id);
            }
          }
        )
        .subscribe((status) => {
          console.log("[StageWebRTC] Streamer channel status:", status);
        });

      channelRef.current = channel;

      // Create and send offer to guest
      console.log("[StageWebRTC] Creating offer for guest...");
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      console.log("[StageWebRTC] Sending offer to guest:", targetGuestId, "SDP length:", offer.sdp?.length);
      await sendSignal("offer", { type: offer.type, sdp: offer.sdp }, targetGuestId);

    } catch (err: any) {
      console.error("[StageWebRTC] Error starting as streamer:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      hasInitializedRef.current = false;
    }
  }, [user, liveId, sendSignal, handleSignal, onGuestStreamReady]);

  // Start connection as guest (sends video to streamer)
  const startAsGuest = useCallback(async (streamerId: string) => {
    if (!user || !liveId) return;
    if (hasInitializedRef.current) {
      console.log("[StageWebRTC] Already initialized as guest, skipping");
      return;
    }

    hasInitializedRef.current = true;
    console.log("[StageWebRTC] Starting as guest, sending video to:", streamerId);
    setIsConnecting(true);
    setError(null);

    try {
      // Get local video/audio stream
      console.log("[StageWebRTC] Guest requesting camera access...");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      console.log("[StageWebRTC] Guest got camera stream", {
        videoTracks: stream.getVideoTracks().map((t) => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
        audioTracks: stream.getAudioTracks().map((t) => ({ id: t.id, enabled: t.enabled, readyState: t.readyState })),
      });

      if (stream.getAudioTracks().length === 0) {
        console.warn("[StageWebRTC] Guest stream has NO audio track - user may have denied mic permission");
      }

      setLocalStream(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks (video + audio)
      stream.getTracks().forEach((track) => {
        console.log("[StageWebRTC] Guest addTrack:", track.kind, {
          trackId: track.id,
          enabled: track.enabled,
          readyState: track.readyState,
        });
        pc.addTrack(track, stream);
      });

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          console.log("[StageWebRTC] Guest sending ICE candidate:", event.candidate.candidate?.substring(0, 50));
          sendSignal("ice-candidate", event.candidate.toJSON(), streamerId);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        console.log("[StageWebRTC] Guest connection state:", state);
        
        if (state === "connected") {
          setIsConnected(true);
          setIsConnecting(false);
        } else if (state === "disconnected" || state === "failed") {
          setIsConnected(false);
          setIsConnecting(false);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log("[StageWebRTC] Guest ICE connection state:", pc.iceConnectionState);
      };

      // Subscribe to signals BEFORE checking for existing offer
      console.log("[StageWebRTC] Guest subscribing to signals...");
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
            console.log("[StageWebRTC] Guest received signal:", signal.signal_type);
            if (signal.live_id === liveId) {
              handleSignal(signal.signal_type, signal.signal_data, signal.sender_id);
            }
          }
        )
        .subscribe((status) => {
          console.log("[StageWebRTC] Guest channel status:", status);
        });

      channelRef.current = channel;

      // Wait a bit for subscription to be ready
      await new Promise(resolve => setTimeout(resolve, 500));

      // Check for existing offer from streamer
      console.log("[StageWebRTC] Guest checking for existing offer...");
      const { data: existingSignals, error: fetchError } = await supabase
        .from("live_stage_signals")
        .select("*")
        .eq("live_id", liveId)
        .eq("receiver_id", user.id)
        .eq("signal_type", "offer")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError) {
        console.error("[StageWebRTC] Error fetching existing signals:", fetchError);
      } else if (existingSignals && existingSignals.length > 0) {
        console.log("[StageWebRTC] Found existing offer, processing...");
        await handleSignal("offer", existingSignals[0].signal_data, existingSignals[0].sender_id);
      } else {
        console.log("[StageWebRTC] No existing offer found, waiting for realtime signal...");
      }

    } catch (err: any) {
      console.error("[StageWebRTC] Error starting as guest:", err);
      setError(err.message || "Failed to connect");
      setIsConnecting(false);
      hasInitializedRef.current = false;
    }
  }, [user, liveId, sendSignal, handleSignal]);

  // Effect: Streamer (re)starts connection when guest changes
  useEffect(() => {
    if (!isStreamer || !user?.id || !liveId) return;

    const prevGuestId = prevGuestIdRef.current;

    // If guest is cleared, close any existing connection
    if (!guestId) {
      if (prevGuestId) {
        console.log("[StageWebRTC] Streamer guest cleared -> cleanup");
        prevGuestIdRef.current = null;
        cleanup();
      }
      return;
    }

    // If a different guest is now on stage, reset and renegotiate
    if (prevGuestId && prevGuestId !== guestId) {
      console.log("[StageWebRTC] Streamer guest changed", { from: prevGuestId, to: guestId });
      cleanup();
    }

    prevGuestIdRef.current = guestId;

    console.log("[StageWebRTC] Streamer effect triggered, guestId:", guestId);
    startAsStreamer(guestId);
  }, [isStreamer, guestId, user?.id, liveId, cleanup, startAsStreamer]);

  // Effect: Guest starts connection when they go on stage
  useEffect(() => {
    if (!isOnStage || isStreamer || !user || !liveId) return;

    console.log("[StageWebRTC] Guest effect triggered, fetching streamer...");
    
    const fetchStreamerAndConnect = async () => {
      const { data: live } = await supabase
        .from("lives")
        .select("streamer_id")
        .eq("id", liveId)
        .maybeSingle();

      if (live?.streamer_id) {
        console.log("[StageWebRTC] Found streamer:", live.streamer_id);
        startAsGuest(live.streamer_id);
      } else {
        console.error("[StageWebRTC] Could not find streamer for live:", liveId);
      }
    };

    fetchStreamerAndConnect();
    
    // No cleanup here - cleanup only on unmount
  }, [isOnStage, isStreamer, user?.id, liveId]); // Use user?.id instead of user object

  // Final cleanup on unmount
  useEffect(() => {
    return () => {
      console.log("[StageWebRTC] Component unmounting, running full cleanup");
      fullCleanup();
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

  // Expose peer connection for quality monitoring
  const getPeerConnection = useCallback(() => peerConnectionRef.current, []);

  return {
    guestStream,
    localStream,
    isConnected,
    isConnecting,
    isMuted,
    error,
    cleanup,
    toggleMute,
    getPeerConnection,
  };
};
