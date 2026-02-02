import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Room, RoomEvent, Track, ConnectionState } from "livekit-client";

export type SpeedDatingStatus = 
  | "idle"
  | "searching"
  | "waiting_room"
  | "countdown"
  | "in_call"
  | "voting"
  | "results";

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface Round {
  id: string;
  round_number: number;
  partner_id: string;
  partner_name: string;
  partner_avatar: string | null;
  room_name: string;
}

interface MatchResult {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  is_mutual: boolean;
}

interface UseSpeedDatingReturn {
  status: SpeedDatingStatus;
  sessionId: string | null;
  participants: Participant[];
  currentRound: Round | null;
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  votes: string[];
  results: MatchResult[];
  isConnected: boolean;
  hasRemoteVideo: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
  partnerTimedOut: boolean;
  partnerConnectionTimer: number;
  isConfirmingVotes: boolean;
  joinSession: (lookingFor?: string) => Promise<void>;
  leaveSession: () => Promise<void>;
  submitVote: (userId: string) => Promise<void>;
  confirmVotes: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  skipToNextRound: () => Promise<void>;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

const ROUND_DURATION = 60; // 60 seconds per round
const TOTAL_ROUNDS = 3;
const COUNTDOWN_DURATION = 5;
const MIN_PARTICIPANTS = 4;
const PARTNER_TIMEOUT = 15; // seconds to wait for partner before showing message

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export function useSpeedDating(): UseSpeedDatingReturn {
  const { user } = useAuth();
  const [status, setStatus] = useState<SpeedDatingStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentRound, setCurrentRound] = useState<Round | null>(null);
  const [roundNumber, setRoundNumber] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(ROUND_DURATION);
  const [votes, setVotes] = useState<string[]>([]);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partnerConnectionTimer, setPartnerConnectionTimer] = useState<number>(0);
  const [partnerTimedOut, setPartnerTimedOut] = useState(false);
  const [isConfirmingVotes, setIsConfirmingVotes] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const partnerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastJoinedRoomRef = useRef<string | null>(null);
  const roundSyncInFlightRef = useRef(false);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (partnerTimerRef.current) {
      clearInterval(partnerTimerRef.current);
      partnerTimerRef.current = null;
    }
    if (roomRef.current) {
      roomRef.current.disconnect();
      roomRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    setIsConnected(false);
    setHasRemoteVideo(false);
    setPartnerConnectionTimer(0);
    setPartnerTimedOut(false);
  }, []);

  // Join a LiveKit room for the current round
  const joinLiveKitRoom = useCallback(async (roomName: string) => {
    if (!user) return;

    try {
      setPartnerTimedOut(false);
      setPartnerConnectionTimer(0);
      
      // Start partner connection timer
      let elapsed = 0;
      partnerTimerRef.current = setInterval(() => {
        elapsed += 1;
        setPartnerConnectionTimer(elapsed);
        
        if (elapsed >= PARTNER_TIMEOUT) {
          setPartnerTimedOut(true);
          if (partnerTimerRef.current) {
            clearInterval(partnerTimerRef.current);
            partnerTimerRef.current = null;
          }
        }
      }, 1000);

      // Get LiveKit token
      const { data: tokenData, error: tokenError } = await supabase.functions.invoke("livekit-token", {
        body: { roomName, isSpeedDating: true },
      });

      if (tokenError || !tokenData?.token) {
        throw new Error("Failed to get LiveKit token");
      }

      const room = new Room();
      roomRef.current = room;

      // Handle connection state changes
      room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
        console.log("[speed-dating] Connection state:", state);
        setIsConnected(state === ConnectionState.Connected);
      });

      // Handle remote tracks - partner connected!
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[speed-dating] Track subscribed:", track.kind, participant.identity);
        
        // Partner connected, clear the timeout
        if (partnerTimerRef.current) {
          clearInterval(partnerTimerRef.current);
          partnerTimerRef.current = null;
        }
        setPartnerTimedOut(false);
        setPartnerConnectionTimer(0);
        
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          console.log("[speed-dating] Attaching remote video track to video element");
          track.attach(remoteVideoRef.current);
          setHasRemoteVideo(true); // Mark that we have received partner video
        } else if (track.kind === Track.Kind.Audio) {
          console.log("[speed-dating] Attaching remote audio track");
          // Create a persistent audio element for mobile compatibility
          const audioElement = document.createElement("audio");
          audioElement.id = `speed-dating-remote-audio-${participant.identity}`;
          audioElement.setAttribute("autoplay", "");
          audioElement.setAttribute("playsinline", "");
          // Remove any existing audio element with the same id
          const existing = document.getElementById(audioElement.id);
          if (existing) {
            existing.remove();
          }
          document.body.appendChild(audioElement);
          track.attach(audioElement);
          
          // Force play on mobile (handle autoplay restrictions)
          const playAudio = async () => {
            try {
              await audioElement.play();
              console.log("[speed-dating] Remote audio playing successfully");
            } catch (e) {
              console.warn("[speed-dating] Audio autoplay blocked, retrying on user interaction:", e);
              // Add a one-time click listener to resume audio
              const resumeAudio = async () => {
                try {
                  await audioElement.play();
                  console.log("[speed-dating] Audio resumed after user interaction");
                } catch (err) {
                  console.error("[speed-dating] Failed to resume audio:", err);
                }
                document.removeEventListener("click", resumeAudio);
                document.removeEventListener("touchstart", resumeAudio);
              };
              document.addEventListener("click", resumeAudio, { once: true });
              document.addEventListener("touchstart", resumeAudio, { once: true });
            }
          };
          playAudio();
        }
      });

      // Also listen for tracks that are already published when we join
      room.on(RoomEvent.ParticipantConnected, (participant) => {
        console.log("[speed-dating] Participant connected:", participant.identity);
        // Clear timeout when partner connects
        if (partnerTimerRef.current) {
          clearInterval(partnerTimerRef.current);
          partnerTimerRef.current = null;
        }
        setPartnerTimedOut(false);
        setPartnerConnectionTimer(0);
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });
      
      // Handle participant disconnection
      room.on(RoomEvent.ParticipantDisconnected, () => {
        console.log("[speed-dating] Partner disconnected");
        setPartnerTimedOut(true);
        setError("Votre partenaire s'est déconnecté");
      });

      // Connect to room
      await room.connect(tokenData.url, tokenData.token);

      // Get local media with Android WebView fallback
      let stream: MediaStream | null = null;
      const isAndroidWebView = /Android/i.test(navigator.userAgent);
      
      // Try different constraints for Android compatibility
      const constraintsOptions = [
        { video: { facingMode: "user", width: 640, height: 480 }, audio: true },
        { video: { facingMode: "user" }, audio: true },
        { video: true, audio: true },
      ];
      
      for (const constraints of constraintsOptions) {
        try {
          console.log("[speed-dating] Trying constraints:", JSON.stringify(constraints));
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          console.log("[speed-dating] Successfully got stream with constraints");
          break;
        } catch (mediaErr) {
          console.warn("[speed-dating] Failed with constraints:", constraints, mediaErr);
        }
      }
      
      if (!stream) {
        throw new Error("Impossible d'accéder à la caméra");
      }
      
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
        // Force video play on Android
        if (isAndroidWebView) {
          try {
            await localVideoRef.current.play();
          } catch (e) {
            console.warn("[speed-dating] Local video play failed:", e);
          }
        }
      }

      // Publish tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      console.log("[speed-dating] Publishing tracks:", { 
        hasVideo: !!videoTrack, 
        hasAudio: !!audioTrack 
      });

      if (videoTrack) {
        await room.localParticipant.publishTrack(videoTrack);
        console.log("[speed-dating] Video track published");
      }
      if (audioTrack) {
        await room.localParticipant.publishTrack(audioTrack);
        console.log("[speed-dating] Audio track published");
      }

      console.log("[speed-dating] Connected to room:", roomName);
    } catch (err) {
      console.error("[speed-dating] Error joining room:", err);
      setError("Erreur de connexion vidéo");
      setPartnerTimedOut(true);
    }
  }, [user]);
  
  // Skip current round and move to next
  const skipToNextRound = useCallback(async () => {
    if (!sessionId) return;
    
    try {
      console.log("[speed-dating] Skipping to next round...");
      cleanup();
      toast.info("Passage au round suivant...");
      
      const { data } = await supabase.functions.invoke("speed-dating-orchestrator", {
        body: { action: "next_round", session_id: sessionId },
      });
      console.log("[speed-dating] Skip round result:", data);
    } catch (err) {
      console.error("[speed-dating] Error skipping round:", err);
    }
  }, [sessionId, cleanup]);

  // Start the round timer
  const startRoundTimer = useCallback(() => {
    setTimeRemaining(ROUND_DURATION);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  const syncToLatestRound = useCallback(
    async (opts?: { expectedMinRound?: number; reason?: string }) => {
      if (!sessionId || !user) return;
      if (roundSyncInFlightRef.current) return;
      roundSyncInFlightRef.current = true;

      try {
        const { data: latestRounds, error: latestErr } = await supabase
          .from("speed_dating_rounds")
          .select("id, round_number, user1_id, user2_id, room_name")
          .eq("session_id", sessionId)
          .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
          .order("round_number", { ascending: false })
          .limit(1);

        if (latestErr) {
          console.warn("[speed-dating] syncToLatestRound: query failed", latestErr);
          return;
        }

        const latest = latestRounds?.[0];
        if (!latest) return;

        if (typeof opts?.expectedMinRound === "number" && latest.round_number < opts.expectedMinRound) {
          return;
        }

        // If we're already in this exact room, nothing to do.
        if (lastJoinedRoomRef.current === latest.room_name) return;

        const partnerId = latest.user1_id === user.id ? latest.user2_id : latest.user1_id;
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, avatar_url")
          .eq("user_id", partnerId)
          .single();

        setCurrentRound({
          id: latest.id,
          round_number: latest.round_number,
          partner_id: partnerId,
          partner_name: profile?.display_name || "Anonyme",
          partner_avatar: profile?.avatar_url,
          room_name: latest.room_name,
        });
        setRoundNumber(latest.round_number);
        setStatus("in_call");

        // Important: set this before connecting to avoid double-joins when multiple events arrive.
        lastJoinedRoomRef.current = latest.room_name;

        await joinLiveKitRoom(latest.room_name);
        startRoundTimer();
        console.log("[speed-dating] Synced to latest round", {
          reason: opts?.reason,
          round: latest.round_number,
          room: latest.room_name,
        });
      } finally {
        roundSyncInFlightRef.current = false;
      }
    },
    [sessionId, user, joinLiveKitRoom, startRoundTimer]
  );

  // Find or create a session
  const joinSession = useCallback(async (lookingFor: string = "tous") => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    try {
      setStatus("searching");
      setError(null);

      // Get user's gender from profile
      const { data: userProfile } = await supabase
        .from("profiles")
        .select("gender")
        .eq("user_id", user.id)
        .single();

      const userGender = userProfile?.gender || "tous";

      // Look for an existing waiting session
      const { data: existingSessions } = await supabase
        .from("speed_dating_sessions")
        .select("*")
        .eq("status", "waiting")
        .order("created_at", { ascending: true })
        .limit(1);

      let sessionToJoin = existingSessions?.[0];

      // If no waiting session, create one
      if (!sessionToJoin) {
        const { data: newSession, error: createError } = await supabase
          .from("speed_dating_sessions")
          .insert({
            status: "waiting",
            round_duration_seconds: ROUND_DURATION,
            total_rounds: TOTAL_ROUNDS,
          })
          .select()
          .single();

        if (createError) throw createError;
        sessionToJoin = newSession;
      }

      // Join the session with gender and preference
      const { error: joinError } = await supabase
        .from("speed_dating_participants")
        .insert({
          session_id: sessionToJoin.id,
          user_id: user.id,
          gender: userGender,
          looking_for: lookingFor,
        });

      if (joinError && !joinError.message.includes("duplicate")) {
        throw joinError;
      }

      setSessionId(sessionToJoin.id);
      setStatus("waiting_room");

      toast.success("Session rejointe !");

      // Trigger the orchestrator to check if we can start
      setTimeout(async () => {
        try {
          await supabase.functions.invoke("speed-dating-orchestrator", {
            body: { action: "check_and_start" },
          });
        } catch (err) {
          console.log("[speed-dating] Orchestrator check:", err);
        }
      }, 2000);
    } catch (err) {
      console.error("[speed-dating] Error joining:", err);
      setError("Erreur lors de la connexion");
      setStatus("idle");
      toast.error("Impossible de rejoindre la session");
    }
  }, [user]);

  // Leave the current session
  const leaveSession = useCallback(async () => {
    if (!user || !sessionId) return;

    try {
      await supabase
        .from("speed_dating_participants")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      cleanup();
      setStatus("idle");
      setSessionId(null);
      setParticipants([]);
      setCurrentRound(null);
      setRoundNumber(0);
      setVotes([]);
      setResults([]);
    } catch (err) {
      console.error("[speed-dating] Error leaving:", err);
    }
  }, [user, sessionId, cleanup]);

  // Submit a vote for a participant
  const submitVote = useCallback(async (votedForId: string) => {
    if (!user || !sessionId) return;

    try {
      // Check if already voted for this person
      if (votes.includes(votedForId)) {
        // Remove vote
        await supabase
          .from("speed_dating_votes")
          .delete()
          .eq("session_id", sessionId)
          .eq("voter_id", user.id)
          .eq("voted_for_id", votedForId);

        setVotes(prev => prev.filter(id => id !== votedForId));
      } else {
        // Add vote
        await supabase
          .from("speed_dating_votes")
          .insert({
            session_id: sessionId,
            voter_id: user.id,
            voted_for_id: votedForId,
          });

        setVotes(prev => [...prev, votedForId]);
      }
    } catch (err) {
      console.error("[speed-dating] Error voting:", err);
      toast.error("Erreur lors du vote");
    }
  }, [user, sessionId, votes]);

  // Confirm votes and reveal matches
  const confirmVotes = useCallback(async () => {
    if (!sessionId || !user) return;
    
    setIsConfirmingVotes(true);
    try {
      console.log("[speed-dating] Confirming votes and revealing matches...");
      
      // Call the orchestrator to end voting phase
      await supabase.functions.invoke("speed-dating-orchestrator", {
        body: { action: "end_voting", session_id: sessionId },
      });
      
      // Transition to results
      setStatus("results");
      toast.success("Matchs révélés !");
    } catch (err) {
      console.error("[speed-dating] Error confirming votes:", err);
      toast.error("Erreur lors de la confirmation");
    } finally {
      setIsConfirmingVotes(false);
    }
  }, [sessionId, user]);

  // Toggle mute
  const toggleMute = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsMuted(prev => !prev);
    }
  }, []);

  // Toggle video
  const toggleVideo = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getVideoTracks().forEach(track => {
        track.enabled = !track.enabled;
      });
      setIsVideoOff(prev => !prev);
    }
  }, []);

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId || !user) return;

    // Fetch participants with profiles
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("speed_dating_participants")
        .select("user_id")
        .eq("session_id", sessionId)
        .eq("is_active", true);

      if (data && data.length > 0) {
        const userIds = data.map(p => p.user_id);
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);

        const participantList = data.map(p => {
          const profile = profiles?.find(pr => pr.user_id === p.user_id);
          return {
            id: p.user_id,
            user_id: p.user_id,
            display_name: profile?.display_name || "Anonyme",
            avatar_url: profile?.avatar_url,
          };
        }).filter(p => p.user_id !== user.id);

        setParticipants(participantList);

        // Check if enough participants to start
        if (participantList.length >= MIN_PARTICIPANTS - 1 && status === "waiting_room") {
          setStatus("countdown");
          setTimeRemaining(COUNTDOWN_DURATION);
        }
      }
    };

    fetchParticipants();

    // Subscribe to participant changes
    const participantChannel = supabase
      .channel(`speed-dating-participants-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "speed_dating_participants",
          filter: `session_id=eq.${sessionId}`,
        },
        () => {
          fetchParticipants();
        }
      )
      .subscribe();

    // Subscribe to session status changes
    const sessionChannel = supabase
      .channel(`speed-dating-session-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "speed_dating_sessions",
          filter: `id=eq.${sessionId}`,
        },
        (payload) => {
          const newStatus = payload.new.status as string;
          if (newStatus === "voting") {
            cleanup();
            setStatus("voting");
          } else if (newStatus === "completed") {
            setStatus("results");
          }
        }
      )
      .subscribe();

    // Subscribe to rounds
    const roundsChannel = supabase
      .channel(`speed-dating-rounds-${sessionId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "speed_dating_rounds",
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          const round = payload.new;
          if (round.user1_id === user.id || round.user2_id === user.id) {
            const partnerId = round.user1_id === user.id ? round.user2_id : round.user1_id;
            
            const { data: profile } = await supabase
              .from("profiles")
              .select("display_name, avatar_url")
              .eq("user_id", partnerId)
              .single();

            setCurrentRound({
              id: round.id,
              round_number: round.round_number,
              partner_id: partnerId,
              partner_name: profile?.display_name || "Anonyme",
              partner_avatar: profile?.avatar_url,
              room_name: round.room_name,
            });
            setRoundNumber(round.round_number);
            setStatus("in_call");

            lastJoinedRoomRef.current = round.room_name;
            
            // Join the video room
            await joinLiveKitRoom(round.room_name);
            startRoundTimer();
          }
        }
      )
      .subscribe();

    // Fallback: if the INSERT realtime event is missed on mobile, pull the latest round and join it.
    // This also covers cases where a user joins mid-session.
    syncToLatestRound({ reason: "init" });

    return () => {
      participantChannel.unsubscribe();
      sessionChannel.unsubscribe();
      roundsChannel.unsubscribe();
    };
  }, [sessionId, user, status, cleanup, joinLiveKitRoom, startRoundTimer, syncToLatestRound]);

  // Handle countdown timer for session start
  useEffect(() => {
    if (status === "countdown") {
      const timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [status]);

  // Handle round timer - advance to next round when time is up
  useEffect(() => {
    if (status === "in_call" && timeRemaining === 0 && sessionId) {
      // Round ended, trigger next round
      const advanceRound = async () => {
        try {
          cleanup();
          const { data } = await supabase.functions.invoke("speed-dating-orchestrator", {
            body: { action: "next_round", session_id: sessionId },
          });
          console.log("[speed-dating] Next round result:", data);

          // Robustness: wait for the new round row to exist, then join the new room even if realtime missed it.
          const expected = roundNumber + 1;
          for (let attempt = 0; attempt < 12; attempt++) {
            await delay(1000);
            await syncToLatestRound({ expectedMinRound: expected, reason: `post-next_round#${attempt + 1}` });
          }
        } catch (err) {
          console.error("[speed-dating] Error advancing round:", err);
        }
      };
      advanceRound();
    }
  }, [status, timeRemaining, sessionId, cleanup, syncToLatestRound, roundNumber]);

  // Fetch results when in results status
  useEffect(() => {
    if (status !== "results" || !sessionId || !user) return;

    const fetchResults = async () => {
      // Get all votes
      const { data: allVotes } = await supabase
        .from("speed_dating_votes")
        .select("voter_id, voted_for_id")
        .eq("session_id", sessionId);

      // Get my votes
      const myVotes = allVotes?.filter(v => v.voter_id === user.id) || [];
      const votesForMe = allVotes?.filter(v => v.voted_for_id === user.id) || [];

      // Find mutual matches
      const mutualMatches = myVotes
        .filter(myVote => 
          votesForMe.some(forMe => forMe.voter_id === myVote.voted_for_id)
        )
        .map(v => v.voted_for_id);

      // Get profiles of all people I met
      const metPeople = participants.map(p => p.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", metPeople);

      const resultsList: MatchResult[] = (profiles || []).map(profile => ({
        user_id: profile.user_id,
        display_name: profile.display_name || "Anonyme",
        avatar_url: profile.avatar_url,
        is_mutual: mutualMatches.includes(profile.user_id),
      }));

      // Sort: mutual matches first
      resultsList.sort((a, b) => (b.is_mutual ? 1 : 0) - (a.is_mutual ? 1 : 0));
      setResults(resultsList);

      // Mark session as completed
      await supabase.functions.invoke("speed-dating-orchestrator", {
        body: { action: "complete_session", session_id: sessionId },
      });
    };

    fetchResults();
  }, [status, sessionId, user, participants]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return {
    status,
    sessionId,
    participants,
    currentRound,
    roundNumber,
    totalRounds: TOTAL_ROUNDS,
    timeRemaining,
    votes,
    results,
    isConnected,
    hasRemoteVideo,
    isMuted,
    isVideoOff,
    error,
    partnerTimedOut,
    partnerConnectionTimer,
    isConfirmingVotes,
    joinSession,
    leaveSession,
    submitVote,
    confirmVotes,
    toggleMute,
    toggleVideo,
    skipToNextRound,
    localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
    remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement>,
  };
}
