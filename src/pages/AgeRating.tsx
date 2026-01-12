import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Shield, UserCheck, Ban, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const AgeRating = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Adéquation à l'âge
          </h1>
          <p className="text-muted-foreground">
            Informations sur la classification d'âge de Zembo
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Classification 18+
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Zembo est une application de rencontres exclusivement réservée aux personnes majeures (18 ans et plus).
              </p>
              <p>
                Cette restriction d'âge est imposée pour garantir un environnement sûr et approprié pour tous les utilisateurs.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-primary" />
                Vérification obligatoire
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Pour utiliser Zembo, chaque utilisateur doit :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Déclarer sa date de naissance lors de l'inscription</li>
                <li>Confirmer qu'il a 18 ans ou plus</li>
                <li>Soumettre une vérification d'identité (pièce d'identité + selfie)</li>
              </ul>
              <p>
                La vérification d'identité permet de s'assurer que l'utilisateur correspond à la photo de sa pièce d'identité et qu'il respecte l'âge minimum requis.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Ban className="w-5 h-5 text-destructive" />
                Contenus interdits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Les contenus suivants sont strictement interdits sur Zembo :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Contenu sexuellement explicite ou pornographique</li>
                <li>Nudité ou images suggestives</li>
                <li>Violence, harcèlement ou intimidation</li>
                <li>Discours haineux ou discriminatoire</li>
                <li>Contenu illégal ou frauduleux</li>
                <li>Spam ou publicité non sollicitée</li>
                <li>Usurpation d'identité</li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-warning" />
                Modération et signalement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-muted-foreground">
              <p>
                Zembo dispose d'un système de modération actif incluant :
              </p>
              <ul className="list-disc list-inside space-y-2 ml-2">
                <li>Vérification manuelle des identités par notre équipe</li>
                <li>Système de signalement accessible à tous les utilisateurs</li>
                <li>Examen des signalements par des modérateurs</li>
                <li>Sanctions (avertissement, suspension, bannissement)</li>
              </ul>
              <p>
                Tout utilisateur ne respectant pas nos règles peut être banni définitivement de la plateforme.
              </p>
            </CardContent>
          </Card>

          <div className="text-center text-sm text-muted-foreground pt-4 border-t">
            <p>Dernière mise à jour : Janvier 2026</p>
            <p className="mt-2">
              Pour toute question, contactez-nous à{" "}
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
