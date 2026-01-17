import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isIOS, isAndroid, isNative } from "@/lib/capacitor";

// Stripe public key for Android and Web
const STRIPE_PUBLIC_KEY = "pk_live_51Sq1BlGedsNwxjoeoHkEMvLmFbvhK1Mm2ZMI2cpFoV1tv0PNLJejIUR7Wb0SUqeDCgMTiE10HXsBBZwrZnoPDBek00P5XQjCR7";

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

  // Handle StoreKit payment (iOS native)
  const handleStoreKitPayment = async (plan: Plan): Promise<PaymentResult> => {
    try {
      const { purchaseProduct, isStoreKitAvailable, SUBSCRIPTION_PRODUCT_IDS } = await import("@/lib/storekit");
      
      if (!isStoreKitAvailable()) {
        console.log("StoreKit not available, falling back to Stripe");
        return handleStripePayment(plan);
      }

      const productId = SUBSCRIPTION_PRODUCT_IDS[plan];
      const result = await purchaseProduct(productId);

      if (result.success) {
        return { success: true };
      }

      return { success: false, error: result.error };
    } catch (err: any) {
      console.error("StoreKit payment error:", err);
      
      // Handle user cancellation
      if (err.message?.includes("cancelled") || err.userCancelled) {
        return { success: false, error: "Achat annulé" };
      }
      
      return { success: false, error: err.message || "Payment error" };
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
        // iOS native uses StoreKit
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
