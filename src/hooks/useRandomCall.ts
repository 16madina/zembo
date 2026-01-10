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
  | "first_decision"  // At 1 minute mark
  | "waiting_decision"
  | "call_extended"   // After both chose to continue
  | "result"
  | "rejected";       // Other person said no

interface RandomCallSession {
  id: string;
  user1_id: string;
  user2_id: string;
  started_at: string;
  ends_at: string;
  user1_decision: string | null; // 'yes', 'no', 'continue'
  user2_decision: string | null;
  status: string;
}

interface UseRandomCallReturn {
  status: CallStatus;
  selectedPreference: string | null;
  session: RandomCallSession | null;
  timeRemaining: number;
  matchResult: "matched" | "not_matched" | "rejected" | null;
  waitingForOther: boolean;
  isExtendedCall: boolean;
  otherUserId: string | null;
  startSelecting: () => void;
  startSearch: (preference: string) => Promise<void>;
  cancelSearch: () => Promise<void>;
  submitDecision: (decision: "yes" | "no" | "continue") => Promise<void>;
  reset: () => void;
}

export const useRandomCall = (): UseRandomCallReturn => {
  const { user } = useAuth();
  const [status, setStatus] = useState<CallStatus>("idle");
  const [selectedPreference, setSelectedPreference] = useState<string | null>(null);
  const [session, setSession] = useState<RandomCallSession | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(90);
  const [matchResult, setMatchResult] = useState<"matched" | "not_matched" | "rejected" | null>(null);
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [isExtendedCall, setIsExtendedCall] = useState(false);
  const [hasAskedFirstDecision, setHasAskedFirstDecision] = useState(false);
  
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
        .maybeSingle();
      
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
          
          const isUser1 = updated.user1_id === user.id;
          const myDecision = isUser1 ? updated.user1_decision : updated.user2_decision;
          const theirDecision = isUser1 ? updated.user2_decision : updated.user1_decision;
          
          // Check if other person said no
          if (theirDecision === "no") {
            setMatchResult("rejected");
            setStatus("rejected");
            setWaitingForOther(false);
            return;
          }
          
          // Check if both have decided
          if (updated.user1_decision && updated.user2_decision) {
            if (updated.user1_decision === "yes" && updated.user2_decision === "yes") {
              // Both said yes - match!
              setMatchResult("matched");
              setStatus("result");
            } else if (updated.user1_decision === "continue" && updated.user2_decision === "continue") {
              // Both want to continue - extend call
              setIsExtendedCall(true);
              setStatus("call_extended");
            } else if (
              (updated.user1_decision === "yes" && updated.user2_decision === "continue") ||
              (updated.user1_decision === "continue" && updated.user2_decision === "yes")
            ) {
              // One yes, one continue - continue for now
              setIsExtendedCall(true);
              setStatus("call_extended");
            }
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
    if ((status !== "in_call" && status !== "call_extended") || !session) return;

    const endTime = new Date(session.ends_at).getTime();
    const decisionTime = new Date(session.started_at).getTime() + 60000; // 1 minute mark
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      // At 1 minute mark (30 seconds remaining), show first decision
      if (!hasAskedFirstDecision && remaining <= 30 && remaining > 0 && status === "in_call") {
        setHasAskedFirstDecision(true);
        setStatus("first_decision");
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      }
      
      // Call ended at 0
      if (remaining <= 0) {
        setMatchResult("not_matched");
        setStatus("result");
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
  }, [status, session, hasAskedFirstDecision]);

  // Timer for extended call
  useEffect(() => {
    if (status !== "call_extended" || !session) return;

    const endTime = new Date(session.ends_at).getTime();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      if (remaining <= 0) {
        // Time's up - no more contact possible
        setMatchResult("not_matched");
        setStatus("result");
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

  const startSelecting = useCallback(() => {
    setStatus("selecting");
  }, []);

  const startSearch = useCallback(async (preference: string) => {
    if (!user || !userGender) return;
    
    setSelectedPreference(preference);
    setStatus("searching");
    setHasAskedFirstDecision(false);
    setIsExtendedCall(false);
    
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
            .maybeSingle();
          
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

  const submitDecision = useCallback(async (decision: "yes" | "no" | "continue") => {
    if (!session?.id || !user) return;
    
    // If no, immediately show rejected status
    if (decision === "no") {
      setMatchResult("not_matched");
      setStatus("result");
    } else {
      setWaitingForOther(true);
      setStatus("waiting_decision");
    }
    
    try {
      const { data } = await supabase.rpc("submit_random_call_decision", {
        p_session_id: session.id,
        p_user_id: user.id,
        p_decision: decision,
      });
      
      const result = data as { matched?: boolean; continued?: boolean; completed?: boolean; waiting?: boolean; rejected?: boolean; error?: string };
      
      if (result.rejected) {
        setMatchResult("rejected");
        setStatus("rejected");
        setWaitingForOther(false);
      } else if (result.completed) {
        if (result.matched) {
          setMatchResult("matched");
          setStatus("result");
        } else if (result.continued) {
          setIsExtendedCall(true);
          setStatus("call_extended");
        } else {
          setMatchResult("not_matched");
          setStatus("result");
        }
        setWaitingForOther(false);
      }
      // If waiting, the realtime subscription will handle the update
      
    } catch (error) {
      console.error("Error submitting decision:", error);
      setWaitingForOther(false);
    }
  }, [session, user]);

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
    setIsExtendedCall(false);
    setHasAskedFirstDecision(false);
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

  // Get the other user's ID from the session
  const otherUserId = session && user 
    ? (session.user1_id === user.id ? session.user2_id : session.user1_id)
    : null;

  return {
    status,
    selectedPreference,
    session,
    timeRemaining,
    matchResult,
    waitingForOther,
    isExtendedCall,
    otherUserId,
    startSelecting,
    startSearch,
    cancelSearch,
    submitDecision,
    reset,
  };
};
