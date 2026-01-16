import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSubscription } from "@/hooks/useSubscription";

const FREE_DAILY_LIKES = 10;

interface DailyLikesState {
  likesUsedToday: number;
  likesRemaining: number;
  canLike: boolean;
  isLoading: boolean;
}

export const useDailyLikes = () => {
  const { user } = useAuth();
  const { isPremium, loading: subscriptionLoading } = useSubscription();
  const [state, setState] = useState<DailyLikesState>({
    likesUsedToday: 0,
    likesRemaining: FREE_DAILY_LIKES,
    canLike: true,
    isLoading: true,
  });

  const getTodayStart = () => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    return now.toISOString();
  };

  const fetchDailyLikes = useCallback(async () => {
    if (!user) {
      setState({
        likesUsedToday: 0,
        likesRemaining: FREE_DAILY_LIKES,
        canLike: true,
        isLoading: false,
      });
      return;
    }

    // Premium users have unlimited likes
    if (isPremium) {
      setState({
        likesUsedToday: 0,
        likesRemaining: Infinity,
        canLike: true,
        isLoading: false,
      });
      return;
    }

    try {
      const todayStart = getTodayStart();

      const { count, error } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("liker_id", user.id)
        .gte("created_at", todayStart);

      if (error) {
        console.error("Error fetching daily likes:", error);
        setState((prev) => ({ ...prev, isLoading: false }));
        return;
      }

      const likesUsed = count || 0;
      const remaining = Math.max(0, FREE_DAILY_LIKES - likesUsed);

      setState({
        likesUsedToday: likesUsed,
        likesRemaining: remaining,
        canLike: remaining > 0,
        isLoading: false,
      });
    } catch (err) {
      console.error("Error in fetchDailyLikes:", err);
      setState((prev) => ({ ...prev, isLoading: false }));
    }
  }, [user, isPremium]);

  useEffect(() => {
    if (!subscriptionLoading) {
      fetchDailyLikes();
    }
  }, [fetchDailyLikes, subscriptionLoading]);

  const incrementLikesUsed = useCallback(() => {
    if (isPremium) return; // Premium users don't track

    setState((prev) => ({
      ...prev,
      likesUsedToday: prev.likesUsedToday + 1,
      likesRemaining: Math.max(0, prev.likesRemaining - 1),
      canLike: prev.likesRemaining - 1 > 0,
    }));
  }, [isPremium]);

  const decrementLikesUsed = useCallback(() => {
    if (isPremium) return;

    setState((prev) => ({
      ...prev,
      likesUsedToday: Math.max(0, prev.likesUsedToday - 1),
      likesRemaining: Math.min(FREE_DAILY_LIKES, prev.likesRemaining + 1),
      canLike: true,
    }));
  }, [isPremium]);

  return {
    ...state,
    isPremium,
    maxDailyLikes: isPremium ? Infinity : FREE_DAILY_LIKES,
    refetch: fetchDailyLikes,
    incrementLikesUsed,
    decrementLikesUsed,
  };
};
