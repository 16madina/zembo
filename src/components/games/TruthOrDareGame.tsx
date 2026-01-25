import { motion, AnimatePresence } from "framer-motion";
import { X, Users, Zap, Trophy, MessageCircle, Flame, Check, SkipForward, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useTruthOrDare } from "@/hooks/useTruthOrDare";
import speedDatingBg from "@/assets/speed-dating-bg.jpeg";

interface TruthOrDareGameProps {
  onClose: () => void;
}

// Golden Sparkles component
const GoldenSparkles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(20)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-primary rounded-full"
        style={{
          left: `${Math.random() * 100}%`,
          top: `${Math.random() * 100}%`,
        }}
        animate={{
          opacity: [0, 1, 0],
          scale: [0, 1.5, 0],
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 2,
        }}
      />
    ))}
  </div>
);

// Floating particles
const FloatingParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute text-2xl"
        style={{
          left: `${10 + Math.random() * 80}%`,
          bottom: "-20px",
        }}
        animate={{
          y: [0, -400],
          x: [0, (Math.random() - 0.5) * 100],
          opacity: [0, 1, 1, 0],
          rotate: [0, 360],
        }}
        transition={{
          duration: 4 + Math.random() * 2,
          repeat: Infinity,
          delay: i * 0.5,
          ease: "easeOut",
        }}
      >
        {i % 2 === 0 ? "🎭" : "✨"}
      </motion.div>
    ))}
  </div>
);

