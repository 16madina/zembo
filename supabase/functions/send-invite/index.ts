import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface InviteRequest {
  emails: string[];
  senderName: string;
}

interface SettingsMap {
  [key: string]: string;
}

const sendEmail = async (to: string, subject: string, html: string) => {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "Zembo <noreply@zemboapp.com>",
      to: [to],
      subject,
      html,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to send email: ${error}`);
  }

  return response.json();
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch app settings for social links
    const { data: settings } = await supabase
      .from("app_settings")
      .select("key, value")
      .in("key", ["instagram_url", "tiktok_url", "twitter_url", "facebook_url", "app_store_url", "play_store_url"]);

    const settingsMap: SettingsMap = settings?.reduce((acc: SettingsMap, s: { key: string; value: string }) => ({ ...acc, [s.key]: s.value }), {}) || {};

    const { emails, senderName }: InviteRequest = await req.json();

    if (!emails || emails.length === 0) {
      return new Response(
        JSON.stringify({ error: "No emails provided" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const appStoreUrl = settingsMap["app_store_url"] || "https://apps.apple.com/app/zembo";
    const playStoreUrl = settingsMap["play_store_url"] || "https://play.google.com/store/apps/details?id=app.zembo";
    const websiteUrl = "https://zemboapp.com";

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0a0a0a;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width: 600px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 24px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.3);">
          
          <!-- Header with Logo -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px;">
              <img src="https://i.ibb.co/7NqLfQp/zembo-logo-gold.png" alt="Zembo" width="120" style="display: block;">
            </td>
          </tr>
          
          <!-- Main Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; color: #d4af37; font-size: 28px; font-weight: 700; text-align: center;">
                Vous êtes invité(e) ! ✨
              </h1>
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6; text-align: center;">
                <strong style="color: #d4af37;">${senderName}</strong> pense que vous allez adorer Zembo, l'application de rencontres qui change tout.
              </p>
              <p style="margin: 0 0 30px; color: #a0a0a0; font-size: 14px; line-height: 1.6; text-align: center;">
                Découvrez des connexions authentiques grâce à nos appels vidéo aléatoires, nos lives interactifs et notre système de matching intelligent.
              </p>
            </td>
          </tr>
          
          <!-- Download Buttons -->
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="padding-right: 10px;">
                    <a href="${appStoreUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                      📱 App Store
                    </a>
                  </td>
                  <td style="padding-left: 10px;">
                    <a href="${playStoreUrl}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">
                      🤖 Play Store
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Features -->
          <tr>
            <td style="padding: 0 40px 30px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 12px;">
                    <p style="margin: 0; color: #d4af37; font-size: 24px;">🎲</p>
                    <p style="margin: 5px 0 0; color: #ffffff; font-size: 12px;">Appels Aléatoires</p>
                  </td>
                  <td width="10"></td>
                  <td align="center" style="padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 12px;">
                    <p style="margin: 0; color: #d4af37; font-size: 24px;">📺</p>
                    <p style="margin: 5px 0 0; color: #ffffff; font-size: 12px;">Lives Interactifs</p>
                  </td>
                  <td width="10"></td>
                  <td align="center" style="padding: 15px; background: rgba(212, 175, 55, 0.1); border-radius: 12px;">
                    <p style="margin: 0; color: #d4af37; font-size: 24px;">💫</p>
                    <p style="margin: 5px 0 0; color: #ffffff; font-size: 12px;">Matching IA</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 30px 40px; background: rgba(0,0,0,0.3); border-top: 1px solid rgba(212, 175, 55, 0.2);">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center" style="padding-bottom: 15px;">
                    <a href="${settingsMap["instagram_url"] || '#'}" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 20px;">📸</a>
                    <a href="${settingsMap["tiktok_url"] || '#'}" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 20px;">🎵</a>
                    <a href="${settingsMap["twitter_url"] || '#'}" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 20px;">🐦</a>
                    <a href="${settingsMap["facebook_url"] || '#'}" style="display: inline-block; margin: 0 8px; color: #d4af37; text-decoration: none; font-size: 20px;">👥</a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <p style="margin: 0; color: #666666; font-size: 12px;">
                      © 2025 Zembo. Tous droits réservés.<br>
                      <a href="${websiteUrl}" style="color: #d4af37; text-decoration: none;">zemboapp.com</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailPromises = emails.map((email) =>
      sendEmail(email, `${senderName} vous invite à rejoindre Zembo 💫`, emailHtml)
    );

    const results = await Promise.allSettled(emailPromises);
    const successCount = results.filter((r) => r.status === "fulfilled").length;
    const failedCount = results.filter((r) => r.status === "rejected").length;

    console.log(`Invitations sent: ${successCount} success, ${failedCount} failed`);

    return new Response(
      JSON.stringify({ success: true, sent: successCount, failed: failedCount }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error: any) {
    console.error("Error sending invites:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
