import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey) {
      throw new Error("STRIPE_SECRET_KEY not configured");
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const body = await req.text();
    let event;

    // Verify webhook signature if secret is configured
    if (webhookSecret) {
      const signature = req.headers.get("stripe-signature");
      if (!signature) {
        throw new Error("Missing stripe-signature header");
      }
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      console.log("Webhook signature verified");
    } else {
      // Fallback for development/testing without signature verification
      event = JSON.parse(body);
      console.log("Warning: Webhook signature not verified (STRIPE_WEBHOOK_SECRET not set)");
    }

    console.log("Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id || session.metadata?.user_id;
        const purchaseType = session.metadata?.type;

        if (!userId) {
          console.error("Missing user_id in session metadata");
          break;
        }

        // Handle coin purchase
        if (purchaseType === "coin_purchase") {
          const coins = parseInt(session.metadata?.coins || "0");
          const bonus = parseInt(session.metadata?.bonus || "0");
          const totalCoins = coins + bonus;
          const packId = session.metadata?.pack_id;

          console.log(`Processing coin purchase for user ${userId}: ${totalCoins} coins (pack: ${packId})`);

          // Get or create user_coins record
          const { data: existingCoins } = await supabase
            .from("user_coins")
            .select("*")
            .eq("user_id", userId)
            .single();

          if (existingCoins) {
            // Update existing balance
            await supabase
              .from("user_coins")
              .update({
                balance: existingCoins.balance + totalCoins,
                total_earned: existingCoins.total_earned + totalCoins,
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
          } else {
            // Create new record
            await supabase
              .from("user_coins")
              .insert({
                user_id: userId,
                balance: totalCoins,
                total_earned: totalCoins,
              });
          }

          // Record transaction
          await supabase
            .from("coin_transactions")
            .insert({
              user_id: userId,
              amount: totalCoins,
              type: "purchase",
              description: `Achat de ${coins} coins + ${bonus} bonus (pack ${packId})`,
              reference_id: session.id,
            });

          console.log(`Coins added for user ${userId}: ${totalCoins} coins`);
          break;
        }

        // Handle subscription purchase
        const plan = session.metadata?.plan;
        if (!plan) {
          console.error("Missing plan in session metadata for subscription");
          break;
        }

        const tier = plan === "gold" ? "premium" : "vip";
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        // Get subscription details
        let periodStart: string | null = null;
        let periodEnd: string | null = null;
        
        if (subscriptionId) {
          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          periodStart = new Date(subscription.current_period_start * 1000).toISOString();
          periodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        }

        // Update or insert subscription
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
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
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
              stripe_customer_id: customerId,
              stripe_subscription_id: subscriptionId,
              current_period_start: periodStart,
              current_period_end: periodEnd,
            });
        }

        console.log(`Subscription activated for user ${userId}: ${tier}`);
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by stripe customer id
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          const isActive = subscription.status === "active" || subscription.status === "trialing";
          const periodStart = new Date(subscription.current_period_start * 1000).toISOString();
          const periodEnd = new Date(subscription.current_period_end * 1000).toISOString();

          await supabase
            .from("user_subscriptions")
            .update({
              is_active: isActive,
              current_period_start: periodStart,
              current_period_end: periodEnd,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);

          console.log(`Subscription updated for user ${sub.user_id}: active=${isActive}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user and deactivate subscription
        const { data: sub } = await supabase
          .from("user_subscriptions")
          .select("user_id")
          .eq("stripe_customer_id", customerId)
          .single();

        if (sub) {
          await supabase
            .from("user_subscriptions")
            .update({
              is_active: false,
              tier: "free",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", sub.user_id);

          console.log(`Subscription cancelled for user ${sub.user_id}`);
        }
        break;
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Webhook error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
