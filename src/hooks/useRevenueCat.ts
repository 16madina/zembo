import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isNative } from "@/lib/capacitor";
import {
  initializeRevenueCat,
  loginRevenueCat,
  logoutRevenueCat,
  getCustomerInfo,
  getOfferings,
  purchasePackage,
  restorePurchases,
  getSubscriptionTier,
  isRevenueCatAvailable,
  PACKAGE_IDS,
  type CustomerInfo,
  type RevenueCatPackage,
  type SubscriptionPlan,
} from "@/lib/revenuecat";

interface UseRevenueCatReturn {
  isInitialized: boolean;
  isLoading: boolean;
  customerInfo: CustomerInfo | null;
  packages: RevenueCatPackage[] | null;
  tier: "free" | "premium" | "vip";
  isPremium: boolean;
  isVip: boolean;
  subscribe: (plan: SubscriptionPlan) => Promise<{ success: boolean; error?: string }>;
  restore: () => Promise<{ success: boolean; error?: string }>;
  refresh: () => Promise<void>;
}

export const useRevenueCat = (): UseRevenueCatReturn => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [customerInfo, setCustomerInfo] = useState<CustomerInfo | null>(null);
  const [packages, setPackages] = useState<RevenueCatPackage[] | null>(null);

  // Initialize RevenueCat and login when user is available
  useEffect(() => {
    const init = async () => {
      if (!isNative) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Initialize RevenueCat
        const initialized = await initializeRevenueCat(user?.id);
        setIsInitialized(initialized);

        if (initialized && user?.id) {
          // Login with user ID to sync purchases
          await loginRevenueCat(user.id);
          
          // Get customer info and offerings
          const [info, offers] = await Promise.all([
            getCustomerInfo(),
            getOfferings(),
          ]);
          
          setCustomerInfo(info);
          setPackages(offers);

          // Sync subscription status with Supabase
          if (info) {
            await syncSubscriptionToSupabase(user.id, info);
          }
        }
      } catch (error) {
        console.error("RevenueCat init error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    init();
  }, [user?.id]);

  // Logout from RevenueCat when user logs out
  useEffect(() => {
    if (!user && isInitialized) {
      logoutRevenueCat();
      setCustomerInfo(null);
    }
  }, [user, isInitialized]);

  // Sync RevenueCat subscription to Supabase
  const syncSubscriptionToSupabase = async (userId: string, info: CustomerInfo) => {
    try {
      const tier = getSubscriptionTier(info);
      
      // Get current period info from active entitlement
      let periodStart: Date | null = null;
      let periodEnd: Date | null = null;
      
      const activeEntitlement = info.entitlements.active.platinum || info.entitlements.active.gold;
      if (activeEntitlement?.expirationDate) {
        periodEnd = new Date(activeEntitlement.expirationDate);
        // Estimate period start (1 month before expiration for monthly subscriptions)
        periodStart = new Date(periodEnd);
        periodStart.setMonth(periodStart.getMonth() - 1);
      }

      // Check if subscription exists
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      const subscriptionData = {
        tier,
        is_active: tier !== "free",
        current_period_start: periodStart?.toISOString() || null,
        current_period_end: periodEnd?.toISOString() || null,
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

      console.log("RevenueCat: Synced subscription to Supabase", { tier });
    } catch (error) {
      console.error("RevenueCat: Failed to sync subscription:", error);
    }
  };

  // Subscribe to a plan
  const subscribe = useCallback(async (plan: SubscriptionPlan): Promise<{ success: boolean; error?: string }> => {
    if (!isRevenueCatAvailable()) {
      return { success: false, error: "RevenueCat not available" };
    }

    setIsLoading(true);

    try {
      const packageId = PACKAGE_IDS[plan];
      const result = await purchasePackage(packageId);

      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        
        // Sync to Supabase
        if (user?.id) {
          await syncSubscriptionToSupabase(user.id, result.customerInfo);
        }

        const planName = plan === "gold" ? "Gold" : "Platinum";
        toast.success(`🎉 Bienvenue dans ZEMBO ${planName}!`);
      } else if (result.error && result.error !== "Achat annulé") {
        toast.error(result.error);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Restore purchases
  const restore = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!isRevenueCatAvailable()) {
      return { success: false, error: "RevenueCat not available" };
    }

    setIsLoading(true);

    try {
      const result = await restorePurchases();

      if (result.success && result.customerInfo) {
        setCustomerInfo(result.customerInfo);
        
        // Sync to Supabase
        if (user?.id) {
          await syncSubscriptionToSupabase(user.id, result.customerInfo);
        }

        const tier = getSubscriptionTier(result.customerInfo);
        if (tier !== "free") {
          toast.success("🎉 Vos achats ont été restaurés!");
        } else {
          toast.info("Aucun achat à restaurer");
        }
      } else if (result.error) {
        toast.error(result.error);
      }

      return result;
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Refresh customer info
  const refresh = useCallback(async () => {
    if (!isRevenueCatAvailable()) return;

    setIsLoading(true);
    try {
      const info = await getCustomerInfo();
      setCustomerInfo(info);

      if (info && user?.id) {
        await syncSubscriptionToSupabase(user.id, info);
      }
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Compute tier
  const tier = getSubscriptionTier(customerInfo);

  return {
    isInitialized,
    isLoading,
    customerInfo,
    packages,
    tier,
    isPremium: tier === "premium" || tier === "vip",
    isVip: tier === "vip",
    subscribe,
    restore,
    refresh,
  };
};
