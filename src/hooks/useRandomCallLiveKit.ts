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
  rejected?: boolean;
  continued?: boolean;
  waiting?: boolean;
  success?: boolean;
}

interface UseRandomCallLiveKitReturn {
  status: RandomCallStatus;
  roomName: string | null;
  sessionId: string | null;
  matchedUserId: string | null;
  isConnected: boolean;
  isMuted: boolean;
  isSpeakerOn: boolean;
  audioLevel: number;
  error: string | null;
  timeRemaining: number;
  decisionResult: "matched" | "rejected" | "continued" | null;
  waitingForOther: boolean;
  otherUserRejected: boolean;
  startSearch: (preference: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  endCall: () => void;
  toggleMute: () => void;
  toggleSpeaker: () => Promise<void>;
  submitDecision: (decision: "yes" | "no" | "continue") => Promise<void>;
}

const CALL_DURATION_SECONDS = 90; // 1m30
const SEARCH_TIMEOUT_SECONDS = 120; // 2 minutes
const SEARCH_POLL_INTERVAL_MS = 1500; // Poll every 1.5s
const INITIAL_DELAY_MS = 1500; // Wait before first match attempt
const HEARTBEAT_INTERVAL_MS = 5000; // Update queue entry every 5s

export const useRandomCallLiveKit = (): UseRandomCallLiveKitReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<RandomCallStatus>("idle");
  const [roomName, setRoomName] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [matchedUserId, setMatchedUserId] = useState<string | null>(null);
  // isConnected = true only when a remote participant has joined (real peer present)
  const [isConnected, setIsConnected] = useState(false);
  const [, setIsRoomConnected] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(CALL_DURATION_SECONDS);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [otherUserRejected, setOtherUserRejected] = useState(false);

  const [decisionResult, setDecisionResult] = useState<"matched" | "rejected" | "continued" | null>(null);

  const roomRef = useRef<Room | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const sessionChannelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionEndsAtRef = useRef<Date | null>(null);
  // Ref to store joinLiveKitRoom function to avoid circular dependency
  const joinLiveKitRoomRef = useRef<((roomName: string) => Promise<void>) | null>(null);

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

    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
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

    if (sessionChannelRef.current) {
      sessionChannelRef.current.unsubscribe();
      sessionChannelRef.current = null;
    }

    // Only cancel queue entry when explicitly requested
    if (shouldCancelQueue && user?.id) {
      await supabase.rpc("random_call_cancel", { p_user_id: user.id });
    }

    setIsConnected(false);
    setIsRoomConnected(false);
    setAudioLevel(0);
    sessionEndsAtRef.current = null;
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

    // Helper to poll for matches
    const pollForMatch = async () => {
      try {
        const { data, error: rpcError } = await supabase.rpc("random_call_find_or_create_match", {
          p_user_id: user.id,
          p_user_gender: userGender,
          p_looking_for: preference,
        });

        if (rpcError) {
          console.error("[random-call-lk]", "RPC error", rpcError);
          return;
        }

        const result = data as RpcResult;
        console.log("[random-call-lk]", "poll result", result);

        if (result.action === "matched" && result.room_name) {
          // Stop polling/heartbeat
          if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
          if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
          if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

          setRoomName(result.room_name);
          setSessionId(result.session_id || null);
          setMatchedUserId(result.matched_user_id || null);
          setStatus("matched");
          
          await joinLiveKitRoom(result.room_name);
        }
      } catch (err) {
        console.error("[random-call-lk]", "poll error", err);
      }
    };

    // Heartbeat to keep queue entry fresh
    const heartbeat = async () => {
      try {
        await supabase.rpc("random_call_heartbeat", { p_user_id: user.id });
      } catch (err) {
        console.error("[random-call-lk]", "heartbeat error", err);
      }
    };

