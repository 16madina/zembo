import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Sparkles, Heart, Star, MapPin, MessageCircle, Video, Coins } from "lucide-react";
import { useLocation } from "react-router-dom";

interface TutorialStep {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const tutorialsByPage: Record<string, { title: string; steps: TutorialStep[] }> = {
  "/": {
    title: "Découvrir des profils",
    steps: [
      {
        icon: <Heart className="w-5 h-5 text-primary" />,
        title: "Swipe à droite ou ❤️",
        description: "Pour liker un profil et montrer votre intérêt"
      },
      {
        icon: <X className="w-5 h-5 text-destructive" />,
        title: "Swipe à gauche ou ✕",
        description: "Pour passer au profil suivant"
      },
      {
        icon: <Star className="w-5 h-5 text-accent" fill="currentColor" />,
        title: "Swipe vers le haut ou ⭐",
        description: "Super Like pour vous démarquer (limité pour les utilisateurs gratuits)"
      },
      {
        icon: <Sparkles className="w-5 h-5 text-pink-500" />,
        title: "Envoyer une Rose 🌹",
        description: "Envoyez une rose avec un message personnalisé pour attirer l'attention"
      },
      {
        icon: <MapPin className="w-5 h-5 text-green-500" />,
        title: "À proximité",
        description: "Voir les profils sur une carte selon leur localisation"
      }
    ]
  },
  "/messages": {
    title: "Messagerie",
    steps: [
      {
        icon: <MessageCircle className="w-5 h-5 text-primary" />,
        title: "Vos conversations",
        description: "Discutez avec vos matchs et les personnes qui vous ont envoyé une rose"
      },
      {
        icon: <Heart className="w-5 h-5 text-pink-500" />,
        title: "Likes reçus",
        description: "Voyez qui vous a liké (fonctionnalité Premium)"
      },
      {
        icon: <Video className="w-5 h-5 text-accent" />,
        title: "Appel vidéo",
        description: "Lancez un appel vidéo avec votre match"
      }
    ]
  },
  "/random": {
    title: "Z Roulette",
    steps: [
      {
        icon: <Video className="w-5 h-5 text-primary" />,
        title: "Appel vidéo aléatoire",
        description: "Rencontrez de nouvelles personnes en appel vidéo de 30 secondes"
      },
      {
        icon: <Heart className="w-5 h-5 text-green-500" />,
        title: "Like mutuel",
        description: "Si vous vous likez mutuellement, l'appel continue !"
      },
      {
        icon: <X className="w-5 h-5 text-destructive" />,
        title: "Passer",
        description: "Passez au profil suivant si le courant ne passe pas"
      }
    ]
  },
  "/live": {
    title: "Lives",
    steps: [
      {
        icon: <Video className="w-5 h-5 text-primary" />,
        title: "Regarder des lives",
        description: "Regardez des diffusions en direct de la communauté"
      },
      {
        icon: <Sparkles className="w-5 h-5 text-accent" />,
        title: "Lancer votre live",
        description: "Créez votre propre diffusion et interagissez avec votre audience"
      },
      {
        icon: <Coins className="w-5 h-5 text-yellow-500" />,
        title: "Envoyer des cadeaux",
        description: "Soutenez vos streamers préférés avec des cadeaux virtuels"
      }
    ]
  },
  "/profile": {
    title: "Votre profil",
    steps: [
      {
        icon: <Sparkles className="w-5 h-5 text-primary" />,
        title: "Modifier votre profil",
        description: "Ajoutez des photos et personnalisez votre bio"
      },
      {
        icon: <Star className="w-5 h-5 text-accent" fill="currentColor" />,
        title: "Vérification",
        description: "Vérifiez votre identité pour gagner en confiance"
      },
      {
        icon: <Coins className="w-5 h-5 text-yellow-500" />,
        title: "Coins et abonnement",
        description: "Gérez votre solde et votre abonnement Premium"
      }
    ]
  }
};

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  // Get tutorial for current page, fallback to home
  const currentPath = location.pathname;
  const tutorial = tutorialsByPage[currentPath] || tutorialsByPage["/"];

  return (
    <>
      {/* Help Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-40 p-3 rounded-full glass border border-primary/30 shadow-lg"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.5 }}
      >
        <HelpCircle className="w-5 h-5 text-primary" />
      </motion.button>

      {/* Tutorial Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed bottom-32 left-4 right-4 z-50 glass-strong rounded-2xl p-5 max-w-md mx-auto border border-border/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <HelpCircle className="w-4 h-4 text-primary" />
                  </div>
                  <h3 className="font-semibold text-foreground">{tutorial.title}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 rounded-full hover:bg-muted/50 transition-colors"
                >
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              </div>

              {/* Steps */}
              <div className="space-y-3">
                {tutorial.steps.map((step, index) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-start gap-3 p-3 rounded-xl bg-muted/30"
                  >
                    <div className="w-8 h-8 rounded-full bg-background/50 flex items-center justify-center flex-shrink-0">
                      {step.icon}
                    </div>
                    <div>
                      <h4 className="font-medium text-sm text-foreground">{step.title}</h4>
                      <p className="text-xs text-muted-foreground">{step.description}</p>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Footer */}
              <motion.button
                onClick={() => setIsOpen(false)}
                className="w-full mt-4 py-2.5 btn-gold rounded-xl font-medium text-sm"
                whileTap={{ scale: 0.98 }}
              >
                J'ai compris !
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpButton;
