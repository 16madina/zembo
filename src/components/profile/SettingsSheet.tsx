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
  Download,
  X,
  Check,
  Info,
  Smartphone,
  Users,
  Heart,
  Eye,
  EyeOff,
  Ban,
  Flag,
  ShieldCheck,
  ShieldAlert,
  Baby,
  UserX,
  MapPin,
  MessageCircle,
} from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
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
import { useLanguage, Language } from "@/contexts/LanguageContext";
import { toast } from "sonner";

type Theme = "dark" | "light" | "system";
type ProfileVisibility = "all" | "matches" | "invisible";
type ContactPermission = "anyone" | "matches" | "verified";
type GeoBlocking = "none" | "country" | "nearby";

interface SettingsSheetProps {
  children?: React.ReactNode;
}

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

// Unified Store Guidelines (merged iOS + Android)
const storeGuidelines = {
  fr: {
    accountManagement: [
      "Suppression de compte accessible directement dans l'application",
      "Toutes vos données personnelles supprimées sous 90 jours",
      "Export de vos données personnelles disponible (RGPD)",
      "Les abonnements doivent être annulés via les stores",
    ],
    contentModeration: [
      "Système de modération actif 24h/24",
      "Filtrage automatique des contenus explicites",
      "Signalement des utilisateurs traité sous 24h",
      "Blocage immédiat des utilisateurs indésirables",
      "Interdiction stricte des contenus inappropriés",
    ],
    userSafety: [
      "Vérification de l'âge obligatoire (18+ ans)",
      "Protection contre le harcèlement",
      "Politique de tolérance zéro pour les discours haineux",
      "Photos modérées pour prévenir le contenu inapproprié",
    ],
    childSafety: [
      "Interdiction stricte du contenu CSAM",
      "Signalement obligatoire aux autorités compétentes",
      "Conformité avec les lois sur la protection des mineurs",
    ],
    dataPrivacy: [
      "Politique de confidentialité transparente",
      "Consentement explicite pour la collecte de données",
      "Données chiffrées en transit et au repos",
      "Aucun partage sans consentement",
    ],
  },
  en: {
    accountManagement: [
      "Account deletion accessible directly in the app",
      "All personal data deleted within 90 days",
      "Personal data export available (GDPR)",
      "Subscriptions must be cancelled via stores",
    ],
    contentModeration: [
      "24/7 active content moderation system",
      "Automatic filtering of explicit content",
      "User reports processed within 24 hours",
      "Immediate blocking of unwanted users",
      "Strict prohibition of inappropriate content",
    ],
    userSafety: [
      "Mandatory age verification (18+ years)",
      "Protection against harassment",
      "Zero tolerance policy for hate speech",
      "Photos moderated to prevent inappropriate content",
    ],
    childSafety: [
      "Strict prohibition of CSAM content",
      "Mandatory reporting to competent authorities",
      "Compliance with child protection laws",
    ],
    dataPrivacy: [
      "Transparent privacy policy",
      "Explicit consent for data collection",
      "Data encrypted in transit and at rest",
      "No sharing without consent",
    ],
  },
};

