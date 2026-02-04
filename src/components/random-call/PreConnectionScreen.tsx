import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Check, X, SkipForward, MapPin, User, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";

interface MatchedUserInfo {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  gender: string | null;
}

interface PreConnectionScreenProps {
  matchedUserId: string;
  onAccept: () => void;
  onDecline: () => void;
  onSkip: () => void;
  isLoading?: boolean;
}

const PreConnectionScreen = ({
  matchedUserId,
  onAccept,
  onDecline,
  onSkip,
  isLoading = false,
}: PreConnectionScreenProps) => {
  const [matchedUser, setMatchedUser] = useState<MatchedUserInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!matchedUserId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, location, age, gender")
          .eq("user_id", matchedUserId)
          .single();

        if (error) throw error;
        setMatchedUser(data);
      } catch (error) {
        console.error("Error fetching matched user profile:", error);
        setMatchedUser({
          display_name: null,
          avatar_url: null,
          location: null,
          age: null,
          gender: null,
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [matchedUserId]);

  const getDisplayName = () => {
    if (matchedUser?.display_name) {
      // Only show first name
      return matchedUser.display_name.split(" ")[0];
    }
    return "Utilisateur";
  };

  const getGenderEmoji = () => {
    switch (matchedUser?.gender) {
      case "homme":
        return "👨";
      case "femme":
        return "👩";
      default:
        return "🧑";
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-6 px-4"
    >
      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Quelqu'un trouvé ! 🎲
        </h2>
        <p className="text-muted-foreground text-sm">
          Voulez-vous accepter cette connexion ?
        </p>
      </motion.div>

      {/* User Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full max-w-xs bg-card border border-border rounded-3xl p-6 shadow-lg"
      >
        {loadingProfile ? (
          <div className="flex flex-col items-center gap-4">
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse" />
            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <>
            {/* Avatar */}
            <div className="flex justify-center mb-4">
              <Avatar className="w-24 h-24 border-4 border-primary/20">
                <AvatarImage src={matchedUser?.avatar_url || undefined} />
                <AvatarFallback className="bg-primary/10 text-primary text-3xl">
                  {getGenderEmoji()}
                </AvatarFallback>
              </Avatar>
            </div>

            {/* Info */}
            <div className="text-center space-y-2">
              <h3 className="text-xl font-bold text-foreground">
                {getDisplayName()}
                {matchedUser?.age && (
                  <span className="text-muted-foreground font-normal ml-2">
                    {matchedUser.age}
                  </span>
                )}
              </h3>

              {matchedUser?.location && (
                <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  <span>{matchedUser.location}</span>
                </div>
              )}

              {matchedUser?.gender && (
                <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                  <User className="w-3 h-3" />
                  <span className="capitalize">{matchedUser.gender}</span>
                </div>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-4"
      >
        {/* Decline */}
        <Button
          onClick={onDecline}
          disabled={isLoading || loadingProfile}
          variant="outline"
          size="lg"
          className="w-16 h-16 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <X className="w-8 h-8" />
        </Button>

        {/* Accept */}
        <Button
          onClick={onAccept}
          disabled={isLoading || loadingProfile}
          size="lg"
          className="w-20 h-20 rounded-full btn-gold"
        >
          {isLoading ? (
            <Loader2 className="w-10 h-10 animate-spin" />
          ) : (
            <Check className="w-10 h-10" />
          )}
        </Button>

        {/* Skip */}
        <Button
          onClick={onSkip}
          disabled={isLoading || loadingProfile}
          variant="outline"
          size="lg"
          className="w-16 h-16 rounded-full border-muted-foreground/30 text-muted-foreground hover:bg-muted"
        >
          <SkipForward className="w-6 h-6" />
        </Button>
      </motion.div>

      {/* Labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-8 text-xs text-muted-foreground"
      >
        <span>Refuser</span>
        <span className="text-primary font-medium">Accepter</span>
        <span>Passer</span>
      </motion.div>
    </motion.div>
  );
};

export default PreConnectionScreen;
