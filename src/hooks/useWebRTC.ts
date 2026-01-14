import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

interface UseWebRTCProps {
  sessionId: string | null;
  otherUserId: string | null;
  isInitiator: boolean;
  onConnectionStateChange?: (state: RTCPeerConnectionState) => void;
}

interface UseWebRTCReturn {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isConnected: boolean;
  isConnecting: boolean;
  isMuted: boolean;
  audioLevel: number;
  error: string | null;
  startCall: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
}

// Free STUN servers for NAT traversal
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
    { urls: "stun:stun2.l.google.com:19302" },
  ],
};

export const useWebRTC = ({
  sessionId,
  otherUserId,
  isInitiator,
  onConnectionStateChange,
}: UseWebRTCProps): UseWebRTCReturn => {
  const { user } = useAuth();
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const log = useCallback((message: string, data?: unknown) => {
    // Reuse the same prefix so it shows in the Random debug panel
    if (data === undefined) {
      console.log("[random-call]", message);
    } else {
      console.log("[random-call]", message, data);
    }
  }, []);

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStartingRef = useRef(false);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (remoteAudioRef.current) {
      try {
        remoteAudioRef.current.pause();
        remoteAudioRef.current.srcObject = null;
      } catch {
        // ignore
      }
      // Remove from DOM to avoid leaks
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    if (localStream) {
      localStream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }

    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    isStartingRef.current = false;

    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
  }, [localStream]);

  // Send signaling data
  const sendSignal = useCallback(async (signalType: string, signalData: any) => {
    if (!sessionId || !user || !otherUserId) return;

    try {
      await supabase.from("webrtc_signals").insert({
        session_id: sessionId,
        sender_id: user.id,
        receiver_id: otherUserId,
        signal_type: signalType,
        signal_data: signalData,
      });
    } catch (err) {
      console.error("Error sending signal:", err);
    }
  }, [sessionId, user, otherUserId]);

  // Handle incoming signals
  const handleSignal = useCallback(async (signalType: string, signalData: any) => {
    const pc = peerConnectionRef.current;
    if (!pc) return;

    try {
      if (signalType === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
      } else if (signalType === "answer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData));
      } else if (signalType === "ice-candidate" && signalData) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData));
      }
    } catch (err) {
      console.error("Error handling signal:", err);
    }
  }, [sendSignal]);

  // Setup audio level monitoring
  const setupAudioLevelMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();
      analyserRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyserRef.current);
      analyserRef.current.fftSize = 256;

      const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);

      const updateLevel = () => {
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length;
          setAudioLevel(average);
        }
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.error("Error setting up audio monitoring:", err);
    }
  }, []);

  // Start the call
  const startCall = useCallback(async () => {
    if (!sessionId || !user || !otherUserId) {
      setError("Session not ready");
      return;
    }

    // Prevent double-start (React strict mode / fast re-renders)
    if (isStartingRef.current || peerConnectionRef.current) {
      log("webrtc startCall skipped (already starting/started)");
      return;
    }

    isStartingRef.current = true;

    setIsConnecting(true);
    setError(null);

    log("webrtc startCall", { sessionId, isInitiator });

    try {
      // Get audio stream
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      
      setLocalStream(stream);
      setupAudioLevelMonitoring(stream);

      // Create peer connection
      const pc = new RTCPeerConnection(ICE_SERVERS);
      peerConnectionRef.current = pc;

      // Add local stream tracks
      stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
      });

      // Handle remote stream
      pc.ontrack = (event) => {
        const [incomingRemoteStream] = event.streams;
        setRemoteStream(incomingRemoteStream);

        log("webrtc ontrack", {
          tracks: incomingRemoteStream.getTracks().map((t) => ({ kind: t.kind, enabled: t.enabled })),
        });

        // iOS Safari is picky: keep a persistent <audio> element attached to DOM
        if (!remoteAudioRef.current) {
          const audioEl = document.createElement("audio");
          audioEl.autoplay = true;
          (audioEl as HTMLMediaElement & { playsInline?: boolean }).playsInline = true;
          audioEl.muted = false;
          audioEl.style.display = "none";
          document.body.appendChild(audioEl);
          remoteAudioRef.current = audioEl;
        }

        remoteAudioRef.current.srcObject = incomingRemoteStream;

        const tryPlay = () => {
          remoteAudioRef.current
            ?.play()
            .then(() => log("webrtc remote audio playing"))
            .catch((err) => {
              log("webrtc audio play blocked", String(err));
              // Common on iOS: need a user gesture; retry on next tap
              const retryOnce = () => {
                remoteAudioRef.current?.play().catch(() => undefined);
              };
              document.addEventListener("touchend", retryOnce, { once: true });
              document.addEventListener("click", retryOnce, { once: true });
            });
        };

        tryPlay();
      };

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          sendSignal("ice-candidate", event.candidate);
        }
      };

      // Handle connection state changes
      pc.onconnectionstatechange = () => {
        const state = pc.connectionState;
        log("webrtc connection state", { state });
        onConnectionStateChange?.(state);

        if (state === "connected") {
          setIsConnected(true);
          setIsConnecting(false);
          isStartingRef.current = false;
        } else if (state === "disconnected" || state === "failed") {
          setIsConnected(false);
          setError("Connection lost");
          isStartingRef.current = false;
        }
      };

      // Subscribe to signals from the other user
      const channel = supabase
        .channel(`webrtc-${sessionId}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "webrtc_signals",
            filter: `receiver_id=eq.${user.id}`,
          },
          (payload) => {
            const signal = payload.new as any;
            if (signal.session_id === sessionId) {
              handleSignal(signal.signal_type, signal.signal_data);
            }
          }
        )
        .subscribe();

      channelRef.current = channel;

      // If initiator, create and send offer
      if (isInitiator) {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
      } else {
        // Check for existing offer
        const { data: existingSignals } = await supabase
          .from("webrtc_signals")
          .select("*")
          .eq("session_id", sessionId)
          .eq("receiver_id", user.id)
          .eq("signal_type", "offer")
          .order("created_at", { ascending: false })
          .limit(1);

        if (existingSignals && existingSignals.length > 0) {
          await handleSignal("offer", existingSignals[0].signal_data);
        }
      }

    } catch (err: any) {
      console.error("Error starting call:", err);
      log("webrtc startCall error", {
        name: err?.name,
        message: err?.message,
      });
      setError(err.message || "Failed to start call");
      setIsConnecting(false);
      cleanup();
    } finally {
      // If we never reached "connected", allow retry
      if (!peerConnectionRef.current || peerConnectionRef.current.connectionState !== "connected") {
        isStartingRef.current = false;
      }
    }
  }, [sessionId, user, otherUserId, isInitiator, sendSignal, handleSignal, setupAudioLevelMonitoring, cleanup, onConnectionStateChange, log]);

  // End the call
  const endCall = useCallback(() => {
    cleanup();
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
      }
    }
  }, [localStream]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    localStream,
    remoteStream,
    isConnected,
    isConnecting,
    isMuted,
    audioLevel,
    error,
    startCall,
    endCall,
    toggleMute,
  };
};
