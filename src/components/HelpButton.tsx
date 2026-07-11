import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HelpCircle, X, Sparkles, Heart, Flame, MapPin, MessageCircle, Video, Coins } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const HelpButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { t, language } = useLanguage();

  // Tutorials with translations
  const getTutorialsByPage = () => ({
    "/discover": {
      title: language === "en" ? "Discover profiles" : "Découvrir des profils",
      steps: [
        {
          icon: <Heart className="w-5 h-5 text-primary" />,
          title: language === "en" ? "Swipe right or ❤️" : "Swipe à droite ou ❤️",
          description: language === "en" ? "To like a profile and show your interest" : "Pour liker un profil et montrer votre intérêt"
        },
        {
          icon: <X className="w-5 h-5 text-destructive" />,
          title: language === "en" ? "Swipe left or ✕" : "Swipe à gauche ou ✕",
          description: language === "en" ? "To skip to the next profile" : "Pour passer au profil suivant"
        },
        {
          icon: <Flame className="w-5 h-5 text-orange-500" fill="currentColor" />,
          title: language === "en" ? "Swipe up or 🔥" : "Swipe vers le haut ou 🔥",
          description: language === "en" ? "ZFlamme to stand out (limited for free users)" : "ZFlamme pour vous démarquer (limité pour les utilisateurs gratuits)"
        },
        {
          icon: <Sparkles className="w-5 h-5 text-pink-500" />,
          title: language === "en" ? "Send a Rose 🌹" : "Envoyer une Rose 🌹",
          description: language === "en" ? "Send a rose with a personalized message to get noticed" : "Envoyez une rose avec un message personnalisé pour attirer l'attention"
        },
        {
          icon: <MapPin className="w-5 h-5 text-green-500" />,
          title: t.nearby,
          description: language === "en" ? "See profiles on a map by location" : "Voir les profils sur une carte selon leur localisation"
        }
      ]
    },
    "/messages": {
      title: t.messages,
      steps: [
        {
          icon: <MessageCircle className="w-5 h-5 text-primary" />,
          title: language === "en" ? "Your conversations" : "Vos conversations",
          description: language === "en" ? "Chat with your matches and people who sent you a rose" : "Discutez avec vos matchs et les personnes qui vous ont envoyé une rose"
        },
        {
          icon: <Heart className="w-5 h-5 text-pink-500" />,
          title: language === "en" ? "Received likes" : "Likes reçus",
          description: language === "en" ? "See who liked you (Premium feature)" : "Voyez qui vous a liké (fonctionnalité Premium)"
        },
        {
          icon: <Video className="w-5 h-5 text-accent" />,
          title: language === "en" ? "Video call" : "Appel vidéo",
          description: language === "en" ? "Start a video call with your match" : "Lancez un appel vidéo avec votre match"
        }
      ]
    },
    "/": {
      title: "Z Games",
      steps: [
        {
          icon: <Video className="w-5 h-5 text-primary" />,
          title: t.rooms || "Salons",
          description: language === "en" ? "Meet new people in audio calls with their profile" : "Rencontrez de nouvelles personnes en appel audio avec leur profil"
        },
        {
          icon: <Heart className="w-5 h-5 text-green-500" />,
          title: language === "en" ? "Mutual like" : "Like mutuel",
          description: language === "en" ? "If you both like each other, the call continues!" : "Si vous vous likez mutuellement, l'appel continue !"
        },
        {
          icon: <X className="w-5 h-5 text-destructive" />,
          title: t.skip,
          description: language === "en" ? "Skip to the next profile if the connection isn't there" : "Passez au profil suivant si le courant ne passe pas"
        }
      ]
    },
    "/live": {
      title: t.live,
      steps: [
        {
          icon: <Video className="w-5 h-5 text-primary" />,
          title: language === "en" ? "Watch lives" : "Regarder des lives",
          description: language === "en" ? "Watch live broadcasts from the community" : "Regardez des diffusions en direct de la communauté"
        },
        {
          icon: <Sparkles className="w-5 h-5 text-accent" />,
          title: language === "en" ? "Start your live" : "Lancer votre live",
          description: language === "en" ? "Create your own broadcast and interact with your audience" : "Créez votre propre diffusion et interagissez avec votre audience"
        },
        {
          icon: <Coins className="w-5 h-5 text-yellow-500" />,
          title: language === "en" ? "Send gifts" : "Envoyer des cadeaux",
          description: language === "en" ? "Support your favorite streamers with virtual gifts" : "Soutenez vos streamers préférés avec des cadeaux virtuels"
        }
      ]
    },
    "/profile": {
      title: t.myProfile,
      steps: [
        {
          icon: <Sparkles className="w-5 h-5 text-primary" />,
          title: t.editProfile,
          description: language === "en" ? "Add photos and customize your bio" : "Ajoutez des photos et personnalisez votre bio"
        },
        {
          icon: <Sparkles className="w-5 h-5 text-accent" fill="currentColor" />,
          title: language === "en" ? "Verification" : "Vérification",
          description: language === "en" ? "Verify your identity to build trust" : "Vérifiez votre identité pour gagner en confiance"
        },
        {
          icon: <Coins className="w-5 h-5 text-yellow-500" />,
          title: language === "en" ? "Coins and subscription" : "Coins et abonnement",
          description: language === "en" ? "Manage your balance and Premium subscription" : "Gérez votre solde et votre abonnement Premium"
        }
      ]
    }
  });

  const currentPath = location.pathname;
  const tutorialsByPage = getTutorialsByPage();
  const tutorial = tutorialsByPage[currentPath] || tutorialsByPage["/"];
  const understoodText = language === "en" ? "Got it!" : "J'ai compris !";

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
                {understoodText}
              </motion.button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default HelpButton;
