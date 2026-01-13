import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "./useCoins";
import type { Tables } from "@/integrations/supabase/types";

export type VirtualGift = Tables<"virtual_gifts">;
export type GiftTransaction = Tables<"gift_transactions">;

export const useGifts = (liveId?: string) => {
  const { user } = useAuth();
  const { balance, spendCoins, refetch: refetchCoins } = useCoins();
  const [gifts, setGifts] = useState<VirtualGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [recentGifts, setRecentGifts] = useState<
    (GiftTransaction & { gift?: VirtualGift; sender_name?: string })[]
  >([]);

  const fetchGifts = useCallback(async () => {
    const { data, error } = await supabase
      .from("virtual_gifts")
      .select("*")
      .eq("is_active", true)
      .order("price_coins", { ascending: true });

    if (!error && data) {
      setGifts(data);
    }
    setLoading(false);
  }, []);

  // Send a gift to someone (outside of live streams, creates a like for roses)
  const sendGift = async (
    gift: VirtualGift,
    receiverId: string,
    message?: string,
    options?: { createLike?: boolean; sendNotification?: boolean }
  ): Promise<{ success: boolean; error?: string }> => {
    if (!user) {
      return { success: false, error: "Non authentifié" };
    }

    if (balance < gift.price_coins) {
      return { success: false, error: "Solde insuffisant" };
    }

    // Spend the coins first
    const spent = await spendCoins(gift.price_coins);
    if (!spent) {
      return { success: false, error: "Impossible de débiter les coins" };
    }

    // Record the transaction
    const { error } = await supabase.from("gift_transactions").insert({
      sender_id: user.id,
      receiver_id: receiverId,
      live_id: liveId,
      gift_id: gift.id,
      coin_amount: gift.price_coins,
      message,
    });

    if (error) {
      // Refund the coins if transaction fails
      await refetchCoins();
      return { success: false, error: "Erreur lors de l'envoi du cadeau" };
    }

    // For Rose gifts (outside live), also create a like with has_rose = true
    if (options?.createLike && gift.name === "Rose") {
      const { error: likeError } = await supabase
        .from("likes")
        .upsert({
          liker_id: user.id,
          liked_id: receiverId,
          is_super_like: false,
          has_rose: true,
        }, { onConflict: 'liker_id,liked_id' });

      if (likeError) {
        console.error("Error creating like for rose:", likeError);
        // Don't fail the whole transaction, the gift was already sent
      }

      // Send push notification for rose
      if (options?.sendNotification) {
        try {
          await supabase.functions.invoke("notify-rose", {
            body: {
              sender_id: user.id,
              receiver_id: receiverId,
              message: message,
            },
          });
        } catch (notifError) {
          console.error("Error sending rose notification:", notifError);
          // Don't fail the transaction for notification errors
        }
      }
    }

    return { success: true };
  };

  // Subscribe to gift transactions for a specific live
  useEffect(() => {
    if (!liveId) return;

    const fetchRecentGifts = async () => {
      const { data: transactions } = await supabase
        .from("gift_transactions")
        .select("*")
        .eq("live_id", liveId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (transactions && transactions.length > 0) {
        // Fetch gift details
        const giftIds = [...new Set(transactions.map((t) => t.gift_id))];
        const senderIds = [...new Set(transactions.map((t) => t.sender_id))];

        const [giftsResult, profilesResult] = await Promise.all([
          supabase.from("virtual_gifts").select("*").in("id", giftIds),
          supabase
            .from("profiles")
            .select("user_id, display_name")
            .in("user_id", senderIds),
        ]);

        const giftMap = new Map(
          giftsResult.data?.map((g) => [g.id, g]) || []
        );
        const profileMap = new Map(
          profilesResult.data?.map((p) => [p.user_id, p.display_name]) || []
        );

        const enrichedTransactions = transactions.map((t) => ({
          ...t,
          gift: giftMap.get(t.gift_id),
          sender_name: profileMap.get(t.sender_id) || "Anonyme",
        }));

        setRecentGifts(enrichedTransactions);
      }
    };

    fetchRecentGifts();

    const channel = supabase
      .channel(`live-gifts-${liveId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "gift_transactions",
          filter: `live_id=eq.${liveId}`,
        },
        async (payload) => {
          const newTransaction = payload.new as GiftTransaction;

          // Fetch gift and sender info
          const [giftResult, profileResult] = await Promise.all([
            supabase
              .from("virtual_gifts")
              .select("*")
              .eq("id", newTransaction.gift_id)
              .single(),
            supabase
              .from("profiles")
              .select("display_name")
              .eq("user_id", newTransaction.sender_id)
              .single(),
          ]);

          const enrichedTransaction = {
            ...newTransaction,
            gift: giftResult.data || undefined,
            sender_name: profileResult.data?.display_name || "Anonyme",
          };

          setRecentGifts((prev) => [enrichedTransaction, ...prev.slice(0, 9)]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [liveId]);

  useEffect(() => {
    fetchGifts();
  }, [fetchGifts]);

  return {
    gifts,
    loading,
    sendGift,
    recentGifts,
  };
};
