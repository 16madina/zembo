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
    const event = JSON.parse(body);

    console.log("Stripe webhook event:", event.type);

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const userId = session.metadata?.supabase_user_id;
        const plan = session.metadata?.plan;

        if (!userId || !plan) {
          console.error("Missing metadata in session");
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
