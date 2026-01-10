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

// Demo mode flag - set to true to simulate matches without a real user
const DEMO_MODE = true;
const DEMO_MATCH_DELAY_MS = 4000; // Time before "finding" a demo match

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
  submitDecision: (decision: "yes" | "no") => Promise<void>;
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
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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

  // Timer for call duration (works for both real and demo mode)
  // Also continues during first_decision and waiting_decision states
  useEffect(() => {
    if (status !== "in_call" && status !== "call_extended" && status !== "first_decision" && status !== "waiting_decision") return;
    if (!session && !isDemoMode) return;

    // For demo mode, we use a simple countdown from timeRemaining
    // For real mode, we use session.ends_at
    const getEndTime = () => {
      if (isDemoMode) {
        // Demo: countdown from current timeRemaining
        return Date.now() + timeRemaining * 1000;
      }
      return session ? new Date(session.ends_at).getTime() : Date.now();
    };

    const endTime = getEndTime();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
      // At 30 seconds remaining, show first decision (but keep timer running!)
      if (!hasAskedFirstDecision && remaining <= 30 && remaining > 0 && status === "in_call") {
        setHasAskedFirstDecision(true);
        setStatus("first_decision");
        // DON'T clear the timer - let the countdown continue!
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
  }, [status, session, hasAskedFirstDecision, isDemoMode]);

  // Timer for extended call (demo mode compatible)
  useEffect(() => {
    if (status !== "call_extended") return;
    if (!session && !isDemoMode) return;

    const getEndTime = () => {
      if (isDemoMode) {
        return Date.now() + timeRemaining * 1000;
      }
      return session ? new Date(session.ends_at).getTime() : Date.now();
    };

    const endTime = getEndTime();
    
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((endTime - now) / 1000));
      setTimeRemaining(remaining);
      
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
  }, [status, session, isDemoMode]);

  const startSelecting = useCallback(() => {
    setStatus("selecting");
  }, []);

  const startSearch = useCallback(async (preference: string) => {
    if (!user) return;
    
    setSelectedPreference(preference);
    setStatus("searching");
    setHasAskedFirstDecision(false);
    setIsExtendedCall(false);
    setIsDemoMode(false);
    
    // If DEMO_MODE is enabled, simulate a match after delay
    if (DEMO_MODE) {
      demoTimeoutRef.current = setTimeout(() => {
        // Create a fake demo session
        const now = new Date();
        const endsAt = new Date(now.getTime() + 90 * 1000); // 90 seconds from now
        
        const demoSession: RandomCallSession = {
          id: "demo-session-" + Date.now(),
          user1_id: user.id,
          user2_id: "demo-user-id",
          started_at: now.toISOString(),
          ends_at: endsAt.toISOString(),
          user1_decision: null,
          user2_decision: null,
          status: "active",
        };
        
        setSession(demoSession);
        setIsDemoMode(true);
        setTimeRemaining(90);
        setStatus("matched");
        
        // Short delay then start call
        setTimeout(() => {
          setStatus("in_call");
        }, 2000);
      }, DEMO_MATCH_DELAY_MS);
      
      return;
    }
    
    // Real mode - requires userGender
    if (!userGender) return;
    
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
    // Clear demo timeout if running
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    
    if (!user) {
      setStatus("idle");
      setSelectedPreference(null);
      return;
    }
    
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
      setIsDemoMode(false);
    } catch (error) {
      console.error("Error canceling search:", error);
    }
  }, [user]);

  const submitDecision = useCallback(async (decision: "yes" | "no") => {
    if (!user) return;
    
    // DEMO MODE: simulate the other person's response
    if (isDemoMode) {
      if (decision === "no") {
        setMatchResult("not_matched");
        setStatus("result");
      } else {
        setWaitingForOther(true);
        setStatus("waiting_decision");
        
        // Simulate the other person responding after 1-2 seconds
        setTimeout(() => {
          // Demo: 80% chance the other person also says yes
          const demoResponse = Math.random() > 0.2 ? "yes" : "no";
          
          if (demoResponse === "yes") {
            setMatchResult("matched");
            setStatus("result");
          } else {
            // Other person said no
            setMatchResult("rejected");
            setStatus("rejected");
          }
          setWaitingForOther(false);
        }, 1500);
      }
      return;
    }
    
    // Real mode
    if (!session?.id) return;
    
    // If no, immediately end and go to result
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
      
      const result = data as { matched?: boolean; completed?: boolean; waiting?: boolean; rejected?: boolean; error?: string };
      
      if (result.rejected) {
        setMatchResult("rejected");
        setStatus("rejected");
        setWaitingForOther(false);
      } else if (result.completed) {
        if (result.matched) {
          setMatchResult("matched");
          setStatus("result");
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
  }, [session, user, isDemoMode]);

  const reset = useCallback(async () => {
    // Clear demo timeout
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }
    
    // Clean up queue (only if real mode and user exists)
    if (user && !isDemoMode) {
      await supabase
        .from("random_call_queue")
        .delete()
        .eq("user_id", user.id);
    }
    
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
    setIsDemoMode(false);
  }, [user, isDemoMode]);

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
      if (demoTimeoutRef.current) {
        clearTimeout(demoTimeoutRef.current);
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
