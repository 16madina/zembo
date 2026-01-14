import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { RealtimeChannel } from "@supabase/supabase-js";

export type CallStatus =
  | "idle"
  | "selecting"
  | "searching"
  | "search_timeout" // timeout - no users found
  | "matched"
  | "in_call"
  | "first_decision" // At 1 minute mark
  | "waiting_decision"
  | "call_extended" // After both chose to continue
  | "result"
  | "rejected"; // Other person said no

// Tuning (mobile/iOS friendly)
const SEARCH_TIMEOUT_SECONDS = 60;
const SEARCH_POLL_INTERVAL_MS = 3000;

// Demo mode flag - set to true to simulate matches without a real user
const DEMO_MODE = false;
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
  searchTimeRemaining: number;
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
  const [searchTimeRemaining, setSearchTimeRemaining] = useState(SEARCH_TIMEOUT_SECONDS);
  const [matchResult, setMatchResult] = useState<"matched" | "not_matched" | "rejected" | null>(null);
  const [waitingForOther, setWaitingForOther] = useState(false);
  const [userGender, setUserGender] = useState<string | null>(null);
  const [isExtendedCall, setIsExtendedCall] = useState(false);
  const [hasAskedFirstDecision, setHasAskedFirstDecision] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchStartTime, setSearchStartTime] = useState<number | null>(null);

  const searchChannelRef = useRef<RealtimeChannel | null>(null);
  const sessionChannelRef = useRef<RealtimeChannel | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const searchIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const tryMatchRef = useRef<null | (() => Promise<void>)>(null);
  const isMatchingRef = useRef(false);
  const foundSessionRef = useRef(false);
  const timedOutRef = useRef(false);

  const log = useCallback((...args: unknown[]) => {
    // Intentionally always on for iOS debugging (filter by prefix in console)
    console.log("[random-call]", ...args);
  }, []);

  const clearSearchResources = useCallback(() => {
    if (searchIntervalRef.current) {
      clearInterval(searchIntervalRef.current);
      searchIntervalRef.current = null;
    }
    if (searchChannelRef.current) {
      searchChannelRef.current.unsubscribe();
      searchChannelRef.current = null;
    }
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    tryMatchRef.current = null;
    isMatchingRef.current = false;
  }, []);

  // Fetch user gender on mount
  useEffect(() => {
    const fetchUserGender = async () => {
      if (!user) return;

      const { data, error } = await supabase.from("profiles").select("gender").eq("user_id", user.id).maybeSingle();

      if (error) {
        log("fetchUserGender error", error.message);
      }

      if (data?.gender) {
        setUserGender(data.gender);
      }
    };

    fetchUserGender();
  }, [user, log]);

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

          log("session update", {
            sessionId: updated.id,
            status: updated.status,
            myDecision,
            theirDecision,
          });

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
      .subscribe((state) => {
        log("session channel state", state);
      });

    sessionChannelRef.current = channel;

    return () => {
      channel.unsubscribe();
      if (sessionChannelRef.current === channel) {
        sessionChannelRef.current = null;
      }
    };
  }, [session?.id, user, log]);

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

  // Timer for search countdown (timeout is enforced here based on Date.now, not only setTimeout)
  useEffect(() => {
    if (status !== "searching" || !searchStartTime || !user) return;

    const searchTimerInterval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - searchStartTime) / 1000);
      const remaining = Math.max(0, SEARCH_TIMEOUT_SECONDS - elapsed);
      setSearchTimeRemaining(remaining);

      if (remaining <= 0 && !timedOutRef.current && !foundSessionRef.current) {
        timedOutRef.current = true;
        log("search timeout reached", { elapsedSeconds: elapsed });

        void (async () => {
          try {
            await supabase.from("random_call_queue").delete().eq("user_id", user.id);
          } catch (e) {
            log("timeout cleanup failed", e);
          } finally {
            clearSearchResources();
            setStatus("search_timeout");
          }
        })();
      }
    }, 200); // frequent updates for smooth progress bar

    return () => {
      clearInterval(searchTimerInterval);
    };
  }, [status, searchStartTime, user, clearSearchResources, log]);

  // iOS/mobile: when app becomes visible/online again, immediately re-check for matches
  useEffect(() => {
    if (status !== "searching") return;

    const onWake = () => {
      log("wake event", {
        visibility: typeof document !== "undefined" ? document.visibilityState : "unknown",
        online: typeof navigator !== "undefined" ? navigator.onLine : true,
      });
      void tryMatchRef.current?.();
    };

    document.addEventListener("visibilitychange", onWake);
    window.addEventListener("online", onWake);

    return () => {
      document.removeEventListener("visibilitychange", onWake);
      window.removeEventListener("online", onWake);
    };
  }, [status, log]);

  const startSelecting = useCallback(() => {
    setStatus("selecting");
  }, []);

  const startSearch = useCallback(
    async (preference: string) => {
      if (!user) return;

      log("startSearch", {
        userId: user.id,
        preference,
        userGender,
        ua: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      });

      // reset refs for a fresh search
      foundSessionRef.current = false;
      timedOutRef.current = false;

      // Clear search resources + any previous timers
      clearSearchResources();

      if (demoTimeoutRef.current) {
        clearTimeout(demoTimeoutRef.current);
        demoTimeoutRef.current = null;
      }

      setSelectedPreference(preference);
      setStatus("searching");
      setHasAskedFirstDecision(false);
      setIsExtendedCall(false);
      setIsDemoMode(false);
      setSearchTimeRemaining(SEARCH_TIMEOUT_SECONDS);
      setSearchStartTime(Date.now());

      // If DEMO_MODE is enabled, simulate a match after delay
      if (DEMO_MODE) {
        // Set a timeout for search
        searchTimeoutRef.current = setTimeout(() => {
          // Cancel the demo match if it hasn't happened yet
          if (demoTimeoutRef.current) {
            clearTimeout(demoTimeoutRef.current);
            demoTimeoutRef.current = null;
          }
          setStatus("search_timeout");
        }, SEARCH_TIMEOUT_SECONDS * 1000);

        demoTimeoutRef.current = setTimeout(() => {
          // Clear the search timeout since we found a match
          if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
            searchTimeoutRef.current = null;
          }

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
      if (!userGender) {
        console.warn("Random call: user gender not loaded yet");
        setStatus("idle");
        setSelectedPreference(null);
        return;
      }

      const removeMeFromQueue = async () => {
        try {
          await supabase.from("random_call_queue").delete().eq("user_id", user.id);
        } catch (e) {
          log("removeMeFromQueue failed", e);
        }
      };

      const handleFoundSession = async (sessionId: string) => {
        if (foundSessionRef.current || timedOutRef.current) return;
        foundSessionRef.current = true;

        log("handleFoundSession", { sessionId });

        // Stop search activity ASAP
        clearSearchResources();
        void removeMeFromQueue();

        // Fetch full session row (more reliable than relying on INSERT payload)
        const { data: sessionData, error } = await supabase
          .from("random_call_sessions")
          .select("*")
          .eq("id", sessionId)
          .maybeSingle();

        if (error) {
          log("fetch session error", error.message);
        }

        if (!sessionData) {
          // If it wasn't ready yet, allow another attempt
          foundSessionRef.current = false;
          return;
        }

        setSession(sessionData as RandomCallSession);
        setStatus("matched");

        // Short delay then start call
        setTimeout(() => {
          setStatus("in_call");
        }, 2000);
      };

      const tryMatch = async () => {
        if (isMatchingRef.current || foundSessionRef.current || timedOutRef.current) return;

        isMatchingRef.current = true;
        try {
          const { data: sessionId, error } = await supabase.rpc("find_random_call_match", {
            p_user_id: user.id,
            p_user_gender: userGender,
            p_looking_for: preference,
          });

          if (error) {
            log("find_random_call_match error", error.message);
          } else {
            log("tryMatch result", { sessionId });
          }

          if (sessionId) {
            await handleFoundSession(sessionId as string);
          }
        } catch (e) {
          log("tryMatch exception", e);
        } finally {
          isMatchingRef.current = false;
        }
      };

      tryMatchRef.current = tryMatch;

      try {
        // Add to queue
        const { error: queueError } = await supabase.from("random_call_queue").upsert({
          user_id: user.id,
          gender: userGender,
          looking_for: preference,
          status: "waiting",
        });

        if (queueError) {
          log("queue upsert error", queueError.message);
          throw queueError;
        }

        log("added to queue");

        // Backup timeout: after SEARCH_TIMEOUT_SECONDS, stop searching and remove user from queue
        searchTimeoutRef.current = setTimeout(() => {
          if (timedOutRef.current || foundSessionRef.current) return;
          timedOutRef.current = true;

          void (async () => {
            await removeMeFromQueue();
            clearSearchResources();
            setStatus("search_timeout");
          })();
        }, SEARCH_TIMEOUT_SECONDS * 1000);

        // Try to find a match immediately and periodically
        await tryMatch();

        searchIntervalRef.current = setInterval(() => {
          void tryMatch();
        }, SEARCH_POLL_INTERVAL_MS);

        // Realtime: respond to queue changes + detect session creation even if polling is throttled (iOS)
        const searchChannel = supabase
          .channel(`random-call-search-${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "random_call_queue",
            },
            () => {
              log("queue change event");
              void tryMatch();
            }
          )
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "random_call_sessions",
            },
            (payload) => {
              const inserted = payload.new as RandomCallSession;
              const isMine = inserted.user1_id === user.id || inserted.user2_id === user.id;
              if (!isMine) return;

              log("session insert event", { sessionId: inserted.id });
              void handleFoundSession(inserted.id);
            }
          )
          .subscribe((state) => {
            log("search channel state", state);
          });

        searchChannelRef.current = searchChannel;
      } catch (error) {
        console.error("Error starting search:", error);
        clearSearchResources();
        setStatus("idle");
      }
    },
    [user, userGender, clearSearchResources, log]
  );

  const cancelSearch = useCallback(async () => {
    // Clear demo timeout if running
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }

    // Clear search timeout if running
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    clearSearchResources();

    if (!user) {
      setStatus("idle");
      setSelectedPreference(null);
      return;
    }

    try {
      await supabase.from("random_call_queue").delete().eq("user_id", user.id);

      setStatus("idle");
      setSelectedPreference(null);
      setIsDemoMode(false);
      setSearchStartTime(null);
      setSearchTimeRemaining(SEARCH_TIMEOUT_SECONDS);
      timedOutRef.current = false;
      foundSessionRef.current = false;
    } catch (error) {
      console.error("Error canceling search:", error);
    }
  }, [user, clearSearchResources]);

  const submitDecision = useCallback(
    async (decision: "yes" | "no") => {
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

        const result = data as {
          matched?: boolean;
          completed?: boolean;
          waiting?: boolean;
          rejected?: boolean;
          error?: string;
        };

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
    },
    [session, user, isDemoMode]
  );

  const reset = useCallback(async () => {
    // Clear demo timeout
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current);
      demoTimeoutRef.current = null;
    }

    // Clear search timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
      searchTimeoutRef.current = null;
    }

    // Clean up queue (only if real mode and user exists)
    if (user && !isDemoMode) {
      await supabase.from("random_call_queue").delete().eq("user_id", user.id);
    }

    clearSearchResources();

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (sessionChannelRef.current) {
      sessionChannelRef.current.unsubscribe();
      sessionChannelRef.current = null;
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
    setSearchStartTime(null);
    setSearchTimeRemaining(SEARCH_TIMEOUT_SECONDS);

    foundSessionRef.current = false;
    timedOutRef.current = false;
  }, [user, isDemoMode, clearSearchResources]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearSearchResources();

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (sessionChannelRef.current) {
        sessionChannelRef.current.unsubscribe();
      }

      if (demoTimeoutRef.current) {
        clearTimeout(demoTimeoutRef.current);
      }

      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [clearSearchResources]);

  // Get the other user's ID from the session
  const otherUserId = session && user ? (session.user1_id === user.id ? session.user2_id : session.user1_id) : null;

  return {
    status,
    selectedPreference,
    session,
    timeRemaining,
    searchTimeRemaining,
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
