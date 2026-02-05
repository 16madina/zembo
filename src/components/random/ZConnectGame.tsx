import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Phone, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
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
import PreConnectionScreen from "@/components/random-call/PreConnectionScreen";

interface ZConnectGameProps {
  onBack: () => void;
}

const ZConnectGame = ({ onBack }: ZConnectGameProps) => {
  const [isExiting, setIsExiting] = useState(false);
  const [isSelecting, setIsSelecting] = useState(false);
  const [hasPlayedZemboSound, setHasPlayedZemboSound] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [acceptedConnection, setAcceptedConnection] = useState(false);
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
    if (!canCall) {
      setShowUpgradeModal(true);
      return;
    }

    const success = await incrementCallCount();
    if (!success) {
      toast.error("Limite d'appels atteinte pour aujourd'hui");
      return;
    }

    diceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    playDiceSound();
    setIsExiting(true);
    setTimeout(() => {
      setIsExiting(false);
      setIsSelecting(true);
    }, 800);
  };

  const handleStartSearch = async (preference: string) => {
    if (!hasPlayedZemboSound) {
      playZemboVoice();
      setHasPlayedZemboSound(true);
    }
    await startSearch(preference);
  };

  const handleReset = () => {
    endCall();
    setIsSelecting(false);
    setHasPlayedZemboSound(false);
    setAcceptedConnection(false);
  };

  const handleAcceptConnection = () => {
    setAcceptedConnection(true);
  };

  const handleDeclineConnection = () => {
    cancelSearch();
    handleReset();
    toast.info("Connexion refusée");
  };

  const handleSkipConnection = async () => {
    await cancelSearch();
    setAcceptedConnection(false);
    setTimeout(() => {
      startSearch("tous");
    }, 500);
  };

  const renderContent = () => {
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
        // ALWAYS show PreConnectionScreen first - user MUST accept before call starts
        if (!acceptedConnection) {
          if (!matchedUserId) {
            // Still waiting for matchedUserId, show loading state
            return (
              <div className="flex flex-col items-center justify-center gap-4">
                <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
                <p className="text-muted-foreground text-sm">Chargement du profil...</p>
              </div>
            );
          }
          return (
            <PreConnectionScreen
              matchedUserId={matchedUserId}
              onAccept={handleAcceptConnection}
              onDecline={handleDeclineConnection}
              onSkip={handleSkipConnection}
            />
          );
        }
        // Only proceed to InCallScreen AFTER user explicitly accepted
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
      case "deciding":
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

            <motion.div className="text-center mb-0 z-10" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="text-lg font-bold text-foreground">
                <span className="text-primary text-2xl font-black">Z</span> Connect
              </h1>
              <motion.div 
                className="flex items-center justify-center gap-2 mt-0.5"
                initial={{ opacity: 0, scale: 0.9 }} 
                animate={{ opacity: 1, scale: 1 }} 
                transition={{ delay: 0.2 }}
              >
                <motion.div animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-xs text-primary font-medium">Es-tu prêt(e) à rencontrer quelqu'un ?</span>
              </motion.div>
            </motion.div>

            <div ref={diceRef} className="-my-8">
              <DiceAnimation isExiting={isExiting} />
            </div>
            
            <motion.p className="text-muted-foreground max-w-xs leading-snug text-center z-10 text-xs -mt-12" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <span className="text-foreground font-medium">Aucun profil, juste une voix.</span> Tu vas être connecté(e) avec une personne choisie par le hasard.
            </motion.p>

            <motion.div
              className="z-10 mb-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <MicrophoneTest />
            </motion.div>

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

  // Show back button only when idle
  const showBackButton = status === "idle" && !isSelecting;

  return (
    <div className="flex flex-col items-center w-full relative">
      {showBackButton && (
        <motion.button
          onClick={onBack}
          className="absolute top-0 left-0 p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors z-20"
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </motion.button>
      )}

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

      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)}
        currentTier={tier}
      />
    </div>
  );
};

export default ZConnectGame;
