import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Coin pack prices in Stripe (in cents USD)
const COIN_PACK_PRICES: Record<string, { priceInCents: number; coins: number; bonus: number }> = {
  basic: { priceInCents: 199, coins: 150, bonus: 10 },
  popular: { priceInCents: 699, coins: 500, bonus: 50 },
  premium: { priceInCents: 1499, coins: 1200, bonus: 200 },
  vip: { priceInCents: 2999, coins: 3000, bonus: 600 },
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeSecretKey) {
      console.error("STRIPE_SECRET_KEY is not configured");
      throw new Error("Stripe is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Not authenticated");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication failed");
    }

    const { packId, successUrl, cancelUrl } = await req.json();

    // Validate pack
    const pack = COIN_PACK_PRICES[packId];
    if (!pack) {
      throw new Error(`Invalid pack: ${packId}`);
    }

    console.log(`Creating checkout for user ${user.id}, pack: ${packId}`);

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: "2023-10-16",
    });

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name")
      .eq("user_id", user.id)
      .single();

    const email = profile?.email || user.email;
    const name = profile?.display_name || email?.split("@")[0];

    let customerId: string | undefined;
    
    if (email) {
      const existingCustomers = await stripe.customers.list({
        email,
        limit: 1,
      });
      
      if (existingCustomers.data.length > 0) {
        customerId = existingCustomers.data[0].id;
      }
    }

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: email || undefined,
        name: name || undefined,
        metadata: {
          supabase_user_id: user.id,
        },
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
              name: `${pack.coins} Coins ZEMBO`,
              description: pack.bonus > 0 ? `+ ${pack.bonus} coins bonus inclus !` : undefined,
              images: ["https://zembo.lovable.app/favicon.ico"],
            },
            unit_amount: pack.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: successUrl || `${req.headers.get("origin")}/?coin_purchase=success`,
      cancel_url: cancelUrl || `${req.headers.get("origin")}/?coin_purchase=cancelled`,
      metadata: {
        user_id: user.id,
        pack_id: packId,
        coins: pack.coins.toString(),
        bonus: pack.bonus.toString(),
        type: "coin_purchase",
      },
    });

    console.log(`Checkout session created: ${session.id}`);

    return new Response(
      JSON.stringify({ 
        url: session.url,
        sessionId: session.id,
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error: any) {
    console.error("Error creating coin checkout:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
