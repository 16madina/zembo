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
  Users,
  Heart,
  Eye,
  Ban,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Baby,
  UserX,
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
    communityGuidelines: "Règles de la communauté",
    safetyTips: "Conseils de sécurité",
    contentModeration: "Modération du contenu",
    userSafety: "Sécurité des utilisateurs",
    childSafety: "Protection des mineurs",
    contentPolicy: "Politique de contenu",
    userProtection: "Protection des utilisateurs",
    dataPrivacy: "Confidentialité des données",
    consequences: "Sanctions",
    reportingAndBlocking: "Signalement & blocage",
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
    communityGuidelines: "Community Guidelines",
    safetyTips: "Safety Tips",
    contentModeration: "Content Moderation",
    userSafety: "User Safety",
    childSafety: "Child Safety",
    contentPolicy: "Content Policy",
    userProtection: "User Protection",
    dataPrivacy: "Data Privacy",
    consequences: "Consequences",
    reportingAndBlocking: "Reporting & Blocking",
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

// Comprehensive App Store & Play Store Guidelines for Dating Apps
const appGuidelines = {
  ios: {
    fr: {
      accountManagement: [
        "Suppression de compte accessible directement dans l'application (Guideline 5.1.1)",
        "Toutes vos données personnelles seront supprimées dans un délai de 90 jours",
        "Possibilité d'exporter vos données personnelles (RGPD)",
        "Les achats intégrés ne sont pas remboursables après utilisation",
        "Option 'Sign in with Apple' disponible pour la connexion",
      ],
      contentModeration: [
        "Système de modération actif 24h/24 pour le contenu inapproprié (Guideline 1.2)",
        "Filtrage automatique des contenus à caractère sexuel explicite (Guideline 1.1.4)",
        "Signalement des utilisateurs abusifs avec traitement sous 24h",
        "Blocage immédiat des utilisateurs indésirables",
        "Interdiction stricte des contenus pornographiques ou prostitution",
      ],
      userSafety: [
        "Vérification de l'âge obligatoire (18+ ans)",
        "Protection contre le harcèlement et les comportements abusifs",
        "Politique de tolérance zéro pour les discours haineux",
        "Photos modérées pour prévenir le contenu inapproprié",
        "Messagerie sécurisée avec signalement intégré",
      ],
      dataPrivacy: [
        "Politique de confidentialité transparente et accessible",
        "Consentement explicite pour la collecte de données",
        "Localisation utilisée uniquement avec votre permission",
        "Données chiffrées en transit et au repos",
        "Aucun partage de données avec des tiers sans consentement",
      ],
    },
    en: {
      accountManagement: [
        "Account deletion accessible directly in the app (Guideline 5.1.1)",
        "All personal data deleted within 90 days",
        "Option to export your personal data (GDPR)",
        "In-app purchases are non-refundable after use",
        "'Sign in with Apple' option available for login",
      ],
      contentModeration: [
        "24/7 active content moderation system (Guideline 1.2)",
        "Automatic filtering of sexually explicit content (Guideline 1.1.4)",
        "User abuse reports processed within 24 hours",
        "Immediate blocking of unwanted users",
        "Strict prohibition of pornographic content or prostitution",
      ],
      userSafety: [
        "Mandatory age verification (18+ years)",
        "Protection against harassment and abusive behavior",
        "Zero tolerance policy for hate speech",
        "Photos moderated to prevent inappropriate content",
        "Secure messaging with integrated reporting",
      ],
      dataPrivacy: [
        "Transparent and accessible privacy policy",
        "Explicit consent for data collection",
        "Location used only with your permission",
        "Data encrypted in transit and at rest",
        "No data sharing with third parties without consent",
      ],
    },
  },
  android: {
    fr: {
      accountManagement: [
        "Suppression de compte disponible dans les paramètres",
        "Les données sont supprimées conformément au RGPD (90 jours max)",
        "Possibilité de télécharger toutes vos données personnelles",
        "Les abonnements doivent être annulés via Google Play Store",
        "Processus de suppression simple et clairement documenté",
      ],
      childSafety: [
        "Interdiction stricte du contenu CSAM (Child Safety Standards)",
        "Signalement obligatoire au NCMEC en cas de contenu illégal détecté",
        "Mécanisme de feedback intégré pour signaler les violations",
        "Conformité avec les lois sur la protection des mineurs",
        "Point de contact dédié pour les signalements de sécurité enfants",
      ],
      contentPolicy: [
        "Interdiction des services de 'sugar dating' ou compensés",
        "Aucune nudité sexuelle ou poses suggestives autorisées",
        "Modération proactive par IA des contenus téléchargés",
        "Standards de contenu publiés dans nos conditions d'utilisation",
        "Action rapide contre les violateurs (suspension/bannissement)",
      ],
      userProtection: [
        "Mécanisme de blocage et signalement facile d'accès",
        "Équipe de modération dédiée pour les signalements",
        "Retrait de contenu problématique sous 24h",
        "Protection contre les arnaques et profils frauduleux",
        "Vérification des profils pour une communauté authentique",
      ],
    },
    en: {
      accountManagement: [
        "Account deletion available in settings",
        "Data deleted in accordance with GDPR (90 days max)",
        "Option to download all your personal data",
        "Subscriptions must be cancelled via Google Play Store",
        "Simple and clearly documented deletion process",
      ],
      childSafety: [
        "Strict prohibition of CSAM content (Child Safety Standards)",
        "Mandatory reporting to NCMEC if illegal content detected",
        "Integrated feedback mechanism to report violations",
        "Compliance with child protection laws",
        "Dedicated contact point for child safety reports",
      ],
      contentPolicy: [
        "Prohibition of 'sugar dating' or compensated services",
        "No sexual nudity or suggestive poses allowed",
        "Proactive AI moderation of uploaded content",
        "Content standards published in our terms of service",
        "Swift action against violators (suspension/ban)",
      ],
      userProtection: [
        "Easy-access blocking and reporting mechanism",
        "Dedicated moderation team for reports",
        "Problematic content removal within 24h",
        "Protection against scams and fraudulent profiles",
        "Profile verification for an authentic community",
      ],
    },
  },
};

