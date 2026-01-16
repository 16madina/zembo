import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserSubscriptionData {
  tier: "free" | "premium" | "vip";
  is_active: boolean;
}

export const useUserSubscription = (userId: string | null | undefined) => {
  const [subscription, setSubscription] = useState<UserSubscriptionData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!userId) {
        setSubscription(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      const { data, error } = await supabase
        .from("user_subscriptions")
        .select("tier, is_active")
        .eq("user_id", userId)
        .eq("is_active", true)
        .maybeSingle();

      if (!error && data) {
        setSubscription(data as UserSubscriptionData);
      } else {
        setSubscription(null);
      }
      setLoading(false);
    };

    fetchSubscription();
  }, [userId]);

  const tier = subscription?.tier || "free";
  const isPremium = tier === "premium" || tier === "vip";
  const isVip = tier === "vip";

  return {
    subscription,
    loading,
    tier,
    isPremium,
    isVip,
  };
};
