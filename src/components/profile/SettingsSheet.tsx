import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Settings,
  Bell,
  BellOff,
  Moon,
  Sun,
  Globe,
  Shield,
  Trash2,
  FileText,
  Lock,
  Database,
  Clock,
  AlertTriangle,
  ChevronRight,
  X,
  Check,
  Info,
  Smartphone,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

type Language = "fr" | "en";
type Theme = "dark" | "light" | "system";

interface SettingsSheetProps {
  children?: React.ReactNode;
}

const translations = {
  fr: {
    settings: "Paramètres",
    notifications: "Notifications",
    pushNotifications: "Notifications push",
    pushDescription: "Recevoir des alertes pour les matchs, messages et activités",
    appearance: "Apparence",
    darkMode: "Mode sombre",
    lightMode: "Mode clair",
    systemMode: "Système",
    language: "Langue",
    french: "Français",
    english: "English",
    privacyAndSecurity: "Confidentialité et sécurité",
    privacyPolicy: "Politique de confidentialité",
    termsOfService: "Conditions d'utilisation",
    dataCollection: "Collecte des données",
    accountManagement: "Gestion du compte",
    deleteAccount: "Supprimer mon compte",
    deleteAccountWarning: "Cette action est irréversible",
    dataRetention: "Conservation des données",
    dataRetentionInfo: "Vos données sont supprimées 90 jours après la suppression du compte",
    appGuidelines: "Directives de l'application",
    iosGuidelines: "Directives iOS (App Store)",
    androidGuidelines: "Directives Android (Google Play)",
    confirmDelete: "Confirmer la suppression",
    deleteConfirmMessage: "Êtes-vous sûr de vouloir supprimer définitivement votre compte ? Toutes vos données seront supprimées après 90 jours conformément à notre politique de conservation.",
    cancel: "Annuler",
    delete: "Supprimer",
    saved: "Paramètres sauvegardés",
  },
  en: {
    settings: "Settings",
    notifications: "Notifications",
    pushNotifications: "Push notifications",
    pushDescription: "Receive alerts for matches, messages and activities",
    appearance: "Appearance",
    darkMode: "Dark mode",
    lightMode: "Light mode",
    systemMode: "System",
    language: "Language",
    french: "Français",
    english: "English",
    privacyAndSecurity: "Privacy & Security",
    privacyPolicy: "Privacy Policy",
    termsOfService: "Terms of Service",
    dataCollection: "Data Collection",
    accountManagement: "Account Management",
    deleteAccount: "Delete my account",
    deleteAccountWarning: "This action is irreversible",
    dataRetention: "Data Retention",
    dataRetentionInfo: "Your data is deleted 90 days after account deletion",
    appGuidelines: "App Guidelines",
    iosGuidelines: "iOS Guidelines (App Store)",
    androidGuidelines: "Android Guidelines (Google Play)",
    confirmDelete: "Confirm deletion",
    deleteConfirmMessage: "Are you sure you want to permanently delete your account? All your data will be deleted after 90 days according to our retention policy.",
    cancel: "Cancel",
    delete: "Delete",
    saved: "Settings saved",
  },
};

const dataCollectionInfo = {
  fr: [
    {
      title: "Données personnelles",
      description: "Nous collectons votre nom, email, date de naissance et genre pour créer votre profil.",
    },
    {
      title: "Photos et médias",
      description: "Vos photos de profil sont stockées de manière sécurisée et utilisées uniquement pour l'affichage.",
    },
    {
      title: "Données de localisation",
      description: "Votre localisation est utilisée pour vous montrer des profils à proximité. Elle n'est jamais partagée sans votre consentement.",
    },
    {
      title: "Données d'utilisation",
      description: "Nous analysons votre utilisation de l'app pour améliorer nos services et votre expérience.",
    },
    {
      title: "Conservation",
      description: "Vos données sont conservées tant que votre compte est actif. Après suppression, elles sont effacées sous 90 jours.",
    },
  ],
  en: [
    {
      title: "Personal Data",
      description: "We collect your name, email, date of birth and gender to create your profile.",
    },
    {
      title: "Photos and Media",
      description: "Your profile photos are stored securely and used only for display purposes.",
    },
    {
      title: "Location Data",
      description: "Your location is used to show you nearby profiles. It's never shared without your consent.",
    },
    {
      title: "Usage Data",
      description: "We analyze your app usage to improve our services and your experience.",
    },
    {
      title: "Retention",
      description: "Your data is kept as long as your account is active. After deletion, it's erased within 90 days.",
    },
  ],
};

