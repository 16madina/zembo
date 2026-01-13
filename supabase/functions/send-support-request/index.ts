import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SupportRequest {
  category: string;
  subject: string;
  message: string;
  userEmail?: string;
  userName?: string;
  userId?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { category, subject, message, userEmail, userName, userId }: SupportRequest = await req.json();

    const categoryLabels: Record<string, string> = {
      bug: "🐛 Bug / Problème technique",
      account: "👤 Compte / Connexion",
      payment: "💳 Paiement / Abonnement",
      safety: "🚨 Signalement / Sécurité",
      feature: "💡 Suggestion / Idée",
      other: "📝 Autre",
    };

    const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "support@zemboapp.com";

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0a0a0a; color: #fff; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: #1a1a1a; border-radius: 16px; overflow: hidden; }
            .header { background: linear-gradient(135deg, #d4a574 0%, #c9956e 100%); padding: 30px; text-align: center; }
            .header h1 { margin: 0; color: #000; font-size: 24px; }
            .content { padding: 30px; }
            .field { margin-bottom: 20px; }
            .label { color: #888; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
            .value { color: #fff; font-size: 16px; background: #252525; padding: 12px 16px; border-radius: 8px; }
            .message-box { background: #252525; padding: 20px; border-radius: 12px; margin-top: 20px; }
            .category-badge { display: inline-block; background: #d4a574; color: #000; padding: 6px 12px; border-radius: 20px; font-size: 14px; font-weight: 600; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📩 Nouvelle demande d'assistance</h1>
            </div>
            <div class="content">
              <div class="field">
                <div class="label">Catégorie</div>
                <span class="category-badge">${categoryLabels[category] || category}</span>
              </div>
              
              <div class="field">
                <div class="label">Sujet</div>
                <div class="value">${subject || "Non spécifié"}</div>
              </div>
              
              <div class="field">
                <div class="label">Utilisateur</div>
                <div class="value">
                  ${userName || "Anonyme"}<br>
                  <span style="color: #888; font-size: 14px;">${userEmail || "Email non fourni"}</span><br>
                  <span style="color: #666; font-size: 12px;">ID: ${userId || "N/A"}</span>
                </div>
              </div>
              
              <div class="message-box">
                <div class="label">Message</div>
                <p style="margin: 10px 0 0 0; line-height: 1.6; white-space: pre-wrap;">${message}</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const emailResponse = await resend.emails.send({
      from: `Zembo Support <${fromEmail}>`,
      to: ["support@zemboapp.com"],
      reply_to: userEmail || undefined,
      subject: `[Support] ${categoryLabels[category] || category} - ${subject || "Nouvelle demande"}`,
      html: emailHtml,
    });

    console.log("Support email sent:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending support email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);
