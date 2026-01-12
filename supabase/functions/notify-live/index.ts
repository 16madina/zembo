import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LiveNotificationRequest {
  streamer_id: string;
  live_id: string;
  live_title: string;
}

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  
  const jwtPayload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  };

  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = serviceAccount.private_key
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\n/g, "");
  
  const binaryKey = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
  
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const jwt = await create(
    { alg: "RS256", typ: "JWT" },
    jwtPayload,
    cryptoKey
  );

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const tokenResult = await tokenResponse.json();
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenResult)}`);
  }

  return tokenResult.access_token;
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

    const { streamer_id, live_id, live_title }: LiveNotificationRequest = await req.json();

    if (!streamer_id || !live_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch streamer's profile
    const { data: streamerProfile } = await supabase
      .from("profiles")
      .select("display_name, avatar_url")
      .eq("user_id", streamer_id)
      .single();

    const streamerName = streamerProfile?.display_name || "Un utilisateur";

    // Fetch all matches of the streamer to notify them
    const { data: matches, error: matchesError } = await supabase
      .from("matches")
      .select("user1_id, user2_id")
      .or(`user1_id.eq.${streamer_id},user2_id.eq.${streamer_id}`);

    if (matchesError) {
      console.error("Error fetching matches:", matchesError);
      throw matchesError;
    }

    // Get all matched user IDs (excluding the streamer)
    const matchedUserIds = matches?.map(m => 
      m.user1_id === streamer_id ? m.user2_id : m.user1_id
    ) || [];

    if (matchedUserIds.length === 0) {
      console.log("No matched users to notify");
      return new Response(
        JSON.stringify({ success: true, message: "No users to notify" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch FCM tokens for all matched users
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, fcm_token")
      .in("user_id", matchedUserIds)
      .not("fcm_token", "is", null);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    if (!profiles || profiles.length === 0) {
      console.log("No FCM tokens found for matched users");
      return new Response(
        JSON.stringify({ success: true, message: "No FCM tokens available" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get OAuth2 access token
    const accessToken = await getAccessToken(serviceAccount);

    // Send notifications to all matched users
    const notifications = profiles.map(profile => 
      fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: profile.fcm_token,
              notification: {
                title: "🔴 Live en cours !",
                body: `${streamerName} est en live${live_title ? `: "${live_title}"` : ""} ! Rejoins maintenant.`,
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
                type: "live",
                live_id: live_id,
                live_title: live_title || "",
                streamer_id: streamer_id,
                streamer_name: streamerName,
                streamer_avatar: streamerProfile?.avatar_url || "",
              },
            },
          }),
        }
      )
    );

    const results = await Promise.allSettled(notifications);
    const successCount = results.filter(r => r.status === "fulfilled").length;

    console.log(`Live notifications sent: ${successCount}/${notifications.length}`);

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
    console.error("Error sending live notification:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
