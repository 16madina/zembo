import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, UserCheck, Ban, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const AgeRating = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
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
            {t.ageAdequacy}
          </h1>
          <p className="text-muted-foreground">
            {t.ageRatingInfo}
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                {t.classification18}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{t.classification18Desc1}</p>
              <p>{t.classification18Desc2}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                {t.mandatoryVerification}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{t.verificationRequirements}</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t.verificationReq1}</li>
                <li>{t.verificationReq2}</li>
                <li>{t.verificationReq3}</li>
              </ul>
              <p>{t.verificationExplanation}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                {t.prohibitedContent}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{t.prohibitedContentIntro}</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t.prohibitedContent1}</li>
                <li>{t.prohibitedContent2}</li>
                <li>{t.prohibitedContent3}</li>
                <li>{t.prohibitedContent4}</li>
                <li>{t.prohibitedContent5}</li>
                <li>{t.prohibitedContent6}</li>
                <li>{t.prohibitedContent7}</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                {t.moderationAndReporting}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>{t.moderationIntro}</p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>{t.moderation1}</li>
                <li>{t.moderation2}</li>
                <li>{t.moderation3}</li>
                <li>{t.moderation4}</li>
              </ul>
              <p>{t.moderationConclusion}</p>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>{t.lastUpdated}</p>
            <p className="mt-2">
              {t.contactUs}{" "}
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

export default AgeRating;
