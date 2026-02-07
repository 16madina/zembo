import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserSubscription } from "@/hooks/useUserSubscription";

// Skip limits per subscription tier
const SKIP_LIMITS = {
  free: 3,
  premium: 5,    // Gold
  vip: 7,        // Platinum
} as const;

export const useDailySkips = (userId: string | undefined) => {
  const [skipCount, setSkipCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { tier } = useUserSubscription(userId);

  // Get max skips based on subscription
  const maxSkips = SKIP_LIMITS[tier] || SKIP_LIMITS.free;
  const remainingSkips = Math.max(0, maxSkips - skipCount);
  const canSkip = remainingSkips > 0;

  // Fetch today's skip count
  const fetchSkipCount = useCallback(async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      const today = new Date().toISOString().split("T")[0];
      
      const { data, error } = await supabase
        .from("daily_skips")
        .select("skip_count")
        .eq("user_id", userId)
        .eq("skip_date", today)
        .maybeSingle();

      if (error) {
        console.error("[useDailySkips] Error fetching skip count:", error);
        return;
      }

      setSkipCount(data?.skip_count || 0);
    } catch (err) {
      console.error("[useDailySkips] Unexpected error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId]);

  // Increment skip count
  const incrementSkipCount = useCallback(async (): Promise<boolean> => {
    if (!userId || !canSkip) {
      return false;
    }

    try {
      const today = new Date().toISOString().split("T")[0];

      // Try to upsert (insert or update)
      const { data: existing } = await supabase
        .from("daily_skips")
        .select("id, skip_count")
        .eq("user_id", userId)
        .eq("skip_date", today)
        .maybeSingle();

      if (existing) {
        // Update existing record
        const newCount = existing.skip_count + 1;
        const { error } = await supabase
          .from("daily_skips")
          .update({ skip_count: newCount })
          .eq("id", existing.id);

        if (error) {
          console.error("[useDailySkips] Error updating skip count:", error);
          return false;
        }

        setSkipCount(newCount);
      } else {
        // Insert new record
        const { error } = await supabase
          .from("daily_skips")
          .insert({
            user_id: userId,
            skip_date: today,
            skip_count: 1,
          });

        if (error) {
          console.error("[useDailySkips] Error inserting skip count:", error);
          return false;
        }

        setSkipCount(1);
      }

      return true;
    } catch (err) {
      console.error("[useDailySkips] Unexpected error incrementing:", err);
      return false;
    }
  }, [userId, canSkip]);

  // Fetch on mount and when userId changes
  useEffect(() => {
    fetchSkipCount();
  }, [fetchSkipCount]);

  return {
    skipCount,
    maxSkips,
    remainingSkips,
    canSkip,
    isLoading,
    incrementSkipCount,
    refetch: fetchSkipCount,
  };
};
