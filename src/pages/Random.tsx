import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { useRandomCall } from "@/hooks/useRandomCall";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import PreferenceSelector from "@/components/random-call/PreferenceSelector";
import SearchingScreen from "@/components/random-call/SearchingScreen";
import SearchTimeoutScreen from "@/components/random-call/SearchTimeoutScreen";
import MatchFoundScreen from "@/components/random-call/MatchFoundScreen";
import InCallScreen from "@/components/random-call/InCallScreen";
import DecisionOverlay from "@/components/random-call/DecisionOverlay";
import ExtendedCallScreen from "@/components/random-call/ExtendedCallScreen";
import ResultScreen from "@/components/random-call/ResultScreen";
import RejectedScreen from "@/components/random-call/RejectedScreen";
import DiceAnimation from "@/components/random-call/DiceAnimation";

const Random = () => {
  const [isExiting, setIsExiting] = useState(false);
  
  const {
    status,
    selectedPreference,
    session,
    timeRemaining,
    searchTimeRemaining,
    matchResult,
    waitingForOther,
    otherUserId,
    startSelecting,
    startSearch,
    cancelSearch,
    submitDecision,
    reset,
  } = useRandomCall();
  
  const { playDiceSound, playZemboVoice, playRevealSound, isDrumrollPlaying } = useSoundEffects();

  const handleCommencer = () => {
    playDiceSound();
    setIsExiting(true);
    
    // Wait for the zoom animation to complete before transitioning
    setTimeout(() => {
      setIsExiting(false);
      startSelecting();
    }, 800);
  };

  const handleStartCall = () => {
    playZemboVoice();
  };

  const renderContent = () => {
    switch (status) {
      case "selecting":
        return (
          <PreferenceSelector 
            onSelect={startSearch} 
            onStartCall={handleStartCall}
            isShaking={isDrumrollPlaying}
          />
        );
      
      case "searching":
        return (
          <SearchingScreen 
            preference={selectedPreference || "tous"} 
            onCancel={cancelSearch}
            timeRemaining={searchTimeRemaining}
          />
        );
      
      case "search_timeout":
        return <SearchTimeoutScreen onRetry={reset} />;
      
      case "matched":
        return <MatchFoundScreen />;
      
      case "in_call":
      case "first_decision":
      case "waiting_decision":
        return (
          <div className="relative w-full">
            <InCallScreen 
              timeRemaining={timeRemaining} 
              otherUserId={otherUserId || undefined} 
              sessionId={session?.id}
              onHangUp={reset}
            />
            {/* Decision overlay appears on top while call continues */}
            <AnimatePresence>
              {(status === "first_decision" || status === "waiting_decision") && (
                <DecisionOverlay 
                  onDecide={submitDecision} 
                  waitingForOther={waitingForOther}
                  timeRemaining={timeRemaining}
                />
              )}
            </AnimatePresence>
          </div>
        );
      
      case "call_extended":
        return <ExtendedCallScreen timeRemaining={timeRemaining} otherUserId={otherUserId || undefined} sessionId={session?.id} />;
      
      case "rejected":
        return <RejectedScreen onRetry={reset} />;
      
      case "result":
        return (
          <ResultScreen 
            matched={matchResult === "matched"} 
            onRetry={reset}
            otherUserId={otherUserId || undefined}
            onRevealSound={playRevealSound}
          />
        );
      
      default:
        return (
          <>
            {/* Animated background circles */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-primary/10"
                  style={{
                    width: `${200 + i * 100}px`,
                    height: `${200 + i * 100}px`,
                  }}
                  animate={{ 
                    scale: [1, 1.1, 1],
                    opacity: [0.3, 0.1, 0.3]
                  }}
                  transition={{ 
                    duration: 4, 
                    repeat: Infinity, 
                    delay: i * 0.5,
                    ease: "easeInOut"
                  }}
                />
              ))}
            </div>

            {/* Title with big Z - BEFORE animation */}
            <motion.div 
              className="text-center mb-4 z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <h1 className="text-3xl font-bold text-foreground">
                Bienvenue sur <span className="text-primary text-5xl font-black">Z</span> Roulette
              </h1>
            </motion.div>

            {/* Hand throwing dice animation with zoom exit effect */}
            <DiceAnimation isExiting={isExiting} />

            {/* Ghost mode badge */}
            <motion.div
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6 z-10"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <motion.div
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className="w-2 h-2 rounded-full bg-primary"
              />
              <span className="text-sm text-primary font-medium">Mode Ghost activé</span>
            </motion.div>
            
            <motion.p 
              className="text-muted-foreground mb-4 max-w-xs leading-relaxed text-center z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              Tu vas être connecté(e) avec une personne choisie par le hasard.
            </motion.p>

            <motion.p 
              className="text-muted-foreground/70 mb-10 max-w-xs text-center text-sm z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              Aucun profil. Aucune photo.<br />
              <span className="text-foreground font-medium">Juste une voix.</span>
            </motion.p>

            <motion.button 
              onClick={handleCommencer}
              className="px-10 py-4 btn-gold rounded-2xl font-semibold flex items-center gap-3 z-10"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Play className="w-5 h-5 text-primary-foreground" />
              <span className="text-primary-foreground">Commencer</span>
            </motion.button>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))]">
      <motion.header 
        className="flex items-center justify-center px-6 py-4 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <ZemboLogo />
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center overflow-hidden min-h-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center w-full"
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
