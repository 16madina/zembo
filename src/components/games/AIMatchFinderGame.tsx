import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Heart, MessageCircle, Coins, Search, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface AIMatchFinderGameProps {
  onClose: () => void;
}

interface ProfilePreview {
  userId: string;
  avatarUrl: string | null;
  displayName: string;
}

interface MatchResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  location: string | null;
  compatibilityScore: number;
}

interface OracleAnswers {
  seeking: string;
  connectionType: string;
  attraction: string;
  frequency: string;
  lookingFor: string[];
}

type GameStatus = "questionnaire" | "idle" | "shuffling" | "scanning" | "revealing" | "revealed" | "matched";

const MATCH_COST = 50;

// Questionnaire options
const QUESTIONS = [
  {
    id: "lookingFor",
    title: "Tu recherches qui ?",
    subtitle: "(plusieurs choix possibles)",
    multiSelect: true,
    options: [
      { id: "homme", emoji: "👨", label: "Homme" },
      { id: "femme", emoji: "👩", label: "Femme" },
      { id: "lgbt", emoji: "🏳️‍🌈", label: "LGBT+" },
    ]
  },
  {
    id: "seeking",
    title: "Que recherches-tu en ce moment ?",
    options: [
      { id: "serious", emoji: "💘", label: "Une relation sérieuse" },
      { id: "casual", emoji: "🌊", label: "Quelque chose de léger" },
      { id: "friends", emoji: "🤝", label: "De nouvelles rencontres" },
      { id: "test", emoji: "🎭", label: "Juste tester le jeu" },
    ]
  },
  {
    id: "connectionType",
    title: "Quel type de connexion te correspond ?",
    options: [
      { id: "passionate", emoji: "🔥", label: "Passionnée & intense" },
      { id: "calm", emoji: "🧘", label: "Calme & stable" },
      { id: "fun", emoji: "😂", label: "Fun & décontractée" },
      { id: "intellectual", emoji: "🧠", label: "Intellectuelle & stimulante" },
    ]
  },
  {
    id: "attraction",
    title: "Qu'est-ce qui t'attire en premier ?",
    options: [
      { id: "style", emoji: "😍", label: "Le style / l'apparence" },
      { id: "personality", emoji: "🧠", label: "La personnalité" },
      { id: "energy", emoji: "💬", label: "L'énergie / le vibe" },
      { id: "kindness", emoji: "❤️", label: "La gentillesse" },
    ]
  },
  {
    id: "frequency",
    title: "À quelle fréquence veux-tu matcher ?",
    options: [
      { id: "now", emoji: "⚡️", label: "Maintenant (instantané)" },
      { id: "daily", emoji: "🔁", label: "Une fois par jour" },
      { id: "weekly", emoji: "🌙", label: "Une fois par semaine" },
      { id: "random", emoji: "🎲", label: "Quand j'en ai envie" },
    ]
  },
];

// Scanning laser effect
const ScanningLaser = () => (
  <motion.div
    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent"
    initial={{ top: 0 }}
    animate={{ top: ["0%", "100%", "0%"] }}
    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
    style={{ boxShadow: "0 0 20px 5px hsl(var(--primary) / 0.5)" }}
  />
);

