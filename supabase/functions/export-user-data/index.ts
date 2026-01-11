import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from token
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    // Collect all user data from various tables
    const [
      profileResult,
      likesGivenResult,
      likesReceivedResult,
      matchesResult,
      reportsResult,
      subscriptionResult,
      coinsResult,
      giftsSentResult,
      giftsReceivedResult,
      livesResult,
      liveMessagesResult,
    ] = await Promise.all([
      // Profile data
      supabase.from("profiles").select("*").eq("user_id", userId).single(),
      // Likes given
      supabase.from("likes").select("liked_id, is_super_like, created_at").eq("liker_id", userId),
      // Likes received
      supabase.from("likes").select("liker_id, is_super_like, created_at").eq("liked_id", userId),
      // Matches
      supabase.from("matches").select("*").or(`user1_id.eq.${userId},user2_id.eq.${userId}`),
      // Reports made
      supabase.from("user_reports").select("reason, description, status, created_at").eq("reporter_id", userId),
      // Subscription
      supabase.from("user_subscriptions").select("tier, is_active, current_period_start, current_period_end, created_at").eq("user_id", userId).maybeSingle(),
      // Coins
      supabase.from("user_coins").select("balance, total_earned, total_spent, created_at").eq("user_id", userId).maybeSingle(),
      // Gifts sent
      supabase.from("gift_transactions").select("receiver_id, coin_amount, message, created_at").eq("sender_id", userId),
      // Gifts received
      supabase.from("gift_transactions").select("sender_id, coin_amount, message, created_at").eq("receiver_id", userId),
      // Lives created
      supabase.from("lives").select("title, description, status, viewer_count, max_viewers, created_at, started_at, ended_at").eq("streamer_id", userId),
      // Live messages sent
      supabase.from("live_messages").select("content, created_at, live_id").eq("user_id", userId),
    ]);

    // Build the export data object
    const exportData = {
      export_info: {
        exported_at: new Date().toISOString(),
        user_id: userId,
        email: user.email,
        data_retention_policy: "Your data will be deleted 90 days after account deletion",
        gdpr_compliant: true,
      },
      profile: profileResult.data ? {
        display_name: profileResult.data.display_name,
        email: profileResult.data.email,
        bio: profileResult.data.bio,
        age: profileResult.data.age,
        gender: profileResult.data.gender,
        location: profileResult.data.location,
        occupation: profileResult.data.occupation,
        education: profileResult.data.education,
        height: profileResult.data.height,
        interests: profileResult.data.interests,
        looking_for: profileResult.data.looking_for,
        avatar_url: profileResult.data.avatar_url,
        is_verified: profileResult.data.is_verified,
        email_verified: profileResult.data.email_verified,
        created_at: profileResult.data.created_at,
        updated_at: profileResult.data.updated_at,
        last_seen: profileResult.data.last_seen,
      } : null,
      activity: {
        likes_given: likesGivenResult.data || [],
        likes_received: likesReceivedResult.data || [],
        matches: matchesResult.data || [],
        reports_submitted: reportsResult.data || [],
      },
      subscription: subscriptionResult.data || null,
      economy: {
        coins: coinsResult.data || null,
        gifts_sent: giftsSentResult.data || [],
        gifts_received: giftsReceivedResult.data || [],
      },
      live_streaming: {
        lives_created: livesResult.data || [],
        messages_sent: liveMessagesResult.data || [],
      },
      data_sources: [
        "profiles",
        "likes",
        "matches",
        "user_reports",
        "user_subscriptions",
        "user_coins",
        "gift_transactions",
        "lives",
        "live_messages",
      ],
      your_rights: {
        access: "You have the right to access all your personal data (this export)",
        rectification: "You can modify your data through the app settings",
        erasure: "You can request account deletion, data will be erased within 90 days",
        portability: "This export allows you to transfer your data to another service",
        restriction: "You can restrict processing by contacting support",
        objection: "You can object to data processing by contacting support",
      },
    };

    return new Response(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="zembo-data-export-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(JSON.stringify({ error: "Failed to export data" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});