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

interface AdminEmailRequest {
  recipientType: "all" | "individual";
  recipientId?: string;
  title: string;
  message: string;
  notificationType: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is admin
    const token = authHeader.replace('Bearer ', '');
    const { data: claims, error: claimsError } = await supabase.auth.getUser(token);
    
    if (claimsError || !claims?.user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claims.user.id;

    // Check if user has admin role
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .eq('role', 'admin')
      .single();

    if (roleError || !roleData) {
      return new Response(
        JSON.stringify({ error: 'Forbidden - Admin access required' }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { recipientType, recipientId, title, message, notificationType }: AdminEmailRequest = await req.json();
    
    // Get base URL for logo
    const baseUrl = req.headers.get('origin') || 'https://zemboapp.com';
    const logoUrl = `${baseUrl}/images/zembo-logo-email.png`;

    let recipients: { email: string; displayName: string }[] = [];

    if (recipientType === "individual" && recipientId) {
      // Get single user
      const { data: profile, error: profileError } = await supabaseAdmin
        .from('profiles')
        .select('email, display_name')
        .eq('user_id', recipientId)
        .single();

      if (profileError || !profile?.email) {
        return new Response(
          JSON.stringify({ error: 'User not found or has no email' }), 
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipients.push({ 
        email: profile.email, 
        displayName: profile.display_name || 'Utilisateur' 
      });
    } else if (recipientType === "all") {
      // Get all users with email
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from('profiles')
        .select('email, display_name')
        .not('email', 'is', null);

      if (profilesError) {
        return new Response(
          JSON.stringify({ error: 'Failed to fetch users' }), 
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      recipients = (profiles || [])
        .filter(p => p.email)
        .map(p => ({ 
          email: p.email!, 
          displayName: p.display_name || 'Utilisateur' 
        }));
    }

    if (recipients.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No valid recipients found' }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get notification type styling
    const typeStyles = {
      info: { color: '#3b82f6', icon: 'ℹ️', label: 'Information' },
      warning: { color: '#f59e0b', icon: '⚠️', label: 'Avertissement' },
      success: { color: '#10b981', icon: '✅', label: 'Succès' },
      promo: { color: '#f093fb', icon: '🎉', label: 'Promotion' },
    };

    const style = typeStyles[notificationType as keyof typeof typeStyles] || typeStyles.info;

    // Send emails
    const results = await Promise.allSettled(
      recipients.map(recipient => 
        resend.emails.send({
          from: fromEmail,
          to: [recipient.email],
          subject: `${style.icon} ${title} - Zembo`,
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
                    <img src="${logoUrl}" alt="ZEMBO" style="max-width: 180px; height: auto;" />
                  </div>
                  
                  <div style="background: ${style.color}20; border-left: 4px solid ${style.color}; padding: 12px 16px; border-radius: 0 8px 8px 0; margin-bottom: 20px;">
                    <span style="color: ${style.color}; font-weight: bold;">${style.icon} ${style.label}</span>
                  </div>
                  
                  <h2 style="color: #fff; font-size: 24px; margin-bottom: 20px;">
                    ${title}
                  </h2>
                  
                  <p style="color: #e0e0e0; font-size: 16px; line-height: 1.8; margin-bottom: 30px; white-space: pre-wrap;">
                    Bonjour ${recipient.displayName},

${message}
                  </p>
                  
                  <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 30px 0;">
                  
                  <p style="color: #666; font-size: 12px; text-align: center; margin-bottom: 20px;">
                    Cet email vous a été envoyé par l'équipe Zembo.<br>
                    Si vous avez des questions, répondez directement à cet email.
                  </p>
                  
                  <!-- Social Media Links -->
                  <div style="text-align: center; margin-bottom: 20px;">
                    <a href="https://instagram.com/zemboapp" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/32/174/174855.png" alt="Instagram" style="width: 28px; height: 28px; opacity: 0.7;" />
                    </a>
                    <a href="https://tiktok.com/@zemboapp" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/32/3046/3046121.png" alt="TikTok" style="width: 28px; height: 28px; opacity: 0.7;" />
                    </a>
                    <a href="https://twitter.com/zemboapp" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/32/733/733579.png" alt="Twitter" style="width: 28px; height: 28px; opacity: 0.7;" />
                    </a>
                    <a href="https://facebook.com/zemboapp" style="display: inline-block; margin: 0 8px; text-decoration: none;">
                      <img src="https://cdn-icons-png.flaticon.com/32/733/733547.png" alt="Facebook" style="width: 28px; height: 28px; opacity: 0.7;" />
                    </a>
                  </div>
                  
                  <p style="color: #555; font-size: 11px; text-align: center; margin-bottom: 10px;">
                    © ${new Date().getFullYear()} Zembo. Tous droits réservés.
                  </p>
                  
                  <p style="color: #444; font-size: 10px; text-align: center;">
                    <a href="https://zemboapp.com/privacy" style="color: #888; text-decoration: none;">Politique de confidentialité</a>
                    &nbsp;•&nbsp;
                    <a href="https://zemboapp.com/terms" style="color: #888; text-decoration: none;">Conditions d'utilisation</a>
                    &nbsp;•&nbsp;
                    <a href="https://zemboapp.com/unsubscribe" style="color: #888; text-decoration: none;">Se désabonner</a>
                  </p>
                </div>
              </div>
            </body>
            </html>
          `,
        })
      )
    );

    const successful = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;

    console.log(`Admin email sent: ${successful} successful, ${failed} failed`);

    return new Response(JSON.stringify({ 
      success: true, 
      sent: successful,
      failed: failed,
      total: recipients.length
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error in send-admin-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
};

serve(handler);
