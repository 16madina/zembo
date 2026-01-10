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
}

interface OtherUserProfile {
  display_name: string | null;
  avatar_url: string | null;
  age: number | null;
  bio: string | null;
  location: string | null;
  interests: string[] | null;
}

const ResultScreen = ({ matched, onRetry, otherUserId }: ResultScreenProps) => {
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
    }
  }, [matched]);

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

        {/* Profile reveal card */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="w-full max-w-xs rounded-3xl glass overflow-hidden"
        >
          {/* Avatar */}
          <div className="relative h-48 bg-gradient-to-b from-primary/20 to-background flex items-center justify-center">
            {otherProfile?.avatar_url ? (
              <img 
                src={otherProfile.avatar_url} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center">
                <User className="w-12 h-12 text-muted-foreground" />
              </div>
            )}
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
