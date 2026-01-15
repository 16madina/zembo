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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVICE_ACCOUNT = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!FIREBASE_SERVICE_ACCOUNT) {
      console.log("FIREBASE_SERVICE_ACCOUNT not configured, skipping push notification");
      return new Response(
        JSON.stringify({ success: false, reason: "Push notifications not configured" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { calleeId, callerName, callerPhoto, callId, callType } = await req.json();

    if (!calleeId || !callerName || !callId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: calleeId, callerName, callId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Get all devices for the callee
    const devices = await getUserDevices(supabase, calleeId);

    if (devices.length === 0) {
      console.log("Callee has no registered devices, cannot send push notification");
      return new Response(
        JSON.stringify({ success: false, reason: "Callee has no registered devices" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount: ServiceAccountKey = JSON.parse(FIREBASE_SERVICE_ACCOUNT);
    const accessToken = await getAccessToken(serviceAccount);

    const title = callType === "video" ? "📹 Appel vidéo entrant" : "📞 Appel entrant";
    const body = `${callerName} vous appelle`;

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
              sound: "ringtone.caf",
              badge: 1,
              "content-available": 1,
              "interruption-level": "time-sensitive",
            },
          },
          headers: {
            "apns-priority": "10",
            "apns-push-type": "alert",
          },
        },
        android: {
          priority: "high",
          notification: {
            sound: "ringtone",
            channel_id: "incoming_calls",
            visibility: "public",
            notification_priority: "PRIORITY_MAX",
          },
          ttl: "60s",
        },
        data: {
          type: "incoming_call",
          callId,
          callType: callType || "audio",
          callerName,
          callerPhoto: callerPhoto || "",
        },
      },
      supabase
    );

    console.log(`Call notification sent to ${result.successCount}/${devices.length} devices`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        devices_notified: result.successCount,
        devices_failed: result.failedCount,
        total_devices: devices.length
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending call notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
