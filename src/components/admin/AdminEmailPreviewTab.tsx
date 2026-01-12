import { useState } from "react";
import { motion } from "framer-motion";
import {
  Mail,
  Send,
  Eye,
  Smartphone,
  Monitor,
  Moon,
  Sun,
  Loader2,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type EmailTemplate = "verification" | "invitation" | "match" | "message";
type ViewMode = "desktop" | "mobile";
type ThemeMode = "dark" | "light";

const EMAIL_TEMPLATES: { value: EmailTemplate; label: string; description: string }[] = [
  { value: "verification", label: "Vérification Email", description: "Email envoyé lors de l'inscription" },
  { value: "invitation", label: "Invitation", description: "Email d'invitation par un ami" },
  { value: "match", label: "Nouveau Match", description: "Notification de nouveau match" },
  { value: "message", label: "Nouveau Message", description: "Notification de message reçu" },
];

const AdminEmailPreviewTab = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>("verification");
  const [viewMode, setViewMode] = useState<ViewMode>("desktop");
  const [themeMode, setThemeMode] = useState<ThemeMode>("dark");
  const [testEmail, setTestEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastSentResult, setLastSentResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleSendTest = async () => {
    if (!testEmail || !testEmail.includes("@")) {
      toast.error("Veuillez entrer une adresse email valide");
      return;
    }

    setIsSending(true);
    setLastSentResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("send-test-email", {
        body: {
          email: testEmail,
          template: selectedTemplate,
          testData: {
            displayName: "Utilisateur Test",
            senderName: "Admin ZEMBO",
            matchName: "Sophie",
            messageSender: "Marie",
            messagePreview: "Salut ! Comment ça va ? 😊",
          },
        },
      });

      if (error) throw error;

      setLastSentResult({ success: true, message: `Email test envoyé à ${testEmail}` });
      toast.success(`Email "${EMAIL_TEMPLATES.find(t => t.value === selectedTemplate)?.label}" envoyé !`);
    } catch (error: any) {
      console.error("Error sending test email:", error);
      setLastSentResult({ success: false, message: error.message || "Erreur lors de l'envoi" });
      toast.error("Erreur lors de l'envoi de l'email test");
    } finally {
      setIsSending(false);
    }
  };

  const getPreviewHtml = () => {
    const logoUrl = "https://zemboapp.com/images/zembo-logo-email.png";
    const bgColor = themeMode === "dark" ? "#000000" : "#f5f5f5";
    const cardBg = themeMode === "dark" 
      ? "linear-gradient(165deg, #0d0d14 0%, #12121f 50%, #0a0a10 100%)" 
      : "linear-gradient(165deg, #ffffff 0%, #f8f8fa 50%, #f0f0f5 100%)";
    const textColor = themeMode === "dark" ? "#ffffff" : "#1a1a1a";
    const mutedColor = themeMode === "dark" ? "#9494a8" : "#6b6b7b";
    const borderColor = themeMode === "dark" ? "rgba(212, 175, 55, 0.15)" : "rgba(212, 175, 55, 0.3)";

    const templates: Record<EmailTemplate, string> = {
      verification: `
        <div style="text-align: center; padding: 24px;">
          <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; border: 2px solid rgba(212, 175, 55, 0.3); margin-bottom: 16px;">
            ✉️
          </div>
          <h1 style="margin: 0 0 12px; color: ${textColor}; font-size: 26px; font-weight: 700;">
            Bienvenue, Utilisateur Test !
          </h1>
          <p style="margin: 0 0 8px; color: #d4af37; font-size: 15px; font-weight: 500;">
            Plus qu'une étape pour rejoindre l'aventure
          </p>
          <p style="margin: 0 0 24px; color: ${mutedColor}; font-size: 15px; line-height: 1.7;">
            Confirmez votre adresse email pour activer votre compte et découvrir des connexions authentiques.
          </p>
          <a href="#" style="display: inline-block; padding: 18px 48px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 16px; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
            Vérifier mon email →
          </a>
        </div>
      `,
      invitation: `
        <div style="text-align: center; padding: 24px;">
          <h1 style="margin: 0 0 20px; color: #d4af37; font-size: 28px; font-weight: 700;">
            Vous êtes invité(e) ! ✨
          </h1>
          <p style="margin: 0 0 20px; color: ${textColor}; font-size: 16px; line-height: 1.6;">
            <strong style="color: #d4af37;">Admin ZEMBO</strong> pense que vous allez adorer Zembo.
          </p>
          <p style="margin: 0 0 30px; color: ${mutedColor}; font-size: 14px; line-height: 1.6;">
            Découvrez des connexions authentiques grâce à nos appels vidéo aléatoires et notre système de matching intelligent.
          </p>
          <div style="display: flex; gap: 12px; justify-content: center; flex-wrap: wrap;">
            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">
              📱 App Store
            </a>
            <a href="#" style="display: inline-block; background: linear-gradient(135deg, #d4af37 0%, #f4d03f 100%); color: #0a0a0a; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 600; font-size: 14px;">
              🤖 Play Store
            </a>
          </div>
        </div>
      `,
      match: `
        <div style="text-align: center; padding: 24px;">
          <div style="width: 80px; height: 80px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 40px; border: 2px solid rgba(212, 175, 55, 0.3); margin-bottom: 16px;">
            💫
          </div>
          <h1 style="margin: 0 0 12px; color: ${textColor}; font-size: 28px; font-weight: 700;">
            Nouveau Match !
          </h1>
          <p style="margin: 0 0 8px; color: #d4af37; font-size: 18px; font-weight: 600;">
            Sophie et vous avez matché ! 🎉
          </p>
          <p style="margin: 0 0 24px; color: ${mutedColor}; font-size: 15px; line-height: 1.7;">
            N'attendez plus, envoyez le premier message et faites connaissance !
          </p>
          <a href="#" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 16px; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
            Envoyer un message 💬
          </a>
        </div>
      `,
      message: `
        <div style="text-align: center; padding: 24px;">
          <div style="width: 72px; height: 72px; background: linear-gradient(135deg, rgba(212, 175, 55, 0.2) 0%, rgba(212, 175, 55, 0.05) 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; font-size: 32px; border: 2px solid rgba(212, 175, 55, 0.3); margin-bottom: 16px;">
            💬
          </div>
          <h1 style="margin: 0 0 12px; color: ${textColor}; font-size: 24px; font-weight: 700;">
            Nouveau message de Marie
          </h1>
          <div style="background: rgba(212, 175, 55, 0.08); border-radius: 16px; padding: 20px; margin: 20px 0; border: 1px solid rgba(212, 175, 55, 0.15);">
            <p style="margin: 0; color: ${textColor}; font-size: 16px; font-style: italic;">
              "Salut ! Comment ça va ? 😊"
            </p>
          </div>
          <a href="#" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #d4af37 0%, #c9a430 100%); color: #0a0a0f; text-decoration: none; font-weight: 700; font-size: 15px; border-radius: 16px; box-shadow: 0 8px 32px rgba(212, 175, 55, 0.35);">
            Répondre →
          </a>
        </div>
      `,
    };

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; background-color: ${bgColor}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
        <table width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td align="center">
              <table width="100%" cellspacing="0" cellpadding="0" style="max-width: 480px; background: ${cardBg}; border-radius: 32px; overflow: hidden; border: 1px solid ${borderColor}; box-shadow: 0 20px 60px rgba(0,0,0,0.3);">
                <tr>
                  <td style="height: 4px; background: linear-gradient(90deg, #d4af37, #f4e4a6, #d4af37);"></td>
                </tr>
                <tr>
                  <td align="center" style="padding: 32px 24px 16px;">
                    <img src="${logoUrl}" alt="ZEMBO" width="120" style="display: block; max-width: 120px; height: auto;" />
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px 32px;">
                    ${templates[selectedTemplate]}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 0 24px;">
                    <div style="height: 1px; background: linear-gradient(90deg, transparent, rgba(212, 175, 55, 0.2), transparent);"></div>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 24px; text-align: center;">
                    <p style="margin: 0 0 8px; color: #d4af37; font-size: 13px; font-weight: 600;">ZEMBO</p>
                    <p style="margin: 0; color: ${mutedColor}; font-size: 11px;">L'app de rencontres premium</p>
                    <p style="margin: 12px 0 0; color: ${mutedColor}; font-size: 10px;">
                      <a href="#" style="color: #d4af37; text-decoration: none;">Confidentialité</a> • 
                      <a href="#" style="color: #d4af37; text-decoration: none;">Conditions</a> • 
                      <a href="#" style="color: #d4af37; text-decoration: none;">Désabonnement</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      {/* Controls */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Eye className="w-5 h-5 text-primary" />
            Prévisualisation des Emails
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Template Selector */}
            <div className="space-y-2">
              <Label>Template</Label>
              <Select value={selectedTemplate} onValueChange={(v) => setSelectedTemplate(v as EmailTemplate)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EMAIL_TEMPLATES.map((template) => (
                    <SelectItem key={template.value} value={template.value}>
                      {template.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode */}
            <div className="space-y-2">
              <Label>Aperçu</Label>
              <div className="flex gap-2">
                <Button
                  variant={viewMode === "desktop" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewMode("desktop")}
                >
                  <Monitor className="w-4 h-4 mr-1" />
                  Desktop
                </Button>
                <Button
                  variant={viewMode === "mobile" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setViewMode("mobile")}
                >
                  <Smartphone className="w-4 h-4 mr-1" />
                  Mobile
                </Button>
              </div>
            </div>

            {/* Theme Mode */}
            <div className="space-y-2">
              <Label>Thème</Label>
              <div className="flex gap-2">
                <Button
                  variant={themeMode === "dark" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setThemeMode("dark")}
                >
                  <Moon className="w-4 h-4 mr-1" />
                  Sombre
                </Button>
                <Button
                  variant={themeMode === "light" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => setThemeMode("light")}
                >
                  <Sun className="w-4 h-4 mr-1" />
                  Clair
                </Button>
              </div>
            </div>

            {/* Template Info */}
            <div className="space-y-2">
              <Label>Description</Label>
              <p className="text-sm text-muted-foreground pt-1">
                {EMAIL_TEMPLATES.find((t) => t.value === selectedTemplate)?.description}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-muted-foreground">
            Aperçu {viewMode === "mobile" ? "Mobile (375px)" : "Desktop"}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div
            className={`mx-auto transition-all duration-300 ${
              viewMode === "mobile" ? "max-w-[375px]" : "max-w-full"
            }`}
          >
            <div
              className={`rounded-xl overflow-hidden border border-border/30 shadow-lg ${
                viewMode === "mobile" ? "aspect-[9/16] max-h-[600px]" : "min-h-[500px]"
              }`}
            >
              <iframe
                srcDoc={getPreviewHtml()}
                className="w-full h-full border-0"
                style={{ minHeight: viewMode === "mobile" ? "600px" : "500px" }}
                title="Email Preview"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Send Test */}
      <Card className="border-border/50 bg-card/50 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Send className="w-5 h-5 text-primary" />
            Envoyer un Email Test
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 space-y-2">
              <Label htmlFor="test-email">Adresse Email</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="test-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={handleSendTest}
                  disabled={isSending || !testEmail}
                  className="min-w-[140px]"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Envoi...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Envoyer Test
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {lastSentResult && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex items-center gap-2 p-3 rounded-lg ${
                lastSentResult.success
                  ? "bg-green-500/10 border border-green-500/20 text-green-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              }`}
            >
              {lastSentResult.success ? (
                <CheckCircle2 className="w-5 h-5" />
              ) : (
                <XCircle className="w-5 h-5" />
              )}
              <span className="text-sm">{lastSentResult.message}</span>
            </motion.div>
          )}

          <p className="text-xs text-muted-foreground">
            💡 L'email test sera envoyé avec des données fictives pour vérifier le rendu final dans votre boîte de réception.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AdminEmailPreviewTab;
