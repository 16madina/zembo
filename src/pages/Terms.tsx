import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, UserCheck, Users, Ban, Gavel, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const termsContent = {
  fr: {
    title: "Conditions d'utilisation",
    subtitle: "Règles et conditions pour utiliser Zembo",
    lastUpdated: "Dernière mise à jour : Janvier 2026",
    sections: [
      {
        icon: FileText,
        title: "1. Acceptation",
        content: "En utilisant Zembo, vous acceptez ces conditions d'utilisation. Si vous n'êtes pas d'accord, veuillez ne pas utiliser l'application.",
      },
      {
        icon: UserCheck,
        title: "2. Éligibilité",
        content: "Vous devez avoir au moins 18 ans pour utiliser Zembo. En créant un compte, vous confirmez avoir l'âge légal et fournir des informations exactes.",
      },
      {
        icon: Users,
        title: "3. Conduite des utilisateurs",
        content: "Vous vous engagez à : utiliser uniquement vos propres photos, ne pas harceler d'autres utilisateurs, ne pas publier de contenu illégal ou offensant, signaler tout comportement inapproprié.",
      },
      {
        icon: Ban,
        title: "4. Contenu interdit",
        content: "Sont strictement interdits : nudité ou contenu sexuellement explicite, discours haineux, spam, arnaques, sollicitation commerciale, contenu impliquant des mineurs.",
      },
      {
        icon: Gavel,
        title: "5. Suspension et résiliation",
        content: "Nous nous réservons le droit de suspendre ou supprimer tout compte violant ces conditions, sans préavis ni remboursement.",
      },
      {
        icon: AlertTriangle,
        title: "6. Limitation de responsabilité",
        content: "Zembo n'est pas responsable des interactions entre utilisateurs. Faites preuve de prudence lors de vos rencontres et signalez tout comportement suspect.",
      },
    ],
    contact: "Pour toute question, contactez-nous à",
  },
  en: {
    title: "Terms of Service",
    subtitle: "Rules and conditions for using Zembo",
    lastUpdated: "Last updated: January 2026",
    sections: [
      {
        icon: FileText,
        title: "1. Acceptance",
        content: "By using Zembo, you agree to these terms of service. If you disagree, please do not use the application.",
      },
      {
        icon: UserCheck,
        title: "2. Eligibility",
        content: "You must be at least 18 years old to use Zembo. By creating an account, you confirm you are of legal age and provide accurate information.",
      },
      {
        icon: Users,
        title: "3. User Conduct",
        content: "You agree to: use only your own photos, not harass other users, not post illegal or offensive content, report any inappropriate behavior.",
      },
      {
        icon: Ban,
        title: "4. Prohibited Content",
        content: "Strictly prohibited: nudity or sexually explicit content, hate speech, spam, scams, commercial solicitation, content involving minors.",
      },
      {
        icon: Gavel,
        title: "5. Suspension and Termination",
        content: "We reserve the right to suspend or delete any account violating these terms, without notice or refund.",
      },
      {
        icon: AlertTriangle,
        title: "6. Limitation of Liability",
        content: "Zembo is not responsible for interactions between users. Exercise caution when meeting and report any suspicious behavior.",
      },
    ],
    contact: "For any questions, contact us at",
  },
};

const Terms = () => {
  const navigate = useNavigate();
  const { language, t } = useLanguage();
  const content = termsContent[language];

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

export default Terms;