// Community Guidelines for Dating Apps
const communityGuidelines = {
  fr: {
    title: "Règles de la communauté",
    description: "Pour garantir un environnement sûr et respectueux pour tous nos utilisateurs.",
    rules: [
      {
        title: "Respect mutuel",
        description: "Traitez tous les utilisateurs avec respect et dignité. Le harcèlement, les insultes et les comportements intimidants sont strictement interdits.",
        icon: "🤝",
      },
      {
        title: "Authenticité",
        description: "Utilisez uniquement vos propres photos récentes. Les faux profils et l'usurpation d'identité entraînent un bannissement immédiat.",
        icon: "✅",
      },
      {
        title: "Contenu approprié",
        description: "Aucun contenu sexuellement explicite, nudité, ou matériel illégal. Cela inclut les photos et les messages.",
        icon: "🚫",
      },
      {
        title: "Sécurité",
        description: "Ne partagez jamais d'informations financières. Signalez immédiatement tout comportement suspect ou demande d'argent.",
        icon: "🛡️",
      },
      {
        title: "Âge minimum",
        description: "Vous devez avoir au moins 18 ans pour utiliser Zembo. La vérification de l'âge est obligatoire.",
        icon: "🔞",
      },
      {
        title: "Signalement",
        description: "Signalez tout comportement inapproprié. Nos équipes examinent chaque signalement dans les 24 heures.",
        icon: "🚨",
      },
    ],
    consequences: [
      "Premier avertissement : Rappel des règles",
      "Deuxième avertissement : Suspension temporaire (7 jours)",
      "Troisième violation : Bannissement permanent",
      "Contenu illégal : Bannissement immédiat et signalement aux autorités",
    ],
  },
  en: {
    title: "Community Guidelines",
    description: "To ensure a safe and respectful environment for all our users.",
    rules: [
      {
        title: "Mutual Respect",
        description: "Treat all users with respect and dignity. Harassment, insults, and intimidating behavior are strictly prohibited.",
        icon: "🤝",
      },
      {
        title: "Authenticity",
        description: "Use only your own recent photos. Fake profiles and identity theft result in immediate ban.",
        icon: "✅",
      },
      {
        title: "Appropriate Content",
        description: "No sexually explicit content, nudity, or illegal material. This includes photos and messages.",
        icon: "🚫",
      },
      {
        title: "Safety",
        description: "Never share financial information. Immediately report any suspicious behavior or money requests.",
        icon: "🛡️",
      },
      {
        title: "Minimum Age",
        description: "You must be at least 18 years old to use Zembo. Age verification is mandatory.",
        icon: "🔞",
      },
      {
        title: "Reporting",
        description: "Report any inappropriate behavior. Our teams review each report within 24 hours.",
        icon: "🚨",
      },
    ],
    consequences: [
      "First warning: Reminder of rules",
      "Second warning: Temporary suspension (7 days)",
      "Third violation: Permanent ban",
      "Illegal content: Immediate ban and report to authorities",
    ],
  },
};

