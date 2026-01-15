import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { 
  getAccessToken, 
  getUserDevices, 
  sendToAllDevices,
  ServiceAccountKey 
} from "../_shared/send-to-all-devices.ts";

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
    const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!FIREBASE_SERVICE_ACCOUNT) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT is not configured");
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error("Supabase credentials not configured");
    }

    const serviceAccount: ServiceAccountKey = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { user1_id, user2_id, match_id }: MatchNotificationRequest = await req.json();

    if (!user1_id || !user2_id) {
      return new Response(
        JSON.stringify({ error: "Missing user IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch both users' profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", [user1_id, user2_id]);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    const user1Profile = profiles?.find(p => p.user_id === user1_id);
    const user2Profile = profiles?.find(p => p.user_id === user2_id);

    // Get devices for both users
    const [user1Devices, user2Devices] = await Promise.all([
      getUserDevices(supabase, user1_id),
      getUserDevices(supabase, user2_id),
    ]);

    const accessToken = await getAccessToken(serviceAccount);

    let totalSuccess = 0;
    let totalFailed = 0;

    // Send notification to user1 about user2
    if (user1Devices.length > 0) {
      const result = await sendToAllDevices(
        serviceAccount,
        accessToken,
        user1Devices,
        {
          notification: {
            title: "💕 Nouveau Match !",
            body: `${user2Profile?.display_name || "Quelqu'un"} et toi avez matché ! Commence la conversation.`,
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },
          data: {
            type: "match",
            match_id: match_id || "",
            matched_user_id: user2_id,
            matched_user_name: user2Profile?.display_name || "",
            matched_user_avatar: user2Profile?.avatar_url || "",
          },
        },
        supabase
      );
      totalSuccess += result.successCount;
      totalFailed += result.failedCount;
    }

    // Send notification to user2 about user1
    if (user2Devices.length > 0) {
      const result = await sendToAllDevices(
        serviceAccount,
        accessToken,
        user2Devices,
        {
          notification: {
            title: "💕 Nouveau Match !",
            body: `${user1Profile?.display_name || "Quelqu'un"} et toi avez matché ! Commence la conversation.`,
          },
          apns: {
            payload: {
              aps: {
                sound: "default",
                badge: 1,
              },
            },
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
            },
          },
          data: {
            type: "match",
            match_id: match_id || "",
            matched_user_id: user1_id,
            matched_user_name: user1Profile?.display_name || "",
            matched_user_avatar: user1Profile?.avatar_url || "",
          },
        },
        supabase
      );
      totalSuccess += result.successCount;
      totalFailed += result.failedCount;
    }

    console.log(`Match notifications: ${totalSuccess} success, ${totalFailed} failed`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        notifications_sent: totalSuccess,
        notifications_failed: totalFailed 
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
