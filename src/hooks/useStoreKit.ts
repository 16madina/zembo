import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isNative, isIOS } from "@/lib/capacitor";
import {
  initializeStoreKit,
  purchaseProduct,
  restorePurchases,
  getSubscriptionProducts,
  getCoinProducts,
  getActiveSubscriptions,
  getSubscriptionTier,
  isStoreKitAvailable,
  SUBSCRIPTION_PRODUCT_IDS,
  COIN_PACK_TO_PRODUCT,
  type StoreKitProduct,
  type SubscriptionPlan,
} from "@/lib/storekit";

interface UseStoreKitReturn {
  isInitialized: boolean;
  isLoading: boolean;
  subscriptionProducts: StoreKitProduct[];
  coinProducts: StoreKitProduct[];
  tier: "free" | "premium" | "vip";
  isPremium: boolean;
  isVip: boolean;
  subscribe: (plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
  purchaseCoins: (packId: string) => Promise<{ success: boolean; coins?: number; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export const useStoreKit = (): UseStoreKitReturn => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscriptionProducts, setSubscriptionProducts] = useState<StoreKitProduct[]>([]);
  const [coinProducts, setCoinProducts] = useState<StoreKitProduct[]>([]);
  const [tier, setTier] = useState<"free" | "premium" | "vip">("free");

  // Initialize StoreKit when user is available
  useEffect(() => {
    const init = async () => {
      if (!isNative || !isIOS) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const initialized = await initializeStoreKit(user?.id);
        setIsInitialized(initialized);

        if (initialized) {
          // Get products
          const subs = getSubscriptionProducts();
          const coins = getCoinProducts();
          setSubscriptionProducts(subs);
          setCoinProducts(coins);

          // Check active subscriptions
          const activeSubscriptions = await getActiveSubscriptions();
          const currentTier = getSubscriptionTier(activeSubscriptions);
          setTier(currentTier);

          // Sync with Supabase
          if (user?.id) {
            await syncSubscriptionToSupabase(user.id, currentTier);
          }
        }
      } catch (error) {
        console.error("StoreKit init error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Sync subscription to Supabase
  const syncSubscriptionToSupabase = async (userId: string, tier: "free" | "premium" | "vip") => {
    try {
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      const subscriptionData = {
        tier,
        is_active: tier !== "free",
        updated_at: new Date().toISOString(),
      };

      if (existingSub) {
        await supabase
          .from("user_subscriptions")
          .update(subscriptionData)
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            ...subscriptionData,
          });
      }

      console.log("StoreKit: Synced subscription to Supabase", { tier });
    } catch (error) {
      console.error("StoreKit: Failed to sync subscription:", error);
    }
  };

  // Subscribe to a plan
  const subscribe = useCallback(async (plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> => {
    if (!isStoreKitAvailable()) {
      return { success: false, error: "StoreKit not available" };
    }

    setIsLoading(true);

    try {
      const productId = SUBSCRIPTION_PRODUCT_IDS[plan];
      const result = await purchaseProduct(productId);

      if (result.success) {
        // Verify receipt with our server
        if (result.receipt && user?.id) {
          await verifyReceiptWithServer(user.id, result.receipt, productId);
        }

        // Update local tier
        const newTier = plan === "platinum" ? "vip" : "premium";
        setTier(newTier);
        
        if (user?.id) {
          await syncSubscriptionToSupabase(user.id, newTier);
        }

        const planName = plan === "gold" ? "Gold" : "Platinum";
        toast.success(`🎉 Bienvenue dans ZEMBO ${planName}!`);
        
        return { success: true };
      } else if (result.error && result.error !== "Achat annulé") {
        toast.error(result.error);
      }

      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Purchase coins
  const purchaseCoins = useCallback(async (packId: string): Promise<{ success: boolean; coins?: number; error?: string }> => {
    if (!isStoreKitAvailable()) {
      return { success: false, error: "StoreKit not available" };
    }

    const packInfo = COIN_PACK_TO_PRODUCT[packId];
    if (!packInfo) {
      return { success: false, error: "Invalid pack ID" };
    }

    setIsLoading(true);

    try {
      const result = await purchaseProduct(packInfo.productId);

      if (result.success) {
        const totalCoins = packInfo.coins + packInfo.bonus;

        // Verify receipt and add coins via server
        if (result.receipt && user?.id) {
          const verified = await verifyReceiptWithServer(
            user.id, 
            result.receipt, 
            packInfo.productId,
            totalCoins
          );
          
          if (verified) {
            toast.success(`🎉 ${totalCoins} coins ajoutés à votre compte !`);
            return { success: true, coins: totalCoins };
          }
        }
        
        return { success: true, coins: totalCoins };
      } else if (result.error && result.error !== "Achat annulé") {
        toast.error(result.error);
      }

      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Verify receipt with our server
  const verifyReceiptWithServer = async (
    userId: string, 
    receipt: string, 
    productId: string,
    coins?: number
  ): Promise<boolean> => {
    try {
      const { error } = await supabase.functions.invoke("verify-ios-receipt", {
        body: {
          userId,
          receipt,
          productId,
          coins,
        },
      });

      if (error) {
        console.error("Receipt verification failed:", error);
        return false;
      }

      return true;
    } catch (error) {
      console.error("Receipt verification error:", error);
      return false;
    }
  };

  // Restore purchases
  const restore = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isStoreKitAvailable()) {
      return { success: false, error: "StoreKit not available" };
    }

    setIsLoading(true);

    try {
      const result = await restorePurchases();

      if (result.success) {
        // Check which subscriptions were restored
        const restoredTier = getSubscriptionTier(result.restoredProducts);
        setTier(restoredTier);

        if (user?.id) {
          await syncSubscriptionToSupabase(user.id, restoredTier);
        }

        if (restoredTier !== "free") {
          toast.success("🎉 Vos achats ont été restaurés!");
        } else {
          toast.info("Aucun achat à restaurer");
        }

        return { success: true };
      } else if (result.error) {
        toast.error(result.error);
      }

      return { success: false, error: result.error };
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh subscription status
  const refresh = useCallback(async () => {
    if (!isStoreKitAvailable()) return;

    setIsLoading(true);
    try {
      const activeSubscriptions = await getActiveSubscriptions();
      const currentTier = getSubscriptionTier(activeSubscriptions);
      setTier(currentTier);

      if (user?.id) {
        await syncSubscriptionToSupabase(user.id, currentTier);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  return {
    isInitialized,
    isLoading,
    subscriptionProducts,
    coinProducts,
    tier,
    isPremium: tier === "premium" || tier === "vip",
    isVip: tier === "vip",
    subscribe,
    purchaseCoins,
    restore,
    refresh,
  };
};
