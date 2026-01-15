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

interface LikeNotificationRequest {
  liker_id: string;
  liked_id: string;
  is_super_like: boolean;
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

    const { liker_id, liked_id, is_super_like }: LikeNotificationRequest = await req.json();

    if (!liker_id || !liked_id) {
      return new Response(
        JSON.stringify({ error: "Missing user IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all devices for the liked user
    const devices = await getUserDevices(supabase, liked_id);

    if (devices.length === 0) {
      console.log("No devices found for liked user:", liked_id);
      return new Response(
        JSON.stringify({ success: true, message: "No devices available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch liker's profile for display name
    const { data: likerProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", liker_id)
      .single();

    const likerName = likerProfile?.display_name || "Quelqu'un";
    
    // Determine notification content based on like type
    const title = is_super_like ? "⭐ Super Like !" : "❤️ Nouveau Like !";
    const body = is_super_like 
      ? `${likerName} t'a envoyé un Super Like ! C'est le moment de découvrir son profil.`
      : `${likerName} a aimé ton profil ! Swipe pour voir si c'est réciproque.`;

    const accessToken = await getAccessToken(serviceAccount);

    // Send to all devices
    const result = await sendToAllDevices(
      serviceAccount,
      accessToken,
      devices,
      {
        notification: { title, body },
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
          type: is_super_like ? "super_like" : "like",
          liker_id: liker_id,
          liker_name: likerName,
          liker_avatar: likerProfile?.avatar_url || "",
        },
      },
      supabase
    );

    console.log(`Like notification sent to ${result.successCount}/${devices.length} devices`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        devices_notified: result.successCount,
        devices_failed: result.failedCount
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending like notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
