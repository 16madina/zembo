import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import { useRandomCallLiveKit } from "@/hooks/useRandomCallLiveKit";
import { useSoundEffects } from "@/hooks/useSoundEffects";
import PreferenceSelector from "@/components/random-call/PreferenceSelector";
import SearchingScreen from "@/components/random-call/SearchingScreen";
import InCallScreenLiveKit from "@/components/random-call/InCallScreenLiveKit";
import DecisionOverlay from "@/components/random-call/DecisionOverlay";
import ResultScreen from "@/components/random-call/ResultScreen";
import DiceAnimation from "@/components/random-call/DiceAnimation";
import MicrophoneTest from "@/components/random-call/MicrophoneTest";

const Random = () => {
  const [isExiting, setIsExiting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasPlayedZemboSound, setHasPlayedZemboSound] = useState(false);
  
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

  const handleCommencer = () => {
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
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

            <motion.div className="text-center mb-4 z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-3xl font-bold text-foreground">
                Bienvenue sur <span className="text-primary text-5xl font-black">Z</span> Roulette
              </h1>
            </motion.div>

            <DiceAnimation isExiting={isExiting} />

            <motion.div className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-4 z-10" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
              <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-sm text-primary font-medium">Mode Ghost activé</span>
            </motion.div>
            
            <motion.p className="text-muted-foreground mb-3 max-w-xs leading-relaxed text-center z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              Tu vas être connecté(e) avec une personne choisie par le hasard.
            </motion.p>

            <motion.p className="text-muted-foreground/70 mb-4 max-w-xs text-center text-sm z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
              Aucun profil. Aucune photo.<br /><span className="text-foreground font-medium">Juste une voix.</span>
            </motion.p>

            {/* Microphone Test - Above the button for visibility */}
            <motion.div
              className="z-10 mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55 }}
            >
              <MicrophoneTest />
            </motion.div>

            {/* Commencer Button - Always visible */}
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

      <BottomNavigation />
    </div>
  );
};

export default Random;
