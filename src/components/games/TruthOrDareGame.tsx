import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Heart, Flame, RotateCcw, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface TruthOrDareGameProps {
  onClose: () => void;
  partnerId?: string;
  partnerName?: string;
}

// Sample truths and dares - these could be fetched from the database
const defaultTruths = [
  "Quel est ton plus grand regret amoureux ?",
  "Quelle est la chose la plus folle que tu as faite par amour ?",
  "As-tu déjà été jaloux(se) de quelqu'un ? Pourquoi ?",
  "Quel est ton type idéal ?",
  "Quelle est ta plus grande peur dans une relation ?",
  "As-tu déjà eu un coup de foudre ? Raconte.",
  "Quel est ton secret le plus embarrassant ?",
  "Quelle est la première chose que tu remarques chez quelqu'un ?",
  "As-tu déjà stalké quelqu'un sur les réseaux sociaux ?",
  "Quel est ton fantasme le plus innocent ?",
  "Si tu pouvais revivre un moment, lequel serait-ce ?",
  "Quelle est la chose la plus romantique qu'on t'a faite ?",
];

const defaultDares = [
  "Envoie un message vocal en chantant",
  "Fais ton plus beau compliment à ton partenaire",
  "Raconte une blague (même nulle !)",
  "Imite quelqu'un de célèbre",
  "Danse pendant 10 secondes",
  "Fais une déclaration d'amour dramatique",
  "Envoie un selfie avec une grimace",
  "Dis 3 choses que tu aimes chez ton partenaire",
  "Chante le refrain de ta chanson préférée",
  "Fais une imitation d'un emoji",
  "Raconte ton pire rendez-vous",
  "Invente un surnom pour ton partenaire",
];

type GameMode = "solo" | "duo";
type Choice = "truth" | "dare" | null;

const GoldenSparkles = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
          y: [0, -30],
        }}
        transition={{
          duration: 2 + Math.random() * 2,
          repeat: Infinity,
          delay: Math.random() * 3,
        }}
      />
    ))}
  </div>
);