// Privacy Policy Content
const privacyPolicyContent = {
  fr: {
    title: "Politique de confidentialité",
    lastUpdated: "Dernière mise à jour : Janvier 2026",
    sections: [
      {
        title: "1. Collecte des données",
        content: "Nous collectons les informations que vous nous fournissez directement : nom, email, date de naissance, photos de profil, localisation, préférences de rencontre et centres d'intérêt. Ces données sont nécessaires au fonctionnement du service de mise en relation.",
      },
      {
        title: "2. Utilisation des données",
        content: "Vos données sont utilisées pour : créer et gérer votre profil, vous proposer des correspondances pertinentes, améliorer nos services, assurer la sécurité de la plateforme, et vous envoyer des communications importantes.",
      },
      {
        title: "3. Partage des données",
        content: "Nous ne vendons jamais vos données personnelles. Vos informations peuvent être partagées avec d'autres utilisateurs selon vos paramètres de confidentialité, et avec nos prestataires de services sous contrat de confidentialité.",
      },
      {
        title: "4. Sécurité",
        content: "Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger vos données : chiffrement SSL/TLS, stockage sécurisé, contrôles d'accès stricts, et surveillance continue.",
      },
      {
        title: "5. Conservation",
        content: "Vos données sont conservées tant que votre compte est actif. Après suppression du compte, vos données sont effacées sous 90 jours, sauf obligation légale de conservation.",
      },
      {
        title: "6. Vos droits",
        content: "Conformément au RGPD, vous avez le droit d'accéder, rectifier, supprimer, exporter vos données, et de vous opposer à leur traitement. Exercez ces droits via les paramètres de l'app ou contactez-nous.",
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    lastUpdated: "Last updated: January 2026",
    sections: [
      {
        title: "1. Data Collection",
        content: "We collect information you provide directly: name, email, date of birth, profile photos, location, dating preferences and interests. This data is necessary for the matchmaking service to function.",
      },
      {
        title: "2. Data Usage",
        content: "Your data is used to: create and manage your profile, suggest relevant matches, improve our services, ensure platform security, and send you important communications.",
      },
      {
        title: "3. Data Sharing",
        content: "We never sell your personal data. Your information may be shared with other users according to your privacy settings, and with our service providers under confidentiality agreements.",
      },
      {
        title: "4. Security",
        content: "We use technical and organizational security measures to protect your data: SSL/TLS encryption, secure storage, strict access controls, and continuous monitoring.",
      },
      {
        title: "5. Retention",
        content: "Your data is kept as long as your account is active. After account deletion, your data is erased within 90 days, unless legally required to retain it.",
      },
      {
        title: "6. Your Rights",
        content: "Under GDPR, you have the right to access, rectify, delete, export your data, and object to its processing. Exercise these rights via app settings or contact us.",
      },
    ],
  },
};

// Terms of Service Content
const termsOfServiceContent = {
  fr: {
    title: "Conditions d'utilisation",
    lastUpdated: "Dernière mise à jour : Janvier 2026",
    sections: [
      {
        title: "1. Acceptation",
        content: "En utilisant Zembo, vous acceptez ces conditions d'utilisation. Si vous n'êtes pas d'accord, veuillez ne pas utiliser l'application.",
      },
      {
        title: "2. Éligibilité",
        content: "Vous devez avoir au moins 18 ans pour utiliser Zembo. En créant un compte, vous confirmez avoir l'âge légal et fournir des informations exactes.",
      },
      {
        title: "3. Conduite des utilisateurs",
        content: "Vous vous engagez à : utiliser uniquement vos propres photos, ne pas harceler d'autres utilisateurs, ne pas publier de contenu illégal ou offensant, signaler tout comportement inapproprié.",
      },
      {
        title: "4. Contenu interdit",
        content: "Sont strictement interdits : nudité ou contenu sexuellement explicite, discours haineux, spam, arnaques, sollicitation commerciale, contenu impliquant des mineurs.",
      },
      {
        title: "5. Suspension et résiliation",
        content: "Nous nous réservons le droit de suspendre ou supprimer tout compte violant ces conditions, sans préavis ni remboursement.",
      },
      {
        title: "6. Limitation de responsabilité",
        content: "Zembo n'est pas responsable des interactions entre utilisateurs. Faites preuve de prudence lors de vos rencontres et signalez tout comportement suspect.",
      },
    ],
  },
  en: {
    title: "Terms of Service",
    lastUpdated: "Last updated: January 2026",
    sections: [
      {
        title: "1. Acceptance",
        content: "By using Zembo, you agree to these terms of service. If you disagree, please do not use the application.",
      },
      {
        title: "2. Eligibility",
        content: "You must be at least 18 years old to use Zembo. By creating an account, you confirm you are of legal age and provide accurate information.",
      },
      {
        title: "3. User Conduct",
        content: "You agree to: use only your own photos, not harass other users, not post illegal or offensive content, report any inappropriate behavior.",
      },
      {
        title: "4. Prohibited Content",
        content: "Strictly prohibited: nudity or sexually explicit content, hate speech, spam, scams, commercial solicitation, content involving minors.",
      },
      {
        title: "5. Suspension and Termination",
        content: "We reserve the right to suspend or delete any account violating these terms, without notice or refund.",
      },
      {
        title: "6. Limitation of Liability",
        content: "Zembo is not responsible for interactions between users. Exercise caution when meeting and report any suspicious behavior.",
      },
    ],
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
  const { language, setLanguage, t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  const [theme, setTheme] = useState<Theme>("dark");
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showTermsOfService, setShowTermsOfService] = useState(false);
  
  // Advanced Privacy Settings
  const [profileVisibility, setProfileVisibility] = useState<ProfileVisibility>("all");
  const [contactPermission, setContactPermission] = useState<ContactPermission>("anyone");
  const [geoBlocking, setGeoBlocking] = useState<GeoBlocking>("none");

  const dataInfo = dataCollectionInfo[language];

  useEffect(() => {
    // Load saved preferences from localStorage
    const savedTheme = localStorage.getItem("zembo-theme") as Theme;
    const savedPush = localStorage.getItem("zembo-push");
    const savedVisibility = localStorage.getItem("zembo-profile-visibility") as ProfileVisibility;
    const savedContact = localStorage.getItem("zembo-contact-permission") as ContactPermission;
    const savedGeo = localStorage.getItem("zembo-geo-blocking") as GeoBlocking;

    if (savedTheme) setTheme(savedTheme);
    if (savedPush) setPushEnabled(savedPush === "true");
    if (savedVisibility) setProfileVisibility(savedVisibility);
    if (savedContact) setContactPermission(savedContact);
    if (savedGeo) setGeoBlocking(savedGeo);
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
    toast.success(language === "fr" ? "Settings saved" : "Paramètres sauvegardés");
  };

  const handleVisibilityChange = (value: ProfileVisibility) => {
    setProfileVisibility(value);
    localStorage.setItem("zembo-profile-visibility", value);
    toast.success(t.privacySettingsSaved);
  };

  const handleContactPermissionChange = (value: ContactPermission) => {
    setContactPermission(value);
    localStorage.setItem("zembo-contact-permission", value);
    toast.success(t.privacySettingsSaved);
  };

  const handleGeoBlockingChange = (value: GeoBlocking) => {
    setGeoBlocking(value);
    localStorage.setItem("zembo-geo-blocking", value);
    toast.success(t.privacySettingsSaved);
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

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      
      if (!token) {
        toast.error(t.exportError);
        return;
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/export-user-data`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Export failed");
      }

      const data = await response.json();
      
      // Create and download the file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `zembo-data-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t.exportSuccess);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(t.exportError);
    } finally {
      setIsExporting(false);
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
              
              {/* Privacy Policy - Opens Popup */}
              <button
                onClick={() => setShowPrivacyPolicy(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{t.privacyPolicy}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              
              {/* Terms of Service - Opens Popup */}
              <button
                onClick={() => setShowTermsOfService(true)}
                className="w-full flex items-center justify-between py-3 hover:bg-muted/30 rounded-lg px-2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Lock className="w-5 h-5 text-primary" />
                  <span className="text-sm font-medium">{t.termsOfService}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </button>
              
              <Accordion type="single" collapsible className="w-full">

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

            {/* Advanced Privacy Settings */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-4 flex items-center gap-2">
                <EyeOff className="w-4 h-4" />
                {t.advancedPrivacy}
              </h3>
              
              {/* Profile Visibility */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{t.profileVisibility}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t.profileVisibilityDescription}</p>
                <RadioGroup 
                  value={profileVisibility} 
                  onValueChange={(v) => handleVisibilityChange(v as ProfileVisibility)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="all" id="vis-all" />
                    <Label htmlFor="vis-all" className="text-sm cursor-pointer flex-1">{t.visibleToAll}</Label>
                    <Eye className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="matches" id="vis-matches" />
                    <Label htmlFor="vis-matches" className="text-sm cursor-pointer flex-1">{t.visibleToMatches}</Label>
                    <Heart className="w-4 h-4 text-pink-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="invisible" id="vis-invisible" />
                    <Label htmlFor="vis-invisible" className="text-sm cursor-pointer flex-1">{t.invisible}</Label>
                    <EyeOff className="w-4 h-4 text-muted-foreground" />
                  </div>
                </RadioGroup>
              </div>

              <Separator className="my-4" />

              {/* Who Can Contact Me */}
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-2">
                  <MessageCircle className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{t.whoCanContact}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t.whoCanContactDescription}</p>
                <RadioGroup 
                  value={contactPermission} 
                  onValueChange={(v) => handleContactPermissionChange(v as ContactPermission)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="anyone" id="contact-anyone" />
                    <Label htmlFor="contact-anyone" className="text-sm cursor-pointer flex-1">{t.anyoneCanContact}</Label>
                    <Users className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="matches" id="contact-matches" />
                    <Label htmlFor="contact-matches" className="text-sm cursor-pointer flex-1">{t.matchesOnly}</Label>
                    <Heart className="w-4 h-4 text-pink-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="verified" id="contact-verified" />
                    <Label htmlFor="contact-verified" className="text-sm cursor-pointer flex-1">{t.verifiedOnly}</Label>
                    <ShieldCheck className="w-4 h-4 text-green-500" />
                  </div>
                </RadioGroup>
              </div>

              <Separator className="my-4" />

              {/* Geographic Blocking */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <p className="text-sm font-medium text-foreground">{t.geographicBlocking}</p>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t.geographicBlockingDescription}</p>
                <RadioGroup 
                  value={geoBlocking} 
                  onValueChange={(v) => handleGeoBlockingChange(v as GeoBlocking)}
                  className="space-y-2"
                >
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="none" id="geo-none" />
                    <Label htmlFor="geo-none" className="text-sm cursor-pointer flex-1">{t.noBlocking}</Label>
                    <Globe className="w-4 h-4 text-blue-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="country" id="geo-country" />
                    <Label htmlFor="geo-country" className="text-sm cursor-pointer flex-1">{t.blockMyCountry}</Label>
                    <Ban className="w-4 h-4 text-amber-500" />
                  </div>
                  <div className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/30 transition-colors">
                    <RadioGroupItem value="nearby" id="geo-nearby" />
                    <Label htmlFor="geo-nearby" className="text-sm cursor-pointer flex-1">{t.blockNearby}</Label>
                    <MapPin className="w-4 h-4 text-red-500" />
                  </div>
                </RadioGroup>
              </div>
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

            {/* Export Data Section (GDPR) */}
            <div className="glass-strong rounded-2xl p-4">
              <SettingRow
                icon={<Download className="w-5 h-5" />}
                label={t.exportData}
                description={t.exportDataDescription}
                action={
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportData}
                    disabled={isExporting}
                    className="flex items-center gap-2"
                  >
                    {isExporting ? (
                      <>
                        <span className="animate-spin">⏳</span>
                        {t.exporting}
                      </>
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        {language === "fr" ? "Télécharger" : "Download"}
                      </>
                    )}
                  </Button>
                }
              />
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

            {/* Store Guidelines Section - Unified */}
            <div className="glass-strong rounded-2xl p-4">
              <h3 className="text-sm font-semibold text-primary mb-2 flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                {t.storeGuidelines}
              </h3>
              
              <Accordion type="single" collapsible className="w-full">
                <AccordionItem value="account" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Settings className="w-4 h-4 text-primary" />
                      <span>{t.accountManagement}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {storeGuidelines[language].accountManagement.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="moderation" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      <span>{t.contentModeration}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {storeGuidelines[language].contentModeration.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3 h-3 text-green-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="safety" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-primary" />
                      <span>{t.userSafety}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {storeGuidelines[language].userSafety.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldAlert className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="child-safety" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Baby className="w-4 h-4 text-primary" />
                      <span>{t.childSafety}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {storeGuidelines[language].childSafety.map((item, index) => (
                        <li key={index} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <ShieldCheck className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </AccordionContent>
                </AccordionItem>

                <AccordionItem value="privacy" className="border-none">
                  <AccordionTrigger className="py-2 hover:no-underline text-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      <span>{t.dataPrivacy}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-4">
                    <ul className="space-y-2">
                      {storeGuidelines[language].dataPrivacy.map((item, index) => (
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

      {/* Privacy Policy Popup */}
      <AlertDialog open={showPrivacyPolicy} onOpenChange={setShowPrivacyPolicy}>
        <AlertDialogContent className="bg-background max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              {privacyPolicyContent[language].title}
            </AlertDialogTitle>
            <p className="text-xs text-muted-foreground">{privacyPolicyContent[language].lastUpdated}</p>
          </AlertDialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 space-y-4">
            {privacyPolicyContent[language].sections.map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold text-sm text-foreground mb-1">{section.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setShowPrivacyPolicy(false)}>
              {language === "fr" ? "Fermer" : "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Terms of Service Popup */}
      <AlertDialog open={showTermsOfService} onOpenChange={setShowTermsOfService}>
        <AlertDialogContent className="bg-background max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-primary" />
              {termsOfServiceContent[language].title}
            </AlertDialogTitle>
            <p className="text-xs text-muted-foreground">{termsOfServiceContent[language].lastUpdated}</p>
          </AlertDialogHeader>
          <div className="overflow-y-auto flex-1 pr-2 space-y-4">
            {termsOfServiceContent[language].sections.map((section, index) => (
              <div key={index}>
                <h4 className="font-semibold text-sm text-foreground mb-1">{section.title}</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">{section.content}</p>
              </div>
            ))}
          </div>
          <AlertDialogFooter className="mt-4">
            <AlertDialogAction onClick={() => setShowTermsOfService(false)}>
              {language === "fr" ? "Fermer" : "Close"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default SettingsSheet;
