import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type Subscription = Tables<"user_subscriptions">;

export const useSubscription = () => {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSubscription = async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("user_subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) {
      setSubscription(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchSubscription();
  }, [user]);

  const isPremium = subscription?.tier === "premium" || subscription?.tier === "vip";
  const isVip = subscription?.tier === "vip";

  return {
    subscription,
    loading,
    isPremium,
    isVip,
    fetchSubscription,
  };
};
