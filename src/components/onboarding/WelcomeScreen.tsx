import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import ZemboLogo from "@/components/ZemboLogo";
import welcomeBg from "@/assets/welcome-bg.jpg";

interface WelcomeScreenProps {
  onSignUp: () => void;
  onLogin: () => void;
}

// Terms content (same as /terms page)
const TermsContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground">
    <section>
      <h3 className="font-semibold text-foreground mb-2">1. Acceptation des conditions</h3>
      <p>En utilisant l'application Zembo, vous acceptez d'être lié par ces conditions d'utilisation. Si vous n'acceptez pas ces conditions, veuillez ne pas utiliser l'application.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">2. Éligibilité</h3>
      <p>Vous devez avoir au moins 18 ans pour utiliser Zembo. En créant un compte, vous confirmez que vous avez l'âge légal requis.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">3. Conduite de l'utilisateur</h3>
      <p>Vous vous engagez à utiliser Zembo de manière responsable et respectueuse. Tout comportement abusif, harcèlement ou contenu inapproprié entraînera la suspension de votre compte.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">4. Contenu interdit</h3>
      <ul className="list-disc list-inside space-y-1 ml-2">
        <li>Contenu sexuellement explicite ou pornographique</li>
        <li>Discours haineux ou discriminatoire</li>
        <li>Harcèlement ou intimidation</li>
        <li>Fraude ou usurpation d'identité</li>
        <li>Spam ou sollicitation commerciale</li>
      </ul>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">5. Suspension et résiliation</h3>
      <p>Nous nous réservons le droit de suspendre ou résilier votre compte à tout moment en cas de violation de ces conditions.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">6. Limitation de responsabilité</h3>
      <p>Zembo n'est pas responsable des interactions entre utilisateurs. Utilisez l'application à vos propres risques et faites preuve de prudence lors de vos rencontres.</p>
    </section>
  </div>
);

// Privacy content (same as /privacy page)
const PrivacyContent = () => (
  <div className="space-y-6 text-sm text-muted-foreground">
    <section>
      <h3 className="font-semibold text-foreground mb-2">1. Données collectées</h3>
      <p>Nous collectons les informations que vous fournissez lors de l'inscription : nom, email, photos, préférences de rencontre, et données de localisation (si autorisée).</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">2. Utilisation des données</h3>
      <p>Vos données sont utilisées pour : personnaliser votre expérience, vous suggérer des correspondances, améliorer nos services, et assurer la sécurité de la plateforme.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">3. Partage des données</h3>
      <p>Nous ne vendons jamais vos données personnelles. Elles peuvent être partagées avec des prestataires de services essentiels (hébergement, analyse) sous stricte confidentialité.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">4. Sécurité</h3>
      <p>Nous utilisons des mesures de sécurité avancées pour protéger vos données : chiffrement, authentification sécurisée, et surveillance continue.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">5. Conservation des données</h3>
      <p>Vos données sont conservées pendant la durée de votre compte actif. Après suppression, elles sont effacées sous 90 jours conformément à notre politique de rétention.</p>
    </section>
    <section>
      <h3 className="font-semibold text-foreground mb-2">6. Vos droits (RGPD)</h3>
      <p>Vous avez le droit d'accéder, modifier, exporter ou supprimer vos données personnelles à tout moment depuis les paramètres de votre compte.</p>
    </section>
  </div>
);

const WelcomeScreen = ({ onSignUp, onLogin }: WelcomeScreenProps) => {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden">
      {/* Background Image with gradient overlay */}
      <div className="absolute inset-0">
        <img
          src={welcomeBg}
          alt="Couple romantique"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full px-6 pt-[calc(env(safe-area-inset-top)+48px)] pb-[calc(env(safe-area-inset-bottom)+32px)] overflow-hidden">
        {/* Logo at top */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex justify-center pt-8"
        >
          <ZemboLogo size="lg" />
        </motion.div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom content */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="space-y-6 pb-8"
        >
          <div className="text-center space-y-3">
            <h1 className="text-3xl font-bold text-foreground">
              Trouvez l'amour
            </h1>
            <p className="text-muted-foreground text-base max-w-xs mx-auto">
              Rejoignez des milliers de célibataires et trouvez votre âme sœur
            </p>
          </div>

          {/* Checkbox for terms acceptance */}
          <div className="flex items-start gap-3 px-2">
            <Checkbox
              id="terms-acceptance"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
              className="mt-0.5 border-muted-foreground data-[state=checked]:bg-primary data-[state=checked]:border-primary"
            />
            <label 
              htmlFor="terms-acceptance" 
              className="text-xs text-muted-foreground cursor-pointer leading-relaxed"
            >
              J'accepte les{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowTerms(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Conditions d'utilisation
              </button>{" "}
              et la{" "}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  setShowPrivacy(true);
                }}
                className="text-primary hover:underline font-medium"
              >
                Politique de confidentialité
              </button>
            </label>
          </div>

          <div className="space-y-3">
            <Button
              onClick={onSignUp}
              disabled={!termsAccepted}
              className="w-full h-14 btn-gold rounded-2xl text-base font-semibold flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Créer un compte
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button
              onClick={onLogin}
              disabled={!termsAccepted}
              variant="outline"
              className="w-full h-14 glass border-0 rounded-2xl text-base font-medium text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Se connecter
            </Button>
          </div>

          {!termsAccepted && (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs text-center text-muted-foreground/70"
            >
              Veuillez accepter les conditions pour continuer
            </motion.p>
          )}
        </motion.div>
      </div>

      {/* Terms Dialog */}
      <Dialog open={showTerms} onOpenChange={setShowTerms}>
        <DialogContent className="max-w-lg max-h-[80vh] p-0 bg-background border-border">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold">Conditions d'utilisation</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] px-6 pb-6">
            <TermsContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Privacy Dialog */}
      <Dialog open={showPrivacy} onOpenChange={setShowPrivacy}>
        <DialogContent className="max-w-lg max-h-[80vh] p-0 bg-background border-border">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold">Politique de confidentialité</DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh] px-6 pb-6">
            <PrivacyContent />
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WelcomeScreen;
