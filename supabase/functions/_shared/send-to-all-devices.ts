import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { create } from "https://deno.land/x/djwt@v2.8/mod.ts";

// Use a generic type for the Supabase client to avoid type conflicts
// deno-lint-ignore no-explicit-any
type AnySupabaseClient = SupabaseClient<any, any, any>;

export interface ServiceAccountKey {
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

export interface FCMMessage {
  notification: {
    title: string;
    body: string;
  };
  data?: Record<string, string>;
  apns?: {
    payload: {
      aps: {
        sound?: string;
        badge?: number;
        "content-available"?: number;
        "interruption-level"?: string;
      };
    };
    headers?: Record<string, string>;
  };
  android?: {
    priority?: string;
    notification?: {
      sound?: string;
      channel_id?: string;
      visibility?: string;
      notification_priority?: string;
    };
    ttl?: string;
  };
}

export interface UserDevice {
  id: string;
  user_id: string;
  fcm_token: string;
  device_type: string;
  device_name: string | null;
  last_used_at: string;
}

// Generate OAuth2 access token from Service Account
export async function getAccessToken(serviceAccount: ServiceAccountKey): Promise<string> {
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

// Get all devices for a user
// deno-lint-ignore no-explicit-any
export async function getUserDevices(
  supabase: any,
  userId: string
): Promise<UserDevice[]> {
  const { data: devices, error } = await supabase
    .from("user_devices")
    .select("*")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false });

  if (error) {
    console.error("Error fetching user devices:", error);
    return [];
  }

  return devices || [];
}

// Send notification to all user devices
// deno-lint-ignore no-explicit-any
export async function sendToAllDevices(
  serviceAccount: ServiceAccountKey,
  accessToken: string,
  devices: UserDevice[],
  message: FCMMessage,
  supabase?: any
): Promise<{ successCount: number; failedCount: number; invalidTokens: string[] }> {
  if (devices.length === 0) {
    return { successCount: 0, failedCount: 0, invalidTokens: [] };
  }

  const invalidTokens: string[] = [];
  const results = await Promise.allSettled(
    devices.map(async (device) => {
      const fcmResponse = await fetch(
        `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${accessToken}`,
          },
          body: JSON.stringify({
            message: {
              token: device.fcm_token,
              ...message,
            },
          }),
        }
      );

      const fcmResult = await fcmResponse.json();

      if (!fcmResponse.ok) {
        console.error(`FCM error for device ${device.id}:`, fcmResult);
        
        // Check if token is invalid/expired - we should remove it
        if (fcmResult.error?.details?.some((d: any) => 
          d.errorCode === "UNREGISTERED" || 
          d.errorCode === "INVALID_ARGUMENT"
        )) {
          invalidTokens.push(device.id);
        }
        
        throw new Error(JSON.stringify(fcmResult));
      }

      return fcmResult;
    })
  );

  // Clean up invalid tokens
  if (invalidTokens.length > 0 && supabase) {
    console.log(`Cleaning up ${invalidTokens.length} invalid device tokens`);
    await supabase
      .from("user_devices")
      .delete()
      .in("id", invalidTokens);
  }

  const successCount = results.filter(r => r.status === "fulfilled").length;
  const failedCount = results.filter(r => r.status === "rejected").length;

  return { successCount, failedCount, invalidTokens };
}
