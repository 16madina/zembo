import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// RevenueCat event types
type RevenueCatEventType = 
  | 'INITIAL_PURCHASE'
  | 'RENEWAL'
  | 'CANCELLATION'
  | 'UNCANCELLATION'
  | 'NON_RENEWING_PURCHASE'
  | 'SUBSCRIPTION_PAUSED'
  | 'EXPIRATION'
  | 'BILLING_ISSUE'
  | 'PRODUCT_CHANGE'
  | 'TRANSFER';

interface RevenueCatEvent {
  event: {
    type: RevenueCatEventType;
    app_user_id: string;
    original_app_user_id: string;
    product_id: string;
    entitlement_ids: string[];
    period_type: string;
    purchased_at_ms: number;
    expiration_at_ms: number | null;
    store: string;
    environment: string;
    is_trial_conversion: boolean;
    cancel_reason: string | null;
    currency: string;
    price: number;
    price_in_purchased_currency: number;
    transaction_id: string;
  };
  api_version: string;
}

// Map RevenueCat product IDs to subscription tiers
const PRODUCT_TO_TIER: Record<string, "premium" | "vip"> = {
  'zembo_gold_monthly': 'premium',
  'zembo_platinum_monthly': 'vip',
};

// Map coin product IDs to coin amounts
const COIN_PRODUCTS: Record<string, { coins: number; bonus: number }> = {
  'zembo_coins_150': { coins: 150, bonus: 10 },
  'zembo_coins_500': { coins: 500, bonus: 50 },
  'zembo_coins_1200': { coins: 1200, bonus: 200 },
  'zembo_coins_3000': { coins: 3000, bonus: 600 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Optional: Verify webhook signature (RevenueCat uses Bearer token auth)
    const authHeader = req.headers.get("Authorization");
    const webhookSecret = Deno.env.get("REVENUECAT_WEBHOOK_SECRET");
    
    if (webhookSecret && authHeader !== `Bearer ${webhookSecret}`) {
      console.error("Invalid webhook authorization");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload: RevenueCatEvent = await req.json();
    const event = payload.event;

    console.log(`RevenueCat webhook received: ${event.type} for user ${event.app_user_id}`);
    console.log(`Product: ${event.product_id}, Entitlements: ${event.entitlement_ids?.join(', ')}`);

    const userId = event.app_user_id;

    // Skip if no valid user ID
    if (!userId || userId.startsWith('$RCAnonymousID')) {
      console.log("Skipping anonymous user event");
      return new Response(
        JSON.stringify({ received: true, skipped: true }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Handle subscription events
    if (PRODUCT_TO_TIER[event.product_id]) {
      await handleSubscriptionEvent(supabase, event, userId);
    }

    // Handle coin purchase events (consumables)
    if (COIN_PRODUCTS[event.product_id]) {
      await handleCoinPurchaseEvent(supabase, event, userId);
    }

    return new Response(
      JSON.stringify({ received: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("RevenueCat webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleSubscriptionEvent(supabase: any, event: RevenueCatEvent['event'], userId: string) {
  const tier = PRODUCT_TO_TIER[event.product_id];
  if (!tier) return;

  console.log(`Processing subscription event: ${event.type} for tier ${tier}`);

  switch (event.type) {
    case 'INITIAL_PURCHASE':
    case 'RENEWAL':
    case 'UNCANCELLATION':
    case 'PRODUCT_CHANGE': {
      // Activate or update subscription
      const periodStart = event.purchased_at_ms 
        ? new Date(event.purchased_at_ms).toISOString() 
        : new Date().toISOString();
      const periodEnd = event.expiration_at_ms 
        ? new Date(event.expiration_at_ms).toISOString() 
        : null;

      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      if (existingSub) {
        await supabase
          .from("user_subscriptions")
          .update({
            tier,
            is_active: true,
            current_period_start: periodStart,
            current_period_end: periodEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        await supabase
          .from("user_subscriptions")
          .insert({
            user_id: userId,
            tier,
            is_active: true,
            current_period_start: periodStart,
            current_period_end: periodEnd,
          });
      }

      console.log(`Subscription activated for user ${userId}: ${tier}`);
      break;
    }

    case 'CANCELLATION':
    case 'EXPIRATION': {
      // Deactivate subscription
      await supabase
        .from("user_subscriptions")
        .update({
          is_active: false,
          tier: "free",
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log(`Subscription cancelled/expired for user ${userId}`);
      break;
    }

    case 'BILLING_ISSUE': {
      // Mark subscription as having billing issues (keep active for grace period)
      console.log(`Billing issue for user ${userId} - subscription remains active for grace period`);
      break;
    }

    case 'SUBSCRIPTION_PAUSED': {
      // Mark subscription as paused
      await supabase
        .from("user_subscriptions")
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);

      console.log(`Subscription paused for user ${userId}`);
      break;
    }
  }
}

async function handleCoinPurchaseEvent(supabase: any, event: RevenueCatEvent['event'], userId: string) {
  // Only process initial purchases for consumables
  if (event.type !== 'INITIAL_PURCHASE' && event.type !== 'NON_RENEWING_PURCHASE') {
    return;
  }

  const coinPack = COIN_PRODUCTS[event.product_id];
  if (!coinPack) return;

  const totalCoins = coinPack.coins + coinPack.bonus;

  console.log(`Processing coin purchase: ${totalCoins} coins for user ${userId}`);

  // Check if this transaction was already processed
  const { data: existingTx } = await supabase
    .from("coin_transactions")
    .select("id")
    .eq("reference_id", event.transaction_id)
    .single();

  if (existingTx) {
    console.log(`Transaction ${event.transaction_id} already processed, skipping`);
    return;
  }

  // Get or create user_coins record
  const { data: existingCoins } = await supabase
    .from("user_coins")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (existingCoins) {
    await supabase
      .from("user_coins")
      .update({
        balance: existingCoins.balance + totalCoins,
        total_earned: existingCoins.total_earned + totalCoins,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);
  } else {
    await supabase
      .from("user_coins")
      .insert({
        user_id: userId,
        balance: totalCoins,
        total_earned: totalCoins,
      });
  }

  // Record transaction to prevent duplicates
  await supabase
    .from("coin_transactions")
    .insert({
      user_id: userId,
      amount: totalCoins,
      type: "purchase",
      description: `Achat iOS: ${coinPack.coins} coins + ${coinPack.bonus} bonus`,
      reference_id: event.transaction_id,
    });

  console.log(`Coins added for user ${userId}: ${totalCoins} coins (tx: ${event.transaction_id})`);
}
