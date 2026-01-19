import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Coin pack configurations with Stripe price IDs
const COIN_PACKS: Record<string, { coins: number; bonus: number; priceId: string }> = {
  basic: {
    coins: 150,
    bonus: 10,
    priceId: "price_coin_150", // Will be replaced with real Stripe price ID
  },
  popular: {
    coins: 500,
    bonus: 50,
    priceId: "price_coin_500",
  },
  premium: {
    coins: 1200,
    bonus: 200,
    priceId: "price_coin_1200",
  },
  vip: {
    coins: 3000,
    bonus: 600,
    priceId: "price_coin_3000",
  },
};

serve(async (req) => {
  // Handle CORS preflight
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

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error("User not authenticated");
    }

    const { packId, successUrl, cancelUrl } = await req.json();

    const pack = COIN_PACKS[packId];
    if (!pack) {
      throw new Error(`Invalid pack: ${packId}`);
    }

    const totalCoins = pack.coins + pack.bonus;

    // Check if customer already exists
    const customers = await stripe.customers.list({
      email: user.email,
      limit: 1,
    });

    let customerId: string;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    } else {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      });
      customerId = customer.id;
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${pack.coins} ZEMBO Coins`,
              description: pack.bonus > 0 ? `+${pack.bonus} bonus coins included!` : undefined,
            },
            unit_amount: getPriceInCents(packId),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || "https://zembo.lovable.app/?coin_purchase=success",
      cancel_url: cancelUrl || "https://zembo.lovable.app/?coin_purchase=cancelled",
      metadata: {
        supabase_user_id: user.id,
        pack_id: packId,
        coins: String(pack.coins),
        bonus: String(pack.bonus),
        total_coins: String(totalCoins),
        type: "coin_purchase",
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("Coin checkout error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Helper function to get price in cents
function getPriceInCents(packId: string): number {
  const prices: Record<string, number> = {
    basic: 199,     // $1.99
    popular: 699,   // $6.99
    premium: 1499,  // $14.99
    vip: 2999,      // $29.99
  };
  return prices[packId] || 0;
}
