import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isIOS, isAndroid, isNative } from "@/lib/capacitor";

// Stripe public key for Android
const STRIPE_PUBLIC_KEY = "pk_live_51Sq1BlGedsNwxjoeoHkEMvLmFbvhK1Mm2ZMI2cpFoV1tv0PNLJejIUR7Wb0SUqeDCgMTiE10HXsBBZwrZnoPDBek00P5XQjCR7";

// StoreKit Product IDs for iOS
const IOS_PRODUCTS = {
  gold: "com.zembo.gold.monthly",
  platinum: "com.zembo.platinum.monthly",
};

type Plan = "gold" | "platinum";

interface PaymentResult {
  success: boolean;
  error?: string;
}

export const usePayment = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingPlan, setProcessingPlan] = useState<Plan | null>(null);

  const getPlatform = () => {
    if (isIOS) return "ios";
    if (isAndroid) return "android";
    return "web";
  };

  // Handle Stripe payment (Android + Web)
  const handleStripePayment = async (plan: Plan): Promise<PaymentResult> => {
    try {
      const { loadStripe } = await import("@stripe/stripe-js");
      const stripe = await loadStripe(STRIPE_PUBLIC_KEY);
      
      if (!stripe) {
        throw new Error("Stripe failed to load");
      }

      // Get checkout session from our edge function
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: { 
          plan,
          successUrl: window.location.origin + "/?payment=success",
          cancelUrl: window.location.origin + "/?payment=cancelled",
        },
      });

      if (error || !data?.url) {
        throw new Error(error?.message || "Failed to create checkout session");
      }

      // Redirect to Stripe checkout
      window.location.href = data.url;
      
      return { success: true };
    } catch (err: any) {
      console.error("Stripe payment error:", err);
      return { success: false, error: err.message };
    }
  };

  // Handle StoreKit payment (iOS only)
  const handleStoreKitPayment = async (plan: Plan): Promise<PaymentResult> => {
    try {
      // Try to dynamically import StoreKit plugin - only available on native iOS
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let InAppPurchases: any = null;
      try {
        InAppPurchases = await import("@capacitor-community/in-app-purchases" as string);
      } catch {
        // Module not available - fallback to Stripe
        return handleStripePayment(plan);
      }
      
      if (!InAppPurchases) {
        // Fallback to Stripe on iOS web/simulator
        return handleStripePayment(plan);
      }

      const { InAppPurchase2 } = InAppPurchases;
      const productId = IOS_PRODUCTS[plan];
      
      // Get product info
      await InAppPurchase2.getProducts({ productIdentifiers: [productId] });
      
      // Make purchase
      const result = await InAppPurchase2.purchaseProduct({ productIdentifier: productId });
      
      if (result.transactionId) {
        // Purchase successful - update subscription in Supabase
        const tier = plan === "gold" ? "premium" : "vip";
        const periodStart = new Date();
        const periodEnd = new Date();
        periodEnd.setMonth(periodEnd.getMonth() + 1);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");

        const { data: existingSub } = await supabase
          .from("user_subscriptions")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (existingSub) {
          await supabase
            .from("user_subscriptions")
            .update({
              tier,
              is_active: true,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", user.id);
        } else {
          await supabase
            .from("user_subscriptions")
            .insert({
              user_id: user.id,
              tier,
              is_active: true,
              current_period_start: periodStart.toISOString(),
              current_period_end: periodEnd.toISOString(),
            });
        }

        // Complete the transaction
        await InAppPurchase2.finishTransaction({ transactionId: result.transactionId });
        
        return { success: true };
      }
      
      return { success: false, error: "Purchase was not completed" };
    } catch (err: unknown) {
      console.error("StoreKit payment error:", err);
      
      const error = err as { message?: string; code?: string };
      
      // Handle user cancellation gracefully
      if (error.message?.includes("cancelled") || error.code === "E_USER_CANCELLED") {
        return { success: false, error: "Achat annulé" };
      }
      
      return { success: false, error: error.message || "Payment error" };
    }
  };

  // Main subscribe function
  const subscribe = async (plan: Plan): Promise<PaymentResult> => {
    setIsProcessing(true);
    setProcessingPlan(plan);

    try {
      const platform = getPlatform();
      let result: PaymentResult;

      if (platform === "ios" && isNative) {
        // iOS uses StoreKit
        result = await handleStoreKitPayment(plan);
      } else {
        // Android and Web use Stripe
        result = await handleStripePayment(plan);
      }

      if (result.success) {
        toast.success(`🎉 Bienvenue dans ZEMBO ${plan === "gold" ? "Gold" : "Platinum"}!`);
      } else if (result.error && result.error !== "Achat annulé") {
        toast.error(result.error);
      }

      return result;
    } finally {
      setIsProcessing(false);
      setProcessingPlan(null);
    }
  };

  return {
    subscribe,
    isProcessing,
    processingPlan,
    platform: getPlatform(),
    isStripe: !isIOS || !isNative,
    isStoreKit: isIOS && isNative,
  };
};
