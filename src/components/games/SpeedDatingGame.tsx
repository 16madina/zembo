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
      {/* Header */}
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

// Idle Screen Component
const IdleScreen = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    key="idle"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex-1 flex flex-col items-center justify-center p-6 text-center relative overflow-hidden"
  >
    {/* Background Image */}
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${speedDatingBg})` }}
    />
    {/* Gradient Overlay */}
    <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-background/40" />
    
    {/* Content */}
    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-6 shadow-[0_0_40px_rgba(214,178,107,0.6)]"
      >
        <Zap className="w-12 h-12 text-primary-foreground" />
      </motion.div>
      
      <h2 className="text-2xl font-bold mb-2 text-primary">Speed Dating Vidéo</h2>
      <p className="text-muted-foreground mb-6 max-w-xs">
        Rencontrez plusieurs personnes en sessions de 60 secondes, puis votez pour vos coups de cœur !
      </p>

      <div className="space-y-2 mb-8 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span>3 rounds de 60 secondes</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Users className="w-4 h-4 text-primary" />
          <span>4 participants minimum</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Heart className="w-4 h-4 text-primary" />
          <span>Votes mutuels = Match !</span>
        </div>
      </div>

      <Button 
        onClick={onStart} 
        size="lg" 
        className="bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground shadow-[0_0_20px_rgba(214,178,107,0.4)]"
      >
        <Zap className="w-5 h-5 mr-2" />
        Commencer
      </Button>
    </div>
  </motion.div>
);

// Searching Screen
const SearchingScreen = () => (
  <motion.div
    key="searching"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-6"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full mb-6"
    />
    <p className="text-muted-foreground">Recherche d'une session...</p>
  </motion.div>
);

// Waiting Room Screen
const WaitingRoomScreen = ({ participants }: { participants: Array<{ user_id: string; display_name: string; avatar_url: string | null }> }) => (
  <motion.div
    key="waiting"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    exit={{ opacity: 0, y: -20 }}
    className="flex-1 flex flex-col items-center justify-center p-6"
  >
    <Users className="w-12 h-12 text-primary mb-4" />
    <h3 className="text-xl font-bold mb-2">Salle d'attente</h3>
    <p className="text-muted-foreground mb-6">
      {participants.length + 1}/4 participants minimum
    </p>

    <div className="flex flex-wrap justify-center gap-3 mb-6">
      {participants.map((p) => (
        <motion.div
          key={p.user_id}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="flex flex-col items-center"
        >
          <Avatar className="w-16 h-16 border-2 border-primary">
            <AvatarImage src={p.avatar_url || undefined} />
            <AvatarFallback>{p.display_name[0]}</AvatarFallback>
          </Avatar>
          <span className="text-xs mt-1 text-muted-foreground">{p.display_name}</span>
        </motion.div>
      ))}
    </div>

    <motion.div
      animate={{ opacity: [0.5, 1, 0.5] }}
      transition={{ duration: 2, repeat: Infinity }}
      className="text-sm text-muted-foreground"
    >
      En attente d'autres participants...
    </motion.div>
  </motion.div>
);

// Countdown Screen
const CountdownScreen = ({ timeRemaining }: { timeRemaining: number }) => (
  <motion.div
    key="countdown"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-6"
  >
    <motion.div
      key={timeRemaining}
      initial={{ scale: 0.5, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{ scale: 1.5, opacity: 0 }}
      className="text-8xl font-bold text-primary"
    >
      {timeRemaining}
    </motion.div>
    <p className="text-muted-foreground mt-4">Préparez-vous !</p>
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
    className="flex-1 flex flex-col p-6"
  >
    <div className="text-center mb-6">
      <Heart className="w-12 h-12 text-pink-500 mx-auto mb-2" />
      <h2 className="text-2xl font-bold">Qui vous a plu ?</h2>
      <p className="text-muted-foreground">Votez pour vos coups de cœur</p>
    </div>

    <div className="flex-1 grid grid-cols-2 gap-4 overflow-y-auto">
      {participants.map((p) => {
        const isVoted = votes.includes(p.user_id);
        return (
          <motion.button
            key={p.user_id}
            onClick={() => onVote(p.user_id)}
            className={cn(
              "relative flex flex-col items-center p-4 rounded-2xl border-2 transition-all",
              isVoted 
                ? "border-pink-500 bg-pink-500/10" 
                : "border-border bg-card hover:border-pink-500/50"
            )}
            whileTap={{ scale: 0.98 }}
          >
            <Avatar className="w-20 h-20 mb-2">
              <AvatarImage src={p.avatar_url || undefined} />
              <AvatarFallback className="text-xl">{p.display_name[0]}</AvatarFallback>
            </Avatar>
            <span className="font-medium">{p.display_name}</span>
            
            {isVoted && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-pink-500 flex items-center justify-center"
              >
                <Heart className="w-4 h-4 text-white fill-white" />
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>

    <p className="text-center text-sm text-muted-foreground mt-4">
      {votes.length} vote{votes.length > 1 ? "s" : ""} • Les matchs seront révélés à tous
    </p>
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
      className="flex-1 flex flex-col p-6"
    >
      {/* Celebration header */}
      <div className="text-center mb-6">
        {mutualMatches.length > 0 ? (
          <>
            <motion.div
              animate={{ rotate: [0, -10, 10, -10, 10, 0] }}
              transition={{ duration: 0.5 }}
              className="inline-block"
            >
              <Sparkles className="w-12 h-12 text-yellow-500 mx-auto mb-2" />
            </motion.div>
            <h2 className="text-2xl font-bold">
              {mutualMatches.length} Match{mutualMatches.length > 1 ? "s" : ""} !
            </h2>
            <p className="text-muted-foreground">Vous pouvez maintenant discuter</p>
          </>
        ) : (
          <>
            <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
            <h2 className="text-2xl font-bold">Pas de match cette fois</h2>
            <p className="text-muted-foreground">Retentez votre chance !</p>
          </>
        )}
      </div>

      {/* Results list */}
      <div className="flex-1 space-y-3 overflow-y-auto">
        {results.map((result, index) => (
          <motion.div
            key={result.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "flex items-center gap-3 p-3 rounded-xl",
              result.is_mutual 
                ? "bg-gradient-to-r from-pink-500/20 to-purple-500/20 border border-pink-500/30" 
                : "bg-card border border-border"
            )}
          >
            <Avatar className="w-12 h-12">
              <AvatarImage src={result.avatar_url || undefined} />
              <AvatarFallback>{result.display_name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <span className="font-medium">{result.display_name}</span>
            </div>
            {result.is_mutual && (
              <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-pink-500 text-white text-xs font-medium">
                <Crown className="w-3 h-3" />
                <span>Match</span>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Close button */}
      <Button onClick={onClose} className="mt-4" size="lg">
        Terminer
      </Button>
    </motion.div>
  );
};

export default SpeedDatingGame;