// Safety Tips for Dating Apps
const safetyTips = {
  fr: {
    title: "Conseils de sécurité",
    tips: [
      {
        title: "Restez sur l'application",
        description: "Gardez vos conversations sur Zembo jusqu'à ce que vous fassiez confiance à la personne.",
      },
      {
        title: "Premier rendez-vous public",
        description: "Rencontrez toujours dans un lieu public et fréquenté pour votre premier rendez-vous.",
      },
      {
        title: "Informez un proche",
        description: "Prévenez quelqu'un de confiance de l'heure et du lieu de votre rendez-vous.",
      },
      {
        title: "Vérifiez le profil",
        description: "Recherchez les profils vérifiés et les photos authentiques.",
      },
      {
        title: "Faites confiance à votre instinct",
        description: "Si quelque chose vous semble suspect, n'hésitez pas à bloquer et signaler.",
      },
      {
        title: "Ne partagez jamais vos informations financières",
        description: "N'envoyez jamais d'argent à quelqu'un que vous n'avez pas rencontré en personne.",
      },
    ],
  },
  en: {
    title: "Safety Tips",
    tips: [
      {
        title: "Stay on the app",
        description: "Keep your conversations on Zembo until you trust the person.",
      },
      {
        title: "Meet in public",
        description: "Always meet in a public, busy place for your first date.",
      },
      {
        title: "Tell someone",
        description: "Let a trusted person know the time and place of your date.",
      },
      {
        title: "Verify the profile",
        description: "Look for verified profiles and authentic photos.",
      },
      {
        title: "Trust your instincts",
        description: "If something feels off, don't hesitate to block and report.",
      },
      {
        title: "Never share financial information",
        description: "Never send money to someone you haven't met in person.",
      },
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

            {/* Community Guidelines Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Users className="w-4 h-4" />
                {communityGuidelines[language].title}
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                {communityGuidelines[language].description}
              </p>
              
              <div className="space-y-3">
                {communityGuidelines[language].rules.map((rule, index) => (
                  <div key={index} className="flex gap-3 p-3 bg-muted/30 rounded-lg">
                    <span className="text-xl">{rule.icon}</span>
                    <div>
                      <p className="font-medium text-sm text-foreground">{rule.title}</p>
                      <p className="text-xs text-muted-foreground">{rule.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
                <h4 className="font-semibold text-sm text-destructive flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4" />
                  {t.consequences}
                </h4>
                <ul className="space-y-1">
                  {communityGuidelines[language].consequences.map((consequence, index) => (
                    <li key={index} className="text-xs text-muted-foreground flex items-start gap-2">
                      <span className="text-destructive">•</span>
                      <span>{consequence}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Safety Tips Section */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Heart className="w-4 h-4" />
                {safetyTips[language].title}
              </h3>
              
              <div className="space-y-3">
                {safetyTips[language].tips.map((tip, index) => (
                  <div key={index} className="flex gap-3 items-start">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{index + 1}</span>
                    </div>
                    <div>
                      <p className="font-medium text-sm text-foreground">{tip.title}</p>
                      <p className="text-xs text-muted-foreground">{tip.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* App Guidelines Section - iOS */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <span className="text-lg">🍎</span>
                {t.iosGuidelines}
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="ios-account" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      <span>{t.accountManagement}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.ios[language].accountManagement.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ios-moderation" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>{t.contentModeration}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.ios[language].contentModeration.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ios-safety" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>{t.userSafety}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.ios[language].userSafety.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="ios-privacy" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <span>{t.dataPrivacy}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.ios[language].dataPrivacy.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Lock className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </div>

            {/* App Guidelines Section - Android */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <span className="text-lg">🤖</span>
                {t.androidGuidelines}
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="android-account" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      <span>{t.accountManagement}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.android[language].accountManagement.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="android-child" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-primary" />
                      <span>{t.childSafety}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.android[language].childSafety.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="android-content" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Ban className="w-4 h-4 text-primary" />
                      <span>{t.contentPolicy}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.android[language].contentPolicy.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Ban className="w-3 h-3 text-orange-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="android-protection" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Flag className="w-4 h-4 text-primary" />
                      <span>{t.userProtection}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {appGuidelines.android[language].userProtection.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <UserX className="w-3 h-3 text-purple-500 shrink-0 mt-0.5" />
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
