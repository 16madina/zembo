import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type JoinGift = Tables<"virtual_gifts"> & { is_join_gift: boolean };

export const useLiveAccess = (liveId: string) => {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [isStreamer, setIsStreamer] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [joinGifts, setJoinGifts] = useState<JoinGift[]>([]);

  const checkAccess = useCallback(async () => {
    if (!user || !liveId) {
      setHasAccess(false);
      setLoading(false);
      return;
    }

    setLoading(true);

    try {
      // Check if user is the streamer
      const { data: live } = await supabase
        .from("lives")
        .select("streamer_id")
        .eq("id", liveId)
        .maybeSingle();

      if (live?.streamer_id === user.id) {
        setIsStreamer(true);
        setHasAccess(true);
        setLoading(false);
        return;
      }

      // Use the can_access_live function
      const { data: canAccess, error } = await supabase.rpc("can_access_live", {
        p_user_id: user.id,
        p_live_id: liveId,
      });

      if (error) {
        console.error("Error checking access:", error);
        setHasAccess(false);
      } else {
        setHasAccess(canAccess ?? false);
        
        // Check if access is via Premium
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("tier, is_active")
          .eq("user_id", user.id)
          .maybeSingle();
        
        setIsPremium(
          subscription?.is_active && 
          (subscription?.tier === "premium" || subscription?.tier === "vip")
        );
      }
    } catch (err) {
      console.error("Error checking live access:", err);
      setHasAccess(false);
    }

    setLoading(false);
  }, [user, liveId]);

  // Fetch join gifts
  const fetchJoinGifts = useCallback(async () => {
    const { data, error } = await supabase
      .from("virtual_gifts")
      .select("*")
      .eq("is_join_gift", true)
      .eq("is_active", true)
      .order("price_coins", { ascending: true });

    if (!error && data) {
      setJoinGifts(data as JoinGift[]);
    }
  }, []);

  // Grant access after sending a join gift
  const grantAccessWithGift = async (giftId: string): Promise<{ success: boolean; error?: string }> => {
    if (!user || !liveId) {
      return { success: false, error: "Non authentifié" };
    }

    try {
      const { error } = await supabase.from("live_access").insert({
        live_id: liveId,
        user_id: user.id,
        gift_id: giftId,
      });

      if (error) {
        if (error.code === "23505") {
          // Already has access (unique constraint)
          setHasAccess(true);
          return { success: true };
        }
        console.error("Error granting access:", error);
        return { success: false, error: "Erreur lors de l'accès" };
      }

      setHasAccess(true);
      return { success: true };
    } catch (err) {
      console.error("Error granting access:", err);
      return { success: false, error: "Erreur lors de l'accès" };
    }
  };

  useEffect(() => {
    checkAccess();
    fetchJoinGifts();
  }, [checkAccess, fetchJoinGifts]);

  // Subscribe to access changes
  useEffect(() => {
    if (!user || !liveId) return;

    const channel = supabase
      .channel(`live-access-${liveId}-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "live_access",
          filter: `live_id=eq.${liveId}`,
        },
        (payload) => {
          const newAccess = payload.new as Tables<"live_access">;
          if (newAccess.user_id === user.id) {
            setHasAccess(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, liveId]);

  return {
    hasAccess,
    loading,
    isStreamer,
    isPremium,
    joinGifts,
    checkAccess,
    grantAccessWithGift,
  };
};
