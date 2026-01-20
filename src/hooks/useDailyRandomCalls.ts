import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useUserSubscription } from "@/hooks/useUserSubscription";

interface DailyRandomCallsState {
  callsUsed: number;
  maxCalls: number;
  canCall: boolean;
  isLoading: boolean;
  remainingCalls: number;
}

export const useDailyRandomCalls = () => {
  const { user } = useAuth();
  const { tier } = useUserSubscription(user?.id);
  const [state, setState] = useState<DailyRandomCallsState>({
    callsUsed: 0,
    maxCalls: 1,
    canCall: true,
    isLoading: true,
    remainingCalls: 1,
  });

  // Determine max calls based on subscription tier
  const getMaxCalls = useCallback(() => {
    switch (tier) {
      case "vip":
        return Infinity; // Platinum: unlimited
      case "premium":
        return 5; // Gold: 5 per day
      default:
        return 1; // Free: 1 per day
    }
  }, [tier]);

  const fetchCallCount = useCallback(async () => {
    if (!user?.id) {
      setState(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("daily_random_calls")
        .select("call_count")
        .eq("user_id", user.id)
        .eq("call_date", today)
        .maybeSingle();

      if (error) throw error;

      const callsUsed = data?.call_count || 0;
      const maxCalls = getMaxCalls();
      const remainingCalls = maxCalls === Infinity ? Infinity : Math.max(0, maxCalls - callsUsed);
      const canCall = maxCalls === Infinity || callsUsed < maxCalls;

      setState({
        callsUsed,
        maxCalls,
        canCall,
        isLoading: false,
        remainingCalls,
      });
    } catch (error) {
      console.error("Error fetching daily random calls:", error);
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [user?.id, getMaxCalls]);

  const incrementCallCount = useCallback(async () => {
    if (!user?.id) return false;

    const maxCalls = getMaxCalls();
    
    // Platinum users (unlimited) can always call
    if (maxCalls === Infinity) {
      return true;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Try to upsert - increment if exists, create if not
      const { data: existing } = await supabase
        .from("daily_random_calls")
        .select("call_count")
        .eq("user_id", user.id)
        .eq("call_date", today)
        .maybeSingle();

      const currentCount = existing?.call_count || 0;

      if (currentCount >= maxCalls) {
        return false;
      }

      if (existing) {
        // Update existing record
        const { error } = await supabase
          .from("daily_random_calls")
          .update({ call_count: currentCount + 1 })
          .eq("user_id", user.id)
          .eq("call_date", today);

        if (error) throw error;
      } else {
        // Insert new record
        const { error } = await supabase
          .from("daily_random_calls")
          .insert({
            user_id: user.id,
            call_date: today,
            call_count: 1,
          });

        if (error) throw error;
      }

      // Refresh the state
      await fetchCallCount();
      return true;
    } catch (error) {
      console.error("Error incrementing call count:", error);
      return false;
    }
  }, [user?.id, getMaxCalls, fetchCallCount]);

  useEffect(() => {
    fetchCallCount();
  }, [fetchCallCount]);

  return {
    ...state,
    incrementCallCount,
    refresh: fetchCallCount,
  };
};
