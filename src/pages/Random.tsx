import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Phone } from "lucide-react";
import { toast } from "sonner";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { useRandomCallLiveKit } from "@/hooks/useRandomCallLiveKit";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import { useDailyRandomCalls } from "@/hooks/useDailyRandomCalls";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { useAuth } from "@/contexts/AuthContext";
import PreferenceSelector from "@/components/random-call/PreferenceSelector";
import SearchingScreen from "@/components/random-call/SearchingScreen";
import InCallScreenLiveKit from "@/components/random-call/InCallScreenLiveKit";
import DecisionOverlay from "@/components/random-call/DecisionOverlay";
import ResultScreen from "@/components/random-call/ResultScreen";
import DiceAnimation from "@/components/random-call/DiceAnimation";
import MicrophoneTest from "@/components/random-call/MicrophoneTest";
import UpgradeModal from "@/components/random-call/UpgradeModal";
import CompatibilityGameModal from "@/components/games/CompatibilityGameModal";

const Random = () => {
  const [isExiting, setIsExiting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasPlayedZemboSound, setHasPlayedZemboSound] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showCompatibilityGame, setShowCompatibilityGame] = useState(false);
  const diceRef = useRef<HTMLDivElement>(null);
  
  const { user } = useAuth();
  const { tier } = useUserSubscription(user?.id);
  
  const {
    status,
    sessionId,
    matchedUserId,
    isConnected,
    isMuted,
    isSpeakerOn,
    audioLevel,
    error,
    timeRemaining,
    decisionResult,
    waitingForOther,
    startSearch,
    cancelSearch,
    endCall,
    toggleMute,
    toggleSpeaker,
    submitDecision,
  } = useRandomCallLiveKit();
  
  const { playDiceSound, playZemboVoice, playRevealSound, isDrumrollPlaying } = useSoundEffects();
  const { canCall, remainingCalls, maxCalls, incrementCallCount, isLoading: isLoadingCalls } = useDailyRandomCalls();

  const handleCommencer = async () => {
    // Check if user can make a call
    if (!canCall) {
      setShowUpgradeModal(true);
      return;
    }

    // Increment call count
    const success = await incrementCallCount();
    if (!success) {
      toast.error("Limite d'appels atteinte pour aujourd'hui");
      return;
    }

    // Scroll to dice animation
    diceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    playDiceSound();
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setIsSelecting(true);
    }, 800);
  };

  const handleStartSearch = async (preference: string) => {
    // Only play zembo voice once per search session
    if (!hasPlayedZemboSound) {
      playZemboVoice();
      setHasPlayedZemboSound(true);
    }
    await startSearch(preference);
  };

  const handleReset = () => {
    endCall();
    setIsSelecting(false);
    setHasPlayedZemboSound(false); // Reset for next search
  };

  const renderContent = () => {
    // Show selecting screen
    if (isSelecting && status === "idle") {
      return (
        <PreferenceSelector 
          onSelect={handleStartSearch} 
          onStartCall={() => {}}
          isShaking={isDrumrollPlaying}
        />
      );
    }

    switch (status) {
      case "searching":
        return (
          <SearchingScreen 
            preference="tous" 
            onCancel={cancelSearch}
            timeRemaining={60}
          />
        );
      
      case "matched":
      case "in_call":
        return (
          <InCallScreenLiveKit 
            timeRemaining={timeRemaining}
            isConnected={isConnected}
            isMuted={isMuted}
            isSpeakerOn={isSpeakerOn}
            audioLevel={audioLevel}
            error={error}
            matchedUserId={matchedUserId || undefined}
            sessionId={sessionId || undefined}
            onToggleMute={toggleMute}
            onToggleSpeaker={toggleSpeaker}
            onEndCall={handleReset}
          />
        );
      
      case "in_call_deciding":
        // Show in-call screen with decision overlay - timer still running
        return (
          <div className="relative w-full">
            <InCallScreenLiveKit 
              timeRemaining={timeRemaining}
              isConnected={isConnected}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              audioLevel={audioLevel}
              error={error}
              matchedUserId={matchedUserId || undefined}
              sessionId={sessionId || undefined}
              onToggleMute={toggleMute}
              onToggleSpeaker={toggleSpeaker}
              onEndCall={handleReset}
            />
            <DecisionOverlay 
              onDecide={submitDecision} 
              waitingForOther={waitingForOther}
              timeRemaining={timeRemaining}
            />
          </div>
        );
      
      case "deciding":
        // Legacy: pure decision screen (shouldn't happen with new flow)
        return (
          <div className="relative w-full">
            <InCallScreenLiveKit 
              timeRemaining={timeRemaining}
              isConnected={isConnected}
              isMuted={isMuted}
              isSpeakerOn={isSpeakerOn}
              audioLevel={audioLevel}
              error={error}
              matchedUserId={matchedUserId || undefined}
              sessionId={sessionId || undefined}
              onToggleMute={toggleMute}
              onToggleSpeaker={toggleSpeaker}
              onEndCall={handleReset}
            />
            <DecisionOverlay 
              onDecide={submitDecision} 
              waitingForOther={waitingForOther}
              timeRemaining={timeRemaining}
            />
          </div>
        );
      
      case "completed":
        return (
          <ResultScreen 
            matched={decisionResult === "matched"} 
            onRetry={handleReset}
            otherUserId={matchedUserId || undefined}
            onRevealSound={playRevealSound}
          />
        );
      
      case "error":
        return (
          <div className="text-center">
            <p className="text-destructive mb-4">{error || "Une erreur est survenue"}</p>
            <button onClick={handleReset} className="btn-gold px-6 py-3 rounded-xl">
              Réessayer
            </button>
          </div>
        );
      
      default:
        return (
          <>
            <div className="absolute inset-0 -z-10 flex items-center justify-center pointer-events-none overflow-hidden">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="absolute rounded-full border border-primary/10"
                  style={{ width: `${200 + i * 100}px`, height: `${200 + i * 100}px` }}
                  animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.1, 0.3] }}
                  transition={{ duration: 4, repeat: Infinity, delay: i * 0.5, ease: "easeInOut" }}
                />
              ))}
            </div>

            {/* Titre + sous-titre compacts */}
            <motion.div className="text-center mb-0 z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-xl font-bold text-foreground">
                Bienvenue sur <span className="text-primary text-3xl font-black">Z</span> Roulette
              </h1>
            <motion.div 
                className="flex items-center justify-center gap-2 mt-1"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.2 }}
              >
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-primary font-medium">Es-tu prêt(e) à jouer ?</span>
              </motion.div>
            </motion.div>

            {/* Mini-Games Buttons */}
            <motion.div 
              className="flex flex-wrap justify-center gap-2 mt-3 z-10"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <motion.button
                onClick={() => setShowCompatibilityGame(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/20 border border-primary/30 text-primary text-xs font-medium hover:bg-primary/30 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>💕</span>
                <span>Compatibilité</span>
              </motion.button>
              
              <motion.button
                onClick={() => toast.info("Speed Dating - Bientôt disponible !")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/30 border border-accent/40 text-accent-foreground text-xs font-medium hover:bg-accent/50 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>⚡</span>
                <span>Speed Dating</span>
              </motion.button>
              
              <motion.button
                onClick={() => toast.info("Vérité ou Défi - Bientôt disponible !")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary/50 border border-secondary text-secondary-foreground text-xs font-medium hover:bg-secondary/70 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>🎭</span>
                <span>Vérité ou Défi</span>
              </motion.button>
            </motion.div>

            <div ref={diceRef} className="-my-6">
              <DiceAnimation isExiting={isExiting} />
            </div>
            
            <motion.p className="text-muted-foreground mb-1 max-w-xs leading-snug text-center z-10 text-xs -mt-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <span className="text-foreground font-medium">Aucun profil, juste une voix.</span> Tu vas être connecté(e) avec une personne choisie par le hasard.
            </motion.p>

            {/* Microphone Test - Above the button for visibility */}
            <motion.div
              className="z-10 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <MicrophoneTest />
            </motion.div>

            {/* Random Calls Counter */}
            {!isLoadingCalls && maxCalls !== Infinity && (
              <motion.div
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 mb-3 z-10"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.55 }}
              >
                <Phone className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs font-medium text-primary">
                  {remainingCalls}/{maxCalls}
                </span>
              </motion.div>
            )}

            {/* Commencer Button - Always visible */}
            <motion.button 
              onClick={handleCommencer}
              disabled={!canCall}
              className={`px-8 py-3 rounded-2xl font-semibold flex items-center gap-2 z-10 ${
                canCall 
                  ? "btn-gold" 
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
              initial={{ opacity: 0, y: 20 }} 
              animate={{ opacity: 1, y: 0 }} 
              transition={{ delay: 0.6 }} 
              whileHover={canCall ? { scale: 1.03 } : undefined} 
              whileTap={canCall ? { scale: 0.97 } : undefined}
            >
              <Play className={`w-4 h-4 ${canCall ? "text-primary-foreground" : ""}`} />
              <span className={`text-sm ${canCall ? "text-primary-foreground" : ""}`}>
                {canCall ? "Commencer" : "Limite atteinte"}
              </span>
            </motion.button>
          </>
        );
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(140px+env(safe-area-inset-bottom))]">
      <motion.header className="flex items-center justify-center px-6 md:px-8 py-4 flex-shrink-0" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <ZemboLogo />
      </motion.header>

      <div className="flex-1 flex flex-col items-center justify-start px-6 md:px-8 pt-4 text-center overflow-y-auto overflow-x-hidden min-h-0 max-w-2xl md:mx-auto w-full pb-[calc(180px+env(safe-area-inset-bottom))]">
        <AnimatePresence mode="wait">
          <motion.div key={status} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="flex flex-col items-center w-full">
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        currentTier={tier}
      />

      <CompatibilityGameModal
        isOpen={showCompatibilityGame}
        onClose={() => setShowCompatibilityGame(false)}
      />

      <BottomNavigation />
    </div>
  );
};

export default Random;
