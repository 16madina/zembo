import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Heart, MessageCircle, Coins, Search, Zap } from "lucide-react";
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

interface MatchResult {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  age: number | null;
  location: string | null;
  compatibilityScore: number;
}

type GameStatus = "idle" | "scanning" | "revealed" | "matched";

const MATCH_COST = 50;

// Scanning effect particles
const ScanningParticles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {[...Array(12)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-8 bg-gradient-to-b from-primary to-transparent"
        style={{
          left: `${(i / 12) * 100}%`,
          top: 0,
        }}
        animate={{
          y: [0, 200, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          delay: i * 0.1,
          ease: "linear",
        }}
      />
    ))}
  </div>
);

// Glowing ring animation
const GlowingRing = ({ delay = 0 }: { delay?: number }) => (
  <motion.div
    className="absolute inset-0 rounded-full border-2 border-primary"
    initial={{ scale: 0.8, opacity: 0 }}
    animate={{
      scale: [0.8, 1.5, 2],
      opacity: [0, 0.5, 0],
    }}
    transition={{
      duration: 2,
      repeat: Infinity,
      delay,
      ease: "easeOut",
    }}
  />
);

// AI brain animation
const AIBrainAnimation = () => (
  <motion.div
    className="absolute inset-0 flex items-center justify-center pointer-events-none"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
  >
    {/* Neural network lines */}
    {[...Array(6)].map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-0.5 bg-gradient-to-b from-primary/50 to-transparent"
        style={{
          height: 40 + Math.random() * 30,
          left: `${20 + i * 12}%`,
          transformOrigin: "center",
          rotate: `${-30 + i * 12}deg`,
        }}
        animate={{
          opacity: [0.2, 1, 0.2],
          scaleY: [0.8, 1.2, 0.8],
        }}
        transition={{
          duration: 0.8,
          repeat: Infinity,
          delay: i * 0.15,
        }}
      />
    ))}
  </motion.div>
);

export default function AIMatchFinderGame({ onClose }: AIMatchFinderGameProps) {
  const { user } = useAuth();
  const { balance, spendCoins, refetch } = useCoins();
  const navigate = useNavigate();
  
  const [status, setStatus] = useState<GameStatus>("idle");
  const [matchResult, setMatchResult] = useState<MatchResult | null>(null);
  const [myProfile, setMyProfile] = useState<{ avatarUrl: string | null; displayName: string } | null>(null);
  const [scanProgress, setScanProgress] = useState(0);
  const [isCreatingMatch, setIsCreatingMatch] = useState(false);

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

  // Start scanning
  const startScan = async () => {
    if (!user) {
      toast.error("Tu dois être connecté");
      return;
    }

    setStatus("scanning");
    setScanProgress(0);

    // Simulate scanning progress
    const progressInterval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + Math.random() * 15;
      });
    }, 200);

    try {
      // Fetch current user's preferences
      const { data: myProfileData } = await supabase
        .from("profiles")
        .select("looking_for, gender")
        .eq("user_id", user.id)
        .single();

      // Fetch compatibility scores if available
      const { data: compatScores } = await supabase
        .from("compatibility_scores")
        .select("user2_id, score")
        .eq("user1_id", user.id)
        .order("score", { ascending: false })
        .limit(10);

      // Get all eligible profiles
      let query = supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, location, gender")
        .neq("user_id", user.id)
        .not("avatar_url", "is", null);

      // Apply gender filter if set
      const lookingFor = myProfileData?.looking_for || [];
      if (lookingFor.length > 0 && !lookingFor.includes("tous")) {
        query = query.in("gender", lookingFor);
      }

      const { data: profiles } = await query.limit(50);

      if (!profiles || profiles.length === 0) {
        clearInterval(progressInterval);
        toast.error("Aucun profil compatible trouvé");
        setStatus("idle");
        return;
      }

      // Wait for scanning animation to complete
      await new Promise(resolve => setTimeout(resolve, 2500));
      clearInterval(progressInterval);
      setScanProgress(100);

      // Score and rank profiles
      const scoredProfiles = profiles.map(profile => {
        // Check if we have a compatibility score
        const compatScore = compatScores?.find(s => s.user2_id === profile.user_id);
        const score = compatScore?.score || Math.floor(Math.random() * 40 + 60); // 60-100 random if no score
        
        return {
          userId: profile.user_id,
          displayName: profile.display_name || "Inconnu",
          avatarUrl: profile.avatar_url,
          age: profile.age,
          location: profile.location,
          compatibilityScore: score,
        };
      });

      // Sort by compatibility and pick the best
      scoredProfiles.sort((a, b) => b.compatibilityScore - a.compatibilityScore);
      const bestMatch = scoredProfiles[0];

      // Small delay for dramatic effect
      await new Promise(resolve => setTimeout(resolve, 500));

      setMatchResult(bestMatch);
      setStatus("revealed");

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
          <span className="text-2xl">🤖</span>
          <span className="bg-gradient-to-r from-primary via-amber-400 to-primary bg-clip-text text-transparent">
            AI Match Finder
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
          {status === "idle" && (
            <IdleScreen 
              key="idle" 
              myProfile={myProfile} 
              onStart={startScan} 
            />
          )}
          {status === "scanning" && (
            <ScanningScreen 
              key="scanning" 
              myProfile={myProfile} 
              progress={scanProgress} 
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

// Idle Screen
function IdleScreen({ 
  myProfile, 
  onStart 
}: { 
  myProfile: { avatarUrl: string | null; displayName: string } | null;
  onStart: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="flex flex-col items-center gap-6 text-center max-w-md"
    >
      {/* Two profile slots */}
      <div className="flex items-center gap-6">
        {/* My profile */}
        <motion.div
          className="relative"
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-28 h-28 rounded-2xl border-2 border-primary/50 overflow-hidden bg-primary/10">
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
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-primary text-primary-foreground text-xs font-bold rounded-full">
            TOI
          </span>
        </motion.div>

        {/* AI Icon */}
        <motion.div
          animate={{ 
            scale: [1, 1.2, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 3, repeat: Infinity }}
          className="text-4xl"
        >
          ⚡
        </motion.div>

        {/* Mystery slot */}
        <motion.div
          className="relative"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Search className="w-10 h-10 text-primary/50" />
            </motion.div>
          </div>
          <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-full">
            ???
          </span>
        </motion.div>
      </div>

      {/* Description */}
      <div className="space-y-2">
        <h2 className="text-lg font-bold">Laisse l'IA trouver ton match parfait</h2>
        <p className="text-muted-foreground text-sm">
          Notre algorithme analyse des milliers de profils pour te trouver LA personne idéale.
        </p>
      </div>

      {/* Info badges */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium text-xs">Scan gratuit</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-md border border-primary/30">
          <Coins className="w-4 h-4 text-primary" />
          <span className="text-foreground font-medium text-xs">50 coins pour matcher</span>
        </div>
      </div>

      {/* Start button */}
      <Button
        onClick={onStart}
        size="lg"
        className="px-12 bg-gradient-to-r from-primary to-amber-600 hover:from-primary/90 hover:to-amber-600/90 text-primary-foreground font-bold text-lg shadow-lg shadow-primary/40"
      >
        <Zap className="w-5 h-5 mr-2" />
        Lancer le scan
      </Button>
    </motion.div>
  );
}

// Scanning Screen
function ScanningScreen({ 
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
      className="flex flex-col items-center gap-8"
    >
      {/* Two profile slots with scanning effect */}
      <div className="flex items-center gap-6">
        {/* My profile */}
        <motion.div className="relative w-28 h-28 rounded-2xl border-2 border-primary overflow-hidden">
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

        {/* Connection animation */}
        <div className="flex items-center gap-1">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 rounded-full bg-primary"
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
              }}
            />
          ))}
        </div>

        {/* Scanning slot */}
        <motion.div className="relative w-28 h-28 rounded-2xl border-2 border-primary/50 overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5">
          <ScanningParticles />
          <AIBrainAnimation />
          
          {/* Glowing rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <GlowingRing delay={0} />
            <GlowingRing delay={0.5} />
            <GlowingRing delay={1} />
          </div>

          {/* Center icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Search className="w-10 h-10 text-primary" />
            </motion.div>
          </div>
        </motion.div>
      </div>

      {/* Progress bar */}
      <div className="w-64 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Analyse en cours...</span>
          <span className="text-primary font-bold">{Math.min(Math.round(progress), 100)}%</span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-primary to-amber-500"
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Status messages */}
      <AnimatePresence mode="wait">
        <motion.p
          key={Math.floor(progress / 25)}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="text-sm text-muted-foreground"
        >
          {progress < 25 && "🔍 Analyse de ton profil..."}
          {progress >= 25 && progress < 50 && "🧠 Comparaison des personnalités..."}
          {progress >= 50 && progress < 75 && "💫 Calcul de compatibilité..."}
          {progress >= 75 && "✨ Match parfait trouvé !"}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}

