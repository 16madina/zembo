import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Room, RoomEvent, Track } from "livekit-client";
import { RealtimeChannel } from "@supabase/supabase-js";

export type RandomCallStatus = 
  | "idle"
  | "searching"
  | "matched"
  | "in_call"
  | "deciding"
  | "completed"
  | "cancelled"
  | "error";

interface RpcResult {
  action?: string;
  room_name?: string;
  session_id?: string;
  matched_user_id?: string;
  queue_id?: string;
  completed?: boolean;
  matched?: boolean;
  success?: boolean;
}

interface UseRandomCallLiveKitReturn {
  status: RandomCallStatus;
  roomName: string | null;
  sessionId: string | null;
  matchedUserId: string | null;
  isConnected: boolean;
  isMuted: boolean;
  audioLevel: number;
  error: string | null;
  timeRemaining: number;
  startSearch: (preference: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  submitDecision: (decision: "yes" | "no" | "continue") => Promise<void>;
}

const CALL_DURATION_SECONDS = 90; // 1m30

export const useRandomCallLiveKit = (): UseRandomCallLiveKitReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<RandomCallStatus>("idle");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(CALL_DURATION_SECONDS);
  const [userGender, setUserGender] = useState<string | null>(null);

  const roomRef = useRef<Room | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // Fetch user gender on mount
  useEffect(() => {
    if (!user?.id) return;
    
    supabase
      .from("profiles")
      .select("gender")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.gender) {
          setUserGender(data.gender);
        }
      });
  }, [user?.id]);

  // Cleanup function - does NOT cancel queue entry (only cancelSearch does that)
  const cleanup = useCallback(async (shouldCancelQueue = false) => {
    console.log("[random-call-lk]", "cleanup called", { shouldCancelQueue });

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    if (channelRef.current) {
      channelRef.current.unsubscribe();
      channelRef.current = null;
    }

    // Only cancel queue entry when explicitly requested
    if (shouldCancelQueue && user?.id) {
      await supabase.rpc("random_call_cancel", { p_user_id: user.id });
    }

    setIsConnected(false);
    setAudioLevel(0);
  }, [user?.id]);

  // Start search for a random call
  const startSearch = useCallback(async (preference: string) => {
    if (!user?.id || !userGender) {
      setError("Profil incomplet");
      return;
    }

    setStatus("searching");
    setError(null);
    setTimeRemaining(CALL_DURATION_SECONDS);

    console.log("[random-call-lk]", "startSearch", { preference, gender: userGender });

    try {
      // Call the atomic RPC function
      const { data, error: rpcError } = await supabase.rpc("random_call_find_or_create_match", {
        p_user_id: user.id,
        p_user_gender: userGender,
        p_looking_for: preference,
      });

      if (rpcError) {
        console.error("[random-call-lk]", "RPC error", rpcError);
        setError("Erreur lors de la recherche");
        setStatus("error");
        return;
      }

      const result = data as RpcResult;
      console.log("[random-call-lk]", "RPC result", result);

      if (result.action === "matched" && result.room_name) {
        // Immediate match found
        setRoomName(result.room_name);
        setSessionId(result.session_id || null);
        setMatchedUserId(result.matched_user_id || null);
        setStatus("matched");
        
        // Join the LiveKit room
        await joinLiveKitRoom(result.room_name);
      } else if (result.action === "waiting") {
        // Subscribe to realtime updates for our queue entry
        subscribeToQueueUpdates(user.id);
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[random-call-lk]", "startSearch error", err);
      setError(message);
      setStatus("error");
    }
  }, [user?.id, userGender]);

  // Subscribe to realtime updates on our queue entry
  const subscribeToQueueUpdates = useCallback((userId: string) => {
    console.log("[random-call-lk]", "subscribing to queue updates", { userId });

    const channel = supabase
      .channel(`random-call-queue-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "random_call_queue",
          filter: `user_id=eq.${userId}`,
        },
        async (payload) => {
          const updated = payload.new as { status: string; room_name: string | null };
          console.log("[random-call-lk]", "queue update received", updated);

          if (updated.status === "matched" && updated.room_name) {
            setRoomName(updated.room_name);
            setStatus("matched");
            
            // Fetch session info
            const { data: sessions } = await supabase
              .from("random_call_sessions")
              .select("id, user1_id, user2_id")
              .eq("room_name", updated.room_name)
              .single();

            if (sessions) {
              setSessionId(sessions.id);
              const otherId = sessions.user1_id === userId ? sessions.user2_id : sessions.user1_id;
              setMatchedUserId(otherId);
            }

            // Join the LiveKit room
            await joinLiveKitRoom(updated.room_name);
          }
        }
      )
      .subscribe((state) => {
        console.log("[random-call-lk]", "queue channel state", state);
      });

    channelRef.current = channel;
  }, []);

  // Join LiveKit room for audio call
  const joinLiveKitRoom = useCallback(async (liveKitRoomName: string) => {
    if (!user?.id) return;

    console.log("[random-call-lk]", "joining LiveKit room", { roomName: liveKitRoomName });

    try {
      // Get LiveKit token from edge function - pass isRandomCall for audio-only permissions
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("livekit-token", {
        body: { roomName: liveKitRoomName, isRandomCall: true },
      });

      if (tokenError || !tokenData?.token) {
        throw new Error("Failed to get LiveKit token");
      }

      const room = new Room();
      roomRef.current = room;

      // Handle remote tracks (other participant's audio)
      room.on(RoomEvent.TrackSubscribed, (track) => {
        console.log("[random-call-lk]", "track subscribed", { kind: track.kind });
        
        if (track.kind === Track.Kind.Audio) {
          // Attach audio to a hidden element
          const audioElement = track.attach();
          audioElement.style.display = "none";
          document.body.appendChild(audioElement);
          audioElement.play().catch(console.error);

          // Monitor remote audio level
          if (track.mediaStream) {
            setupRemoteAudioMonitoring(track.mediaStream);
          }
        }
      });

      room.on(RoomEvent.Connected, () => {
        console.log("[random-call-lk]", "connected to LiveKit room");
        setIsConnected(true);
        setStatus("in_call");
        startCallTimer();
      });

      room.on(RoomEvent.Disconnected, () => {
        console.log("[random-call-lk]", "disconnected from LiveKit room");
        setIsConnected(false);
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[random-call-lk]", "participant connected", { id: participant.identity });
      });

      // Connect to the room
      const livekitUrl = tokenData.url || import.meta.env.VITE_LIVEKIT_URL || "wss://zembo-app-5cqbwowc.livekit.cloud";
      await room.connect(livekitUrl, tokenData.token);

      // Publish only audio (no video for random calls)
      await room.localParticipant.setMicrophoneEnabled(true);
      console.log("[random-call-lk]", "microphone enabled");

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de rejoindre l'appel";
      console.error("[random-call-lk]", "joinLiveKitRoom error", err);
      setError(message);
      setStatus("error");
    }
  }, [user?.id]);

  // Setup remote audio monitoring for visualization
  const setupRemoteAudioMonitoring = useCallback((stream: MediaStream) => {
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
      console.error("[random-call-lk]", "audio monitoring error", err);
    }
  }, []);

  // Start call timer
  const startCallTimer = useCallback(() => {
    setTimeRemaining(CALL_DURATION_SECONDS);
    
    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          // Timer ended - show decision screen
          setStatus("deciding");
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // Cancel search - explicitly cancels queue entry
  const cancelSearch = useCallback(async () => {
    console.log("[random-call-lk]", "cancelSearch");
    await cleanup(true); // Pass true to cancel queue entry
    setStatus("cancelled");
    setTimeout(() => setStatus("idle"), 500);
  }, [cleanup]);

  // End call - also cancels queue entry
  const endCall = useCallback(() => {
    console.log("[random-call-lk]", "endCall");
    cleanup(true);
    setStatus("completed");
    setTimeout(() => setStatus("idle"), 500);
  }, [cleanup]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    if (!roomRef.current) return;

    const newMuted = !isMuted;
    await roomRef.current.localParticipant.setMicrophoneEnabled(!newMuted);
    setIsMuted(newMuted);
  }, [isMuted]);

  // Submit decision
  const submitDecision = useCallback(async (decision: "yes" | "no" | "continue") => {
    if (!sessionId || !user?.id) return;

    console.log("[random-call-lk]", "submitDecision", { decision, sessionId });

    try {
      const { data, error: rpcError } = await supabase.rpc("submit_random_call_decision", {
        p_session_id: sessionId,
        p_user_id: user.id,
        p_decision: decision,
      });

      if (rpcError) {
        console.error("[random-call-lk]", "decision error", rpcError);
        return;
      }

      const result = data as RpcResult;
      console.log("[random-call-lk]", "decision result", result);

      if (result.completed) {
        if (result.matched) {
          // Mutual match - keep connection or celebrate
          console.log("[random-call-lk]", "MATCH!");
        }
        await cleanup(true);
        setStatus("completed");
      }
    } catch (err) {
      console.error("[random-call-lk]", "submitDecision error", err);
    }
  }, [sessionId, user?.id, cleanup]);

  // Cleanup on unmount - but don't cancel queue (user might be just navigating)
  useEffect(() => {
    return () => {
      cleanup(false);
    };
  }, [cleanup]);

  return {
    status,
    roomName,
    sessionId,
    matchedUserId,
    isConnected,
    isMuted,
    audioLevel,
    error,
    timeRemaining,
    startSearch,
    cancelSearch,
    endCall,
    toggleMute,
    submitDecision,
  };
};
