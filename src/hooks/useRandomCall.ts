import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

export type CallStatus = 
  | "idle" 
  | "selecting" 
  | "searching" 
  | "matched" 
  | "in_call" 
  | "deciding" 
  | "result";

interface RandomCallSession {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  ends_at: string;
  user1_wants_match: boolean | null;
  user2_wants_match: boolean | null;
  status: string;
}

interface UseRandomCallReturn {
  status: CallStatus;
  selectedPreference: string | null;
  session: RandomCallSession | null;
  timeRemaining: number;
  matchResult: "matched" | "not_matched" | null;
  waitingForOther: boolean;
  startSelecting: () => void;
  startSearch: (preference: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  submitDecision: (wantsMatch: boolean) => Promise<void>;
  reset: () => void;
}

export const useRandomCall = (): UseRandomCallReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);
  const [session, setSession] = useState<RandomCallSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [matchResult, setMatchResult] = useState<"matched" | "not_matched" | null>(null);
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user gender on mount
  useEffect(() => {
    const fetchUserGender = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("gender")
        .eq("user_id", user.id)
        .single();
      
      if (data?.gender) {
        setUserGender(data.gender);
      }
    };
    
    fetchUserGender();
  }, [user]);

  // Subscribe to session changes
  useEffect(() => {
    if (!session?.id || !user) return;

    const channel = supabase
      .channel(`session-${session.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "random_call_sessions",
          filter: `id=eq.${session.id}`,
        },
        (payload) => {
          const updated = payload.new as RandomCallSession;
          setSession(updated);
          
          if (updated.status === "completed") {
            if (updated.user1_wants_match && updated.user2_wants_match) {
              setMatchResult("matched");
            } else {
              setMatchResult("not_matched");
            }
            setStatus("result");
            setWaitingForOther(false);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, [session?.id, user]);

  // Timer for call duration
  useEffect(() => {
    if (status !== "in_call" || !session) return;

    const endTime = new Date(session.ends_at).getTime();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        setStatus("deciding");
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [status, session]);

  const startSearch = useCallback(async (preference: string) => {
    if (!user || !userGender) return;
    
    setSelectedPreference(preference);
    setStatus("searching");
    
    try {
      // Add to queue
      await supabase.from("random_call_queue").upsert({
        user_id: user.id,
        gender: userGender,
        looking_for: preference,
        status: "waiting",
      });
      
      // Try to find a match immediately and periodically
      const tryMatch = async () => {
        const { data: sessionId } = await supabase.rpc("find_random_call_match", {
          p_user_id: user.id,
          p_user_gender: userGender,
          p_looking_for: preference,
        });
        
        if (sessionId) {
          // Found a match!
          const { data: sessionData } = await supabase
            .from("random_call_sessions")
            .select("*")
            .eq("id", sessionId)
            .single();
          
          if (sessionData) {
            setSession(sessionData as RandomCallSession);
            setStatus("matched");
            
            // Short delay then start call
            setTimeout(() => {
              setStatus("in_call");
            }, 2000);
            
            // Clear search interval
            if (searchIntervalRef.current) {
              clearInterval(searchIntervalRef.current);
            }
          }
        }
      };
      
      // Try immediately
      await tryMatch();
      
      // Then every 3 seconds
      searchIntervalRef.current = setInterval(tryMatch, 3000);
      
      // Also subscribe to queue changes for real-time matching
      const queueChannel = supabase
        .channel("queue-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "random_call_queue",
          },
          async () => {
            // Someone joined/left the queue, try to match
            await tryMatch();
          }
        )
        .subscribe();
        
      channelRef.current = queueChannel;
      
    } catch (error) {
      console.error("Error starting search:", error);
      setStatus("idle");
    }
  }, [user, userGender]);

  const cancelSearch = useCallback(async () => {
    if (!user) return;
    
    try {
      await supabase
        .from("random_call_queue")
        .delete()
        .eq("user_id", user.id);
      
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
      }
      
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
      
      setStatus("idle");
      setSelectedPreference(null);
    } catch (error) {
      console.error("Error canceling search:", error);
    }
  }, [user]);

  const submitDecision = useCallback(async (wantsMatch: boolean) => {
    if (!session?.id || !user) return;
    
    setWaitingForOther(true);
    
    try {
      const { data } = await supabase.rpc("submit_random_call_decision", {
        p_session_id: session.id,
        p_user_id: user.id,
        p_wants_match: wantsMatch,
      });
      
      const result = data as { matched?: boolean; completed?: boolean; waiting?: boolean; error?: string };
      
      if (result.completed) {
        if (result.matched) {
          setMatchResult("matched");
        } else {
          setMatchResult("not_matched");
        }
        setStatus("result");
        setWaitingForOther(false);
      }
      // If waiting, the realtime subscription will handle the update
      
    } catch (error) {
      console.error("Error submitting decision:", error);
      setWaitingForOther(false);
    }
  }, [session, user]);

  const startSelecting = useCallback(() => {
    setStatus("selecting");
  }, []);

  const reset = useCallback(async () => {
    if (!user) return;
    
    // Clean up queue
    await supabase
      .from("random_call_queue")
      .delete()
      .eq("user_id", user.id);
    
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (channelRef.current) {
      channelRef.current.unsubscribe();
    }
    
    setStatus("idle");
    setSelectedPreference(null);
    setSession(null);
    setTimeRemaining(90);
    setMatchResult(null);
    setWaitingForOther(false);
  }, [user]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (searchIntervalRef.current) {
        clearInterval(searchIntervalRef.current);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (channelRef.current) {
        channelRef.current.unsubscribe();
      }
    };
  }, []);

  return {
    status,
    selectedPreference,
    session,
    timeRemaining,
    matchResult,
    waitingForOther,
    startSelecting,
    startSearch,
    cancelSearch,
    submitDecision,
    reset,
  };
};
