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

    // Send verification email with ZEMBO branding (dark theme + gold accents)
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Vérifiez votre adresse email - ZEMBO",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0a0a0f;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(180deg, #0f0f1a 0%, #1a1a2e 100%); border-radius: 20px; padding: 50px 40px; border: 1px solid rgba(212, 175, 55, 0.2); box-shadow: 0 20px 60px rgba(0,0,0,0.5);">
              
              <!-- Logo -->
              <div style="text-align: center; margin-bottom: 40px;">
                <img src="${logoUrl}" alt="ZEMBO" style="max-width: 200px; height: auto;" />
              </div>
              
              <!-- Greeting -->
              <h1 style="color: #ffffff; font-size: 28px; text-align: center; margin-bottom: 16px; font-weight: 600;">
                Bonjour ${displayName} ! 👋
              </h1>
              
              <!-- Message -->
              <p style="color: #b8b8c8; font-size: 16px; line-height: 1.8; text-align: center; margin-bottom: 35px;">
                Merci de vous être inscrit sur <span style="color: #d4af37; font-weight: 600;">ZEMBO</span> ! Pour finaliser votre inscription et vérifier votre profil, cliquez sur le bouton ci-dessous.
              </p>
              
              <!-- CTA Button with golden gradient -->
              <div style="text-align: center; margin-bottom: 35px;">
                <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #d4af37 100%); color: #0a0a0f; text-decoration: none; padding: 18px 50px; border-radius: 50px; font-weight: bold; font-size: 16px; box-shadow: 0 8px 25px rgba(212, 175, 55, 0.4); text-transform: uppercase; letter-spacing: 1px;">
                  Vérifier mon email
                </a>
              </div>
              
              <!-- Alternative link -->
              <p style="color: #6b6b7b; font-size: 13px; text-align: center; margin-bottom: 15px;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              
              <p style="color: #d4af37; font-size: 12px; text-align: center; word-break: break-all; margin-bottom: 40px; background: rgba(212, 175, 55, 0.1); padding: 12px 16px; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.2);">
                ${verificationLink}
              </p>
              
              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid rgba(212, 175, 55, 0.2); margin: 35px 0;">
              
              <!-- Disclaimer -->
              <p style="color: #6b6b7b; font-size: 12px; text-align: center; margin-bottom: 30px;">
                Si vous n'avez pas créé de compte sur ZEMBO, ignorez cet email.
              </p>
              
              <!-- Social Media Links -->
              ${socialLinks.length > 0 ? `
              <div style="text-align: center; margin-bottom: 25px;">
                ${socialLinks.join('')}
              </div>
              ` : ''}
              
              <!-- Footer -->
              <p style="color: #d4af37; font-size: 12px; text-align: center; margin-bottom: 15px; font-weight: 500;">
                © ${new Date().getFullYear()} ZEMBO. Tous droits réservés.
              </p>
              
              <p style="color: #6b6b7b; font-size: 11px; text-align: center;">
                <a href="${privacyUrl}" style="color: #8b8b9b; text-decoration: none;">Politique de confidentialité</a>
                <span style="color: #4b4b5b; margin: 0 8px;">•</span>
                <a href="${termsUrl}" style="color: #8b8b9b; text-decoration: none;">Conditions d'utilisation</a>
                <span style="color: #4b4b5b; margin: 0 8px;">•</span>
                <a href="${unsubscribeUrl}" style="color: #8b8b9b; text-decoration: none;">Se désabonner</a>
              </p>
            </div>
          </div>
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