// Neural network animation around the photo
const NeuralNetwork = () => (
  <div className="absolute inset-0 pointer-events-none overflow-hidden rounded-3xl">
    {[...Array(8)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full bg-primary"
        style={{
          left: `${10 + (i % 4) * 25}%`,
          top: `${15 + Math.floor(i / 4) * 70}%`,
        }}
        animate={{
          scale: [0, 1.5, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.2,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
    {/* Connection lines */}
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={`line-${i}`}
        className="absolute bg-gradient-to-r from-primary/50 via-primary to-primary/50 h-0.5"
        style={{
          width: 40 + Math.random() * 60,
          left: `${Math.random() * 80}%`,
          top: `${Math.random() * 100}%`,
          transform: `rotate(${Math.random() * 360}deg)`,
        }}
        animate={{
          opacity: [0, 0.8, 0],
          scaleX: [0, 1, 0],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.1,
        }}
      />
    ))}
  </div>
);

// Glowing pulse effect
const GlowingPulse = ({ color = "primary" }: { color?: string }) => (
  <motion.div
    className={`absolute inset-0 rounded-3xl border-4 border-${color}`}
    animate={{
      boxShadow: [
        "0 0 20px 5px hsl(var(--primary) / 0.3)",
        "0 0 40px 15px hsl(var(--primary) / 0.5)",
        "0 0 20px 5px hsl(var(--primary) / 0.3)",
      ],
    }}
    transition={{ duration: 1.5, repeat: Infinity }}
  />
);

export default function AIMatchFinderGame({ onClose }: AIMatchFinderGameProps) {
  const { user } = useAuth();
  const { balance, spendCoins, refetch } = useCoins();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<GameStatus>("questionnaire");
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [oracleAnswers, setOracleAnswers] = useState<OracleAnswers>({
    seeking: "",
    connectionType: "",
    attraction: "",
    frequency: "",
    lookingFor: [],
  });
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [myProfile, setMyProfile] = useState<{ avatarUrl: string | null; displayName: string } | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);
  const [shuffleProfiles, setShuffleProfiles] = useState<ProfilePreview[]>([]);
  const [currentShuffleIndex, setCurrentShuffleIndex] = useState(0);
  const [allProfiles, setAllProfiles] = useState<any[]>([]);
  const shuffleIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch user's profile
  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("avatar_url, display_name")
        .eq("user_id", user.id)
        .single();
      
      if (data) {
        setMyProfile({
          avatarUrl: data.avatar_url,
          displayName: data.display_name || "Moi",
        });
      }
    };
    fetchProfile();
  }, [user]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
      }
    };
  }, []);

  // Handle questionnaire answer
  const handleAnswer = (questionId: string, answerId: string) => {
    const question = QUESTIONS.find(q => q.id === questionId);
    
    // Handle multi-select questions (like lookingFor)
    if (question?.multiSelect) {
      setOracleAnswers(prev => {
        const currentValues = prev[questionId as keyof OracleAnswers];
        if (Array.isArray(currentValues)) {
          if (currentValues.includes(answerId)) {
            return { ...prev, [questionId]: currentValues.filter(v => v !== answerId) };
          } else {
            return { ...prev, [questionId]: [...currentValues, answerId] };
          }
        }
        return prev;
      });
    } else {
      // Single select - auto-advance
      setOracleAnswers(prev => ({ ...prev, [questionId]: answerId }));
      
      if (currentQuestion < QUESTIONS.length - 1) {
        setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
      } else {
        setTimeout(() => setStatus("idle"), 500);
      }
    }
  };

  // Confirm multi-select and move to next question
  const confirmMultiSelect = () => {
    if (currentQuestion < QUESTIONS.length - 1) {
      setTimeout(() => setCurrentQuestion(prev => prev + 1), 300);
    } else {
      setTimeout(() => setStatus("idle"), 500);
    }
  };

  // Start the full experience
  const startScan = async () => {
    if (!user) {
      toast.error("Tu dois être connecté");
      return;
    }

    // Use the answer from questionnaire for gender preference (multi-select)
    const lookingFor = oracleAnswers.lookingFor;

    let query = supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url, age, location, gender")
      .neq("user_id", user.id)
      .not("avatar_url", "is", null);

    // Filter by gender based on Oracle questionnaire answers (multi-select)
    if (lookingFor.length > 0) {
      query = query.in("gender", lookingFor);
    }

    const { data: profiles } = await query.limit(50);

    if (!profiles || profiles.length < 3) {
      toast.error("Pas assez de profils pour le scan");
      return;
    }

    setAllProfiles(profiles);
    
    // Create shuffle preview profiles
    const shufflePreviews: ProfilePreview[] = profiles.slice(0, 15).map(p => ({
      userId: p.user_id,
      avatarUrl: p.avatar_url,
      displayName: p.display_name || "Inconnu",
    }));
    setShuffleProfiles(shufflePreviews);

    // Start shuffling phase
    setStatus("shuffling");
    setCurrentShuffleIndex(0);

    // Fast shuffle through profiles
    let shuffleSpeed = 100; // Start fast
    let index = 0;
    
    shuffleIntervalRef.current = setInterval(() => {
      index = (index + 1) % shufflePreviews.length;
      setCurrentShuffleIndex(index);
    }, shuffleSpeed);

    // After 2s, slow down and transition to scanning
    setTimeout(() => {
      if (shuffleIntervalRef.current) {
        clearInterval(shuffleIntervalRef.current);
      }
      
      // Slower shuffle
      shuffleSpeed = 200;
      shuffleIntervalRef.current = setInterval(() => {
        index = (index + 1) % shufflePreviews.length;
        setCurrentShuffleIndex(index);
      }, shuffleSpeed);

      // After 1.5s more, go to scanning
      setTimeout(() => {
        if (shuffleIntervalRef.current) {
          clearInterval(shuffleIntervalRef.current);
        }
        beginScanning(profiles);
      }, 1500);
    }, 2000);
  };

  // Begin the actual scanning phase
  const beginScanning = async (profiles: any[]) => {
    setStatus("scanning");
    setScanProgress(0);

    // Progress animation
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 2;
      });
    }, 80);

    try {
      // Fetch compatibility scores
      const { data: compatScores } = await supabase
        .from("compatibility_scores")
        .select("user2_id, score")
        .eq("user1_id", user!.id)
        .order("score", { ascending: false })
        .limit(10);

      // Wait for scanning animation
      await new Promise(resolve => setTimeout(resolve, 4000));
      clearInterval(progressInterval);
      setScanProgress(100);

      // Score profiles
      const scoredProfiles = profiles.map(profile => {
        const compatScore = compatScores?.find(s => s.user2_id === profile.user_id);
        const score = compatScore?.score || Math.floor(Math.random() * 40 + 60);
        
        return {
          userId: profile.user_id,
          displayName: profile.display_name || "Inconnu",
          avatarUrl: profile.avatar_url,
          age: profile.age,
          location: profile.location,
          compatibilityScore: score,
        };
      });

      scoredProfiles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      const bestMatch = scoredProfiles[0];

      // Transition to revealing phase
      setStatus("revealing");
      setMatchResult(bestMatch);

      // After dramatic reveal animation
      setTimeout(() => {
        setStatus("revealed");
      }, 2000);

    } catch (error) {
      console.error("Error finding match:", error);
      clearInterval(progressInterval);
      toast.error("Erreur lors de la recherche");
      setStatus("idle");
    }
  };

  // Match with the revealed profile (costs coins)
  const handleMatch = async () => {
    if (!user || !matchResult) return;

    if (balance < MATCH_COST) {
      toast.error(`Tu as besoin de ${MATCH_COST} coins pour matcher`);
      return;
    }

    setIsCreatingMatch(true);

    try {
      // Spend coins
      const success = await spendCoins(MATCH_COST);
      if (!success) {
        toast.error("Erreur lors du paiement");
        setIsCreatingMatch(false);
        return;
      }

      // Create a like (which may trigger a match)
      const { error: likeError } = await supabase
        .from("likes")
        .upsert({
          liker_id: user.id,
          liked_id: matchResult.userId,
          is_super_like: true, // AI match counts as super like
        });

      if (likeError) {
        console.error("Error creating like:", likeError);
        toast.error("Erreur lors du match");
        setIsCreatingMatch(false);
        return;
      }

      await refetch();
      setStatus("matched");
      toast.success("Match créé ! Tu peux maintenant discuter 💬");

    } catch (error) {
      console.error("Error matching:", error);
      toast.error("Erreur lors du match");
    } finally {
      setIsCreatingMatch(false);
    }
  };

  // Navigate to messages
  const goToMessages = () => {
    if (matchResult) {
      navigate(`/messages?chat=${matchResult.userId}`);
    }
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
      <div className="absolute inset-0 bg-background" />
      <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/10" />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between p-4">
        <motion.h1 
          className="text-xl font-bold flex items-center gap-2"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <span className="text-2xl">🔮</span>
          <span className="bg-gradient-to-r from-primary via-primary/70 to-primary bg-clip-text text-transparent">
            Zembo Oracle
          </span>
        </motion.h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="rounded-full bg-background/50 backdrop-blur-sm"
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Content */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 pb-32">
        <AnimatePresence mode="wait">
          {status === "questionnaire" && (
            <QuestionnaireScreen
              key="questionnaire"
              currentQuestion={currentQuestion}
              onAnswer={handleAnswer}
              onConfirmMultiSelect={confirmMultiSelect}
              answers={oracleAnswers}
            />
          )}
          {status === "idle" && (
            <IdleScreen 
              key="idle" 
              myProfile={myProfile} 
              onStart={startScan} 
            />
          )}
          {status === "shuffling" && (
            <ShufflingScreen
              key="shuffling"
              myProfile={myProfile}
              shuffleProfiles={shuffleProfiles}
              currentIndex={currentShuffleIndex}
            />
          )}
          {status === "scanning" && (
            <ScanningScreenNew 
              key="scanning" 
              myProfile={myProfile} 
              progress={scanProgress} 
            />
          )}
          {status === "revealing" && matchResult && (
            <RevealingScreen
              key="revealing"
              myProfile={myProfile}
              matchResult={matchResult}
            />
          )}
          {status === "revealed" && matchResult && (
            <RevealedScreen
              key="revealed"
              myProfile={myProfile}
              matchResult={matchResult}
              balance={balance}
              matchCost={MATCH_COST}
              onMatch={handleMatch}
              onScanAgain={() => setStatus("idle")}
              isLoading={isCreatingMatch}
            />
          )}
          {status === "matched" && matchResult && (
            <MatchedScreen
              key="matched"
              matchResult={matchResult}
              onMessage={goToMessages}
              onClose={onClose}
            />
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// Questionnaire Screen - 5 questions before scanning (with multi-select support)
function QuestionnaireScreen({
  currentQuestion,
  onAnswer,
  onConfirmMultiSelect,
  answers,
}: {
  currentQuestion: number;
  onAnswer: (questionId: string, answerId: string) => void;
  onConfirmMultiSelect: () => void;
  answers: OracleAnswers;
}) {
  const question = QUESTIONS[currentQuestion];
  const progress = ((currentQuestion + 1) / QUESTIONS.length) * 100;
  const isMultiSelect = question.multiSelect === true;
  const currentAnswerValue = answers[question.id as keyof OracleAnswers];
  const selectedItems = Array.isArray(currentAnswerValue) ? currentAnswerValue : [];
  const canConfirm = selectedItems.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 text-center max-w-md w-full px-4"
    >
      {/* Oracle icon with mystical animation */}
      <motion.div
        className="relative"
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <span className="text-6xl">🔮</span>
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{ 
            boxShadow: [
              "0 0 20px 10px hsl(var(--primary) / 0.2)",
              "0 0 40px 20px hsl(var(--primary) / 0.4)",
              "0 0 20px 10px hsl(var(--primary) / 0.2)",
            ]
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>

      {/* Progress indicator */}
      <div className="w-full space-y-2">
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Question {currentQuestion + 1} / {QUESTIONS.length}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-primary/70"
            initial={{ width: `${((currentQuestion) / QUESTIONS.length) * 100}%` }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentQuestion}
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -50 }}
          className="w-full space-y-4"
        >
          <div>
            <h2 className="text-lg font-bold text-foreground">
              {question.title}
            </h2>
            {question.subtitle && (
              <p className="text-xs text-muted-foreground mt-1">
                {question.subtitle}
              </p>
            )}
          </div>

          {/* Options */}
          <div className={`grid gap-3 ${isMultiSelect ? 'grid-cols-3' : 'grid-cols-1'}`}>
            {question.options.map((option, index) => {
              const isSelected = isMultiSelect && selectedItems.includes(option.id);
              
              return (
                <motion.button
                  key={option.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => onAnswer(question.id, option.id)}
                  className={`relative flex ${isMultiSelect ? 'flex-col' : ''} items-center gap-3 p-4 rounded-2xl bg-background/80 backdrop-blur-sm border-2 transition-all active:scale-95 ${
                    isSelected 
                      ? 'border-primary bg-primary/20' 
                      : 'border-primary/20 hover:border-primary/50 hover:bg-primary/10'
                  }`}
                >
                  <span className={isMultiSelect ? 'text-3xl' : 'text-2xl'}>{option.emoji}</span>
                  <span className={`text-sm font-medium text-foreground ${isMultiSelect ? 'text-center' : 'flex-1 text-left'}`}>
                    {option.label}
                  </span>
                  {isMultiSelect && isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center"
                    >
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </motion.div>
                  )}
                  {!isMultiSelect && (
                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Confirm button for multi-select */}
          {isMultiSelect && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Button
                onClick={onConfirmMultiSelect}
                disabled={!canConfirm}
                className="w-full mt-4 bg-gradient-to-r from-primary to-primary/80"
              >
                Continuer ({selectedItems.length} sélectionné{selectedItems.length > 1 ? 's' : ''})
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Mystical hint */}
      <motion.p
        className="text-xs text-muted-foreground italic"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        L'Oracle analyse tes réponses pour trouver ton âme sœur...
      </motion.p>
    </motion.div>
  );
}

// Animated Crystal Ball Component with VS inside - like the golden dice
const AnimatedCrystalBall = ({ isExiting = false, showVS = false }: { isExiting?: boolean; showVS?: boolean }) => {
  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={isExiting ? { 
        scale: [1, 1.5, 8],
        opacity: [1, 1, 0],
        y: [0, -50, -200],
        rotate: [0, 15, 45]
      } : { 
        scale: 1, 
        opacity: 1 
      }}
      transition={isExiting ? {
        duration: 0.8,
        ease: [0.4, 0, 0.2, 1],
        times: [0, 0.3, 1]
      } : { 
        type: "spring", 
        damping: 15, 
        stiffness: 100,
      }}
      className="relative flex items-center justify-center"
      style={{ perspective: "1000px" }}
    >
      {/* Crystal Ball with animations */}
      <motion.div
        className="relative w-28 h-28"
        animate={isExiting ? {} : {
          y: [0, -5, 0],
          rotate: [0, 2, -2, 0],
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      >
        {/* Main crystal ball */}
        <div className="relative w-full h-full">
          {/* Glow effect behind */}
          <motion.div
            className="absolute inset-0 rounded-full blur-xl"
            animate={{
              background: [
                "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
                "radial-gradient(circle, hsl(var(--primary) / 0.6) 0%, transparent 70%)",
                "radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)",
              ],
              scale: [1, 1.2, 1],
            }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          
          {/* Crystal ball emoji with enhanced styling */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center text-[80px]"
            animate={isExiting ? {
              rotateZ: [0, 360, 720],
              rotateX: [0, 180, 360],
            } : {}}
            transition={isExiting ? {
              duration: 0.8,
              ease: "easeOut"
            } : {}}
            style={{ transformStyle: "preserve-3d" }}
          >
            🔮
          </motion.div>

          {/* VS text inside the ball */}
          {showVS && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center z-10"
              animate={{ 
                scale: [1, 1.15, 1],
                textShadow: [
                  "0 0 10px hsl(var(--primary))",
                  "0 0 20px hsl(var(--primary))",
                  "0 0 10px hsl(var(--primary))",
                ]
              }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-xl font-black text-primary drop-shadow-lg" style={{ 
                textShadow: "0 0 10px hsl(var(--primary)), 0 2px 4px rgba(0,0,0,0.5)" 
              }}>
                VS
              </span>
            </motion.div>
          )}

          {/* Floating sparkles around the ball */}
          {[0, 1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="absolute text-lg"
              style={{
                left: `${50 + 50 * Math.cos((i * Math.PI * 2) / 4)}%`,
                top: `${50 + 50 * Math.sin((i * Math.PI * 2) / 4)}%`,
                transform: "translate(-50%, -50%)",
              }}
              animate={{
                opacity: [0, 1, 0],
                scale: [0.5, 1.2, 0.5],
                rotate: [0, 180, 360],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
                ease: "easeInOut",
              }}
            >
              ✨
            </motion.div>
          ))}
        </div>

        {/* Mystical base/stand */}
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full bg-gradient-to-r from-primary/20 via-primary/40 to-primary/20 blur-md"
          animate={{
            scaleX: [1, 1.1, 1],
            opacity: [0.5, 0.8, 0.5],
          }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </motion.div>
    </motion.div>
  );
};

// Idle Screen - Photos on sides with crystal ball (VS) in the middle
function IdleScreen({ 
  myProfile, 
  onStart 
}: { 
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  onStart: () => void;
}) {
  const [isExiting, setIsExiting] = useState(false);

  const handleStart = () => {
    setIsExiting(true);
    // Wait for animation to complete before starting scan
    setTimeout(() => {
      onStart();
    }, 800);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-4 text-center max-w-md relative"
    >
      {/* Crystal Ball with VS - Positioned absolutely so it can fly out */}
      <div className="absolute left-1/2 -translate-x-1/2 top-8 z-20 pointer-events-none">
        <AnimatedCrystalBall isExiting={isExiting} showVS={true} />
      </div>

      {/* Photos on each side */}
      <motion.div 
        className="flex items-center justify-center gap-24 pt-4"
        animate={isExiting ? { 
          opacity: 0, 
          scale: 0.8,
          y: 20 
        } : { 
          opacity: 1, 
          scale: 1,
          y: 0 
        }}
        transition={{ duration: 0.3, delay: isExiting ? 0.2 : 0 }}
      >
        {/* My profile - Left side */}
        <motion.div
          className="relative"
          initial={{ x: -50, opacity: 0, scale: 0.8 }}
          animate={isExiting ? { x: -100, opacity: 0 } : { x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: isExiting ? 0.1 : 0.2, type: "spring" }}
        >
          <div className="w-32 h-44 rounded-2xl border-3 border-primary/50 overflow-hidden bg-primary/10 shadow-xl shadow-primary/20">
            {myProfile?.avatarUrl ? (
              <img 
                src={myProfile.avatarUrl} 
                alt="Toi" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="text-4xl">👤</span>
              </div>
            )}
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full shadow-lg">
            TOI
          </span>
        </motion.div>

        {/* Mystery slot - Right side */}
        <motion.div
          className="relative"
          initial={{ x: 50, opacity: 0, scale: 0.8 }}
          animate={isExiting ? { x: 100, opacity: 0 } : { x: 0, opacity: 1, scale: 1 }}
          transition={{ delay: isExiting ? 0.1 : 0.3, type: "spring" }}
        >
          <div className="w-32 h-44 rounded-2xl border-3 border-dashed border-primary/30 bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center shadow-xl">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.9, 1.1, 0.9] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Search className="w-12 h-12 text-primary/40" />
            </motion.div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full shadow-lg">
            ???
          </span>
        </motion.div>
      </motion.div>

      {/* Description - hide when exiting */}
      <motion.div 
        className="space-y-1 mt-2"
        animate={isExiting ? { opacity: 0, y: 10 } : { opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <h2 className="text-lg font-bold">L'Oracle va révéler ton match</h2>
        <p className="text-muted-foreground text-xs">
          Basé sur tes réponses, l'Oracle va trouver ton âme sœur.
        </p>
      </motion.div>

      {/* Info badges - hide when exiting */}
      <motion.div 
        className="flex flex-wrap items-center justify-center gap-2"
        animate={isExiting ? { opacity: 0, scale: 0.9 } : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Sparkles className="w-3 h-3 text-primary" />
          <span className="text-foreground font-medium text-xs">Révélation gratuite</span>
        </div>
        <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Coins className="w-3 h-3 text-primary" />
          <span className="text-foreground font-medium text-xs">50 coins pour matcher</span>
        </div>
      </motion.div>

      {/* Start button - hide when exiting */}
      <motion.div
        animate={isExiting ? { opacity: 0, scale: 0.8, y: 20 } : { opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        <Button
          onClick={handleStart}
          disabled={isExiting}
          size="lg"
          className="px-10 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground font-bold text-base shadow-lg shadow-primary/40"
        >
          <span className="mr-2">🔮</span>
          Consulter l'Oracle
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Shuffling Screen - Slot machine effect with profiles
function ShufflingScreen({
  myProfile,
  shuffleProfiles,
  currentIndex,
}: {
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  shuffleProfiles: ProfilePreview[];
  currentIndex: number;
}) {
  const currentProfile = shuffleProfiles[currentIndex];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <motion.h2 
        className="text-lg font-bold text-primary"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        🔮 L'Oracle consulte les astres...
      </motion.h2>

      {/* Two large profile slots */}
      <div className="flex items-center gap-4">
        {/* My profile - Static */}
        <motion.div
          className="relative w-36 h-44 rounded-3xl border-3 border-primary overflow-hidden shadow-xl shadow-primary/30"
        >
          {myProfile?.avatarUrl ? (
            <img 
              src={myProfile.avatarUrl} 
              alt="Toi" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-5xl">👤</span>
            </div>
          )}
          <GlowingPulse />
        </motion.div>

        {/* Connection sparks */}
        <div className="flex flex-col items-center gap-2">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-3 h-3 rounded-full bg-primary"
              animate={{
                scale: [1, 2, 1],
                opacity: [0.3, 1, 0.3],
                x: [-5, 5, -5],
              }}
              transition={{
                duration: 0.3,
                repeat: Infinity,
                delay: i * 0.1,
              }}
            />
          ))}
        </div>

        {/* Shuffling slot - Rapid photo changes */}
        <motion.div
          className="relative w-36 h-44 rounded-3xl border-3 border-primary/50 overflow-hidden shadow-xl"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              initial={{ y: -100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="absolute inset-0"
            >
              {currentProfile?.avatarUrl ? (
                <img 
                  src={currentProfile.avatarUrl} 
                  alt="" 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <span className="text-5xl">👤</span>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
          
          {/* Scanning overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-background/60 pointer-events-none" />
          <ScanningLaser />
        </motion.div>
      </div>

      {/* Shuffling text */}
      <motion.p
        className="text-muted-foreground text-sm"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.3, repeat: Infinity }}
      >
        Analyse de {shuffleProfiles.length}+ profils...
      </motion.p>
    </motion.div>
  );
}

// New Scanning Screen - With bigger photos and neural network effect
function ScanningScreenNew({ 
  myProfile, 
  progress 
}: { 
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  progress: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      {/* Two large profile slots with scanning effect */}
      <div className="flex items-center gap-4">
        {/* My profile with neural network */}
        <motion.div 
          className="relative w-36 h-44 rounded-3xl border-3 border-primary overflow-hidden shadow-xl shadow-primary/30"
        >
          {myProfile?.avatarUrl ? (
            <img 
              src={myProfile.avatarUrl} 
              alt="Toi" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-5xl">👤</span>
            </div>
          )}
          <NeuralNetwork />
          <ScanningLaser />
        </motion.div>

        {/* Oracle Processing animation */}
        <div className="flex flex-col items-center gap-1">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="text-4xl"
          >
            🔮
          </motion.div>
          <motion.div
            className="flex gap-1"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            <span className="text-2xl">✨</span>
          </motion.div>
        </div>

        {/* Scanning slot with neural network */}
        <motion.div 
          className="relative w-36 h-44 rounded-3xl border-3 border-primary/50 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 shadow-xl"
        >
          <NeuralNetwork />
          <ScanningLaser />
          
          {/* Center pulsing icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <Search className="w-14 h-14 text-primary" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Progress bar - Wider */}
      <div className="w-80 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground font-medium">L'Oracle médite...</span>
          <span className="text-primary font-bold text-lg">{Math.min(Math.round(progress), 100)}%</span>
        </div>
        <div className="h-3 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary via-primary/80 to-primary"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Status messages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={Math.floor(progress / 20)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-sm text-muted-foreground text-center"
        >
          {progress < 20 && "🔮 L'Oracle lit ton aura..."}
          {progress >= 20 && progress < 40 && "⭐ Alignement des astres..."}
          {progress >= 40 && progress < 60 && "💫 Calcul de l'affinité cosmique..."}
          {progress >= 60 && progress < 80 && "🌙 Révélation imminente..."}
          {progress >= 80 && "✨ Ton match est révélé !"}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// Revealing Screen - Dramatic reveal animation
function RevealingScreen({
  myProfile,
  matchResult,
}: {
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  matchResult: MatchResult;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex flex-col items-center gap-6"
    >
      <motion.h2 
        className="text-xl font-bold text-primary"
        initial={{ scale: 0 }}
        animate={{ scale: [0, 1.2, 1] }}
        transition={{ duration: 0.5 }}
      >
        🔮 L'Oracle a parlé !
      </motion.h2>

      {/* Two large profile slots */}
      <div className="flex items-center gap-4">
        {/* My profile */}
        <motion.div
          className="relative w-36 h-44 rounded-3xl border-3 border-primary overflow-hidden shadow-xl shadow-primary/30"
          initial={{ x: -100, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring" }}
        >
          {myProfile?.avatarUrl ? (
            <img 
              src={myProfile.avatarUrl} 
              alt="Toi" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-5xl">👤</span>
            </div>
          )}
        </motion.div>

        {/* Heart beating */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          <motion.div
            animate={{ scale: [1, 1.3, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          >
            <Heart className="w-12 h-12 text-destructive fill-destructive" />
          </motion.div>
        </motion.div>

        {/* Match profile - REVEAL */}
        <motion.div
          className="relative w-36 h-44 rounded-3xl border-3 border-primary overflow-hidden shadow-xl shadow-primary/30"
          initial={{ x: 100, opacity: 0, rotateY: 180 }}
          animate={{ x: 0, opacity: 1, rotateY: 0 }}
          transition={{ delay: 0.7, duration: 0.8, type: "spring" }}
        >
          {matchResult.avatarUrl ? (
            <img 
              src={matchResult.avatarUrl} 
              alt={matchResult.displayName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-5xl">👤</span>
            </div>
          )}
          
          {/* Compatibility badge */}
          <motion.div
            className="absolute -top-2 -right-2 w-14 h-14 rounded-full bg-gradient-to-r from-accent to-accent/80 flex items-center justify-center text-primary-foreground font-bold text-sm shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: [0, 1.3, 1] }}
            transition={{ delay: 1.2, type: "spring" }}
          >
            {matchResult.compatibilityScore}%
          </motion.div>
        </motion.div>
      </div>

      {/* Loading dots */}
      <motion.div 
        className="flex gap-2"
        animate={{ opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 0.8, repeat: Infinity }}
      >
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="w-2 h-2 rounded-full bg-primary" />
        <span className="w-2 h-2 rounded-full bg-primary" />
      </motion.div>
    </motion.div>
  );
}

// Revealed Screen - With bigger photos
function RevealedScreen({
  myProfile,
  matchResult,
  balance,
  matchCost,
  onMatch,
  onScanAgain,
  isLoading,
}: {
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  matchResult: MatchResult;
  balance: number;
  matchCost: number;
  onMatch: () => void;
  onScanAgain: () => void;
  isLoading: boolean;
}) {
  const canAfford = balance >= matchCost;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center gap-5 text-center max-w-md"
    >
      {/* Match found header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 text-xl font-bold"
      >
        <span className="text-2xl">🎯</span>
        <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
          Match trouvé !
        </span>
      </motion.div>

      {/* Two BIGGER profiles with heart */}
      <div className="flex items-center gap-3">
        {/* My profile - BIGGER */}
        <motion.div
          className="w-32 h-40 rounded-2xl border-2 border-primary overflow-hidden shadow-lg"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {myProfile?.avatarUrl ? (
            <img 
              src={myProfile.avatarUrl} 
              alt="Toi" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/10">
              <span className="text-4xl">👤</span>
            </div>
          )}
        </motion.div>

        {/* Heart */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.4, type: "spring" }}
        >
          <motion.div
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 1, repeat: Infinity }}
          >
            <Heart className="w-10 h-10 text-destructive fill-destructive" />
          </motion.div>
        </motion.div>

        {/* Match profile - BIGGER */}
        <motion.div
          className="relative"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-32 h-40 rounded-2xl border-2 border-primary overflow-hidden shadow-lg">
            {matchResult.avatarUrl ? (
              <img 
                src={matchResult.avatarUrl} 
                alt={matchResult.displayName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <span className="text-4xl">👤</span>
              </div>
            )}
          </div>
          {/* Compatibility badge */}
          <motion.div
            className="absolute -top-2 -right-2 w-12 h-12 rounded-full bg-gradient-to-r from-accent to-accent/80 flex items-center justify-center text-primary-foreground font-bold text-xs shadow-lg"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.6, type: "spring" }}
          >
            {matchResult.compatibilityScore}%
          </motion.div>
        </motion.div>
      </div>

      {/* Match info */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-background/80 backdrop-blur-md rounded-2xl p-4 border border-primary/30 w-full"
      >
        <h3 className="text-xl font-bold">{matchResult.displayName}</h3>
        <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm mt-1">
          {matchResult.age && <span>{matchResult.age} ans</span>}
          {matchResult.age && matchResult.location && <span>•</span>}
          {matchResult.location && <span>{matchResult.location}</span>}
        </div>
        <div className="mt-2 text-sm text-primary font-medium">
          Compatibilité : {matchResult.compatibilityScore}%
        </div>
      </motion.div>

      {/* Action buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col gap-3 w-full"
      >
        {/* Match button */}
        <Button
          onClick={onMatch}
          disabled={!canAfford || isLoading}
          size="lg"
          className="w-full bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 text-destructive-foreground font-bold shadow-lg"
        >
          {isLoading ? (
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            >
              <Sparkles className="w-5 h-5" />
            </motion.div>
          ) : (
            <>
              <Heart className="w-5 h-5 mr-2 fill-current" />
              Matcher pour {matchCost}
              <Coins className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>

        {!canAfford && (
          <p className="text-sm text-destructive">
            Tu as besoin de {matchCost - balance} coins supplémentaires
          </p>
        )}

        {/* Scan again */}
        <Button
          onClick={onScanAgain}
          variant="outline"
          className="w-full border-primary/30"
        >
          <Search className="w-4 h-4 mr-2" />
          Chercher un autre match
        </Button>
      </motion.div>
    </motion.div>
  );
}

// Matched Screen (success) - With bigger photo
function MatchedScreen({
  matchResult,
  onMessage,
  onClose,
}: {
  matchResult: MatchResult;
  onMessage: () => void;
  onClose: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      className="flex flex-col items-center gap-5 text-center"
    >
      {/* Celebration */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 10 }}
        className="text-6xl"
      >
        🎉
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-2xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent"
      >
        C'est un Match !
      </motion.h2>

      {/* Match avatar - BIGGER */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="relative"
      >
        <div className="w-40 h-48 rounded-3xl border-4 border-primary overflow-hidden shadow-[0_0_30px_rgba(214,178,107,0.4)]">
          {matchResult.avatarUrl ? (
            <img 
              src={matchResult.avatarUrl} 
              alt={matchResult.displayName} 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-primary/20">
              <span className="text-5xl">{matchResult.displayName[0]}</span>
            </div>
          )}
        </div>
        <motion.div
          className="absolute -bottom-3 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold rounded-full shadow-lg"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          {matchResult.compatibilityScore}% compatible
        </motion.div>
      </motion.div>

      <p className="text-lg font-medium">{matchResult.displayName}</p>
      <p className="text-muted-foreground text-sm">
        Tu peux maintenant lui envoyer un message !
      </p>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Button
          onClick={onMessage}
          size="lg"
          className="w-full bg-gradient-to-r from-primary to-primary/80 font-bold"
        >
          <MessageCircle className="w-5 h-5 mr-2" />
          Envoyer un message
        </Button>
        <Button
          onClick={onClose}
          variant="outline"
          className="w-full"
        >
          Continuer plus tard
        </Button>
      </div>
    </motion.div>
  );
}
