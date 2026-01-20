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

interface RoseNotificationRequest {
  sender_id: string;
  receiver_id: string;
  message?: string;
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

    const { sender_id, receiver_id, message }: RoseNotificationRequest = await req.json();

    if (!sender_id || !receiver_id) {
      return new Response(
        JSON.stringify({ error: "Missing user IDs" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all devices for the receiver
    const devices = await getUserDevices(supabase, receiver_id);

    if (devices.length === 0) {
      console.log("No devices found for receiver:", receiver_id);
      return new Response(
        JSON.stringify({ success: true, message: "No devices available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch sender's profile for display name
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", sender_id)
      .single();

    const senderName = senderProfile?.display_name || "Quelqu'un";
    
    // Notification content
    const title = "🌹 Vous avez reçu une rose !";
    const body = message 
      ? `${senderName} vous a offert une rose avec un message : "${message.slice(0, 50)}${message.length > 50 ? '...' : ''}"`
      : `${senderName} vous a offert une rose ! Un geste romantique qui mérite votre attention 💕`;

    // Get OAuth2 access token
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
          type: "rose",
          sender_id: sender_id,
          sender_name: senderName,
          sender_avatar: senderProfile?.avatar_url || "",
          message: message || "",
        },
      },
      supabase
    );

    console.log(`Rose notification sent to ${result.successCount}/${devices.length} devices`);

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
    console.error("Error sending rose notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
