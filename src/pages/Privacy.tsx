import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, Database, Lock, Clock, UserCheck, Share2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const privacyContent = {
  fr: {
    title: "Politique de confidentialité",
    subtitle: "Comment nous protégeons vos données personnelles",
    lastUpdated: "Dernière mise à jour : Janvier 2026",
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
        icon: Share2,
        title: "3. Partage des données",
        content: "Nous ne vendons jamais vos données personnelles. Vos informations peuvent être partagées avec d'autres utilisateurs selon vos paramètres de confidentialité, et avec nos prestataires de services sous contrat de confidentialité.",
      },
      {
        icon: Lock,
        title: "4. Sécurité",
        content: "Nous utilisons des mesures de sécurité techniques et organisationnelles pour protéger vos données : chiffrement SSL/TLS, stockage sécurisé, contrôles d'accès stricts, et surveillance continue.",
      },
      {
        icon: Clock,
        title: "5. Conservation",
        content: "Vos données sont conservées tant que votre compte est actif. Après suppression du compte, vos données sont effacées sous 90 jours, sauf obligation légale de conservation.",
      },
      {
        icon: Shield,
        title: "6. Vos droits (RGPD)",
        content: "Conformément au RGPD, vous avez le droit d'accéder, rectifier, supprimer, exporter vos données, et de vous opposer à leur traitement. Exercez ces droits via les paramètres de l'app ou contactez-nous.",
      },
    ],
    contact: "Pour toute question, contactez-nous à",
  },
  en: {
    title: "Privacy Policy",
    subtitle: "How we protect your personal data",
    lastUpdated: "Last updated: January 2026",
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
        icon: Share2,
        title: "3. Data Sharing",
        content: "We never sell your personal data. Your information may be shared with other users according to your privacy settings, and with our service providers under confidentiality agreements.",
      },
      {
        icon: Lock,
        title: "4. Security",
        content: "We use technical and organizational security measures to protect your data: SSL/TLS encryption, secure storage, strict access controls, and continuous monitoring.",
      },
      {
        icon: Clock,
        title: "5. Retention",
        content: "Your data is kept as long as your account is active. After account deletion, your data is erased within 90 days, unless legally required to retain it.",
      },
      {
        icon: Shield,
        title: "6. Your Rights (GDPR)",
        content: "Under GDPR, you have the right to access, rectify, delete, export your data, and object to its processing. Exercise these rights via app settings or contact us.",
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
