import { motion, AnimatePresence } from "framer-motion";
import { Shuffle, Zap } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { useRandomCall } from "@/hooks/useRandomCall";
import PreferenceSelector from "@/components/random-call/PreferenceSelector";
import SearchingScreen from "@/components/random-call/SearchingScreen";
import MatchFoundScreen from "@/components/random-call/MatchFoundScreen";
import InCallScreen from "@/components/random-call/InCallScreen";
import DecisionScreen from "@/components/random-call/DecisionScreen";
import ResultScreen from "@/components/random-call/ResultScreen";

const Random = () => {
  const {
    status,
    selectedPreference,
    timeRemaining,
    matchResult,
    waitingForOther,
    startSelecting,
    startSearch,
    cancelSearch,
    submitDecision,
    reset,
  } = useRandomCall();

  const renderContent = () => {
    switch (status) {
      case "selecting":
        return <PreferenceSelector onSelect={startSearch} />;
      
      case "searching":
        return (
          <SearchingScreen 
            preference={selectedPreference || "tous"} 
            onCancel={cancelSearch} 
          />
        );
      
      case "matched":
        return <MatchFoundScreen />;
      
      case "in_call":
        return <InCallScreen timeRemaining={timeRemaining} />;
      
      case "deciding":
        return (
          <DecisionScreen 
            onDecide={submitDecision} 
            waitingForOther={waitingForOther}
          />
        );
      
      case "result":
        return (
          <ResultScreen 
            matched={matchResult === "matched"} 
            onRetry={reset} 
          />
        );
      
      default:
        return (
          <>
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="relative w-28 h-28 mb-8"
            >
              <div className="absolute inset-0 rounded-full glass" />
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute inset-0 rounded-full border-2 border-dashed border-primary/30"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <Shuffle className="w-12 h-12 text-primary" />
              </div>
            </motion.div>

            <motion.h1 
              className="text-2xl font-bold text-foreground mb-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              Rencontre Aléatoire
            </motion.h1>
            
            <motion.p 
              className="text-muted-foreground mb-10 max-w-xs leading-relaxed text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              Lancez un appel vocal anonyme de 1min30 avec quelqu'un. Si vous vous plaisez, matchez et découvrez-vous !
            </motion.p>

            <motion.button 
              onClick={startSelecting}
              className="px-10 py-4 btn-gold rounded-2xl font-semibold flex items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Zap className="w-5 h-5 text-primary-foreground" fill="currentColor" />
              <span className="text-primary-foreground">Lancer une rencontre</span>
            </motion.button>
          </>
        );
    }
  };

  return (
    <div className="min-h-screen pb-28 flex flex-col">
      <motion.header 
        className="flex items-center justify-center px-6 py-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default Random;
