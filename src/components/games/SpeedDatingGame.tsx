import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, Users, Clock, Heart, X, Mic, MicOff, 
  Video, VideoOff, PhoneOff, Sparkles, Crown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useSpeedDating, SpeedDatingStatus } from "@/hooks/useSpeedDating";
import { cn } from "@/lib/utils";
import speedDatingBg from "@/assets/speed-dating-bg.jpeg";
interface SpeedDatingGameProps {
  onClose: () => void;
}

const SpeedDatingGame = ({ onClose }: SpeedDatingGameProps) => {
  const {
    status,
    participants,
    currentRound,
    roundNumber,
    totalRounds,
    timeRemaining,
    votes,
    results,
    isConnected,
    isMuted,
    isVideoOff,
    error,
    joinSession,
    leaveSession,
    submitVote,
    toggleMute,
    toggleVideo,
    localVideoRef,
    remoteVideoRef,
  } = useSpeedDating();

  const handleClose = () => {
    leaveSession();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progressPercent = ((totalRounds - roundNumber + 1) / totalRounds) * (timeRemaining / 60) * 100;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background flex flex-col"
    >
      {/* Header with Speed Dating title */}
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          <span className="font-bold text-lg">Speed Dating</span>
        </div>
        <Button variant="ghost" size="icon" onClick={handleClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Idle State - Start Button */}
          {status === "idle" && (
            <IdleScreen onStart={joinSession} />
          )}

          {/* Searching State */}
          {status === "searching" && (
            <SearchingScreen />
          )}

          {/* Waiting Room */}
          {status === "waiting_room" && (
            <WaitingRoomScreen participants={participants} />
          )}

          {/* Countdown */}
          {status === "countdown" && (
            <CountdownScreen timeRemaining={timeRemaining} />
          )}

          {/* In Call */}
          {status === "in_call" && currentRound && (
            <InCallScreen
              round={currentRound}
              roundNumber={roundNumber}
              totalRounds={totalRounds}
              timeRemaining={timeRemaining}
              isConnected={isConnected}
              isMuted={isMuted}
              isVideoOff={isVideoOff}
              localVideoRef={localVideoRef}
              remoteVideoRef={remoteVideoRef}
              onToggleMute={toggleMute}
              onToggleVideo={toggleVideo}
              onEndCall={handleClose}
              progressPercent={progressPercent}
              error={error}
            />
          )}

          {/* Voting */}
          {status === "voting" && (
            <VotingScreen
              participants={participants}
              votes={votes}
              onVote={submitVote}
            />
          )}

          {/* Results */}
          {status === "results" && (
            <ResultsScreen results={results} onClose={handleClose} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Golden Sparkle Particles Component
const GoldenSparkles = () => {
  const sparkles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 3,
    duration: 2 + Math.random() * 2,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
      {sparkles.map((s) => (
        <motion.div
          key={s.id}
          className="absolute rounded-full bg-primary"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            boxShadow: `0 0 ${s.size * 2}px rgba(214, 178, 107, 0.8)`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1.2, 0.5],
          }}
          transition={{
            duration: s.duration,
            repeat: Infinity,
            delay: s.delay,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
};

// Idle Screen Component
const IdleScreen = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    key="idle"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="h-full w-full flex flex-col relative overflow-hidden"
  >
    {/* Background Image - Full screen */}
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
      style={{ backgroundImage: `url(${speedDatingBg})` }}
    />
    {/* Subtle gradient only at bottom for button readability */}
    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background/80 z-[1]" />
    
    {/* Golden Sparkles */}
    <div className="absolute inset-0 z-[2] pointer-events-none">
      <GoldenSparkles />
    </div>

    {/* Info badges on screen - descriptive labels */}
    <motion.div 
      className="relative z-10 pt-6 px-4 flex flex-col items-center gap-3"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
        <Users className="w-5 h-5 text-primary" />
        <span className="text-foreground font-semibold text-base">4+ joueurs</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
        <Clock className="w-5 h-5 text-primary" />
        <span className="text-foreground font-semibold text-base">3 rounds × 60s</span>
      </div>
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
        <Heart className="w-5 h-5 text-primary" />
        <span className="text-foreground font-semibold text-base">Match mutuel</span>
      </div>
    </motion.div>

    {/* Spacer - let image fill the screen */}
    <div className="flex-1" />
    
    {/* Button - positioned higher to avoid navigation overlap */}
    <motion.div 
      className="relative z-10 px-6 pb-40 flex justify-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Button 
        onClick={onStart} 
        size="lg" 
        className="px-12 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground shadow-[0_0_30px_rgba(214,178,107,0.5)] text-base py-6"
      >
        <Zap className="w-5 h-5 mr-2" />
        Commencer
      </Button>
    </motion.div>
  </motion.div>
);

// Searching Screen
const SearchingScreen = () => (
  <motion.div
    key="searching"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-6 relative"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
    
    {/* Golden Sparkles */}
    <div className="absolute inset-0 pointer-events-none">
      <GoldenSparkles />
    </div>
    
    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-20 h-20 border-4 border-primary border-t-transparent rounded-full mb-6 shadow-[0_0_20px_rgba(214,178,107,0.4)]"
      />
      <p className="text-foreground font-medium text-lg">Recherche d'une session...</p>
    </div>
  </motion.div>
);

// Floating Hearts Animation for Waiting Room
const FloatingHearts = () => {
  const hearts = Array.from({ length: 8 }, (_, i) => ({
    id: i,
    left: `${10 + Math.random() * 80}%`,
    delay: Math.random() * 4,
    duration: 3 + Math.random() * 2,
    size: 12 + Math.random() * 8,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          className="absolute text-primary/40"
          style={{ left: h.left, bottom: -20 }}
          animate={{
            y: [0, -400],
            opacity: [0, 0.6, 0],
            rotate: [0, 10, -10, 0],
          }}
          transition={{
            duration: h.duration,
            repeat: Infinity,
            delay: h.delay,
            ease: "easeOut",
          }}
        >
          <Heart style={{ width: h.size, height: h.size }} fill="currentColor" />
        </motion.div>
      ))}
    </div>
  );
};

// Waiting Room Screen
const WaitingRoomScreen = ({ participants }: { participants: Array<{ user_id: string; display_name: string; avatar_url: string | null }> }) => (
  <motion.div
    key="waiting"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
    
    {/* Golden Sparkles */}
    <div className="absolute inset-0 pointer-events-none">
      <GoldenSparkles />
    </div>
    
    {/* Floating Hearts */}
    <FloatingHearts />
    
    {/* Pulsing radar circles */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-40 h-40 rounded-full border border-primary/20"
          animate={{
            scale: [1, 2.5],
            opacity: [0.4, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            delay: i * 1,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
    
    <div className="relative z-10 flex flex-col items-center">
      {/* Glassmorphism card */}
      <motion.div 
        className="bg-background/70 backdrop-blur-md border border-primary/30 rounded-3xl p-6 shadow-[0_0_40px_rgba(214,178,107,0.2)]"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <div className="flex items-center gap-2 mb-4 justify-center">
          <Users className="w-8 h-8 text-primary" />
          <h3 className="text-xl font-bold text-foreground">Salle d'attente</h3>
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
          <span className="text-2xl font-bold text-primary">{participants.length + 1}</span>
          <span className="text-muted-foreground">/4 minimum</span>
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          {participants.map((p, index) => (
            <motion.div
              key={p.user_id}
              initial={{ scale: 0, rotate: -10 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ delay: index * 0.1, type: "spring" }}
              className="flex flex-col items-center"
            >
              <div className="relative">
                <Avatar className="w-16 h-16 border-2 border-primary shadow-[0_0_15px_rgba(214,178,107,0.4)]">
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary font-bold">{p.display_name[0]}</AvatarFallback>
                </Avatar>
                <motion.div
                  className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </div>
              <span className="text-xs mt-2 text-foreground font-medium">{p.display_name}</span>
            </motion.div>
          ))}
        </div>
      </motion.div>

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="mt-6 flex items-center gap-2 text-sm text-muted-foreground"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        >
          <Zap className="w-4 h-4 text-primary" />
        </motion.div>
        En attente d'autres participants...
      </motion.div>
    </div>
  </motion.div>
);

// Countdown Screen
const CountdownScreen = ({ timeRemaining }: { timeRemaining: number }) => (
  <motion.div
    key="countdown"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-6 relative overflow-hidden"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
    
    {/* Golden Sparkles */}
    <div className="absolute inset-0 pointer-events-none">
      <GoldenSparkles />
    </div>
    
    {/* Pulsing circles behind number */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 1.8],
            opacity: [0.6, 0],
          }}
          transition={{
            duration: 1,
            repeat: Infinity,
            delay: i * 0.3,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
    
    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        key={timeRemaining}
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 1.5, opacity: 0 }}
        className="text-9xl font-bold text-primary drop-shadow-[0_0_30px_rgba(214,178,107,0.6)]"
      >
        {timeRemaining}
      </motion.div>
      <motion.p 
        className="text-foreground font-semibold text-lg mt-4"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        Préparez-vous !
      </motion.p>
    </div>
  </motion.div>
);

// In Call Screen
interface InCallScreenProps {
  round: { partner_id: string; partner_name: string; partner_avatar: string | null; room_name: string };
  roundNumber: number;
  totalRounds: number;
  timeRemaining: number;
  isConnected: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  localVideoRef: React.RefObject<HTMLVideoElement>;
  remoteVideoRef: React.RefObject<HTMLVideoElement>;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  onEndCall: () => void;
  progressPercent: number;
  error: string | null;
}

const InCallScreen = ({
  round,
  roundNumber,
  totalRounds,
  timeRemaining,
  isConnected,
  isMuted,
  isVideoOff,
  localVideoRef,
  remoteVideoRef,
  onToggleMute,
  onToggleVideo,
  onEndCall,
  error,
}: InCallScreenProps) => {
  const isLowTime = timeRemaining <= 10;

  return (
    <motion.div
      key="incall"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col relative bg-black"
    >
      {/* Remote Video (Full Screen) */}
      <div className="flex-1 relative">
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="w-full h-full object-cover"
        />
        
        {!isConnected && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="text-center">
              <Avatar className="w-24 h-24 mx-auto mb-4">
                <AvatarImage src={round.partner_avatar || undefined} />
                <AvatarFallback className="text-2xl">{round.partner_name[0]}</AvatarFallback>
              </Avatar>
              <p className="text-muted-foreground">Connexion à {round.partner_name}...</p>
            </div>
          </div>
        )}

        {/* Local Video (PiP) */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute bottom-24 right-4 w-28 h-40 rounded-xl overflow-hidden border-2 border-primary shadow-lg"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              isVideoOff && "hidden"
            )}
            style={{ transform: "scaleX(-1)" }}
          />
          {isVideoOff && (
            <div className="w-full h-full bg-muted flex items-center justify-center">
              <VideoOff className="w-8 h-8 text-muted-foreground" />
            </div>
          )}
        </motion.div>

        {/* Overlay Info */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
          {/* Round indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
            <span className="text-sm font-medium">
              Round {roundNumber}/{totalRounds}
            </span>
          </div>

          {/* Timer */}
          <motion.div
            className={cn(
              "px-4 py-2 rounded-full font-bold text-lg",
              isLowTime 
                ? "bg-destructive text-destructive-foreground" 
                : "bg-background/80 backdrop-blur-sm"
            )}
            animate={isLowTime ? { scale: [1, 1.1, 1] } : {}}
            transition={{ duration: 0.5, repeat: isLowTime ? Infinity : 0 }}
          >
            {timeRemaining}s
          </motion.div>
        </div>

        {/* Partner name */}
        <div className="absolute bottom-24 left-4">
          <div className="px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm">
            <span className="font-medium">{round.partner_name}</span>
          </div>
        </div>

        {error && (
          <div className="absolute top-16 left-4 right-4">
            <div className="px-3 py-2 rounded-lg bg-destructive/80 text-destructive-foreground text-sm text-center">
              {error}
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
        <div className="flex items-center justify-center gap-4">
          <motion.button
            onClick={onToggleMute}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              isMuted ? "bg-destructive" : "bg-muted"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </motion.button>

          <motion.button
            onClick={onEndCall}
            className="w-16 h-16 rounded-full bg-destructive flex items-center justify-center"
            whileTap={{ scale: 0.95 }}
          >
            <PhoneOff className="w-7 h-7 text-white" />
          </motion.button>

          <motion.button
            onClick={onToggleVideo}
            className={cn(
              "w-14 h-14 rounded-full flex items-center justify-center",
              isVideoOff ? "bg-destructive" : "bg-muted"
            )}
            whileTap={{ scale: 0.95 }}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </motion.button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0">
        <Progress value={(timeRemaining / 60) * 100} className="h-1 rounded-none" />
      </div>
    </motion.div>
  );
};

// Voting Screen
interface VotingScreenProps {
  participants: Array<{ user_id: string; display_name: string; avatar_url: string | null }>;
  votes: string[];
  onVote: (userId: string) => void;
}

const VotingScreen = ({ participants, votes, onVote }: VotingScreenProps) => (
  <motion.div
    key="voting"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex-1 flex flex-col p-6 relative overflow-hidden"
  >
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
    
    {/* Golden Sparkles */}
    <div className="absolute inset-0 pointer-events-none">
      <GoldenSparkles />
    </div>
    
    {/* Floating Hearts */}
    <FloatingHearts />
    
    <div className="relative z-10 flex flex-col h-full">
      {/* Header */}
      <motion.div 
        className="text-center mb-6"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/20 border border-primary/30 mb-3 shadow-[0_0_25px_rgba(214,178,107,0.4)]">
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <Heart className="w-8 h-8 text-primary" fill="currentColor" />
          </motion.div>
        </div>
        <h2 className="text-2xl font-bold text-foreground">Qui vous a plu ?</h2>
        <p className="text-muted-foreground">Votez pour vos coups de cœur</p>
      </motion.div>

      {/* Participants grid */}
      <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto">
        {participants.map((p, index) => {
          const isVoted = votes.includes(p.user_id);
          return (
            <motion.button
              key={p.user_id}
              onClick={() => onVote(p.user_id)}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all backdrop-blur-sm",
                isVoted 
                  ? "border-primary bg-primary/20 shadow-[0_0_20px_rgba(214,178,107,0.4)]" 
                  : "border-border/50 bg-background/60 hover:border-primary/50 hover:bg-primary/10"
              )}
              whileTap={{ scale: 0.95 }}
            >
              <div className="relative">
                <Avatar className={cn(
                  "w-20 h-20 mb-2 border-2 transition-all",
                  isVoted ? "border-primary shadow-[0_0_15px_rgba(214,178,107,0.5)]" : "border-transparent"
                )}>
                  <AvatarImage src={p.avatar_url || undefined} />
                  <AvatarFallback className="text-xl bg-primary/20 text-primary">{p.display_name[0]}</AvatarFallback>
                </Avatar>
                
                {isVoted && (
                  <motion.div
                    initial={{ scale: 0, rotate: -180 }}
                    animate={{ scale: 1, rotate: 0 }}
                    className="absolute -top-1 -right-1 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-[0_0_15px_rgba(214,178,107,0.6)]"
                  >
                    <Heart className="w-4 h-4 text-primary-foreground fill-current" />
                  </motion.div>
                )}
              </div>
              <span className="font-medium text-foreground">{p.display_name}</span>
            </motion.button>
          );
        })}
      </div>

      {/* Footer */}
      <motion.div 
        className="mt-4 flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-background/70 backdrop-blur-md border border-primary/20 mx-auto"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <Heart className="w-4 h-4 text-primary" />
        <span className="text-sm text-foreground font-medium">
          {votes.length} vote{votes.length > 1 ? "s" : ""}
        </span>
        <span className="text-muted-foreground">•</span>
        <span className="text-sm text-muted-foreground">Matchs révélés à tous</span>
      </motion.div>
    </div>
  </motion.div>
);

// Results Screen
interface ResultsScreenProps {
  results: Array<{ user_id: string; display_name: string; avatar_url: string | null; is_mutual: boolean }>;
  onClose: () => void;
}

const ResultsScreen = ({ results, onClose }: ResultsScreenProps) => {
  const mutualMatches = results.filter(r => r.is_mutual);

  return (
    <motion.div
      key="results"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex-1 flex flex-col p-6 relative overflow-hidden"
    >
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
      
      {/* Golden Sparkles */}
      <div className="absolute inset-0 pointer-events-none">
        <GoldenSparkles />
      </div>
      
      <div className="relative z-10 flex flex-col h-full">
        {/* Celebration header */}
        <motion.div 
          className="text-center mb-6"
          initial={{ y: -30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
        >
          {mutualMatches.length > 0 ? (
            <>
              <motion.div
                animate={{ rotate: [0, -10, 10, -10, 10, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/20 border border-primary/30 mb-4 shadow-[0_0_40px_rgba(214,178,107,0.5)]"
              >
                <Sparkles className="w-10 h-10 text-primary" />
              </motion.div>
              <h2 className="text-3xl font-bold text-foreground">
                {mutualMatches.length} Match{mutualMatches.length > 1 ? "s" : ""} !
              </h2>
              <p className="text-muted-foreground mt-1">Vous pouvez maintenant discuter</p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-muted/50 border border-border mb-4">
                <Heart className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Pas de match cette fois</h2>
              <p className="text-muted-foreground mt-1">Retentez votre chance !</p>
            </>
          )}
        </motion.div>

        {/* Results list */}
        <div className="flex-1 space-y-3 overflow-y-auto">
          {results.map((result, index) => (
            <motion.div
              key={result.user_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl backdrop-blur-sm",
                result.is_mutual 
                  ? "bg-primary/20 border border-primary/40 shadow-[0_0_20px_rgba(214,178,107,0.3)]" 
                  : "bg-background/60 border border-border/50"
              )}
            >
              <Avatar className={cn(
                "w-14 h-14 border-2",
                result.is_mutual ? "border-primary shadow-[0_0_10px_rgba(214,178,107,0.4)]" : "border-transparent"
              )}>
                <AvatarImage src={result.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/20 text-primary">{result.display_name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <span className="font-semibold text-foreground">{result.display_name}</span>
              </div>
              {result.is_mutual && (
                <motion.div 
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary text-primary-foreground text-sm font-semibold shadow-[0_0_15px_rgba(214,178,107,0.5)]"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                >
                  <Crown className="w-4 h-4" />
                  <span>Match</span>
                </motion.div>
              )}
            </motion.div>
          ))}
        </div>

        {/* Close button */}
        <motion.div
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <Button 
            onClick={onClose} 
            className="w-full mt-6 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground shadow-[0_0_25px_rgba(214,178,107,0.4)] py-6 text-base font-semibold" 
            size="lg"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Terminer
          </Button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default SpeedDatingGame;
