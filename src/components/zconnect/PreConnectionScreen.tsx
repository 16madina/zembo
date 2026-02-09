import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Check, X, SkipForward, MapPin, User, Loader2, MoreVertical, Flag, Ban, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import ReportModal from "./ReportModal";
import BlockUserModal from "@/components/BlockUserModal";

interface MatchedUserInfo {
  display_name: string | null;
  avatar_url: string | null;
  location: string | null;
  age: number | null;
  gender: string | null;
  bio: string | null;
  interests: string[] | null;
}

interface PreConnectionScreenProps {
  matchedUserId: string;
  onAccept: () => void;
  onDecline: () => void;
  onSkip: () => void;
  isLoading?: boolean;
  sharedInterests?: string[];
  remainingSkips?: number;
  maxSkips?: number;
  canSkip?: boolean;
}

const PreConnectionScreen = ({
  matchedUserId,
  onAccept,
  onDecline,
  onSkip,
  isLoading = false,
  sharedInterests = [],
  remainingSkips = 0,
  maxSkips = 3,
  canSkip = true,
}: PreConnectionScreenProps) => {
  const [matchedUser, setMatchedUser] = useState<MatchedUserInfo | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showBlockModal, setShowBlockModal] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const { t, language } = useLanguage();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!matchedUserId) return;

      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("display_name, avatar_url, location, age, gender, bio, interests")
          .eq("user_id", matchedUserId)
          .single();

        if (error) throw error;
        setMatchedUser(data);

        // Fetch additional photos
        const { data: photoData } = await supabase.storage
          .from("profile-photos")
          .list(matchedUserId, { limit: 5 });

        if (photoData && photoData.length > 0) {
          const photoUrls = photoData
            .filter(file => !file.name.startsWith('.'))
            .sort((a, b) => a.name.localeCompare(b.name))
            .slice(0, 3)
            .map(file => {
              const { data: urlData } = supabase.storage
                .from("profile-photos")
                .getPublicUrl(`${matchedUserId}/${file.name}`);
              return urlData.publicUrl;
            });
          setPhotos(photoUrls);
        }
      } catch (error) {
        console.error("Error fetching matched user profile:", error);
        setMatchedUser({
          display_name: null,
          avatar_url: null,
          location: null,
          age: null,
          gender: null,
          bio: null,
          interests: null,
        });
      } finally {
        setLoadingProfile(false);
      }
    };

    fetchProfile();
  }, [matchedUserId]);

  const getDisplayName = () => {
    if (matchedUser?.display_name) {
      return matchedUser.display_name.split(" ")[0];
    }
    return language === "fr" ? "Utilisateur" : "User";
  };

  const getGenderLabel = () => {
    const genderMap: Record<string, { fr: string; en: string }> = {
      homme: { fr: "Homme", en: "Man" },
      femme: { fr: "Femme", en: "Woman" },
      homme_gay: { fr: "Homme gay", en: "Gay man" },
      femme_lesbienne: { fr: "Femme lesbienne", en: "Lesbian woman" },
      non_binaire: { fr: "Non-binaire", en: "Non-binary" },
      autre_lgbt: { fr: "LGBTQ+", en: "LGBTQ+" },
    };
    const gender = matchedUser?.gender || "";
    return genderMap[gender]?.[language] || gender;
  };

  // Display interests - prioritize shared, then show others
  const displayInterests = () => {
    const allInterests = matchedUser?.interests || [];
    const shared = sharedInterests.filter(i => allInterests.includes(i));
    const others = allInterests.filter(i => !shared.includes(i)).slice(0, 3 - shared.length);
    return { shared, others };
  };

  const { shared, others } = displayInterests();

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="flex flex-col items-center justify-center gap-4 px-4 w-full max-w-sm mx-auto"
    >
      {/* Header with options menu */}
      <div className="w-full flex justify-between items-center">
        <div className="flex items-center gap-2">
          {sharedInterests.length > 0 && (
            <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20">
              <Heart className="w-3 h-3 mr-1 fill-primary" />
              {sharedInterests.length} {language === "fr" ? "intérêt(s) commun(s)" : "shared interest(s)"}
            </Badge>
          )}
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => setShowReportModal(true)}
            className="text-destructive focus:text-destructive"
          >
            <Flag className="w-4 h-4 mr-2" />
            {language === "fr" ? "Signaler" : "Report"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => setShowBlockModal(true)}
            className="text-destructive focus:text-destructive"
          >
            <Ban className="w-4 h-4 mr-2" />
            {language === "fr" ? "Bloquer" : "Block"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Title */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <h2 className="text-xl font-bold text-foreground mb-1">
          {language === "fr" ? "Profil compatible trouvé !" : "Compatible profile found!"}
        </h2>
        <p className="text-muted-foreground text-sm">
          {language === "fr" 
            ? "Basé sur vos intérêts communs" 
            : "Based on your shared interests"}
        </p>
      </motion.div>

      {/* User Card - Full Profile */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="w-full bg-card border border-border rounded-3xl overflow-hidden shadow-lg"
      >
        {loadingProfile ? (
          <div className="flex flex-col items-center gap-4 p-6">
            <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
            <div className="w-32 h-6 bg-muted rounded animate-pulse" />
            <div className="w-24 h-4 bg-muted rounded animate-pulse" />
          </div>
        ) : (
          <>
            {/* Photo - Full, not blurred */}
            <div className="relative w-full aspect-[4/3] bg-muted">
              {photos.length > 0 ? (
                <img
                  src={photos[0]}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                />
              ) : matchedUser?.avatar_url ? (
                <img
                  src={matchedUser.avatar_url}
                  alt={getDisplayName()}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-primary/10">
                  <User className="w-16 h-16 text-primary/50" />
                </div>
              )}
              
              {/* Gradient overlay with name */}
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
                <h3 className="text-xl font-bold text-white">
                  {getDisplayName()}
                  {matchedUser?.age && (
                    <span className="font-normal ml-2">{matchedUser.age}</span>
                  )}
                </h3>
                <div className="flex items-center gap-2 text-white/80 text-sm">
                  {matchedUser?.location && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {matchedUser.location}
                    </span>
                  )}
                  {matchedUser?.gender && (
                    <span className="flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {getGenderLabel()}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Info section */}
            <div className="p-4 space-y-3">
              {/* Bio */}
              {matchedUser?.bio && (
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {matchedUser.bio}
                </p>
              )}

              {/* Shared Interests */}
              {(shared.length > 0 || others.length > 0) && (
                <div className="flex flex-wrap gap-1.5">
                  {shared.map((interest) => (
                    <Badge 
                      key={interest} 
                      className="bg-primary/20 text-primary border-primary/30 text-xs"
                    >
                      <Heart className="w-2.5 h-2.5 mr-1 fill-primary" />
                      {interest}
                    </Badge>
                  ))}
                  {others.map((interest) => (
                    <Badge 
                      key={interest} 
                      variant="secondary"
                      className="text-xs"
                    >
                      {interest}
                    </Badge>
                  ))}
                </div>
              )}

              {/* Match reason */}
              {sharedInterests.length > 0 && (
                <p className="text-xs text-primary/80 text-center">
                  {language === "fr" 
                    ? `Vous partagez ${sharedInterests.length} intérêt${sharedInterests.length > 1 ? 's' : ''}` 
                    : `You share ${sharedInterests.length} interest${sharedInterests.length > 1 ? 's' : ''}`}
                </p>
              )}
            </div>
          </>
        )}
      </motion.div>

      {/* Consent Text - Apple Compliance */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-muted-foreground text-center px-4 italic"
      >
        {language === "fr" 
          ? "En acceptant, vous initiez un appel audio avec ce profil." 
          : "By accepting, you initiate an audio call with this profile."}
      </motion.p>

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
          className="w-14 h-14 rounded-full border-destructive/50 text-destructive hover:bg-destructive/10"
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Accept */}
        <Button
          onClick={onAccept}
          disabled={isLoading || loadingProfile}
          size="lg"
          className="w-18 h-18 rounded-full btn-gold"
        >
          {isLoading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <Check className="w-8 h-8" />
          )}
        </Button>

        {/* Skip with counter */}
        <div className="flex flex-col items-center gap-1">
          <Button
            onClick={onSkip}
            disabled={isLoading || loadingProfile || !canSkip}
            variant="outline"
            size="lg"
            className={`w-14 h-14 rounded-full border-muted-foreground/30 text-muted-foreground hover:bg-muted relative ${
              !canSkip ? "opacity-50 cursor-not-allowed" : ""
            }`}
          >
            <SkipForward className="w-5 h-5" />
          </Button>
          {/* Skip counter badge */}
          <span className={`text-[10px] font-medium ${
            remainingSkips === 0 ? "text-destructive" : "text-muted-foreground"
          }`}>
            {remainingSkips}/{maxSkips}
          </span>
        </div>
      </motion.div>

      {/* Labels */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center gap-8 text-xs text-muted-foreground"
      >
        <span>{language === "fr" ? "Refuser" : "Decline"}</span>
        <span className="text-primary font-medium">{language === "fr" ? "Accepter" : "Accept"}</span>
        <span>{language === "fr" ? "Passer" : "Skip"}</span>
      </motion.div>

      {/* Modals - Using portals for proper z-index stacking (App Store compliance) */}
      {createPortal(
        <ReportModal
          isOpen={showReportModal}
          onClose={() => setShowReportModal(false)}
          reportedUserId={matchedUserId}
        />,
        document.body
      )}
      {createPortal(
        <BlockUserModal
          isOpen={showBlockModal}
          onClose={() => setShowBlockModal(false)}
          userId={matchedUserId}
          userName={matchedUser?.display_name || undefined}
        />,
        document.body
      )}
    </motion.div>
  );
};

export default PreConnectionScreen;
