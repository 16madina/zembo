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
  isMuted: boolean;
  isVideoOff: boolean;
  error: string | null;
  joinSession: () => Promise<void>;
  leaveSession: () => Promise<void>;
  submitVote: (userId: string) => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
}

const ROUND_DURATION = 60; // 60 seconds per round
const TOTAL_ROUNDS = 3;
const COUNTDOWN_DURATION = 5;
const MIN_PARTICIPANTS = 4;

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
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const roomRef = useRef<Room | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Clean up resources
  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
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
  }, []);

  // Join a LiveKit room for the current round
  const joinLiveKitRoom = useCallback(async (roomName: string) => {
    if (!user) return;

    try {
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

      // Handle remote tracks
      room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
        console.log("[speed-dating] Track subscribed:", track.kind, participant.identity);
        
        if (track.kind === Track.Kind.Video && remoteVideoRef.current) {
          track.attach(remoteVideoRef.current);
        } else if (track.kind === Track.Kind.Audio) {
          const audioElement = document.createElement("audio");
          audioElement.setAttribute("autoplay", "");
          audioElement.setAttribute("playsinline", "");
          document.body.appendChild(audioElement);
          track.attach(audioElement);
        }
      });

      room.on(RoomEvent.TrackUnsubscribed, (track) => {
        track.detach();
      });

      // Connect to room
      await room.connect(tokenData.url, tokenData.token);

      // Get local media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: true,
      });
      localStreamRef.current = stream;

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Publish tracks
      const videoTrack = stream.getVideoTracks()[0];
      const audioTrack = stream.getAudioTracks()[0];

      if (videoTrack) {
        await room.localParticipant.publishTrack(videoTrack);
      }
      if (audioTrack) {
        await room.localParticipant.publishTrack(audioTrack);
      }

      console.log("[speed-dating] Connected to room:", roomName);
    } catch (err) {
      console.error("[speed-dating] Error joining room:", err);
      setError("Erreur de connexion vidéo");
    }
  }, [user]);

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

  // Find or create a session
  const joinSession = useCallback(async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    try {
      setStatus("searching");
      setError(null);

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

      // Join the session
      const { error: joinError } = await supabase
        .from("speed_dating_participants")
        .insert({
          session_id: sessionToJoin.id,
          user_id: user.id,
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
            
            // Join the video room
            await joinLiveKitRoom(round.room_name);
            startRoundTimer();
          }
        }
      )
      .subscribe();

    return () => {
      participantChannel.unsubscribe();
      sessionChannel.unsubscribe();
      roundsChannel.unsubscribe();
    };
  }, [sessionId, user, status, cleanup, joinLiveKitRoom, startRoundTimer]);

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
        } catch (err) {
          console.error("[speed-dating] Error advancing round:", err);
        }
      };
      advanceRound();
    }
  }, [status, timeRemaining, sessionId, cleanup]);

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
    isMuted,
    isVideoOff,
    error,
    joinSession,
    leaveSession,
    submitVote,
    toggleMute,
    toggleVideo,
    localVideoRef: localVideoRef as React.RefObject<HTMLVideoElement>,
    remoteVideoRef: remoteVideoRef as React.RefObject<HTMLVideoElement>,
  };
}
