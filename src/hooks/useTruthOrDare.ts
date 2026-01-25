import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type GameStatus = "idle" | "searching" | "waiting" | "playing" | "results";

interface Participant {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  score: number;
}

interface Challenge {
  id: string;
  type: "truth" | "dare";
  category: string;
  content: string;
  difficulty: number;
}

interface Play {
  id: string;
  player_id: string;
  challenge_id: string;
  choice: "truth" | "dare";
  completed: boolean;
  skipped: boolean;
}

export function useTruthOrDare() {
  const { user } = useAuth();
  const [status, setStatus] = useState<GameStatus>("idle");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [currentPlayerId, setCurrentPlayerId] = useState<string | null>(null);
  const [currentChallenge, setCurrentChallenge] = useState<Challenge | null>(null);
  const [roundNumber, setRoundNumber] = useState(1);
  const [plays, setPlays] = useState<Play[]>([]);
  const [isMyTurn, setIsMyTurn] = useState(false);
  const [waitingForChoice, setWaitingForChoice] = useState(false);

  // Fetch participants with profiles
  const fetchParticipants = useCallback(async (sid: string) => {
    const { data, error } = await supabase
      .from("truth_or_dare_participants")
      .select("id, user_id, score")
      .eq("session_id", sid)
      .eq("is_active", true);

    if (error || !data) return;

    // Fetch profiles for participants
    const userIds = data.map(p => p.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map(profiles?.map(p => [p.user_id, p]) || []);
    
    setParticipants(data.map(p => ({
      id: p.id,
      user_id: p.user_id,
      display_name: profileMap.get(p.user_id)?.display_name || "Joueur",
      avatar_url: profileMap.get(p.user_id)?.avatar_url,
      score: p.score
    })));
  }, []);

  // Subscribe to session updates
  useEffect(() => {
    if (!sessionId) return;

    const channel = supabase
      .channel(`tod-session-${sessionId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "truth_or_dare_sessions", filter: `id=eq.${sessionId}` },
        (payload) => {
          const session = payload.new as any;
          if (session) {
            if (session.status === "playing") {
              setStatus("playing");
              setCurrentPlayerId(session.current_player_id);
              setRoundNumber(session.round_number);
              setIsMyTurn(session.current_player_id === user?.id);
              setWaitingForChoice(session.current_challenge_id === null && session.current_player_id === user?.id);
              
              // Fetch current challenge if set
              if (session.current_challenge_id) {
                fetchChallenge(session.current_challenge_id);
              } else {
                setCurrentChallenge(null);
              }
            } else if (session.status === "completed") {
              setStatus("results");
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "truth_or_dare_participants", filter: `session_id=eq.${sessionId}` },
        () => {
          fetchParticipants(sessionId);
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "truth_or_dare_plays", filter: `session_id=eq.${sessionId}` },
        (payload) => {
          setPlays(prev => [...prev, payload.new as Play]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, user?.id, fetchParticipants]);

  const fetchChallenge = async (challengeId: string) => {
    const { data } = await supabase
      .from("truth_or_dare_challenges")
      .select("*")
      .eq("id", challengeId)
      .maybeSingle();
    
    if (data) {
      setCurrentChallenge(data as Challenge);
      setWaitingForChoice(false);
    }
  };

  // Join or create session
  const startGame = useCallback(async () => {
    if (!user) {
      toast.error("Connectez-vous pour jouer");
      return;
    }

    setStatus("searching");

    try {
      // Look for an existing waiting session
      const { data: existingSessions } = await supabase
        .from("truth_or_dare_sessions")
        .select("id")
        .eq("status", "waiting")
        .limit(1);

      let sid: string;

      if (existingSessions && existingSessions.length > 0) {
        sid = existingSessions[0].id;
      } else {
        // Create new session
        const { data: newSession, error } = await supabase
          .from("truth_or_dare_sessions")
          .insert({ status: "waiting" })
          .select()
          .single();

        if (error) throw error;
        sid = newSession.id;
      }

      // Join the session
      const { error: joinError } = await supabase
        .from("truth_or_dare_participants")
        .upsert({
          session_id: sid,
          user_id: user.id,
          is_active: true,
          score: 0
        }, { onConflict: "session_id,user_id" });

      if (joinError) throw joinError;

      setSessionId(sid);
      setStatus("waiting");
      await fetchParticipants(sid);

      // Check participant count to potentially start
      const { count } = await supabase
        .from("truth_or_dare_participants")
        .select("*", { count: "exact", head: true })
        .eq("session_id", sid)
        .eq("is_active", true);

      if (count && count >= 3) {
        // Start the game if we have enough players
        await startSession(sid);
      }
    } catch (error) {
      console.error("Error starting game:", error);
      toast.error("Erreur lors du lancement du jeu");
      setStatus("idle");
    }
  }, [user, fetchParticipants]);

  const startSession = async (sid: string) => {
    // Get first player
    const { data: firstParticipant } = await supabase
      .from("truth_or_dare_participants")
      .select("user_id")
      .eq("session_id", sid)
      .eq("is_active", true)
      .order("joined_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (firstParticipant) {
      await supabase
        .from("truth_or_dare_sessions")
        .update({
          status: "playing",
          started_at: new Date().toISOString(),
          current_player_id: firstParticipant.user_id,
          current_challenge_id: null
        })
        .eq("id", sid);
    }
  };

  // Choose truth or dare
  const chooseType = useCallback(async (choice: "truth" | "dare") => {
    if (!sessionId || !user || !isMyTurn) return;

    try {
      // Get a random challenge of this type
      const { data: challenges } = await supabase
        .from("truth_or_dare_challenges")
        .select("id")
        .eq("type", choice)
        .eq("is_active", true);

      if (!challenges || challenges.length === 0) {
        toast.error("Pas de défi disponible");
        return;
      }

      const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];

      // Update session with the challenge
      await supabase
        .from("truth_or_dare_sessions")
        .update({ current_challenge_id: randomChallenge.id })
        .eq("id", sessionId);

      // Record the play
      await supabase
        .from("truth_or_dare_plays")
        .insert({
          session_id: sessionId,
          player_id: user.id,
          challenge_id: randomChallenge.id,
          choice
        });

    } catch (error) {
      console.error("Error choosing type:", error);
      toast.error("Erreur lors du choix");
    }
  }, [sessionId, user, isMyTurn]);

  // Complete the challenge
  const completeChallenge = useCallback(async (completed: boolean) => {
    if (!sessionId || !user || !isMyTurn || !currentChallenge) return;

    try {
      // Update play record
      await supabase
        .from("truth_or_dare_plays")
        .update({ 
          completed, 
          skipped: !completed 
        })
        .eq("session_id", sessionId)
        .eq("player_id", user.id)
        .eq("challenge_id", currentChallenge.id);

      // Update score if completed
      if (completed) {
        await supabase
          .from("truth_or_dare_participants")
          .update({ score: participants.find(p => p.user_id === user.id)!.score + currentChallenge.difficulty * 10 })
          .eq("session_id", sessionId)
          .eq("user_id", user.id);
      }

      // Move to next player
      const currentIndex = participants.findIndex(p => p.user_id === user.id);
      const nextIndex = (currentIndex + 1) % participants.length;
      const nextPlayer = participants[nextIndex];

      const newRound = nextIndex === 0 ? roundNumber + 1 : roundNumber;

      if (newRound > 5) {
        // End game after 5 rounds
        await supabase
          .from("truth_or_dare_sessions")
          .update({
            status: "completed",
            ended_at: new Date().toISOString()
          })
          .eq("id", sessionId);
      } else {
        await supabase
          .from("truth_or_dare_sessions")
          .update({
            current_player_id: nextPlayer.user_id,
            current_challenge_id: null,
            round_number: newRound
          })
          .eq("id", sessionId);
      }
    } catch (error) {
      console.error("Error completing challenge:", error);
      toast.error("Erreur");
    }
  }, [sessionId, user, isMyTurn, currentChallenge, participants, roundNumber]);

  // Leave game
  const leaveGame = useCallback(async () => {
    if (!sessionId || !user) return;

    try {
      await supabase
        .from("truth_or_dare_participants")
        .update({ is_active: false, left_at: new Date().toISOString() })
        .eq("session_id", sessionId)
        .eq("user_id", user.id);

      setSessionId(null);
      setStatus("idle");
      setParticipants([]);
      setCurrentChallenge(null);
      setPlays([]);
    } catch (error) {
      console.error("Error leaving game:", error);
    }
  }, [sessionId, user]);

  const getCurrentPlayer = useCallback(() => {
    return participants.find(p => p.user_id === currentPlayerId);
  }, [participants, currentPlayerId]);

  return {
    status,
    sessionId,
    participants,
    currentPlayerId,
    currentChallenge,
    roundNumber,
    plays,
    isMyTurn,
    waitingForChoice,
    startGame,
    chooseType,
    completeChallenge,
    leaveGame,
    getCurrentPlayer
  };
}
