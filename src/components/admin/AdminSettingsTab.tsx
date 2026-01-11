import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Settings,
  Save,
  Loader2,
  Instagram,
  Twitter,
  Facebook,
  Youtube,
  Linkedin,
  Link,
  Mail,
  FileText,
  Shield,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

interface AppSetting {
  id: string;
  key: string;
  value: string;
  description: string | null;
  category: string;
}

const socialIcons: Record<string, React.ReactNode> = {
  social_instagram: <Instagram className="w-4 h-4 text-pink-500" />,
  social_tiktok: <span className="text-sm">🎵</span>,
  social_twitter: <Twitter className="w-4 h-4 text-blue-400" />,
  social_facebook: <Facebook className="w-4 h-4 text-blue-600" />,
  social_youtube: <Youtube className="w-4 h-4 text-red-500" />,
  social_linkedin: <Linkedin className="w-4 h-4 text-blue-500" />,
};

const AdminSettingsTab = () => {
  const [settings, setSettings] = useState<AppSetting[]>([]);
  const [editedValues, setEditedValues] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("app_settings")
        .select("*")
        .order("category", { ascending: true })
        .order("key", { ascending: true });

      if (error) throw error;

      setSettings(data || []);
      const values: Record<string, string> = {};
      (data || []).forEach((s) => {
        values[s.key] = s.value;
      });
      setEditedValues(values);
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (category: string) => {
    setIsSaving(true);
    try {
      const categorySettings = settings.filter((s) => s.category === category);
      
      for (const setting of categorySettings) {
        if (editedValues[setting.key] !== setting.value) {
          const { error } = await supabase
            .from("app_settings")
            .update({ 
              value: editedValues[setting.key],
              updated_at: new Date().toISOString(),
            })
            .eq("key", setting.key);

          if (error) throw error;
        }
      }

      await fetchSettings();
      toast.success("Paramètres enregistrés avec succès");
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setIsSaving(false);
    }
  };

  const getSettingsByCategory = (category: string) => {
    return settings.filter((s) => s.category === category);
  };

  const hasChanges = (category: string) => {
    return getSettingsByCategory(category).some(
      (s) => editedValues[s.key] !== s.value
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      <Tabs defaultValue="social" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-4">
          <TabsTrigger value="social" className="flex items-center gap-2">
            <Link className="w-4 h-4" />
            <span className="hidden sm:inline">Réseaux sociaux</span>
          </TabsTrigger>
          <TabsTrigger value="legal" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Liens légaux</span>
          </TabsTrigger>
          <TabsTrigger value="general" className="flex items-center gap-2">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Général</span>
          </TabsTrigger>
        </TabsList>

        {/* Social Media Settings */}
        <TabsContent value="social">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link className="w-5 h-5 text-primary" />
                Réseaux sociaux
              </CardTitle>
              <CardDescription>
                Configurez les liens vers vos réseaux sociaux affichés dans les emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("social").map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {socialIcons[setting.key] || <Link className="w-4 h-4" />}
                    {setting.description}
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={editedValues[setting.key] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => handleSave("social")}
                  disabled={isSaving || !hasChanges("social")}
                  className="bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Legal Settings */}
        <TabsContent value="legal">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Liens légaux
              </CardTitle>
              <CardDescription>
                Configurez les liens vers vos pages légales affichés dans les emails.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("legal").map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-muted-foreground" />
                    {setting.description}
                  </Label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={editedValues[setting.key] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => handleSave("legal")}
                  disabled={isSaving || !hasChanges("legal")}
                  className="bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general">
          <Card className="glass-strong">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                Paramètres généraux
              </CardTitle>
              <CardDescription>
                Configurez les paramètres généraux de l'application.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {getSettingsByCategory("general").map((setting) => (
                <div key={setting.key} className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {setting.key === "app_support_email" ? (
                      <Mail className="w-4 h-4 text-muted-foreground" />
                    ) : (
                      <Settings className="w-4 h-4 text-muted-foreground" />
                    )}
                    {setting.description}
                  </Label>
                  <Input
                    type={setting.key.includes("email") ? "email" : "text"}
                    value={editedValues[setting.key] || ""}
                    onChange={(e) =>
                      setEditedValues((prev) => ({
                        ...prev,
                        [setting.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}

              <div className="flex justify-end pt-4">
                <Button
                  onClick={() => handleSave("general")}
                  disabled={isSaving || !hasChanges("general")}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                >
                  {isSaving ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Enregistrer
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};

export default AdminSettingsTab;
