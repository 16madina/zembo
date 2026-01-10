import { motion } from "framer-motion";
import { Heart, HeartCrack, MessageCircle, RotateCcw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ResultScreenProps {
  matched: boolean;
  onRetry: () => void;
  otherUserId?: string;
  onRevealSound?: () => void;
}

interface OtherUserProfile {
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
}

const ResultScreen = ({ matched, onRetry, otherUserId, onRevealSound }: ResultScreenProps) => {
  const navigate = useNavigate();
  const [otherProfile, setOtherProfile] = useState<OtherUserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch other user's profile when matched
  useEffect(() => {
    const fetchOtherProfile = async () => {
      if (!matched || !otherUserId) return;
      
      setIsLoading(true);
      try {
        const { data } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, age, bio, location, interests")
          .eq("user_id", otherUserId)
          .maybeSingle();
        
        if (data) {
          setOtherProfile(data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchOtherProfile();
  }, [matched, otherUserId]);

  useEffect(() => {
    if (matched) {
      // Trigger reveal sound with a slight delay to match curtain animation
      const revealSoundTimeout = setTimeout(() => {
        onRevealSound?.();
      }, 700); // Matches the curtain animation delay
      
      // Trigger confetti
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ["#FFD700", "#FFA500", "#FF6347"];

      (function frame() {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      })();
      
      return () => {
        clearTimeout(revealSoundTimeout);
      };
    }
  }, [matched, onRevealSound]);

  if (matched) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center gap-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", damping: 10, stiffness: 100 }}
          className="text-center space-y-2"
        >
          <h2 className="text-3xl font-bold text-foreground">
            C'est un Match ! 🎉
          </h2>
          <p className="text-muted-foreground text-sm">
            Découvrez votre nouvelle connexion
          </p>
        </motion.div>

        {/* Profile reveal card with curtain animation */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xs rounded-3xl glass overflow-hidden"
        >
          {/* Avatar with curtain reveal */}
          <div className="relative h-48 bg-gradient-to-b from-primary/20 to-background flex items-center justify-center overflow-hidden">
            {otherProfile?.avatar_url ? (
              <motion.img 
                src={otherProfile.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
                initial={{ scale: 1.2 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.8, duration: 0.8, ease: "easeOut" }}
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
            
            {/* Curtain left */}
            <motion.div
              className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-primary via-primary to-primary/80"
              initial={{ x: 0 }}
              animate={{ x: "-100%" }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
            
            {/* Curtain right */}
            <motion.div
              className="absolute inset-y-0 right-0 w-1/2 bg-gradient-to-l from-primary via-primary to-primary/80"
              initial={{ x: 0 }}
              animate={{ x: "100%" }}
              transition={{ delay: 0.7, duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
            />
            
            {/* Sparkle effect after reveal */}
            <motion.div
              className="absolute inset-0 bg-gradient-to-br from-white/30 via-transparent to-transparent"
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ delay: 1.2, duration: 0.5 }}
            />
            
            {/* Gradient overlay */}
            <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
          </div>

          {/* Profile info */}
          <div className="p-4 space-y-3">
            <div className="text-center">
              <h3 className="text-xl font-bold text-foreground">
                {isLoading ? "..." : (otherProfile?.display_name || "Utilisateur")}
                {otherProfile?.age && (
                  <span className="font-normal text-muted-foreground ml-2">
                    {otherProfile.age} ans
                  </span>
                )}
              </h3>
              {otherProfile?.location && (
                <p className="text-sm text-muted-foreground">{otherProfile.location}</p>
              )}
            </div>

            {otherProfile?.bio && (
              <p className="text-sm text-muted-foreground text-center line-clamp-2">
                {otherProfile.bio}
              </p>
            )}

            {otherProfile?.interests && otherProfile.interests.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {otherProfile.interests.slice(0, 4).map((interest, i) => (
                  <span 
                    key={i}
                    className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="flex flex-col gap-3 w-full max-w-xs"
        >
          <Button
            onClick={() => navigate("/messages")}
            className="btn-gold gap-2 w-full"
          >
            <MessageCircle className="w-5 h-5" />
            Envoyer un message
          </Button>

          <Button
            variant="ghost"
            onClick={onRetry}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Nouvelle rencontre
          </Button>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center gap-8"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", damping: 15 }}
        className="w-28 h-28 rounded-full glass flex items-center justify-center"
      >
        <HeartCrack className="w-14 h-14 text-muted-foreground" />
      </motion.div>

      <div className="text-center space-y-3">
        <h2 className="text-2xl font-semibold text-foreground">
          Pas cette fois...
        </h2>
        <p className="text-muted-foreground max-w-xs">
          L'un de vous n'a pas souhaité matcher. Ce n'est pas grave, réessayez !
        </p>
      </div>

      <Button
        onClick={onRetry}
        className="btn-gold gap-2"
      >
        <RotateCcw className="w-5 h-5" />
        Réessayer
      </Button>
    </motion.div>
  );
};

export default ResultScreen;
