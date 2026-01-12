import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Zembo <onboarding@resend.dev>";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface VerificationEmailRequest {
  email: string;
  displayName: string;
}

const MAX_VERIFICATION_EMAILS_PER_DAY = 3;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase clients
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Service role client for updating rate limit counters
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;
    const { email, displayName }: VerificationEmailRequest = await req.json();

    // Check rate limiting
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('verification_email_count, verification_email_count_reset_at')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error("Error fetching profile for rate limit:", profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to check rate limit' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();
    const resetAt = profile?.verification_email_count_reset_at 
      ? new Date(profile.verification_email_count_reset_at) 
      : null;
    
    // Check if we need to reset the counter (new day)
    let currentCount = profile?.verification_email_count || 0;
    const isNewDay = !resetAt || 
      (now.getTime() - resetAt.getTime()) > 24 * 60 * 60 * 1000;
    
    if (isNewDay) {
      currentCount = 0;
    }

    // Check if limit exceeded
    if (currentCount >= MAX_VERIFICATION_EMAILS_PER_DAY) {
      const hoursUntilReset = resetAt 
        ? Math.ceil((24 * 60 * 60 * 1000 - (now.getTime() - resetAt.getTime())) / (1000 * 60 * 60))
        : 24;
      
      return new Response(
        JSON.stringify({ 
          error: `Limite atteinte (${MAX_VERIFICATION_EMAILS_PER_DAY} emails/jour). Réessayez dans ${hoursUntilReset}h.`,
          rateLimited: true,
          remainingEmails: 0
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    // ALWAYS use the production domain for verification links
    const baseUrl = 'https://zemboapp.com';
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;
    // Use the logo hosted in public folder via production URL
    const logoUrl = 'https://zemboapp.com/images/zembo-logo-email.png';

    // Update profile with token and increment counter using admin client
    const updateData: Record<string, unknown> = {
      email: email,
      email_verification_token: verificationToken,
      email_verification_sent_at: now.toISOString(),
      verification_email_count: currentCount + 1,
    };
    
    // Reset the counter date if it's a new day
    if (isNewDay) {
      updateData.verification_email_count_reset_at = now.toISOString();
    }

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save verification token' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch app settings for email footer
    const { data: settingsData } = await supabaseAdmin
      .from('app_settings')
      .select('key, value')
      .in('category', ['social', 'legal']);

    const settings: Record<string, string> = {};
    (settingsData || []).forEach((s: { key: string; value: string }) => {
      settings[s.key] = s.value;
    });

    // Build social links HTML with golden icons
    const socialLinks = [];
    if (settings.social_instagram) {
      socialLinks.push(`<a href="${settings.social_instagram}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/174/174855.png" alt="Instagram" style="width: 32px; height: 32px;" />
      </a>`);
    }
    if (settings.social_tiktok) {
      socialLinks.push(`<a href="${settings.social_tiktok}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/3046/3046121.png" alt="TikTok" style="width: 32px; height: 32px;" />
      </a>`);
    }
    if (settings.social_twitter) {
      socialLinks.push(`<a href="${settings.social_twitter}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" style="width: 32px; height: 32px;" />
      </a>`);
    }
    if (settings.social_facebook) {
      socialLinks.push(`<a href="${settings.social_facebook}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" style="width: 32px; height: 32px;" />
      </a>`);
    }
    if (settings.social_youtube) {
      socialLinks.push(`<a href="${settings.social_youtube}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/1384/1384060.png" alt="YouTube" style="width: 32px; height: 32px;" />
      </a>`);
    }
    if (settings.social_linkedin) {
      socialLinks.push(`<a href="${settings.social_linkedin}" style="display: inline-block; margin: 0 10px; text-decoration: none;">
        <img src="https://cdn-icons-png.flaticon.com/32/174/174857.png" alt="LinkedIn" style="width: 32px; height: 32px;" />
      </a>`);
    }

    const privacyUrl = settings.legal_privacy_url || 'https://zemboapp.com/privacy';
    const termsUrl = settings.legal_terms_url || 'https://zemboapp.com/terms';
    const unsubscribeUrl = settings.legal_unsubscribe_url || 'https://zemboapp.com/unsubscribe';

    // Send verification email with modern ZEMBO branding
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "✨ Vérifiez votre email - ZEMBO",
      html: `
        <!DOCTYPE html>
        <html lang="fr">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Vérification Email - ZEMBO</title>
        </head>
        <body style="margin: 0; padding: 0; background-color: #000000; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #000000; min-height: 100vh;">
            <tr>
              <td align="center" style="padding: 40px 16px;">
                
                <!-- Main Card -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: linear-gradient(165deg, #0d0d14 0%, #12121f 50%, #0a0a10 100%); border-radius: 32px; overflow: hidden; border: 1px solid rgba(212, 175, 55, 0.15); box-shadow: 0 40px 80px rgba(0,0,0,0.6), 0 0 120px rgba(212, 175, 55, 0.08);">
                  
                  <!-- Top Gradient Bar -->
                  <tr>
                    <td style="height: 4px; background: linear-gradient(90deg, #d4af37, #f4e4a6, #d4af37);"></td>
                  </tr>
                  
                  <!-- Logo Section -->
                  <tr>
                    <td align="center" style="padding: 48px 40px 24px;">
                      <img src="${logoUrl}" alt="ZEMBO" width="140" style="display: block; max-width: 140px; height: auto;" />
                    </td>
                  </tr>
                  
                  <!-- Welcome Icon -->
                  <tr>
                    <td align="center" style="padding: 0 40px 16px;">
                      <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-block; line-height: 72px; font-size: 32px; border: 2px solid rgba(212, 175, 55, 0.3);">
                        ✉️
                      </div>
                    </td>
                  </tr>
                  
                  <!-- Greeting -->
                  <tr>
                    <td style="padding: 8px 40px 0;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 26px; font-weight: 700; text-align: center; letter-spacing: -0.5px;">
                        Bienvenue, ${displayName} !
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Subheading -->
                  <tr>
                    <td style="padding: 12px 40px 0;">
                      <p style="margin: 0; color: #d4af37; font-size: 15px; text-align: center; font-weight: 500;">
                        Plus qu'une étape pour rejoindre l'aventure
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Message -->
                  <tr>
                    <td style="padding: 24px 40px 32px;">
                      <p style="margin: 0; color: #9494a8; font-size: 15px; line-height: 1.7; text-align: center;">
                        Confirmez votre adresse email pour activer votre compte et découvrir des connexions authentiques.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 40px;">
                      <table role="presentation" cellspacing="0" cellpadding="0">
                        <tr>
                          <td style="border-radius: 16px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35), 0 2px 8px rgba(212, 175, 55, 0.2);">
                            <a href="${verificationLink}" style="display: inline-block; padding: 18px 48px; color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px; letter-spacing: 0.5px;">
                              Vérifier mon email →
                            </a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Link Box -->
                  <tr>
                    <td style="padding: 0 40px 40px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
                        <tr>
                          <td style="padding: 16px;">
                            <p style="margin: 0 0 8px; color: #6b6b7b; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; text-align: center;">
                              Ou copiez ce lien
                            </p>
                            <p style="margin: 0; color: #d4af37; font-size: 11px; text-align: center; word-break: break-all; line-height: 1.5;">
                              ${verificationLink}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Features Preview -->
                  <tr>
                    <td style="padding: 0 24px 32px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" width="33%" style="padding: 12px 8px;">
                            <div style="background: rgba(212, 175, 55, 0.08); border-radius: 16px; padding: 16px 8px; border: 1px solid rgba(212, 175, 55, 0.1);">
                              <p style="margin: 0 0 4px; font-size: 24px;">🎲</p>
                              <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600;">Random</p>
                            </div>
                          </td>
                          <td align="center" width="33%" style="padding: 12px 8px;">
                            <div style="background: rgba(212, 175, 55, 0.08); border-radius: 16px; padding: 16px 8px; border: 1px solid rgba(212, 175, 55, 0.1);">
                              <p style="margin: 0 0 4px; font-size: 24px;">💫</p>
                              <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600;">Match</p>
                            </div>
                          </td>
                          <td align="center" width="33%" style="padding: 12px 8px;">
                            <div style="background: rgba(212, 175, 55, 0.08); border-radius: 16px; padding: 16px 8px; border: 1px solid rgba(212, 175, 55, 0.1);">
                              <p style="margin: 0 0 4px; font-size: 24px;">📺</p>
                              <p style="margin: 0; color: #ffffff; font-size: 11px; font-weight: 600;">Lives</p>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  
                  <!-- Divider -->
                  <tr>
                    <td style="padding: 0 40px;">
                      <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);"></div>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 32px 40px;">
                      
                      <!-- Social Links -->
                      ${socialLinks.length > 0 ? `
                      <table role="presentation" align="center" cellspacing="0" cellpadding="0" style="margin-bottom: 24px;">
                        <tr>
                          ${socialLinks.join('')}
                        </tr>
                      </table>
                      ` : ''}
                      
                      <!-- Copyright -->
                      <p style="margin: 0 0 16px; color: #d4af37; font-size: 13px; text-align: center; font-weight: 600;">
                        ZEMBO
                      </p>
                      <p style="margin: 0 0 16px; color: #4a4a5a; font-size: 11px; text-align: center;">
                        L'app de rencontres premium
                      </p>
                      
                      <!-- Legal Links -->
                      <p style="margin: 0; color: #3a3a4a; font-size: 10px; text-align: center; line-height: 2;">
                        <a href="${privacyUrl}" style="color: #5a5a6a; text-decoration: none;">Confidentialité</a>
                        <span style="color: #2a2a3a; margin: 0 8px;">•</span>
                        <a href="${termsUrl}" style="color: #5a5a6a; text-decoration: none;">Conditions</a>
                        <span style="color: #2a2a3a; margin: 0 8px;">•</span>
                        <a href="${unsubscribeUrl}" style="color: #5a5a6a; text-decoration: none;">Désabonnement</a>
                      </p>
                      <p style="margin: 16px 0 0; color: #2a2a3a; font-size: 10px; text-align: center;">
                        © ${new Date().getFullYear()} ZEMBO. Tous droits réservés.
                      </p>
                    </td>
                  </tr>
                  
                </table>
                
                <!-- Disclaimer -->
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px;">
                  <tr>
                    <td style="padding: 24px 16px;">
                      <p style="margin: 0; color: #3a3a4a; font-size: 11px; text-align: center; line-height: 1.6;">
                        Vous recevez cet email car vous avez créé un compte ZEMBO.<br>
                        Si ce n'était pas vous, ignorez simplement ce message.
                      </p>
                    </td>
                  </tr>
                </table>
                
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    const remainingEmails = MAX_VERIFICATION_EMAILS_PER_DAY - (currentCount + 1);

    return new Response(JSON.stringify({ 
      success: true, 
      emailResponse,
      remainingEmails 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-verification-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
