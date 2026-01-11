import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import ZemboLogo from "@/components/ZemboLogo";
import welcomeBg from "@/assets/welcome-bg.jpg";

interface WelcomeScreenProps {
  onSignUp: () => void;
  onLogin: () => void;
}

const WelcomeScreen = ({ onSignUp, onLogin }: WelcomeScreenProps) => {
  return (
    <div className="relative min-h-screen flex flex-col">
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
      <div className="relative z-10 flex flex-col h-full min-h-screen px-6 py-12">
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

          <div className="space-y-3">
            <Button
              onClick={onSignUp}
              className="w-full h-14 btn-gold rounded-2xl text-base font-semibold flex items-center justify-center gap-2"
            >
              Créer un compte
              <ArrowRight className="w-5 h-5" />
            </Button>

            <Button
              onClick={onLogin}
              variant="outline"
              className="w-full h-14 glass border-0 rounded-2xl text-base font-medium text-foreground"
            >
              Se connecter
            </Button>
          </div>

          <p className="text-xs text-center text-muted-foreground">
            En continuant, vous acceptez nos{" "}
            <span className="text-primary">Conditions d'utilisation</span> et notre{" "}
            <span className="text-primary">Politique de confidentialité</span>
          </p>
        </motion.div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