const TruthOrDareGame = ({ onClose, partnerId, partnerName }: TruthOrDareGameProps) => {
  const { user } = useAuth();
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  const [choice, setChoice] = useState<Choice>(null);
  const [currentPrompt, setCurrentPrompt] = useState<string>("");
  const [isRevealing, setIsRevealing] = useState(false);
  const [truths, setTruths] = useState<string[]>(defaultTruths);
  const [dares, setDares] = useState<string[]>(defaultDares);
  const [usedTruths, setUsedTruths] = useState<Set<number>>(new Set());
  const [usedDares, setUsedDares] = useState<Set<number>>(new Set());

  // Fetch custom truths and dares from database if available
  useEffect(() => {
    const fetchPrompts = async () => {
      try {
        // Check if truth_or_dare_prompts table exists
        const { data: truthsData } = await supabase
          .from("compatibility_questions")
          .select("question, option_a, option_b")
          .eq("is_active", true)
          .limit(5);
        
        // For now, use default prompts
        // In the future, you can add a dedicated table for truth or dare prompts
      } catch (error) {
        // Use default prompts
      }
    };

    fetchPrompts();
  }, []);

  const getRandomPrompt = (type: "truth" | "dare") => {
    const prompts = type === "truth" ? truths : dares;
    const used = type === "truth" ? usedTruths : usedDares;
    const setUsed = type === "truth" ? setUsedTruths : setUsedDares;

    // Get available indices
    const availableIndices = prompts
      .map((_, i) => i)
      .filter((i) => !used.has(i));

    // Reset if all used
    if (availableIndices.length === 0) {
      setUsed(new Set());
      return prompts[Math.floor(Math.random() * prompts.length)];
    }

    const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
    setUsed(new Set([...used, randomIndex]));
    return prompts[randomIndex];
  };

  const handleChoice = (selectedChoice: "truth" | "dare") => {
    setChoice(selectedChoice);
    setIsRevealing(true);

    // Animate reveal
    setTimeout(() => {
      const prompt = getRandomPrompt(selectedChoice);
      setCurrentPrompt(prompt);
      setIsRevealing(false);
    }, 1000);
  };

  const handleNextRound = () => {
    setChoice(null);
    setCurrentPrompt("");
  };

  const handleReset = () => {
    setChoice(null);
    setCurrentPrompt("");
    setUsedTruths(new Set());
    setUsedDares(new Set());
  };

  // Mode selection screen
  if (!gameMode) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col"
      >
        {/* Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
        <GoldenSparkles />

        {/* Header */}
        <div className="relative z-10 flex items-center justify-between p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-foreground hover:bg-background/50"
          >
            <X className="w-6 h-6" />
          </Button>
          <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
            <span className="text-2xl">🎭</span> Vérité ou Défi
          </h1>
          <div className="w-10" />
        </div>

        {/* Content */}
        <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 gap-8">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-center"
          >
            <h2 className="text-2xl font-bold text-foreground mb-2">
              Comment veux-tu jouer ?
            </h2>
            <p className="text-muted-foreground text-sm">
              Choisis ton mode de jeu
            </p>
          </motion.div>

          <div className="flex flex-col gap-4 w-full max-w-xs">
            <motion.button
              initial={{ x: -50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              onClick={() => setGameMode("solo")}
              className="flex items-center gap-4 p-4 rounded-2xl bg-background/70 backdrop-blur-md border border-primary/30 hover:border-primary/60 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">Solo</h3>
                <p className="text-xs text-muted-foreground">
                  Joue seul(e) et relève les défis !
                </p>
              </div>
            </motion.button>

            <motion.button
              initial={{ x: 50, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.4 }}
              onClick={() => setGameMode("duo")}
              className="flex items-center gap-4 p-4 rounded-2xl bg-background/70 backdrop-blur-md border border-primary/30 hover:border-primary/60 transition-all"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="w-12 h-12 rounded-full bg-accent/30 flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-foreground">En duo</h3>
                <p className="text-xs text-muted-foreground">
                  Joue avec un(e) ami(e) ou un match !
                </p>
              </div>
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col"
    >
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-primary/20 via-background to-background" />
      <GoldenSparkles />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-foreground hover:bg-background/50"
        >
          <X className="w-6 h-6" />
        </Button>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <span className="text-2xl">🎭</span> Vérité ou Défi
        </h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={handleReset}
          className="text-foreground hover:bg-background/50"
        >
          <RotateCcw className="w-5 h-5" />
        </Button>
      </div>

      {/* Game Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-6">
        <AnimatePresence mode="wait">
          {!choice ? (
            // Choice screen
            <motion.div
              key="choice"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex flex-col items-center gap-8"
            >
              <motion.h2
                className="text-2xl font-bold text-foreground text-center"
                animate={{ scale: [1, 1.02, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                Que choisis-tu ?
              </motion.h2>

              <div className="flex gap-4">
                {/* Truth Button */}
                <motion.button
                  onClick={() => handleChoice("truth")}
                  className="relative flex flex-col items-center gap-3 p-6 rounded-3xl bg-background/70 backdrop-blur-md border-2 border-accent/50 hover:border-accent transition-all min-w-[140px]"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-accent/20 flex items-center justify-center"
                    animate={{ rotate: [0, 5, -5, 0] }}
                    transition={{ duration: 3, repeat: Infinity }}
                  >
                    <Heart className="w-8 h-8 text-accent" />
                  </motion.div>
                  <span className="font-bold text-lg text-foreground">Vérité</span>
                  <span className="text-xs text-muted-foreground">Réponds honnêtement</span>
                </motion.button>

                {/* Dare Button */}
                <motion.button
                  onClick={() => handleChoice("dare")}
                  className="relative flex flex-col items-center gap-3 p-6 rounded-3xl bg-background/70 backdrop-blur-md border-2 border-primary/50 hover:border-primary transition-all min-w-[140px]"
                  whileHover={{ scale: 1.05, y: -5 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <motion.div
                    className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                  >
                    <Flame className="w-8 h-8 text-primary" />
                  </motion.div>
                  <span className="font-bold text-lg text-foreground">Défi</span>
                  <span className="text-xs text-muted-foreground">Relève le challenge</span>
                </motion.button>
              </div>
            </motion.div>
          ) : isRevealing ? (
            // Revealing animation
            <motion.div
              key="revealing"
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              className="flex flex-col items-center gap-4"
            >
              <motion.div
                className={`w-24 h-24 rounded-full flex items-center justify-center ${
                  choice === "truth" ? "bg-accent/30" : "bg-primary/30"
                }`}
                animate={{ rotate: 360, scale: [1, 1.2, 1] }}
                transition={{ duration: 1, ease: "easeInOut" }}
              >
                {choice === "truth" ? (
                  <Heart className="w-12 h-12 text-accent" />
                ) : (
                  <Flame className="w-12 h-12 text-primary" />
                )}
              </motion.div>
              <motion.p
                className="text-lg font-medium text-foreground"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 0.5, repeat: Infinity }}
              >
                {choice === "truth" ? "Vérité..." : "Défi..."}
              </motion.p>
            </motion.div>
          ) : (
            // Prompt display
            <motion.div
              key="prompt"
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -50 }}
              className="flex flex-col items-center gap-6 max-w-sm"
            >
              <motion.div
                className={`w-20 h-20 rounded-full flex items-center justify-center ${
                  choice === "truth" ? "bg-accent/30" : "bg-primary/30"
                }`}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200, damping: 15 }}
              >
                {choice === "truth" ? (
                  <Heart className="w-10 h-10 text-accent" />
                ) : (
                  <Flame className="w-10 h-10 text-primary" />
                )}
              </motion.div>

              <motion.div
                className={`p-6 rounded-3xl backdrop-blur-md border-2 ${
                  choice === "truth"
                    ? "bg-accent/10 border-accent/30"
                    : "bg-primary/10 border-primary/30"
                }`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <p className="text-lg font-medium text-foreground text-center leading-relaxed">
                  {currentPrompt}
                </p>
              </motion.div>

              <motion.div
                className="flex gap-3 mt-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
              >
                <Button
                  onClick={handleNextRound}
                  className="px-8 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Suivant
                </Button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="relative z-10 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          {gameMode === "duo" ? "Jouez à tour de rôle !" : "Relève chaque défi !"}
        </p>
      </div>
    </motion.div>
  );
};

export default TruthOrDareGame;
