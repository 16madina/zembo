import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Database, Lock, Clock, UserCheck, Share2, Brain, Server, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const privacyContent = {
  fr: {
    title: "Politique de confidentialité",
    subtitle: "Comment nous protégeons vos données personnelles",
    lastUpdated: "Dernière mise à jour : Février 2026",
    sections: [
      {
        icon: Database,
        title: "1. Collecte des données",
        content: "Nous collectons les informations que vous nous fournissez directement : nom, email, date de naissance, photos de profil, localisation, préférences de rencontre et centres d'intérêt. Ces données sont nécessaires au fonctionnement du service de mise en relation.",
      },
      {
        icon: UserCheck,
        title: "2. Utilisation des données",
        content: "Vos données sont utilisées pour : créer et gérer votre profil, vous proposer des correspondances pertinentes, améliorer nos services, assurer la sécurité de la plateforme, et vous envoyer des communications importantes.",
      },
      {
        icon: Brain,
        title: "3. Fonctionnalités IA et partage de données",
        content: "Pour les fonctionnalités IA (Test de Compatibilité, Zembo Oracle, Flash Connect), nous partageons certaines données avec des fournisseurs d'intelligence artificielle tiers. Avant d'utiliser ces fonctionnalités, vous devez donner votre consentement explicite via un modal dédié qui détaille précisément les données partagées.",
      },
      {
        icon: AlertCircle,
        title: "3.1 Données partagées avec l'IA",
        content: "Les données partagées avec les fournisseurs IA incluent : votre prénom, votre âge, vos centres d'intérêt, vos préférences de rencontre, et vos réponses aux questionnaires de compatibilité. Vos photos ne sont PAS envoyées aux services IA sauf mention explicite. Ces données sont utilisées uniquement pour générer des analyses de compatibilité et des recommandations personnalisées.",
      },
      {
        icon: Server,
        title: "3.2 Fournisseurs IA et sécurité",
        content: "Nos fournisseurs IA sont : Google LLC (via l'API Google Gemini, basé aux États-Unis) et OpenAI Inc. (via l'API GPT, basé aux États-Unis). Ces entreprises respectent les standards SOC 2 et ISO 27001. Les données sont chiffrées en transit (TLS 1.3) et ne sont pas conservées de manière permanente par ces fournisseurs après le traitement de votre requête.",
      },
      {
        icon: Server,
        title: "4. Autres fournisseurs de services",
        content: "Nous utilisons les services suivants pour faire fonctionner l'application : Google Gemini (intelligence artificielle pour l'analyse de compatibilité), OpenAI GPT (intelligence artificielle pour les prédictions et recommandations), Supabase (hébergement de base de données sécurisé), LiveKit (appels audio/vidéo en temps réel), Stripe (traitement des paiements). Tous nos partenaires sont conformes au RGPD et s'engagent contractuellement à protéger vos données selon les mêmes standards que nous.",
      },
      {
        icon: Share2,
        title: "5. Partage des données",
        content: "Nous ne vendons jamais vos données personnelles. Vos informations peuvent être partagées avec d'autres utilisateurs selon vos paramètres de confidentialité, et avec nos prestataires de services sous contrat de confidentialité.",
      },
      {
        icon: Lock,
        title: "6. Sécurité",
        content: "Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger vos données : chiffrement SSL/TLS, stockage sécurisé, contrôles d'accès stricts, et surveillance continue.",
      },
      {
        icon: Clock,
        title: "7. Conservation",
        content: "Vos données sont conservées tant que votre compte est actif. Après suppression du compte, vos données sont effacées sous 90 jours, sauf obligation légale de conservation.",
      },
      {
        icon: Shield,
        title: "8. Vos droits (RGPD)",
        content: "Conformément au RGPD, vous avez le droit d'accéder, rectifier, supprimer, exporter vos données, et de vous opposer à leur traitement. Vous pouvez également révoquer votre consentement pour les fonctionnalités IA à tout moment depuis les paramètres de l'application.",
      },
    ],
    contact: "Pour toute question, contactez-nous à",
  },
  en: {
    title: "Privacy Policy",
    subtitle: "How we protect your personal data",
    lastUpdated: "Last updated: February 2026",
    sections: [
      {
        icon: Database,
        title: "1. Data Collection",
        content: "We collect information you provide directly: name, email, date of birth, profile photos, location, dating preferences and interests. This data is necessary for the matchmaking service to function.",
      },
      {
        icon: UserCheck,
        title: "2. Data Usage",
        content: "Your data is used to: create and manage your profile, suggest relevant matches, improve our services, ensure platform security, and send you important communications.",
      },
      {
        icon: Brain,
        title: "3. AI Features and Data Sharing",
        content: "For AI features (Compatibility Test, Zembo Oracle, Flash Connect), we share certain data with third-party artificial intelligence providers. Before using these features, you must give your explicit consent via a dedicated modal that details exactly what data is shared.",
      },
      {
        icon: AlertCircle,
        title: "3.1 Data Shared with AI",
        content: "Data shared with AI providers includes: your first name, age, interests, dating preferences, and your compatibility questionnaire answers. Your photos are NOT sent to AI services unless explicitly stated. This data is used solely to generate compatibility analyses and personalized recommendations.",
      },
      {
        icon: Server,
        title: "3.2 AI Providers and Security",
        content: "Our AI providers are: Google LLC (via Google Gemini API, based in the United States) and OpenAI Inc. (via GPT API, based in the United States). These companies comply with SOC 2 and ISO 27001 standards. Data is encrypted in transit (TLS 1.3) and is not permanently retained by these providers after processing your request.",
      },
      {
        icon: Server,
        title: "4. Other Service Providers",
        content: "We use the following services to operate the application: Google Gemini (artificial intelligence for compatibility analysis), OpenAI GPT (artificial intelligence for predictions and recommendations), Supabase (secure database hosting), LiveKit (real-time audio/video calls), Stripe (payment processing). All our partners are GDPR compliant and contractually committed to protecting your data to the same standards as we do.",
      },
      {
        icon: Share2,
        title: "5. Data Sharing",
        content: "We never sell your personal data. Your information may be shared with other users according to your privacy settings, and with our service providers under confidentiality agreements.",
      },
      {
        icon: Lock,
        title: "6. Security",
        content: "We use technical and organizational security measures to protect your data: SSL/TLS encryption, secure storage, strict access controls, and continuous monitoring.",
      },
      {
        icon: Clock,
        title: "7. Retention",
        content: "Your data is kept as long as your account is active. After account deletion, your data is erased within 90 days, unless legally required to retain it.",
      },
      {
        icon: Shield,
        title: "8. Your Rights (GDPR)",
        content: "Under GDPR, you have the right to access, rectify, delete, export your data, and object to its processing. You can also revoke your consent for AI features at any time from the app settings.",
      },
    ],
    contact: "For any questions, contact us at",
  },
};

const Privacy = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const content = privacyContent[language];

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto overscroll-contain scroll-smooth scrollbar-hide">
      <div className="container mx-auto px-4 py-8 pb-16 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t.back}
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            {content.title}
          </h1>
          <p className="text-muted-foreground">
            {content.subtitle}
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            {content.lastUpdated}
          </p>
        </div>

        <div className="space-y-6">
          {content.sections.map((section, index) => {
            const IconComponent = section.icon;
            return (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <IconComponent className="w-5 h-5 text-primary" />
                    {section.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground">
                  <p>{section.content}</p>
                </CardContent>
              </Card>
            );
          })}

          <div className="text-center text-sm text-muted-foreground pt-4 border-t border-border">
            <p>
              {content.contact}{" "}
              <a href="mailto:support@zembo.app" className="text-primary hover:underline">
                support@zembo.app
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Privacy;
