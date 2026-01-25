import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, Sparkles, MessageCircle, Search, Crown, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { useCompatibilityTest } from "@/hooks/useCompatibilityTest";
import { useNavigate } from "react-router-dom";
import compatibilityBg from "@/assets/compatibility-game-bg.jpg";

interface CompatibilityTestGameProps {
  onClose: () => void;
}

// Golden Sparkle Particles
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

// Floating Hearts
const FloatingHearts = () => {
  const hearts = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    left: `${5 + Math.random() * 90}%`,
    delay: Math.random() * 5,
    duration: 4 + Math.random() * 3,
    size: 12 + Math.random() * 12,
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {hearts.map((h) => (
        <motion.div
          key={h.id}
          className="absolute text-primary/30"
          style={{ left: h.left, bottom: -30 }}
          animate={{
            y: [0, -600],
            opacity: [0, 0.5, 0],
            rotate: [0, 15, -15, 0],
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

const CompatibilityTestGame = ({ onClose }: CompatibilityTestGameProps) => {
  const {
    status,
    currentQuestion,
    currentQuestionIndex,
    questions,
    progress,
    topMatches,
    analysisProgress,
    startTest,
    submitAnswer,
    resetTest,
  } = useCompatibilityTest();

  const navigate = useNavigate();

  const handleStartConversation = (userId: string) => {
    onClose();
    navigate(`/messages?user=${userId}`);
  };

  const getCategoryEmoji = (category: string) => {
    const emojis: Record<string, string> = {
      amour: "💖",
      mentalite: "🧠",
      lifestyle: "🌍",
      valeurs: "💎",
      personnalite: "✨",
      fun: "🎭",
    };
    return emojis[category] || "❓";
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      amour: "Amour & Relation",
      mentalite: "Mentalité",
      lifestyle: "Lifestyle",
      valeurs: "Valeurs",
      personnalite: "Personnalité",
      fun: "Fun",
    };
    return labels[category] || category;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex flex-col bg-background"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border relative z-10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-primary" fill="currentColor" />
          <span className="font-bold text-lg">Test de Compatibilité</span>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {/* Idle - Intro Screen */}
          {status === "idle" && (
            <IntroScreen onStart={startTest} />
          )}

          {/* Loading */}
          {status === "loading" && (
            <LoadingScreen />
          )}

          {/* Answering Questions */}
          {status === "answering" && currentQuestion && (
            <QuestionScreen
              question={currentQuestion}
              questionIndex={currentQuestionIndex}
              totalQuestions={questions.length}
              progress={progress}
              categoryEmoji={getCategoryEmoji(currentQuestion.category)}
              categoryLabel={getCategoryLabel(currentQuestion.category)}
              onAnswer={submitAnswer}
            />
          )}

          {/* Analyzing */}
          {status === "analyzing" && (
            <AnalyzingScreen progress={analysisProgress} />
          )}

          {/* Results */}
          {status === "results" && (
            <ResultsScreen
              matches={topMatches}
              onStartConversation={handleStartConversation}
              onRetake={resetTest}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// Intro Screen
const IntroScreen = ({ onStart }: { onStart: () => void }) => (
  <motion.div
    key="intro"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="h-full w-full flex flex-col relative overflow-hidden"
  >
    {/* Background */}
    <div 
      className="absolute inset-0 bg-cover bg-center bg-no-repeat z-0"
      style={{ backgroundImage: `url(${compatibilityBg})` }}
    />
    <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-transparent to-background z-[1]" />
    
    <GoldenSparkles />
    <FloatingHearts />

    {/* Intro Message */}
    <motion.div 
      className="relative z-10 pt-16 px-6 flex flex-col items-center"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <motion.div
        animate={{ scale: [1, 1.05, 1] }}
        transition={{ duration: 2, repeat: Infinity }}
        className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-4 shadow-lg"
      >
        <Heart className="w-10 h-10 text-primary-foreground" fill="currentColor" />
      </motion.div>

      <h2 className="text-2xl font-bold text-center text-foreground mb-2">
        Découvre ton match idéal
      </h2>
      
      <p className="text-center text-muted-foreground text-sm max-w-xs mb-6">
        Réponds honnêtement. Ton match le plus compatible t'attend peut-être déjà…
      </p>

      {/* Info badges */}
      <div className="flex flex-col gap-2 mb-8">
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium text-sm">15 questions ciblées</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Search className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium text-sm">Algorithme intelligent</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Crown className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium text-sm">Top 5 matchs révélés</span>
        </div>
      </div>
    </motion.div>

    {/* Spacer */}
    <div className="flex-1" />

    {/* Start Button */}
    <motion.div 
      className="relative z-10 px-6 pb-32 flex justify-center"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <motion.div
        animate={{
          boxShadow: [
            "0 0 20px rgba(214,178,107,0.4)",
            "0 0 40px rgba(214,178,107,0.7)",
            "0 0 20px rgba(214,178,107,0.4)",
          ],
        }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="rounded-xl w-full max-w-xs"
      >
        <Button 
          onClick={onStart} 
          size="lg" 
          className="w-full px-12 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground text-lg py-7"
        >
          <Sparkles className="w-5 h-5 mr-2" />
          Commencer le test
        </Button>
      </motion.div>
    </motion.div>
  </motion.div>
);

// Loading Screen
const LoadingScreen = () => (
  <motion.div
    key="loading"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex items-center justify-center"
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
      className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full"
    />
  </motion.div>
);

// Question Screen
interface QuestionScreenProps {
  question: { id: string; question: string; options: string[]; category: string };
  questionIndex: number;
  totalQuestions: number;
  progress: number;
  categoryEmoji: string;
  categoryLabel: string;
  onAnswer: (index: number) => void;
}

const QuestionScreen = ({
  question,
  questionIndex,
  totalQuestions,
  progress,
  categoryEmoji,
  categoryLabel,
  onAnswer,
}: QuestionScreenProps) => (
  <motion.div
    key={`question-${question.id}`}
    initial={{ opacity: 0, x: 50 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: -50 }}
    className="h-full flex flex-col p-4 relative"
  >
    <GoldenSparkles />
    
    {/* Progress */}
    <div className="mb-6 relative z-10">
      <div className="flex items-center justify-between text-sm text-muted-foreground mb-2">
        <span>Question {questionIndex + 1}/{totalQuestions}</span>
        <span className="flex items-center gap-1">
          {categoryEmoji} {categoryLabel}
        </span>
      </div>
      <Progress value={progress} className="h-2" />
    </div>

    {/* Question */}
    <motion.div
      initial={{ scale: 0.95 }}
      animate={{ scale: 1 }}
      className="bg-card/80 backdrop-blur-md rounded-2xl p-6 mb-6 border border-primary/20 relative z-10"
    >
      <h2 className="text-xl font-bold text-center text-foreground">
        {question.question}
      </h2>
    </motion.div>

    {/* Options */}
    <div className="flex-1 flex flex-col gap-3 relative z-10">
      {question.options.map((option, index) => (
        <motion.button
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => onAnswer(index)}
          className="w-full p-4 rounded-xl border border-border bg-card/60 backdrop-blur-sm hover:border-primary hover:bg-primary/10 transition-all text-left"
        >
          <span className="text-base font-medium text-foreground">{option}</span>
        </motion.button>
      ))}
    </div>
  </motion.div>
);

// Analyzing Screen
const AnalyzingScreen = ({ progress }: { progress: number }) => (
  <motion.div
    key="analyzing"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="flex-1 flex flex-col items-center justify-center p-6 relative"
  >
    <GoldenSparkles />
    <FloatingHearts />

    {/* Pulsing circles */}
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      {[1, 2, 3].map((i) => (
        <motion.div
          key={i}
          className="absolute w-32 h-32 rounded-full border-2 border-primary/30"
          animate={{
            scale: [1, 2.5],
            opacity: [0.5, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            delay: i * 0.6,
            ease: "easeOut",
          }}
        />
      ))}
    </div>

    <div className="relative z-10 flex flex-col items-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-amber-500 flex items-center justify-center mb-6 shadow-lg"
      >
        <Search className="w-12 h-12 text-primary-foreground" />
      </motion.div>

      <motion.div
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.5, repeat: Infinity }}
        className="text-center"
      >
        <p className="text-lg font-semibold text-foreground mb-2">
          {progress < 30 && "💫 Analyse en cours..."}
          {progress >= 30 && progress < 60 && "💗 Recherche de connexions..."}
          {progress >= 60 && progress < 90 && "🔥 Calcul de compatibilité..."}
          {progress >= 90 && "✨ Révélation imminente..."}
        </p>
        <p className="text-sm text-muted-foreground">
          Patience, ton destin se dessine...
        </p>
      </motion.div>

      <div className="w-48 mt-6">
        <Progress value={progress} className="h-2" />
      </div>
    </div>
  </motion.div>
);

// Results Screen
interface ResultsScreenProps {
  matches: Array<{
    userId: string;
    displayName: string;
    avatarUrl: string | null;
    score: number;
    age?: number | null;
    location?: string | null;
  }>;
  onStartConversation: (userId: string) => void;
  onRetake: () => void;
  onClose: () => void;
}

const ResultsScreen = ({ matches, onStartConversation, onRetake, onClose }: ResultsScreenProps) => (
  <motion.div
    key="results"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    className="h-full flex flex-col relative overflow-hidden"
  >
    <GoldenSparkles />
    <FloatingHearts />
    
    <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background z-0" />

    <div className="relative z-10 flex-1 overflow-y-auto p-4">
      {matches.length > 0 ? (
        <>
          {/* Header */}
          <motion.div 
            className="text-center mb-6"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <motion.div
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="inline-block mb-2"
            >
              <span className="text-4xl">🎉</span>
            </motion.div>
            <h2 className="text-2xl font-bold text-foreground">
              Tes matchs compatibles !
            </h2>
            <p className="text-sm text-muted-foreground">
              Voici les profils qui te correspondent le mieux
            </p>
          </motion.div>

          {/* Matches List */}
          <div className="space-y-3">
            {matches.map((match, index) => (
              <motion.div
                key={match.userId}
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.15 }}
                className="bg-card/80 backdrop-blur-md rounded-2xl p-4 border border-border/50 shadow-lg"
              >
                <div className="flex items-center gap-4">
                  {/* Rank Badge */}
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${
                    index === 0 ? "bg-gradient-to-br from-yellow-400 to-amber-600 text-white" :
                    index === 1 ? "bg-gradient-to-br from-gray-300 to-gray-500 text-white" :
                    index === 2 ? "bg-gradient-to-br from-amber-600 to-amber-800 text-white" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {index === 0 ? "🥇" : index === 1 ? "🥈" : index === 2 ? "🥉" : index + 1}
                  </div>

                  {/* Avatar */}
                  <Avatar className="w-14 h-14 border-2 border-primary/30">
                    <AvatarImage src={match.avatarUrl || undefined} />
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {match.displayName.charAt(0)}
                    </AvatarFallback>
                  </Avatar>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {match.displayName}
                      {match.age && <span className="text-muted-foreground font-normal">, {match.age}</span>}
                    </p>
                    {match.location && (
                      <p className="text-sm text-muted-foreground truncate">{match.location}</p>
                    )}
                  </div>

                  {/* Score */}
                  <div className="text-right">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: index * 0.15 + 0.3, type: "spring" }}
                      className={`text-xl font-bold ${
                        match.score >= 80 ? "text-green-500" :
                        match.score >= 60 ? "text-primary" :
                        "text-orange-500"
                      }`}
                    >
                      {match.score}%
                    </motion.div>
                    <p className="text-xs text-muted-foreground">compatible</p>
                  </div>
                </div>

                {/* Action Button */}
                <Button 
                  onClick={() => onStartConversation(match.userId)}
                  className="w-full mt-3 bg-gradient-to-r from-primary to-amber-600"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Commencer la conversation
                </Button>
              </motion.div>
            ))}
          </div>
        </>
      ) : (
        /* No Matches */
        <motion.div 
          className="flex-1 flex flex-col items-center justify-center text-center p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-20 h-20 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Users className="w-10 h-10 text-muted-foreground" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">
            Pas encore de matchs
          </h2>
          <p className="text-sm text-muted-foreground mb-6">
            D'autres utilisateurs n'ont pas encore fait le test. Reviens bientôt !
          </p>
        </motion.div>
      )}
    </div>

    {/* Footer Actions */}
    <div className="relative z-10 p-4 border-t border-border/50 bg-background/80 backdrop-blur-md space-y-2">
      <Button variant="outline" onClick={onRetake} className="w-full">
        <Sparkles className="w-4 h-4 mr-2" />
        Refaire le test
      </Button>
      <Button variant="ghost" onClick={onClose} className="w-full">
        Fermer
      </Button>
    </div>
  </motion.div>
);

export default CompatibilityTestGame;
