import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Zembo <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TestEmailRequest {
  email: string;
  template: "verification" | "invitation" | "match" | "message";
  testData: {
    displayName?: string;
    senderName?: string;
    matchName?: string;
    messageSender?: string;
    messagePreview?: string;
  };
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin role
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);

    if (claimsError || !claims?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", claims.user.id)
      .eq("role", "admin")
      .single();

    if (!roleData) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, template, testData }: TestEmailRequest = await req.json();

    // Fetch app settings for footer
    const { data: settingsData } = await supabaseAdmin
      .from("app_settings")
      .select("key, value")
      .in("category", ["social", "legal"]);

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: { key: string; value: string }) => {
      settings[s.key] = s.value;
    });

    const logoUrl = "https://zemboapp.com/images/zembo-logo-email.png";
    const displayName = testData.displayName || "Utilisateur Test";
    const senderName = testData.senderName || "Admin ZEMBO";
    const matchName = testData.matchName || "Sophie";
    const messageSender = testData.messageSender || "Marie";
    const messagePreview = testData.messagePreview || "Salut ! Comment ça va ? 😊";

    // Build social links
    const socialLinks = [];
    if (settings.social_instagram) {
      socialLinks.push(`<a href="${settings.social_instagram}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/32/174/174855.png" alt="Instagram" width="32" /></a>`);
    }
    if (settings.social_tiktok) {
      socialLinks.push(`<a href="${settings.social_tiktok}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/32/3046/3046121.png" alt="TikTok" width="32" /></a>`);
    }
    if (settings.social_twitter) {
      socialLinks.push(`<a href="${settings.social_twitter}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" width="32" /></a>`);
    }
    if (settings.social_facebook) {
      socialLinks.push(`<a href="${settings.social_facebook}" style="display: inline-block; margin: 0 10px;"><img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" width="32" /></a>`);
    }

    const privacyUrl = settings.legal_privacy_url || "https://zemboapp.com/privacy";
    const termsUrl = settings.legal_terms_url || "https://zemboapp.com/terms";

    // Template-specific content
    let subject = "";
    let mainContent = "";

    switch (template) {
      case "verification":
        subject = "✨ [TEST] Vérifiez votre email - ZEMBO";
        mainContent = `
          <tr>
            <td align="center" style="padding: 0 40px 16px;">
              <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-block; line-height: 72px; font-size: 32px; border: 2px solid rgba(212, 175, 55, 0.3);">✉️</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 40px 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-align: center;">Bienvenue, ${displayName} !</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 40px 0;">
              <p style="margin: 0; color: #d4af37; font-size: 15px; text-align: center; font-weight: 500;">Plus qu'une étape pour rejoindre l'aventure</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0; color: #9494a8; font-size: 15px; line-height: 1.7; text-align: center;">Confirmez votre adresse email pour activer votre compte et découvrir des connexions authentiques.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table cellspacing="0" cellpadding="0"><tr>
                <td style="border-radius: 16px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
                  <a href="https://zemboapp.com" style="display: inline-block; padding: 18px 48px; color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px;">Vérifier mon email →</a>
                </td>
              </tr></table>
            </td>
          </tr>
        `;
        break;

      case "invitation":
        subject = `🎉 [TEST] ${senderName} vous invite à rejoindre Zembo`;
        mainContent = `
          <tr>
            <td style="padding: 20px 40px;">
              <h1 style="margin: 0 0 20px; color: #d4af37; font-size: 28px; font-weight: 700; text-align: center;">Vous êtes invité(e) ! ✨</h1>
              <p style="margin: 0 0 20px; color: #ffffff; font-size: 16px; line-height: 1.6; text-align: center;"><strong style="color: #d4af37;">${senderName}</strong> pense que vous allez adorer Zembo.</p>
              <p style="margin: 0 0 30px; color: #9494a8; font-size: 14px; line-height: 1.6; text-align: center;">Découvrez des connexions authentiques grâce à nos appels vidéo aléatoires et notre système de matching intelligent.</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 30px;">
              <table cellspacing="0" cellpadding="0"><tr>
                <td style="padding-right: 10px;">
                  <a href="https://apps.apple.com/app/zembo" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">📱 App Store</a>
                </td>
                <td style="padding-left: 10px;">
                  <a href="https://play.google.com/store/apps/details?id=app.zembo" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">🤖 Play Store</a>
                </td>
              </tr></table>
            </td>
          </tr>
        `;
        break;

      case "match":
        subject = `💫 [TEST] Nouveau match avec ${matchName} !`;
        mainContent = `
          <tr>
            <td align="center" style="padding: 0 40px 16px;">
              <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-block; line-height: 80px; font-size: 40px; border: 2px solid rgba(212, 175, 55, 0.3);">💫</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 40px 0;">
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 28px; font-weight: 700; text-align: center;">Nouveau Match !</h1>
              <p style="margin: 0 0 8px; color: #d4af37; font-size: 18px; font-weight: 600; text-align: center;">${matchName} et vous avez matché ! 🎉</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px 40px 32px;">
              <p style="margin: 0; color: #9494a8; font-size: 15px; line-height: 1.7; text-align: center;">N'attendez plus, envoyez le premier message et faites connaissance !</p>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 0 40px 40px;">
              <table cellspacing="0" cellpadding="0"><tr>
                <td style="border-radius: 16px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
                  <a href="https://zemboapp.com" style="display: inline-block; padding: 16px 40px; color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px;">Envoyer un message 💬</a>
                </td>
              </tr></table>
            </td>
          </tr>
        `;
        break;

      case "message":
        subject = `💬 [TEST] Nouveau message de ${messageSender}`;
        mainContent = `
          <tr>
            <td align="center" style="padding: 0 40px 16px;">
              <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-block; line-height: 72px; font-size: 32px; border: 2px solid rgba(212, 175, 55, 0.3);">💬</div>
            </td>
          </tr>
          <tr>
            <td style="padding: 8px 40px 0;">
              <h1 style="margin: 0 0 12px; color: #ffffff; font-size: 24px; font-weight: 700; text-align: center;">Nouveau message de ${messageSender}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <div style="background: rgba(212, 175, 55, 0.08); border-radius: 16px; padding: 20px; border: 1px solid rgba(212, 175, 55, 0.15);">
                <p style="margin: 0; color: #ffffff; font-size: 16px; font-style: italic; text-align: center;">"${messagePreview}"</p>
              </div>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 20px 40px 40px;">
              <table cellspacing="0" cellpadding="0"><tr>
                <td style="border-radius: 16px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
                  <a href="https://zemboapp.com" style="display: inline-block; padding: 16px 40px; color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px;">Répondre →</a>
                </td>
              </tr></table>
            </td>
          </tr>
        `;
        break;
    }

    const emailHtml = `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; min-height: 100vh;">
    <tr>
      <td align="center" style="padding: 40px 16px;">
        
        <!-- Test Banner -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; margin-bottom: 16px;">
          <tr>
            <td style="background: linear-gradient(90deg, #ff6b6b, #feca57); border-radius: 12px; padding: 12px 20px; text-align: center;">
              <p style="margin: 0; color: #000; font-size: 12px; font-weight: 700;">⚠️ CECI EST UN EMAIL DE TEST ⚠️</p>
            </td>
          </tr>
        </table>
        
        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(165deg, #0d0d14 0%, #12121f 50%, #0a0a10 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.15); box-shadow: 0 40px 80px rgba(0,0,0,0.6);">
          
          <!-- Top Gradient Bar -->
          <tr><td style="height: 4px; background: linear-gradient(90deg, #d4af37, #f4e4a6, #d4af37);"></td></tr>
          
          <!-- Logo -->
          <tr>
            <td align="center" style="padding: 48px 40px 24px;">
              <img src="${logoUrl}" alt="ZEMBO" width="140" style="display: block; max-width: 140px; height: auto;" />
            </td>
          </tr>
          
          ${mainContent}
          
          <!-- Divider -->
          <tr><td style="padding: 0 40px;"><div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);"></div></td></tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 32px 40px;">
              ${socialLinks.length > 0 ? `<table align="center" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;"><tr>${socialLinks.join("")}</tr></table>` : ""}
              <p style="margin: 0 0 16px; color: #d4af37; font-size: 13px; text-align: center; font-weight: 600;">ZEMBO</p>
              <p style="margin: 0 0 16px; color: #4a4a5a; font-size: 11px; text-align: center;">L'app de rencontres premium</p>
              <p style="margin: 0; color: #3a3a4a; font-size: 10px; text-align: center; line-height: 2;">
                <a href="${privacyUrl}" style="color: #5a5a6a; text-decoration: none;">Confidentialité</a>
                <span style="color: #2a2a3a; margin: 0 8px;">•</span>
                <a href="${termsUrl}" style="color: #5a5a6a; text-decoration: none;">Conditions</a>
              </p>
              <p style="margin: 16px 0 0; color: #2a2a3a; font-size: 10px; text-align: center;">© ${new Date().getFullYear()} ZEMBO. Tous droits réservés.</p>
            </td>
          </tr>
          
        </table>
        
      </td>
    </tr>
  </table>
</body>
</html>
    `;

    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject,
      html: emailHtml,
    });

    console.log("Test email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error sending test email:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
};

serve(handler);
