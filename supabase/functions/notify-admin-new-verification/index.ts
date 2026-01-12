import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

interface NotificationRequest {
  userId: string;
  displayName?: string;
}

async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: serviceAccount.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging",
    aud: serviceAccount.token_uri,
    iat: now,
    exp: now + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  const pemContent = serviceAccount.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n/g, "");
  const binaryKey = Uint8Array.from(atob(pemContent), (c) => c.charCodeAt(0));
  const cryptoKey = await crypto.subtle.importKey(
    "pkcs8",
    binaryKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, encoder.encode(unsignedToken));
  const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signatureB64}`;

  const tokenResponse = await fetch(serviceAccount.token_uri, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${jwt}`,
  });

  const tokenData = await tokenResponse.json();
  if (!tokenData.access_token) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`);
  }

  return tokenData.access_token;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const serviceAccountKeyString = Deno.env.get("FIREBASE_SERVICE_ACCOUNT");
    if (!serviceAccountKeyString) {
      console.log("FIREBASE_SERVICE_ACCOUNT not configured");
      return new Response(
        JSON.stringify({ success: false, error: "Push notifications not configured" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const serviceAccount: ServiceAccountKey = JSON.parse(serviceAccountKeyString);
    const { userId, displayName }: NotificationRequest = await req.json();

    if (!userId) {
      throw new Error("Missing userId");
    }

    // Get admin users' FCM tokens
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Get all admin user IDs
    const rolesResponse = await fetch(
      `${supabaseUrl}/rest/v1/user_roles?role=eq.admin&select=user_id`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const adminRoles = await rolesResponse.json();
    
    if (!adminRoles || adminRoles.length === 0) {
      console.log("No admins found");
      return new Response(
        JSON.stringify({ success: false, error: "No admins found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminUserIds = adminRoles.map((r: { user_id: string }) => r.user_id);

    // Get FCM tokens for admin users
    const profilesResponse = await fetch(
      `${supabaseUrl}/rest/v1/profiles?user_id=in.(${adminUserIds.join(",")})&select=user_id,fcm_token,display_name`,
      {
        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
        },
      }
    );

    const adminProfiles = await profilesResponse.json();
    const adminsWithTokens = adminProfiles.filter((p: { fcm_token: string | null }) => p.fcm_token);

    if (adminsWithTokens.length === 0) {
      console.log("No admins have FCM tokens registered");
      return new Response(
        JSON.stringify({ success: false, error: "No admins have push tokens" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const accessToken = await getAccessToken(serviceAccount);

    const title = "Nouvelle vérification d'identité 🆔";
    const body = displayName 
      ? `${displayName} a soumis une demande de vérification d'identité.`
      : "Un nouvel utilisateur a soumis une demande de vérification d'identité.";

    // Send notification to all admins
    const results = await Promise.allSettled(
      adminsWithTokens.map(async (admin: { fcm_token: string; display_name: string }) => {
        const message = {
          message: {
            token: admin.fcm_token,
            notification: {
              title,
              body,
            },
            data: {
              type: "admin_identity_verification",
              user_id: userId,
              click_action: "FLUTTER_NOTIFICATION_CLICK",
            },
            android: {
              priority: "high",
              notification: {
                channelId: "admin",
                priority: "high",
              },
            },
            apns: {
              headers: {
                "apns-priority": "10",
              },
              payload: {
                aps: {
                  alert: {
                    title,
                    body,
                  },
                  sound: "default",
                  badge: 1,
                },
              },
            },
          },
        };

        const response = await fetch(
          `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify(message),
          }
        );

        return response.json();
      })
    );

    const successful = results.filter((r) => r.status === "fulfilled").length;
    console.log(`Sent notifications to ${successful}/${adminsWithTokens.length} admins`);

    return new Response(
      JSON.stringify({ success: true, notified: successful }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error sending admin notification:", error);
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