const appGuidelines = {
  ios: {
    fr: [
      "Vous pouvez demander la suppression de votre compte directement depuis l'application",
      "Toutes vos données personnelles seront supprimées dans un délai de 90 jours",
      "Vous pouvez exporter vos données avant la suppression",
      "Les achats intégrés ne sont pas remboursables après utilisation",
      "Conformité avec les règles de l'App Store concernant la protection des données",
    ],
    en: [
      "You can request account deletion directly from the app",
      "All your personal data will be deleted within 90 days",
      "You can export your data before deletion",
      "In-app purchases are non-refundable after use",
      "Compliance with App Store rules regarding data protection",
    ],
  },
  android: {
    fr: [
      "Suppression de compte disponible dans les paramètres",
      "Les données sont supprimées conformément au RGPD (90 jours max)",
      "Possibilité de télécharger vos données personnelles",
      "Les abonnements doivent être annulés séparément via Google Play",
      "Conformité avec les politiques Google Play sur les données utilisateur",
    ],
    en: [
      "Account deletion available in settings",
      "Data is deleted in accordance with GDPR (90 days max)",
      "Option to download your personal data",
      "Subscriptions must be cancelled separately via Google Play",
      "Compliance with Google Play policies on user data",
    ],
  },
};

export const SettingsSheet = ({ children }: SettingsSheetProps) => {
  const { user, signOut } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [language, setLanguage] = useState<Language>("fr");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const t = translations[language];
  const dataInfo = dataCollectionInfo[language];

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedLang = localStorage.getItem("zembo-language") as Language;
    const savedTheme = localStorage.getItem("zembo-theme") as Theme;
    const savedPush = localStorage.getItem("zembo-push");

    if (savedLang) setLanguage(savedLang);
    if (savedTheme) setTheme(savedTheme);
    if (savedPush) setPushEnabled(savedPush === "true");
  }, []);

  const handlePushToggle = (enabled: boolean) => {
    setPushEnabled(enabled);
    localStorage.setItem("zembo-push", String(enabled));
    toast.success(t.saved);
  };

  const handleThemeChange = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("zembo-theme", newTheme);
    
    // Apply theme
    const root = document.documentElement;
    if (newTheme === "dark") {
      root.classList.add("dark");
      root.classList.remove("light");
    } else if (newTheme === "light") {
      root.classList.remove("dark");
      root.classList.add("light");
    } else {
      // System preference
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (prefersDark) {
        root.classList.add("dark");
        root.classList.remove("light");
      } else {
        root.classList.remove("dark");
        root.classList.add("light");
      }
    }
    toast.success(t.saved);
  };

  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem("zembo-language", newLang);
    toast.success(translations[newLang].saved);
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Mark account for deletion in database
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ 
          deleted_at: new Date().toISOString(),
          is_online: false 
        })
        .eq("user_id", user.id);

      if (profileError) {
        console.error("Error marking profile for deletion:", profileError);
      }

      // Sign out and notify
      await signOut();
      toast.success(
        language === "fr" 
          ? "Votre compte a été programmé pour suppression. Vos données seront effacées sous 90 jours."
          : "Your account has been scheduled for deletion. Your data will be erased within 90 days."
      );
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error(
        language === "fr"
          ? "Erreur lors de la suppression du compte"
          : "Error deleting account"
      );
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  const SettingRow = ({ 
    icon, 
    label, 
    description,
    action,
    danger = false,
  }: { 
    icon: React.ReactNode; 
    label: string; 
    description?: string;
    action?: React.ReactNode;
    danger?: boolean;
  }) => (
    <div className={`flex items-center justify-between py-4 ${danger ? 'text-destructive' : ''}`}>
      <div className="flex items-center gap-3 flex-1">
        <span className={danger ? 'text-destructive' : 'text-primary'}>{icon}</span>
        <div className="flex-1">
          <p className={`font-medium ${danger ? 'text-destructive' : 'text-foreground'}`}>{label}</p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
      {action}
    </div>
  );

  return (
    <>
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetTrigger asChild>
          {children || (
            <motion.button
              className="p-3 bg-muted/50 backdrop-blur-sm rounded-full"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Settings className="w-5 h-5 text-foreground" />
            </motion.button>
          )}
        </SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto bg-background border-l border-border">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-xl font-bold flex items-center gap-2">
              <Settings className="w-5 h-5 text-primary" />
              {t.settings}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6">
            {/* Notifications Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Bell className="w-4 h-4" />
                {t.notifications}
              </h3>
              <SettingRow
                icon={pushEnabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                label={t.pushNotifications}
                description={t.pushDescription}
                action={
                  <Switch
                    checked={pushEnabled}
                    onCheckedChange={handlePushToggle}
                  />
                }
              />
            </div>

            {/* Appearance Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                {theme === "dark" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                {t.appearance}
              </h3>
              <div className="grid grid-cols-3 gap-2 mt-3">
                <Button
                  variant={theme === "dark" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleThemeChange("dark")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Moon className="w-4 h-4" />
                  <span className="text-xs">{t.darkMode}</span>
                </Button>
                <Button
                  variant={theme === "light" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleThemeChange("light")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Sun className="w-4 h-4" />
                  <span className="text-xs">{t.lightMode}</span>
                </Button>
                <Button
                  variant={theme === "system" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleThemeChange("system")}
                  className="flex flex-col items-center gap-1 h-auto py-3"
                >
                  <Smartphone className="w-4 h-4" />
                  <span className="text-xs">{t.systemMode}</span>
                </Button>
              </div>
            </div>

            {/* Language Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Globe className="w-4 h-4" />
                {t.language}
              </h3>
              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  variant={language === "fr" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLanguageChange("fr")}
                  className="flex items-center gap-2"
                >
                  🇫🇷 {t.french}
                  {language === "fr" && <Check className="w-4 h-4" />}
                </Button>
                <Button
                  variant={language === "en" ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleLanguageChange("en")}
                  className="flex items-center gap-2"
                >
                  🇬🇧 {t.english}
                  {language === "en" && <Check className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            {/* Privacy & Security Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Shield className="w-4 h-4" />
                {t.privacyAndSecurity}
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="privacy" className="border-none">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <FileText className="w-5 h-5 text-primary" />
                      <span>{t.privacyPolicy}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground px-8">
                    <p className="mb-3">
                      {language === "fr" 
                        ? "Notre politique de confidentialité explique comment nous collectons, utilisons et protégeons vos données personnelles."
                        : "Our privacy policy explains how we collect, use and protect your personal data."}
                    </p>
                    <a 
                      href="https://zemboapp.com/privacy" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {language === "fr" ? "Lire la politique complète" : "Read full policy"}
                    </a>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="terms" className="border-none">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Lock className="w-5 h-5 text-primary" />
                      <span>{t.termsOfService}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-sm text-muted-foreground px-8">
                    <p className="mb-3">
                      {language === "fr"
                        ? "Les conditions d'utilisation régissent votre utilisation de l'application Zembo."
                        : "The terms of service govern your use of the Zembo application."}
                    </p>
                    <a 
                      href="https://zemboapp.com/terms" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary underline"
                    >
                      {language === "fr" ? "Lire les conditions" : "Read terms"}
                    </a>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="data" className="border-none">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <Database className="w-5 h-5 text-primary" />
                      <span>{t.dataCollection}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <div className="space-y-4">
                      {dataInfo.map((item, index) => (
                        <div key={index} className="flex gap-3">
                          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                          <div>
                            <p className="font-medium text-sm text-foreground">{item.title}</p>
                            <p className="text-xs text-muted-foreground">{item.description}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Data Retention Info */}
            <div className="glass-strong rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground">{t.dataRetention}</h3>
                  <p className="text-sm text-muted-foreground mt-1">{t.dataRetentionInfo}</p>
                </div>
              </div>
            </div>

            {/* App Guidelines Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t.appGuidelines}
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="ios" className="border-none">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🍎</span>
                      <span>{t.iosGuidelines}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.ios[language].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="android" className="border-none">
                  <AccordionTrigger className="py-3 hover:no-underline">
                    <div className="flex items-center gap-3">
                      <span className="text-lg">🤖</span>
                      <span>{t.androidGuidelines}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.android[language].map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                          <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* Delete Account Section */}
            <div className="glass-strong rounded-2xl p-4 border border-destructive/20">
              <h3 className="text-sm font-semibold text-destructive mb-2 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                {t.accountManagement}
              </h3>
              <SettingRow
                icon={<Trash2 className="w-5 h-5" />}
                label={t.deleteAccount}
                description={t.deleteAccountWarning}
                danger
                action={
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                  >
                    {t.delete}
                  </Button>
                }
              />
            </div>

            {/* Version */}
            <p className="text-center text-muted-foreground text-xs py-4">
              ZEMBO v1.0.0
            </p>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent className="bg-background border-destructive/20">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              {t.confirmDelete}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              {t.deleteConfirmMessage}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t.cancel}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin">⏳</span>
                  {language === "fr" ? "Suppression..." : "Deleting..."}
                </span>
              ) : (
                t.delete
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsSheet;