// Revealed Screen
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
      className="flex flex-col items-center gap-6 text-center max-w-md"
    >
      {/* Match found header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-2 text-xl font-bold"
      >
        <span className="text-2xl">🎯</span>
        <span className="bg-gradient-to-r from-primary to-amber-500 bg-clip-text text-transparent">
          Match trouvé !
        </span>
      </motion.div>

      {/* Two profiles with heart */}
      <div className="flex items-center gap-4">
        {/* My profile */}
        <motion.div
          className="w-24 h-24 rounded-2xl border-2 border-primary overflow-hidden"
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
              <span className="text-3xl">👤</span>
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
            <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          </motion.div>
        </motion.div>

        {/* Match profile - REVEALED */}
        <motion.div
          className="relative"
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="w-24 h-24 rounded-2xl border-2 border-primary overflow-hidden">
            {matchResult.avatarUrl ? (
              <img 
                src={matchResult.avatarUrl} 
                alt={matchResult.displayName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-primary/10">
                <span className="text-3xl">👤</span>
              </div>
            )}
          </div>
          {/* Compatibility badge */}
          <motion.div
            className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center text-white font-bold text-xs shadow-lg"
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
          className="w-full bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 text-white font-bold shadow-lg"
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
              <Heart className="w-5 h-5 mr-2 fill-white" />
              Matcher pour {matchCost}
              <Coins className="w-4 h-4 ml-1" />
            </>
          )}
        </Button>

        {!canAfford && (
          <p className="text-sm text-red-400">
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

// Matched Screen (success)
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
      className="flex flex-col items-center gap-6 text-center"
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
        className="text-2xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent"
      >
        C'est un Match !
      </motion.h2>

      {/* Match avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="relative"
      >
        <Avatar className="w-32 h-32 border-4 border-primary shadow-[0_0_30px_rgba(214,178,107,0.4)]">
          <AvatarImage src={matchResult.avatarUrl || ""} />
          <AvatarFallback className="text-4xl bg-primary/20">
            {matchResult.displayName[0]}
          </AvatarFallback>
        </Avatar>
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-pink-500 to-rose-500 text-white text-sm font-bold rounded-full"
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
          className="w-full bg-gradient-to-r from-primary to-amber-600 font-bold"
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
