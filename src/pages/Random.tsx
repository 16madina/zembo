import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import GameHub from "@/components/random/GameHub";
import ZConnectGame from "@/components/random/ZConnectGame";
import CompatibilityGameModal from "@/components/games/CompatibilityGameModal";
import SpeedDatingGame from "@/components/games/SpeedDatingGame";
import AIMatchFinderGame from "@/components/games/AIMatchFinderGame";
import AIConsentModal from "@/components/AIConsentModal";
import { useAIDataConsent } from "@/hooks/useAIDataConsent";

type GameMode = "hub" | "zconnect" | "speedDating" | "oracle" | "compatibility";

const Random = () => {
  const [currentGame, setCurrentGame] = useState<GameMode>("hub");
  const [showAIConsentModal, setShowAIConsentModal] = useState(false);
  const [pendingAIFeature, setPendingAIFeature] = useState<string | null>(null);
  
  const { hasConsented: hasAIConsent, isLoading: isLoadingConsent } = useAIDataConsent();

  const handleSelectGame = (game: "zconnect" | "speedDating" | "oracle" | "compatibility") => {
    // AI features require consent
    if ((game === "compatibility" || game === "oracle" || game === "speedDating") && !hasAIConsent && !isLoadingConsent) {
      setPendingAIFeature(game);
      setShowAIConsentModal(true);
      return;
    }
    setCurrentGame(game);
  };

  const handleAIConsent = () => {
    if (pendingAIFeature) {
      setCurrentGame(pendingAIFeature as GameMode);
      setPendingAIFeature(null);
    }
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
            <p className="text-xs text-muted-foreground/80 tracking-widest uppercase mb-1">
              Bienvenue sur
            </p>
            <h1 className="text-2xl font-black tracking-tight">
              <span className="text-primary drop-shadow-[0_0_8px_rgba(234,179,8,0.5)]">Z</span>
              <span className="text-foreground">Games</span>
            </h1>
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

      <AIConsentModal
        isOpen={showAIConsentModal}
        onClose={() => {
          setShowAIConsentModal(false);
          setPendingAIFeature(null);
        }}
        onConsent={handleAIConsent}
      />

      <BottomNavigation />
    </div>
  );
};

export default Random;
