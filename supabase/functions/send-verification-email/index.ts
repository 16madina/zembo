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

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

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

    // Generate verification token
    const verificationToken = crypto.randomUUID();
    const baseUrl = req.headers.get('origin') || 'https://lovable.dev';
    const verificationLink = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Store token in database
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        email: email,
        email_verification_token: verificationToken,
        email_verification_sent_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (updateError) {
      console.error("Error updating profile:", updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save verification token' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send verification email
    const emailResponse = await resend.emails.send({
      from: fromEmail,
      to: [email],
      subject: "Vérifiez votre adresse email - Zembo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid rgba(255,255,255,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #fff; font-size: 32px; margin: 0; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">
                  Zembo
                </h1>
              </div>
              
              <h2 style="color: #fff; font-size: 24px; text-align: center; margin-bottom: 20px;">
                Bonjour ${displayName} ! 👋
              </h2>
              
              <p style="color: #a0a0a0; font-size: 16px; line-height: 1.6; text-align: center; margin-bottom: 30px;">
                Merci de vous être inscrit sur Zembo ! Pour finaliser votre inscription et vérifier votre profil, cliquez sur le bouton ci-dessous.
              </p>
              
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${verificationLink}" style="display: inline-block; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: #fff; text-decoration: none; padding: 16px 40px; border-radius: 30px; font-weight: bold; font-size: 16px;">
                  Vérifier mon email
                </a>
              </div>
              
              <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 20px;">
                Ou copiez ce lien dans votre navigateur :
              </p>
              
              <p style="color: #f093fb; font-size: 12px; text-align: center; word-break: break-all; margin-bottom: 30px;">
                ${verificationLink}
              </p>
              
              <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
              
              <p style="color: #666; font-size: 12px; text-align: center;">
                Si vous n'avez pas créé de compte sur Zembo, ignorez cet email.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
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
