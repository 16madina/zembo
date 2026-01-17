import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Apple receipt validation endpoints
const APPLE_PRODUCTION_URL = "https://buy.itunes.apple.com/verifyReceipt";
const APPLE_SANDBOX_URL = "https://sandbox.itunes.apple.com/verifyReceipt";

// Product ID to tier mapping
const SUBSCRIPTION_TIERS: Record<string, "premium" | "vip"> = {
  "zembo_gold_monthly": "premium",
  "zembo_platinum_monthly": "vip",
};

// Coin products
const COIN_PRODUCTS: Record<string, number> = {
  "zembo_coins_150": 160,   // 150 + 10 bonus
  "zembo_coins_500": 550,   // 500 + 50 bonus
  "zembo_coins_1200": 1400, // 1200 + 200 bonus
  "zembo_coins_3000": 3600, // 3000 + 600 bonus
};

interface AppleReceiptResponse {
  status: number;
  receipt?: {
    bundle_id: string;
    in_app: Array<{
      product_id: string;
      transaction_id: string;
      original_transaction_id: string;
      purchase_date_ms: string;
      expires_date_ms?: string;
    }>;
  };
  latest_receipt_info?: Array<{
    product_id: string;
    transaction_id: string;
    original_transaction_id: string;
    purchase_date_ms: string;
    expires_date_ms?: string;
  }>;
}

async function verifyReceiptWithApple(
  receipt: string,
  useSandbox: boolean = false
): Promise<AppleReceiptResponse> {
  const url = useSandbox ? APPLE_SANDBOX_URL : APPLE_PRODUCTION_URL;
  const appSharedSecret = Deno.env.get("APPLE_SHARED_SECRET") || "";

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      "receipt-data": receipt,
      password: appSharedSecret,
      "exclude-old-transactions": true,
    }),
  });

  const data = await response.json();

  // Status 21007 means the receipt is from sandbox, retry with sandbox URL
  if (data.status === 21007 && !useSandbox) {
    return verifyReceiptWithApple(receipt, true);
  }

  return data;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, receipt, productId, coins } = await req.json();

    if (!userId || !receipt || !productId) {
      throw new Error("Missing required fields: userId, receipt, productId");
    }

    // Verify receipt with Apple
    const appleResponse = await verifyReceiptWithApple(receipt);

    if (appleResponse.status !== 0) {
      console.error("Apple verification failed with status:", appleResponse.status);
      throw new Error(`Receipt verification failed: status ${appleResponse.status}`);
    }

    // Find the transaction for this product
    const transactions = appleResponse.latest_receipt_info || appleResponse.receipt?.in_app || [];
    const transaction = transactions.find((t) => t.product_id === productId);

    if (!transaction) {
      throw new Error("Transaction not found in receipt");
    }

    console.log("Verified transaction:", transaction.transaction_id, "for product:", productId);

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Handle subscription products
    if (SUBSCRIPTION_TIERS[productId]) {
      const tier = SUBSCRIPTION_TIERS[productId];
      const expiresDate = transaction.expires_date_ms 
        ? new Date(parseInt(transaction.expires_date_ms))
        : null;
      const purchaseDate = new Date(parseInt(transaction.purchase_date_ms));

      // Check if subscription record exists
      const { data: existingSub } = await supabase
        .from("user_subscriptions")
        .select("id")
        .eq("user_id", userId)
        .single();

      const subscriptionData = {
        tier,
        is_active: true,
        current_period_start: purchaseDate.toISOString(),
        current_period_end: expiresDate?.toISOString() || null,
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

      console.log("Updated subscription for user:", userId, "tier:", tier);
    }

    // Handle coin products
    if (COIN_PRODUCTS[productId]) {
      const coinAmount = coins || COIN_PRODUCTS[productId];

      // Get current coin balance
      const { data: userCoins } = await supabase
        .from("user_coins")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (userCoins) {
        // Update existing balance
        await supabase
          .from("user_coins")
          .update({
            balance: userCoins.balance + coinAmount,
            total_earned: userCoins.total_earned + coinAmount,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);
      } else {
        // Create new coin record
        await supabase
          .from("user_coins")
          .insert({
            user_id: userId,
            balance: coinAmount,
            total_earned: coinAmount,
          });
      }

      // Record transaction
      await supabase
        .from("coin_transactions")
        .insert({
          user_id: userId,
          amount: coinAmount,
          type: "purchase",
          description: `Achat iOS: ${productId}`,
          reference_id: transaction.transaction_id,
        });

      console.log("Added", coinAmount, "coins for user:", userId);
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        transactionId: transaction.transaction_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("iOS receipt verification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
