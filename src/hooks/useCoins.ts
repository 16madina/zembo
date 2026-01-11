import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Tables } from "@/integrations/supabase/types";

export type UserCoins = Tables<"user_coins">;

export const useCoins = () => {
  const { user } = useAuth();
  const [coins, setCoins] = useState<UserCoins | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCoins = useCallback(async () => {
    if (!user) {
      setCoins(null);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("user_coins")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!error) {
      setCoins(data);
    }
    setLoading(false);
  }, [user]);

  // Spend coins (returns true if successful)
  const spendCoins = async (amount: number): Promise<boolean> => {
    if (!user || !coins || coins.balance < amount) {
      return false;
    }

    const { error } = await supabase
      .from("user_coins")
      .update({
        balance: coins.balance - amount,
        total_spent: coins.total_spent + amount,
      })
      .eq("user_id", user.id);

    if (!error) {
      setCoins((prev) =>
        prev
          ? {
              ...prev,
              balance: prev.balance - amount,
              total_spent: prev.total_spent + amount,
            }
          : null
      );
      return true;
    }

    return false;
  };

  // Add coins (for purchases or rewards)
  const addCoins = async (amount: number): Promise<boolean> => {
    if (!user) return false;

    if (!coins) {
      // Create new coin record
      const { data, error } = await supabase
        .from("user_coins")
        .insert({
          user_id: user.id,
          balance: amount,
          total_earned: amount,
        })
        .select()
        .single();

      if (!error && data) {
        setCoins(data);
        return true;
      }
      return false;
    }

    const { error } = await supabase
      .from("user_coins")
      .update({
        balance: coins.balance + amount,
        total_earned: coins.total_earned + amount,
      })
      .eq("user_id", user.id);

    if (!error) {
      setCoins((prev) =>
        prev
          ? {
              ...prev,
              balance: prev.balance + amount,
              total_earned: prev.total_earned + amount,
            }
          : null
      );
      return true;
    }

    return false;
  };

  useEffect(() => {
    fetchCoins();
  }, [fetchCoins]);

  return {
    coins,
    balance: coins?.balance ?? 0,
    loading,
    spendCoins,
    addCoins,
    refetch: fetchCoins,
  };
};
