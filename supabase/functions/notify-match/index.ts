import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface MatchNotificationRequest {
  user1_id: string;
  user2_id: string;
  match_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FIREBASE_SERVER_KEY) {
      throw new Error("FIREBASE_SERVER_KEY is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user1_id, user2_id, match_id }: MatchNotificationRequest = await req.json();

    if (!user1_id || !user2_id) {
      return new Response(
        JSON.stringify({ error: "Missing user IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch both users' profiles with FCM tokens and display names
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, fcm_token, avatar_url")
      .in("user_id", [user1_id, user2_id]);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const user1Profile = profiles?.find(p => p.user_id === user1_id);
    const user2Profile = profiles?.find(p => p.user_id === user2_id);

    const notifications: Promise<Response>[] = [];

    // Send notification to user1 about user2
    if (user1Profile?.fcm_token) {
      const notifPromise = fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${FIREBASE_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: user1Profile.fcm_token,
          notification: {
            title: "💕 Nouveau Match !",
            body: `${user2Profile?.display_name || "Quelqu'un"} et toi avez matché ! Commence la conversation.`,
            sound: "default",
            badge: 1,
          },
          data: {
            type: "match",
            match_id: match_id,
            matched_user_id: user2_id,
            matched_user_name: user2Profile?.display_name || "",
            matched_user_avatar: user2Profile?.avatar_url || "",
          },
          priority: "high",
        }),
      });
      notifications.push(notifPromise);
    }

    // Send notification to user2 about user1
    if (user2Profile?.fcm_token) {
      const notifPromise = fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `key=${FIREBASE_SERVER_KEY}`,
        },
        body: JSON.stringify({
          to: user2Profile.fcm_token,
          notification: {
            title: "💕 Nouveau Match !",
            body: `${user1Profile?.display_name || "Quelqu'un"} et toi avez matché ! Commence la conversation.`,
            sound: "default",
            badge: 1,
          },
          data: {
            type: "match",
            match_id: match_id,
            matched_user_id: user1_id,
            matched_user_name: user1Profile?.display_name || "",
            matched_user_avatar: user1Profile?.avatar_url || "",
          },
          priority: "high",
        }),
      });
      notifications.push(notifPromise);
    }

    if (notifications.length === 0) {
      console.log("No FCM tokens found for users, skipping notifications");
      return new Response(
        JSON.stringify({ success: true, message: "No FCM tokens available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const results = await Promise.allSettled(notifications);
    const successCount = results.filter(r => r.status === "fulfilled").length;

    console.log(`Match notifications sent: ${successCount}/${notifications.length}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: successCount,
        total_attempted: notifications.length 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending match notifications:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
