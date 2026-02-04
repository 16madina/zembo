import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Database, Lock, Clock, UserCheck, Share2, Brain, Server } from "lucide-react";
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
        content: "Pour les fonctionnalités IA (Compatibilité, Zembo Oracle), nous partageons certaines données avec nos fournisseurs IA (Lovable AI utilisant Google Gemini et OpenAI GPT). Les données partagées incluent : votre profil (nom, âge, intérêts), vos réponses au test de compatibilité, et vos préférences. Nous demandons votre consentement explicite avant tout partage. Ces données sont chiffrées en transit et ne sont pas stockées par les fournisseurs IA.",
      },
      {
        icon: Server,
        title: "4. Fournisseurs de services tiers",
        content: "Nous utilisons les services suivants : Lovable AI (intelligence artificielle pour les fonctionnalités de compatibilité et prédictions), Supabase (hébergement de données sécurisé), LiveKit (appels audio/vidéo), Stripe (paiements). Tous nos partenaires sont conformes au RGPD et protègent vos données selon les mêmes standards que nous.",
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
        content: "For AI features (Compatibility, Zembo Oracle), we share certain data with our AI providers (Lovable AI using Google Gemini and OpenAI GPT). Shared data includes: your profile (name, age, interests), your compatibility test answers, and your preferences. We ask for your explicit consent before any sharing. This data is encrypted in transit and is not stored by AI providers.",
      },
      {
        icon: Server,
        title: "4. Third-Party Service Providers",
        content: "We use the following services: Lovable AI (artificial intelligence for compatibility and prediction features), Supabase (secure data hosting), LiveKit (audio/video calls), Stripe (payments). All our partners are GDPR compliant and protect your data to the same standards as we do.",
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
