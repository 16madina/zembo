import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  token: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const FIREBASE_SERVER_KEY = Deno.env.get("FIREBASE_SERVER_KEY");
    
    if (!FIREBASE_SERVER_KEY) {
      throw new Error("FIREBASE_SERVER_KEY is not configured");
    }

    const { token, title, body, data }: PushNotificationRequest = await req.json();

    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: token, title, body" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Send push notification via FCM HTTP v1 API (Legacy)
    const fcmResponse = await fetch("https://fcm.googleapis.com/fcm/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `key=${FIREBASE_SERVER_KEY}`,
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title,
          body,
          sound: "default",
          badge: 1,
        },
        data: data || {},
        priority: "high",
      }),
    });

    const fcmResult = await fcmResponse.json();

    if (!fcmResponse.ok) {
      console.error("FCM error:", fcmResult);
      return new Response(
        JSON.stringify({ error: "Failed to send notification", details: fcmResult }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    console.log("Push notification sent successfully:", fcmResult);

    return new Response(
      JSON.stringify({ success: true, result: fcmResult }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending push notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