    try {
      // Initial call to RPC (UPSERT into queue)
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
      console.log("[random-call-lk]", "initial RPC result", result);

      if (result.action === "matched" && result.room_name) {
        // Immediate match found
        setRoomName(result.room_name);
        setSessionId(result.session_id || null);
        setMatchedUserId(result.matched_user_id || null);
        setStatus("matched");
        
        // Fetch ends_at for timer synchronization
        if (result.session_id) {
          const { data: sessionData } = await supabase
            .from("random_call_sessions")
            .select("ends_at")
            .eq("id", result.session_id)
            .single();
          
          if (sessionData?.ends_at) {
            sessionEndsAtRef.current = new Date(sessionData.ends_at);
          }
        }
        
        await joinLiveKitRoom(result.room_name);
        return;
      }

      // No immediate match - set up polling, heartbeat, realtime, and timeout
      subscribeToQueueUpdates(user.id);

      // Wait initial delay before polling (let other user join queue)
      await new Promise(resolve => setTimeout(resolve, INITIAL_DELAY_MS));

      // Start periodic polling
      pollIntervalRef.current = setInterval(pollForMatch, SEARCH_POLL_INTERVAL_MS);

      // Start heartbeat
      heartbeatIntervalRef.current = setInterval(heartbeat, HEARTBEAT_INTERVAL_MS);

      // Set search timeout
      searchTimeoutRef.current = setTimeout(async () => {
        console.log("[random-call-lk]", "search timeout reached");
        await cleanup(true);
        setStatus("error");
        setError("Aucun utilisateur trouvé. Réessayez plus tard.");
      }, SEARCH_TIMEOUT_SECONDS * 1000);

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Erreur inconnue";
      console.error("[random-call-lk]", "startSearch error", err);
      setError(message);
      setStatus("error");
    }
  }, [user?.id, userGender, cleanup]);

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
            // Stop polling/heartbeat/timeout
            if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
            if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
            if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

            setRoomName(updated.room_name);
            setStatus("matched");
            
            // Fetch session info including ends_at - CRITICAL: Get the matched user
            const { data: sessions, error: sessionError } = await supabase
              .from("random_call_sessions")
              .select("id, user1_id, user2_id, ends_at")
              .eq("room_name", updated.room_name)
              .eq("status", "active")
              .single();

            if (sessionError) {
              console.error("[random-call-lk]", "failed to fetch session", sessionError);
            }

            if (sessions) {
              console.log("[random-call-lk]", "session found via realtime", {
                sessionId: sessions.id,
                user1: sessions.user1_id,
                user2: sessions.user2_id,
                currentUser: userId
              });
              
              setSessionId(sessions.id);
              // Determine which user is the "other" user
              const otherId = sessions.user1_id === userId ? sessions.user2_id : sessions.user1_id;
              setMatchedUserId(otherId);
              console.log("[random-call-lk]", "matched user id set", { otherId });
              
              // Store ends_at for synchronized timer
              if (sessions.ends_at) {
                sessionEndsAtRef.current = new Date(sessions.ends_at);
              }
            } else {
              console.warn("[random-call-lk]", "no active session found for room", updated.room_name);
            }

            // Join the LiveKit room using ref to avoid circular dependency
            if (joinLiveKitRoomRef.current) {
              await joinLiveKitRoomRef.current(updated.room_name);
            }
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
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[random-call-lk]", "🎵 track subscribed", { 
          kind: track.kind, 
          participantId: participant.identity,
          trackSid: publication.trackSid 
        });

        if (track.kind === Track.Kind.Audio) {
          // Mark as connected when we receive audio track
          console.log("[random-call-lk]", "✓ Audio track received - marking as connected");
          setIsConnected(true);
          
          // Create audio element with proper attributes for mobile
          const audioElement = document.createElement("audio");
          audioElement.style.display = "none";
          audioElement.setAttribute("playsinline", "");
          audioElement.setAttribute("autoplay", "");
          audioElement.muted = false;
          audioElement.volume = 1.0;
          document.body.appendChild(audioElement);
          
          // Attach track to audio element
          track.attach(audioElement);

          console.log("[random-call-lk]", "audio element attached", { 
            muted: audioElement.muted,
            volume: audioElement.volume,
            paused: audioElement.paused,
            readyState: audioElement.readyState
          });

          const tryPlay = () => {
            audioElement
              .play()
              .then(() => {
                console.log("[random-call-lk]", "✓ Remote audio playing successfully");
              })
              .catch((err) => {
                console.warn("[random-call-lk]", "⚠️ Remote audio play blocked:", String(err));
                // iOS/Android: Need user gesture to play audio
                const retryOnGesture = () => {
                  audioElement.play().then(() => {
                    console.log("[random-call-lk]", "✓ Remote audio playing after user gesture");
                  }).catch(() => undefined);
                  document.removeEventListener("touchstart", retryOnGesture);
                  document.removeEventListener("click", retryOnGesture);
                };
                document.addEventListener("touchstart", retryOnGesture, { once: true, passive: true });
                document.addEventListener("click", retryOnGesture, { once: true });
              });
          };

          // Small delay to ensure track is ready, then play
          setTimeout(tryPlay, 150);

          // Monitor remote audio level for visualization
          try {
            const stream = new MediaStream([track.mediaStreamTrack]);
            setupRemoteAudioMonitoring(stream);
          } catch (e) {
            console.warn("[random-call-lk]", "Failed to setup audio monitoring:", e);
          }
        }
      });

      // Also listen for TrackPublished to catch tracks that were published before we subscribed
      room.on(RoomEvent.TrackPublished, (publication, participant) => {
        console.log("[random-call-lk]", "📢 Track published", { 
          kind: publication.kind,
          participantId: participant.identity 
        });
      });

      // Connected to LiveKit server
      room.on(RoomEvent.Connected, () => {
        console.log("[random-call-lk]", "✓ Connected to LiveKit room");
        setIsRoomConnected(true);
        setStatus("in_call");
        startCallTimer();
        
        // Check if there are already remote participants (we joined late)
        const participantCount = room.remoteParticipants.size;
        if (participantCount > 0) {
          console.log("[random-call-lk]", "📍 Remote participants already present:", participantCount);
          setIsConnected(true);
          
          // Check for existing audio tracks and attach them
          room.remoteParticipants.forEach((participant) => {
            console.log("[random-call-lk]", "Checking tracks for participant:", participant.identity);
            participant.audioTrackPublications.forEach((publication) => {
              console.log("[random-call-lk]", "Audio publication:", { 
                isSubscribed: publication.isSubscribed,
                hasTrack: !!publication.track,
                trackSid: publication.trackSid
              });
              
              if (publication.track && publication.isSubscribed) {
                console.log("[random-call-lk]", "🔊 Attaching existing audio track from", participant.identity);
                
                // Create audio element explicitly
                const audioElement = document.createElement("audio");
                audioElement.style.display = "none";
                audioElement.setAttribute("playsinline", "");
                audioElement.setAttribute("autoplay", "");
                audioElement.muted = false;
                audioElement.volume = 1.0;
                document.body.appendChild(audioElement);
                
                // Attach track
                publication.track.attach(audioElement);
                
                // Try to play
                audioElement.play().then(() => {
                  console.log("[random-call-lk]", "✓ Existing audio track playing");
                }).catch((err) => {
                  console.warn("[random-call-lk]", "⚠️ Existing audio play blocked:", String(err));
                });
              }
            });
          });
        }
      });

      room.on(RoomEvent.Disconnected, (reason) => {
        console.log("[random-call-lk]", "disconnected from LiveKit room", { reason });
        setIsRoomConnected(false);
        setIsConnected(false);
      });

      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[random-call-lk]", "participant connected", { id: participant.identity });
        // A real peer is present now
        setIsConnected(true);
      });

      room.on(RoomEvent.ParticipantDisconnected, (participant) => {
        console.log("[random-call-lk]", "participant disconnected", { id: participant.identity });
        // If no remote participants left, go back to waiting state
        if (room.remoteParticipants.size === 0) {
          setIsConnected(false);
        }
      });

      // Connect to the room
      const livekitUrl = tokenData.url || import.meta.env.VITE_LIVEKIT_URL || "wss://zembo-app-5cqbwowc.livekit.cloud";
      console.log("[random-call-lk]", "connecting to LiveKit", { url: livekitUrl });
      await room.connect(livekitUrl, tokenData.token);

      // Publish only audio (no video for random calls)
      try {
        await room.localParticipant.setMicrophoneEnabled(true);
        console.log("[random-call-lk]", "microphone enabled");
      } catch (micErr) {
        console.log("[random-call-lk]", "microphone enable failed", micErr);
      }

    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de rejoindre l'appel";
      console.error("[random-call-lk]", "joinLiveKitRoom error", err);
      setError(message);
      setStatus("error");
    }
  }, [user?.id]);

  // Store joinLiveKitRoom in ref for use in callbacks
  joinLiveKitRoomRef.current = joinLiveKitRoom;

  // Setup remote audio monitoring for visualization
  const setupRemoteAudioMonitoring = useCallback((stream: MediaStream) => {
    try {
      audioContextRef.current = new AudioContext();

      // iOS/Safari often starts suspended until a user gesture
      const resumeAudio = () => {
        audioContextRef.current?.resume().catch(() => undefined);
      };
      if (audioContextRef.current.state === "suspended") {
        resumeAudio();
        document.addEventListener("touchend", resumeAudio, { once: true });
        document.addEventListener("click", resumeAudio, { once: true });
      }

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
  
  const startCallTimer = useCallback(() => {
    // Calculate remaining time from session ends_at if available
    if (sessionEndsAtRef.current) {
      const now = new Date();
      const remaining = Math.max(0, Math.floor((sessionEndsAtRef.current.getTime() - now.getTime()) / 1000));
      console.log("[random-call-lk]", "starting synchronized timer", { remaining, endsAt: sessionEndsAtRef.current });
      setTimeRemaining(remaining);
    } else {
      setTimeRemaining(CALL_DURATION_SECONDS);
    }
    
    timerRef.current = setInterval(() => {
      if (sessionEndsAtRef.current) {
        // Use server time for synchronization
        const now = new Date();
        const remaining = Math.max(0, Math.floor((sessionEndsAtRef.current.getTime() - now.getTime()) / 1000));
        
        if (remaining <= 0) {
          // Timer ended - show decision screen
          setStatus("deciding");
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          setTimeRemaining(0);
        } else {
          setTimeRemaining(remaining);
        }
      } else {
        // Fallback to local timer
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            setStatus("deciding");
            if (timerRef.current) {
              clearInterval(timerRef.current);
              timerRef.current = null;
            }
            return 0;
          }
          return prev - 1;
        });
      }
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

  // Toggle speaker (speakerphone vs earpiece)
  const toggleSpeaker = useCallback(async () => {
    if (!roomRef.current) return;

    const newSpeakerOn = !isSpeakerOn;
    
    try {
      // Get all audio elements and switch output
      const audioElements = document.querySelectorAll('audio');
      audioElements.forEach((audio) => {
        // On mobile, we use setSinkId if available, otherwise toggle volume/routing
        if ('setSinkId' in audio && typeof (audio as HTMLAudioElement & { setSinkId: (sinkId: string) => Promise<void> }).setSinkId === 'function') {
          // Use default speaker for speakerphone
          (audio as HTMLAudioElement & { setSinkId: (sinkId: string) => Promise<void> }).setSinkId(newSpeakerOn ? '' : 'default').catch(() => {});
        }
      });
      
      // For LiveKit, use room's audio output device setting
      if (newSpeakerOn) {
        await roomRef.current.switchActiveDevice('audiooutput', '');
      } else {
        await roomRef.current.switchActiveDevice('audiooutput', 'default');
      }
      
      console.log("[random-call-lk]", "speaker toggled", { newSpeakerOn });
    } catch (err) {
      console.warn("[random-call-lk]", "Failed to toggle speaker:", err);
    }
    
    setIsSpeakerOn(newSpeakerOn);
  }, [isSpeakerOn]);


  // Subscribe to session updates for decision synchronization
  const subscribeToSessionUpdates = useCallback(
    (currentSessionId: string) => {
      console.log("[random-call-lk]", "subscribing to session updates", {
        sessionId: currentSessionId,
      });

      const channel = supabase
        .channel(`random-call-session-${currentSessionId}`)
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "random_call_sessions",
            filter: `id=eq.${currentSessionId}`,
          },
          async (payload) => {
            const updated = payload.new as {
              status: string;
              user1_decision: string | null;
              user2_decision: string | null;
              user1_id: string;
              user2_id: string;
            };

            console.log("[random-call-lk]", "session update received", updated);

            // Determine if current user is user1 or user2
            const isUser1 = updated.user1_id === user?.id;
            const myDecision = isUser1 ? updated.user1_decision : updated.user2_decision;
            const otherDecision = isUser1 ? updated.user2_decision : updated.user1_decision;

            // INSTANT REJECTION: If the other user said "no", immediately show rejection
            if (otherDecision === "no") {
              console.log("[random-call-lk]", "Other user rejected via realtime - showing rejection immediately");
              setOtherUserRejected(true);
              setWaitingForOther(false);
              setDecisionResult("rejected");
              await cleanup(true);
              setStatus("completed");
              return;
            }

            // Check if session is completed
            if (updated.status === "completed") {
              const bothYes =
                updated.user1_decision === "yes" && updated.user2_decision === "yes";
              const anyContinue =
                updated.user1_decision === "continue" ||
                updated.user2_decision === "continue";

              if (bothYes) {
                console.log("[random-call-lk]", "MATCH via realtime!");
                setDecisionResult("matched");
              } else if (
                anyContinue &&
                updated.user1_decision !== "no" &&
                updated.user2_decision !== "no"
              ) {
                setDecisionResult("continued");
              } else {
                setDecisionResult("rejected");
              }

              setWaitingForOther(false);
              await cleanup(true);
              setStatus("completed");
            } else if (updated.status === "deciding") {
              // If we submitted but other hasn't yet
              if (myDecision && !otherDecision) {
                setWaitingForOther(true);
              }
            }
          }
        )
        .subscribe((state) => {
          console.log("[random-call-lk]", "session channel state", state);
        });

      sessionChannelRef.current = channel;
    },
    [cleanup, user?.id]
  );

  // Submit decision
  const submitDecision = useCallback(
    async (decision: "yes" | "no" | "continue") => {
      if (!sessionId || !user?.id) return;

      console.log("[random-call-lk]", "submitDecision", { decision, sessionId });

      // Subscribe to session updates BEFORE submitting decision
      if (!sessionChannelRef.current) {
        subscribeToSessionUpdates(sessionId);
      }

      try {
        const { data, error: rpcError } = await supabase.rpc(
          "submit_random_call_decision",
          {
            p_session_id: sessionId,
            p_user_id: user.id,
            p_decision: decision,
          }
        );

        if (rpcError) {
          console.error("[random-call-lk]", "decision error", rpcError);
          return;
        }

        const result = data as RpcResult;
        console.log("[random-call-lk]", "decision result", result);

        if (result.completed) {
          // Decision is final
          if (result.matched) {
            console.log("[random-call-lk]", "MATCH!");
            setDecisionResult("matched");
          } else if (result.continued) {
            setDecisionResult("continued");
          } else {
            setDecisionResult("rejected");
          }

          await cleanup(true);
          setStatus("completed");
        } else if (result.waiting) {
          // Waiting for other user - the realtime subscription will handle the update
          console.log(
            "[random-call-lk]",
            "waiting for other user decision..."
          );
          setWaitingForOther(true);
        } else if (result.rejected) {
          // Other user already said no
          console.log("[random-call-lk]", "Other user already rejected");
          setDecisionResult("rejected");
          await cleanup(true);
          setStatus("completed");
        }
      } catch (err) {
        console.error("[random-call-lk]", "submitDecision error", err);
      }
    },
    [sessionId, user?.id, cleanup, subscribeToSessionUpdates]
  );

  // CRITICAL: Subscribe to session updates as soon as we enter "deciding" state
  // This ensures we catch the other user's decision immediately
  useEffect(() => {
    if (status === "deciding" && sessionId && !sessionChannelRef.current) {
      console.log("[random-call-lk]", "Auto-subscribing to session updates on deciding state");
      subscribeToSessionUpdates(sessionId);
    }
  }, [status, sessionId, subscribeToSessionUpdates]);

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
    isSpeakerOn,
    audioLevel,
    error,
    timeRemaining,
    decisionResult,
    waitingForOther,
    otherUserRejected,
    startSearch,
    cancelSearch,
    endCall,
    toggleMute,
    toggleSpeaker,
    submitDecision,
  };
};

