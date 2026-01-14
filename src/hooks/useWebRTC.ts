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

  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const isStartingRef = useRef(false);
  const isCleaningUpRef = useRef(false);

  // Refs to track values for cleanup without causing dependency loops
  const localStreamRef = useRef<MediaStream | null>(null);
  const sessionIdRef = useRef(sessionId);
  const otherUserIdRef = useRef(otherUserId);
  const userIdRef = useRef(user?.id);
  const isInitiatorRef = useRef(isInitiator);

  // Update refs when props change
  useEffect(() => {
    localStreamRef.current = localStream;
  }, [localStream]);

  useEffect(() => {
    sessionIdRef.current = sessionId;
    otherUserIdRef.current = otherUserId;
    userIdRef.current = user?.id;
    isInitiatorRef.current = isInitiator;
  }, [sessionId, otherUserId, user?.id, isInitiator]);

  // Cleanup function - stable, no dependencies
  const cleanup = useCallback(() => {
    if (isCleaningUpRef.current) return;
    isCleaningUpRef.current = true;

    console.log("[random-call]", "webrtc cleanup called");
    
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
      remoteAudioRef.current.remove();
      remoteAudioRef.current = null;
    }

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
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
    isCleaningUpRef.current = false;

    setRemoteStream(null);
    setIsConnected(false);
    setIsConnecting(false);
  }, []);

  // Send signaling data - use refs for stable function
  const sendSignal = useCallback(async (signalType: string, signalData: any) => {
    const sid = sessionIdRef.current;
    const uid = userIdRef.current;
    const otherId = otherUserIdRef.current;
    
    if (!sid || !uid || !otherId) return;

    try {
      await supabase.from("webrtc_signals").insert({
        session_id: sid,
        sender_id: uid,
        receiver_id: otherId,
        signal_type: signalType,
        signal_data: signalData,
      });
    } catch (err) {
      console.error("Error sending signal:", err);
    }
  }, []);

  // Handle incoming signals - use refs for stable function
  const handleSignal = useCallback(async (signalType: string, signalData: unknown) => {
    const pc = peerConnectionRef.current;
    if (!pc) {
      console.log("[random-call]", "handleSignal: no peer connection yet", { signalType });
      return;
    }

    console.log("[random-call]", "handleSignal", { signalType, signalingState: pc.signalingState });

    try {
      if (signalType === "offer") {
        await pc.setRemoteDescription(new RTCSessionDescription(signalData as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        await sendSignal("answer", answer);
        console.log("[random-call]", "handleSignal: sent answer");
      } else if (signalType === "answer") {
        if (pc.signalingState === "have-local-offer") {
          await pc.setRemoteDescription(new RTCSessionDescription(signalData as RTCSessionDescriptionInit));
          console.log("[random-call]", "handleSignal: set remote answer");
        }
      } else if (signalType === "ice-candidate" && signalData) {
        await pc.addIceCandidate(new RTCIceCandidate(signalData as RTCIceCandidateInit));
      }
    } catch (err: unknown) {
      console.log("[random-call]", "handleSignal error", { signalType, error: (err as Error)?.message });
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

  // Start the call - use refs to avoid dependency changes
  const startCall = useCallback(async () => {
    const sid = sessionIdRef.current;
    const uid = userIdRef.current;
    const otherId = otherUserIdRef.current;
    const initiator = isInitiatorRef.current;

    if (!sid || !uid || !otherId) {
      setError("Session not ready");
      return;
    }

    // Prevent double-start (React strict mode / fast re-renders)
    if (isStartingRef.current || peerConnectionRef.current) {
      console.log("[random-call]", "webrtc startCall skipped (already starting/started)");
      return;
    }

    isStartingRef.current = true;

    setIsConnecting(true);
    setError(null);

    console.log("[random-call]", "webrtc startCall", { sessionId: sid, isInitiator: initiator });

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
      
      localStreamRef.current = stream;
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

        console.log("[random-call]", "webrtc ontrack", {
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
            .then(() => console.log("[random-call]", "webrtc remote audio playing"))
            .catch((err) => {
              console.log("[random-call]", "webrtc audio play blocked", String(err));
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
        console.log("[random-call]", "webrtc connection state", { state });
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
        .channel(`webrtc-${sid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "webrtc_signals",
            filter: `receiver_id=eq.${uid}`,
          },
          (payload) => {
            const signal = payload.new as { session_id: string; signal_type: string; signal_data: unknown };
            console.log("[random-call]", "webrtc signal received", { signalType: signal.signal_type, session: signal.session_id });
            if (signal.session_id === sid) {
              handleSignal(signal.signal_type, signal.signal_data);
            }
          }
        )
        .subscribe((state) => {
          console.log("[random-call]", "webrtc signal channel", { state });
        });

      channelRef.current = channel;

      // If initiator, create and send offer
      if (initiator) {
        console.log("[random-call]", "webrtc: I am initiator, creating offer");
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await sendSignal("offer", offer);
        console.log("[random-call]", "webrtc: offer sent");
      } else {
        console.log("[random-call]", "webrtc: I am NOT initiator, waiting for offer");
        // Check for existing offer (in case it arrived before we subscribed)
        const { data: existingSignals, error: sigErr } = await supabase
          .from("webrtc_signals")
          .select("*")
          .eq("session_id", sid)
          .eq("receiver_id", uid)
          .eq("signal_type", "offer")
          .order("created_at", { ascending: false })
          .limit(1);

        if (sigErr) {
          console.log("[random-call]", "webrtc: error fetching existing offer", sigErr.message);
        }

        if (existingSignals && existingSignals.length > 0) {
          console.log("[random-call]", "webrtc: found existing offer, handling it");
          await handleSignal("offer", existingSignals[0].signal_data);
        } else {
          console.log("[random-call]", "webrtc: no existing offer yet, will wait for realtime");
        }
      }

    } catch (err: any) {
      console.error("Error starting call:", err);
      console.log("[random-call]", "webrtc startCall error", {
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
  }, [sendSignal, handleSignal, setupAudioLevelMonitoring, cleanup, onConnectionStateChange]);

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
