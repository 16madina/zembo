import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import GameHub from "@/components/random/GameHub";
import ZConnectGame from "@/components/random/ZConnectGame";
import CompatibilityGameModal from "@/components/games/CompatibilityGameModal";
import SpeedDatingGame from "@/components/games/SpeedDatingGame";
import AIMatchFinderGame from "@/components/games/AIMatchFinderGame";
 import { useAIDataConsent } from "@/hooks/useAIDataConsent";
 import { toast } from "sonner";
 import { useLanguage } from "@/contexts/LanguageContext";

type GameMode = "hub" | "zconnect" | "speedDating" | "oracle" | "compatibility";

const Random = () => {
  const [currentGame, setCurrentGame] = useState<GameMode>("hub");
   const location = useLocation();
   const { hasConsented, isLoading } = useAIDataConsent();
   const { language } = useLanguage();

   // Reset to hub when navigating to this page (e.g., clicking nav button while in a game)
   useEffect(() => {
     // When location key changes (new navigation) and we're on /, reset to hub
     if (location.pathname === "/" && currentGame !== "hub") {
       // Check if this is a new navigation (not initial mount)
       const isNewNavigation = location.key !== "default";
       if (isNewNavigation) {
         setCurrentGame("hub");
       }
     }
   }, [location.key]);
 
  const handleSelectGame = (game: "zconnect" | "speedDating" | "oracle" | "compatibility") => {
     // AI games require consent
     const aiGames = ["compatibility", "oracle", "speedDating"];
     if (aiGames.includes(game) && !hasConsented && !isLoading) {
       toast.error(
         language === "fr"
           ? "Tu dois accepter le consentement IA ci-dessus pour accéder à ce jeu."
           : "You must accept the AI consent above to access this game."
       );
      return;
    }
    setCurrentGame(game);
  };

  const handleBackToHub = () => {
    setCurrentGame("hub");
  };

  const renderContent = () => {
    switch (currentGame) {
      case "zconnect":
        return <ZConnectGame onBack={handleBackToHub} />;
      case "hub":
      default:
        return <GameHub onSelectGame={handleSelectGame} />;
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(80px+env(safe-area-inset-bottom))]">
      <motion.header 
        className="flex flex-col items-center px-4 md:px-6 py-2 flex-shrink-0" 
        initial={{ opacity: 0, y: -20 }} 
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="w-full flex justify-start">
          <ZemboLogo size="sm" animate={false} />
        </div>
        {currentGame === "hub" && (
          <motion.div 
            className="text-center mt-3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <p className="text-sm font-semibold text-foreground/90 tracking-wide mb-1">
              ✨ Bienvenue sur ✨
            </p>
            <motion.h1 
              className="text-3xl font-black tracking-tight relative inline-block"
              animate={{
                textShadow: [
                  "0 0 10px rgba(234,179,8,0.3)",
                  "0 0 20px rgba(234,179,8,0.6)",
                  "0 0 10px rgba(234,179,8,0.3)",
                ],
              }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <span className="text-primary">Z</span>
              <span className="bg-gradient-to-r from-foreground via-primary/80 to-foreground bg-clip-text text-transparent">Games</span>
            </motion.h1>
            <motion.p 
              className="text-xs text-muted-foreground mt-2 italic"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              Es-tu prêt(e) à jouer ? 🎮
            </motion.p>
          </motion.div>
        )}
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-center px-4 md:px-8 text-center overflow-hidden min-h-0 max-w-2xl md:mx-auto w-full">
        <AnimatePresence mode="wait">
          <motion.div 
            key={currentGame} 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            exit={{ opacity: 0, y: -20 }} 
            className="flex flex-col items-center w-full"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modals for games that use overlays */}
      <CompatibilityGameModal
        isOpen={currentGame === "compatibility"}
        onClose={handleBackToHub}
      />

      <AnimatePresence>
        {currentGame === "speedDating" && (
          <SpeedDatingGame onClose={handleBackToHub} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentGame === "oracle" && (
          <AIMatchFinderGame onClose={handleBackToHub} />
        )}
      </AnimatePresence>

      <BottomNavigation />
    </div>
  );
};

export default Random;
