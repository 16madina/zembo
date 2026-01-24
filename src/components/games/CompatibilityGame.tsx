import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, Users, ArrowLeft } from "lucide-react";
import { useCompatibilityGame } from "@/hooks/useCompatibilityGame";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import confetti from "canvas-confetti";

interface CompatibilityGameProps {
  partnerId: string;
  partnerName?: string;
  partnerAvatar?: string;
  onClose: () => void;
}

const CompatibilityGame = ({ 
  partnerId, 
  partnerName: initialPartnerName,
  partnerAvatar: initialPartnerAvatar,
  onClose 
}: CompatibilityGameProps) => {
  const {
    status,
    currentQuestion,
    currentQuestionIndex,
    questions,
    progress,
    compatibilityScore,
    partnerName,
    partnerAvatar,
    myAnswers,
    partnerAnswers,
    startGame,
    submitAnswer,
    resetGame,
  } = useCompatibilityGame(partnerId);

  const [selectedAnswer, setSelectedAnswer] = useState<"A" | "B" | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Auto-start game
  useEffect(() => {
    if (status === "idle") {
      startGame(partnerId);
    }
  }, [status, partnerId, startGame]);

  // Celebrate on completion
  useEffect(() => {
    if (status === "completed" && compatibilityScore >= 60) {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ["#ec4899", "#f43f5e", "#f97316"],
      });
    }
  }, [status, compatibilityScore]);

  const handleAnswer = async (answer: "A" | "B") => {
    if (isAnimating) return;
    
    setSelectedAnswer(answer);
    setIsAnimating(true);
    
    // Animation delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await submitAnswer(answer);
    setSelectedAnswer(null);
    setIsAnimating(false);
  };

  const getScoreMessage = (score: number) => {
    if (score >= 80) return { emoji: "🔥", text: "Match parfait !", color: "text-pink-500" };
    if (score >= 60) return { emoji: "💕", text: "Super compatibles !", color: "text-rose-500" };
    if (score >= 40) return { emoji: "✨", text: "Bonne entente", color: "text-orange-500" };
    if (score >= 20) return { emoji: "🌙", text: "Opposés qui s'attirent ?", color: "text-purple-500" };
    return { emoji: "🎲", text: "Mystère à explorer", color: "text-blue-500" };
  };

  const displayPartnerName = partnerName || initialPartnerName || "Partenaire";
  const displayPartnerAvatar = partnerAvatar || initialPartnerAvatar;

  // Loading state
  if (status === "loading") {
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
        />
      </div>
    );
  }

  // Game completed - Show results
  if (status === "completed") {
    const scoreInfo = getScoreMessage(compatibilityScore);
    
    return (
      <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center p-6">
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.8 }}
          className="text-center max-w-md w-full"
        >
          {/* Score Circle */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative w-40 h-40 mx-auto mb-6"
          >
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                stroke="currentColor"
                strokeWidth="12"
                fill="none"
                className="text-muted/20"
              />
              <motion.circle
                cx="80"
                cy="80"
                r="70"
                stroke="url(#scoreGradient)"
                strokeWidth="12"
                fill="none"
                strokeLinecap="round"
                initial={{ strokeDasharray: "0 440" }}
                animate={{ strokeDasharray: `${(compatibilityScore / 100) * 440} 440` }}
                transition={{ delay: 0.5, duration: 1.5, ease: "easeOut" }}
              />
              <defs>
                <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ec4899" />
                  <stop offset="100%" stopColor="#f97316" />
                </linearGradient>
              </defs>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
                className="text-4xl font-bold bg-gradient-to-r from-pink-500 to-orange-500 bg-clip-text text-transparent"
              >
                {compatibilityScore}%
              </motion.span>
            </div>
          </motion.div>

          {/* Score message */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mb-6"
          >
            <span className="text-5xl mb-2 block">{scoreInfo.emoji}</span>
            <h2 className={`text-2xl font-bold ${scoreInfo.color}`}>
              {scoreInfo.text}
            </h2>
            <p className="text-muted-foreground mt-2">
              Toi et {displayPartnerName}
            </p>
          </motion.div>

          {/* Answer comparison */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1 }}
            className="space-y-3 mb-8"
          >
            {questions.map((q, i) => {
              const myAnswer = myAnswers[q.id];
              const theirAnswer = partnerAnswers[q.id];
              const matching = myAnswer === theirAnswer;
              
              return (
                <motion.div
                  key={q.id}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 1.2 + i * 0.1 }}
                  className={`flex items-center gap-3 p-3 rounded-xl ${
                    matching ? "bg-green-500/10 border border-green-500/30" : "bg-muted/30"
                  }`}
                >
                  <span className="text-lg">{matching ? "✅" : "❌"}</span>
                  <span className="text-sm text-left flex-1 truncate">{q.question}</span>
                </motion.div>
              );
            })}
          </motion.div>

          {/* Actions */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="flex gap-3"
          >
            <Button
              onClick={onClose}
              variant="outline"
              className="flex-1"
            >
              Fermer
            </Button>
            <Button
              onClick={() => {
                resetGame();
                startGame(partnerId);
              }}
              className="flex-1 bg-gradient-to-r from-pink-500 to-orange-500 text-white"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Rejouer
            </Button>
          </motion.div>
        </motion.div>
      </div>
    );
  }

  // Playing state
  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border/50">
        <button onClick={onClose} className="p-2 hover:bg-muted rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-pink-500" />
          <span className="font-semibold">Quiz Compatibilité</span>
        </div>
        
        <Avatar className="w-8 h-8">
          <AvatarImage src={displayPartnerAvatar || undefined} />
          <AvatarFallback>{displayPartnerName?.charAt(0) || "?"}</AvatarFallback>
        </Avatar>
      </div>

      {/* Progress */}
      <div className="px-4 pt-4">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
          <span>Question {currentQuestionIndex + 1}/{questions.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <Progress value={progress} className="h-2" />
      </div>

      {/* Question */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <AnimatePresence mode="wait">
          {currentQuestion && (
            <motion.div
              key={currentQuestion.id}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="text-center w-full max-w-md"
            >
              {/* Question text */}
              <motion.h2
                initial={{ y: -20 }}
                animate={{ y: 0 }}
                className="text-xl font-bold mb-8"
              >
                {currentQuestion.question}
              </motion.h2>

              {/* Options */}
              <div className="space-y-4">
                <motion.button
                  onClick={() => handleAnswer("A")}
                  disabled={isAnimating}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedAnswer === "A"
                      ? "border-pink-500 bg-pink-500/20 scale-[0.98]"
                      : "border-border/50 hover:border-pink-500/50 hover:bg-pink-500/5"
                  }`}
                  whileHover={{ scale: selectedAnswer ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-lg">{currentQuestion.option_a}</span>
                </motion.button>

                <motion.button
                  onClick={() => handleAnswer("B")}
                  disabled={isAnimating}
                  className={`w-full p-4 rounded-2xl border-2 text-left transition-all ${
                    selectedAnswer === "B"
                      ? "border-orange-500 bg-orange-500/20 scale-[0.98]"
                      : "border-border/50 hover:border-orange-500/50 hover:bg-orange-500/5"
                  }`}
                  whileHover={{ scale: selectedAnswer ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <span className="text-lg">{currentQuestion.option_b}</span>
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer hint */}
      <div className="p-4 text-center">
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Users className="w-4 h-4" />
          Joue avec {displayPartnerName}
        </p>
      </div>
    </div>
  );
};

export default CompatibilityGame;