export default function TruthOrDareGame({ onClose }: TruthOrDareGameProps) {
  const {
    status,
    participants,
    currentChallenge,
    roundNumber,
    isMyTurn,
    waitingForChoice,
    startGame,
    chooseType,
    completeChallenge,
    leaveGame,
    getCurrentPlayer
  } = useTruthOrDare();

  const handleClose = () => {
    leaveGame();
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Background */}
      <div className="absolute inset-0">
        <img src={speedDatingBg} alt="" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background/90 to-background" />
      </div>

      <GoldenSparkles />
      <FloatingParticles />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <motion.h1 
          className="text-2xl font-bold bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent"
          animate={{ 
            backgroundPosition: ["0%", "100%", "0%"],
          }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          Vérité ou Défi 🎭
        </motion.h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClose}
          className="rounded-full bg-background/50 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <AnimatePresence mode="wait">
          {status === "idle" && (
            <IdleScreen key="idle" onStart={startGame} />
          )}
          {status === "searching" && (
            <SearchingScreen key="searching" />
          )}
          {status === "waiting" && (
            <WaitingScreen key="waiting" participants={participants} />
          )}
          {status === "playing" && (
            <PlayingScreen
              key="playing"
              currentPlayer={getCurrentPlayer()}
              currentChallenge={currentChallenge}
              isMyTurn={isMyTurn}
              waitingForChoice={waitingForChoice}
              roundNumber={roundNumber}
              onChoose={chooseType}
              onComplete={completeChallenge}
            />
          )}
          {status === "results" && (
            <ResultsScreen key="results" participants={participants} onClose={handleClose} />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Idle Screen
function IdleScreen({ onStart }: { onStart: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 text-center max-w-md"
    >
      {/* Info badges */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-foreground font-semibold text-base">3+ joueurs</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Zap className="w-5 h-5 text-primary" />
          <span className="text-foreground font-semibold text-base">5 rounds × Tour</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Trophy className="w-5 h-5 text-primary" />
          <span className="text-foreground font-semibold text-base">Score & Classement</span>
        </div>
      </div>

      {/* Description */}
      <p className="text-muted-foreground text-sm px-4">
        Choisissez Vérité ou Défi à tour de rôle. Complétez pour gagner des points !
      </p>

      {/* Start button */}
      <Button
        onClick={onStart}
        size="lg"
        className="px-12 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/40"
      >
        <Zap className="w-5 h-5 mr-2" />
        Jouer
      </Button>
    </motion.div>
  );
}

// Searching Screen
function SearchingScreen() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <motion.div
        className="w-20 h-20 rounded-full border-4 border-primary border-t-transparent"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      />
      <p className="text-lg text-foreground font-medium">Recherche d'une session...</p>
    </motion.div>
  );
}

// Waiting Screen
function WaitingScreen({ participants }: { participants: any[] }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-md"
    >
      <div className="bg-background/70 backdrop-blur-md rounded-3xl p-6 border border-primary/30 shadow-[0_0_40px_rgba(214,178,107,0.2)] w-full">
        <h2 className="text-xl font-bold text-center mb-4 text-foreground">
          Salle d'attente
        </h2>
        
        <div className="flex justify-center items-center gap-3 mb-4">
          <Users className="w-5 h-5 text-primary" />
          <span className="text-lg font-semibold">{participants.length}/3 joueurs</span>
        </div>

        {/* Participant avatars */}
        <div className="flex flex-wrap justify-center gap-4">
          {participants.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: i * 0.1 }}
              className="flex flex-col items-center gap-1"
            >
              <Avatar className="w-14 h-14 border-2 border-primary">
                <AvatarImage src={p.avatar_url || ""} />
                <AvatarFallback className="bg-primary/20">{p.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="text-xs text-muted-foreground truncate max-w-[60px]">
                {p.display_name}
              </span>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-sm text-muted-foreground mt-4">
          En attente de joueurs...
        </p>
      </div>

      {/* Pulsing radar effect */}
      <div className="relative">
        {[1, 2, 3].map((i) => (
          <motion.div
            key={i}
            className="absolute inset-0 rounded-full border border-primary/30"
            style={{ width: 60 + i * 40, height: 60 + i * 40, left: -(i * 20), top: -(i * 20) }}
            animate={{ scale: [1, 1.2], opacity: [0.5, 0] }}
            transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
          />
        ))}
        <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
          <Sparkles className="w-8 h-8 text-primary" />
        </div>
      </div>
    </motion.div>
  );
}

// Playing Screen
function PlayingScreen({
  currentPlayer,
  currentChallenge,
  isMyTurn,
  waitingForChoice,
  roundNumber,
  onChoose,
  onComplete
}: {
  currentPlayer: any;
  currentChallenge: any;
  isMyTurn: boolean;
  waitingForChoice: boolean;
  roundNumber: number;
  onChoose: (choice: "truth" | "dare") => void;
  onComplete: (completed: boolean) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-md"
    >
      {/* Round indicator */}
      <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
        <span className="text-sm font-medium">Round {roundNumber}/5</span>
      </div>

      {/* Current player */}
      <div className="flex items-center gap-3 bg-background/70 backdrop-blur-md rounded-2xl px-6 py-3 border border-primary/30">
        <Avatar className="w-12 h-12 border-2 border-primary">
          <AvatarImage src={currentPlayer?.avatar_url || ""} />
          <AvatarFallback className="bg-primary/20">
            {currentPlayer?.display_name?.[0] || "?"}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-sm text-muted-foreground">C'est au tour de</p>
          <p className="font-bold text-lg">
            {isMyTurn ? "Vous !" : currentPlayer?.display_name}
          </p>
        </div>
      </div>

      {/* Choice or Challenge */}
      <AnimatePresence mode="wait">
        {waitingForChoice && isMyTurn ? (
          <motion.div
            key="choice"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            <p className="text-lg font-medium mb-2">Choisissez :</p>
            <div className="flex gap-4 w-full">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChoose("truth")}
                className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xl shadow-lg flex flex-col items-center gap-2"
              >
                <MessageCircle className="w-8 h-8" />
                Vérité
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => onChoose("dare")}
                className="flex-1 py-6 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 text-white font-bold text-xl shadow-lg flex flex-col items-center gap-2"
              >
                <Flame className="w-8 h-8" />
                Défi
              </motion.button>
            </div>
          </motion.div>
        ) : currentChallenge ? (
          <motion.div
            key="challenge"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="flex flex-col items-center gap-4 w-full"
          >
            {/* Challenge type badge */}
            <div className={`px-4 py-1 rounded-full font-bold text-white ${
              currentChallenge.type === "truth" 
                ? "bg-gradient-to-r from-blue-500 to-indigo-600" 
                : "bg-gradient-to-r from-orange-500 to-red-600"
            }`}>
              {currentChallenge.type === "truth" ? "VÉRITÉ" : "DÉFI"}
            </div>

            {/* Challenge content */}
            <div className="bg-background/80 backdrop-blur-md rounded-2xl p-6 border border-primary/30 w-full">
              <p className="text-lg text-center font-medium">{currentChallenge.content}</p>
              <div className="flex justify-center mt-3 gap-1">
                {[...Array(currentChallenge.difficulty)].map((_, i) => (
                  <span key={i} className="text-primary">⭐</span>
                ))}
              </div>
            </div>

            {/* Action buttons (only for current player) */}
            {isMyTurn && (
              <div className="flex gap-3 w-full mt-2">
                <Button
                  onClick={() => onComplete(false)}
                  variant="outline"
                  className="flex-1 border-red-500/50 text-red-500"
                >
                  <SkipForward className="w-4 h-4 mr-2" />
                  Passer
                </Button>
                <Button
                  onClick={() => onComplete(true)}
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Fait !
                </Button>
              </div>
            )}
          </motion.div>
        ) : !isMyTurn ? (
          <motion.div
            key="waiting"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center text-muted-foreground"
          >
            <p>En attente du choix de {currentPlayer?.display_name}...</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.div>
  );
}

// Results Screen
function ResultsScreen({ participants, onClose }: { participants: any[]; onClose: () => void }) {
  const sorted = [...participants].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 w-full max-w-md"
    >
      <div className="bg-background/70 backdrop-blur-md rounded-3xl p-6 border border-primary/30 shadow-[0_0_40px_rgba(214,178,107,0.2)] w-full">
        <h2 className="text-2xl font-bold text-center mb-2">
          🏆 Résultats 🏆
        </h2>
        
        {/* Winner */}
        <div className="flex flex-col items-center my-6">
          <motion.div
            animate={{ scale: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            <Avatar className="w-20 h-20 border-4 border-primary shadow-[0_0_20px_rgba(214,178,107,0.5)]">
              <AvatarImage src={winner?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/20 text-2xl">
                {winner?.display_name?.[0] || "?"}
              </AvatarFallback>
            </Avatar>
          </motion.div>
          <p className="text-xl font-bold mt-2">{winner?.display_name}</p>
          <p className="text-primary font-bold">{winner?.score} pts</p>
        </div>

        {/* Leaderboard */}
        <div className="space-y-2">
          {sorted.map((p, i) => (
            <div
              key={p.id}
              className={`flex items-center gap-3 p-3 rounded-xl ${
                i === 0 ? "bg-primary/20 border border-primary/30" : "bg-background/50"
              }`}
            >
              <span className="text-lg font-bold w-6">{i + 1}.</span>
              <Avatar className="w-10 h-10">
                <AvatarImage src={p.avatar_url || ""} />
                <AvatarFallback>{p.display_name[0]}</AvatarFallback>
              </Avatar>
              <span className="flex-1 font-medium">{p.display_name}</span>
              <span className="font-bold text-primary">{p.score} pts</span>
            </div>
          ))}
        </div>
      </div>

      <Button onClick={onClose} className="bg-gradient-to-r from-primary to-amber-600">
        Terminer
      </Button>
    </motion.div>
  );
}
