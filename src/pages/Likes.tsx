import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Crown, Lock, ArrowLeft, Star, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";
import SubscriptionBadge from "@/components/SubscriptionBadge";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface LikeProfile {
  id: string;
  displayName: string;
  avatarUrl: string;
  age: number | null;
  location: string | null;
  isSuperLike: boolean;
  hasRose: boolean;
  createdAt: string;
  bio: string | null;
  interests: string[];
  isVerified: boolean;
}

const Likes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isPremium, isVip } = useSubscription();
  
  const [likes, setLikes] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<LikeProfile | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<LikeProfile | null>(null);

  // Fetch likes
  useEffect(() => {
    const fetchLikes = async () => {
      if (!user) return;

      setLoading(true);

      // Get likes where I'm the liked person
      const { data: likesData, error: likesError } = await supabase
        .from("likes")
        .select("liker_id, is_super_like, has_rose, created_at")
        .eq("liked_id", user.id)
        .order("created_at", { ascending: false });

      if (likesError) {
        console.error("Error fetching likes:", likesError);
        setLoading(false);
        return;
      }

      // Get IDs of users I've already liked back
      const { data: myLikesData } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);

      const myLikedIds = new Set(myLikesData?.map((l) => l.liked_id) || []);

      // Filter to only users I haven't liked back
      const pendingLikes = likesData?.filter((l) => !myLikedIds.has(l.liker_id)) || [];

      if (pendingLikes.length === 0) {
        setLikes([]);
        setLoading(false);
        return;
      }

      // Get profiles of users who liked me
      const likerIds = pendingLikes.map((l) => l.liker_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, age, location, bio, interests, is_verified")
        .in("user_id", likerIds);

      if (profiles) {
        const likeProfiles: LikeProfile[] = pendingLikes.map((like) => {
          const profile = profiles.find((p) => p.user_id === like.liker_id);
          return {
            id: like.liker_id,
            displayName: profile?.display_name || "Utilisateur",
            avatarUrl: profile?.avatar_url || "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&h=400&fit=crop",
            age: profile?.age || null,
            location: profile?.location || null,
            isSuperLike: like.is_super_like,
            hasRose: like.has_rose || false,
            createdAt: like.created_at,
            bio: profile?.bio || null,
            interests: profile?.interests || [],
            isVerified: profile?.is_verified || false,
          };
        });
        setLikes(likeProfiles);
      }

      setLoading(false);
    };

    fetchLikes();

    // Subscribe to realtime updates
    const channel = supabase
      .channel("likes-page")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "likes",
          filter: `liked_id=eq.${user?.id}`,
        },
        () => {
          fetchLikes();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Handle like back (creates a match)
  const handleLikeBack = async (profile: LikeProfile) => {
    if (!user) return;

    try {
      const { error } = await supabase.from("likes").upsert(
        {
          liker_id: user.id,
          liked_id: profile.id,
          is_super_like: false,
        },
        { onConflict: "liker_id,liked_id" }
      );

      if (error) {
        console.error("Error liking back:", error);
        toast({
          title: "Erreur",
          description: "Impossible de liker ce profil",
          variant: "destructive",
        });
        return;
      }

      // It's a match!
      setMatchedProfile(profile);
      setIsMatchModalOpen(true);
      setSelectedProfile(null);

      // Remove from pending likes
      setLikes((prev) => prev.filter((l) => l.id !== profile.id));

      // Send match notification
      await supabase.functions.invoke("notify-match", {
        body: {
          user1_id: user.id,
          user2_id: profile.id,
        },
      });
    } catch (err) {
      console.error("Error:", err);
    }
  };

  const handleCloseMatchModal = () => {
    setIsMatchModalOpen(false);
    setMatchedProfile(null);
  };

  const handleStartChat = () => {
    setIsMatchModalOpen(false);
    navigate("/messages");
  };

  // Sorted likes: roses first, then super likes, then regular
  const sortedLikes = useMemo(() => {
    return [...likes].sort((a, b) => {
      if (a.hasRose && !b.hasRose) return -1;
      if (!a.hasRose && b.hasRose) return 1;
      if (a.isSuperLike && !b.isSuperLike) return -1;
      if (!a.isSuperLike && b.isSuperLike) return 1;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }, [likes]);

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <motion.header
        className="sticky top-0 z-40 glass-strong border-b border-border/50"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2 tap-highlight">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-destructive fill-destructive" />
            <h1 className="text-lg font-semibold">Qui m'a liké</h1>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </motion.header>

      {/* Content */}
      <div className="p-4">
        {/* Premium banner for non-subscribers */}
        {!isPremium && likes.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-primary/20 via-yellow-500/20 to-primary/20 border border-primary/30"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-full bg-primary/20">
                <Crown className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">
                  Débloque qui t'a liké ! ✨
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {likes.length} personne{likes.length > 1 ? "s" : ""} t'ont liké. Passe à Gold pour voir leurs photos et matcher instantanément !
                </p>
                <Button
                  onClick={() => navigate("/subscriptions")}
                  className="bg-gradient-to-r from-primary to-yellow-500 text-primary-foreground hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  Devenir Gold
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && likes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              <Heart className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              Aucun like pour le moment
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Continue à swiper pour attirer l'attention et recevoir tes premiers likes !
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="mt-6"
            >
              Découvrir des profils
            </Button>
          </motion.div>
        )}

        {/* Likes grid */}
        {!loading && likes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {sortedLikes.map((like, index) => (
                <LikeCard
                  key={like.id}
                  profile={like}
                  index={index}
                  isPremium={isPremium}
                  onPress={() => {
                    if (isPremium) {
                      setSelectedProfile(like);
                    } else {
                      navigate("/subscriptions");
                    }
                  }}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Profile Modal */}
      {selectedProfile && (
        <ProfileModal
          isOpen={!!selectedProfile}
          onClose={() => setSelectedProfile(null)}
          profile={{
            id: selectedProfile.id,
            name: selectedProfile.displayName,
            age: selectedProfile.age || 25,
            location: selectedProfile.location || "France",
            photos: [selectedProfile.avatarUrl],
            bio: selectedProfile.bio || "",
            interests: selectedProfile.interests,
            isVerified: selectedProfile.isVerified,
          }}
          onLike={() => handleLikeBack(selectedProfile)}
          onSuperLike={() => handleLikeBack(selectedProfile)}
        />
      )}

      {/* Match Modal */}
      {matchedProfile && (
        <MatchModal
          isOpen={isMatchModalOpen}
          onClose={handleCloseMatchModal}
          profile={{
            id: matchedProfile.id,
            name: matchedProfile.displayName,
            age: matchedProfile.age || 25,
            location: matchedProfile.location || "France",
            photos: [matchedProfile.avatarUrl],
            bio: matchedProfile.bio || "",
            interests: matchedProfile.interests,
            isVerified: matchedProfile.isVerified,
            gender: "female" as const,
            distance: "",
            isOnline: false,
          }}
          onStartChat={handleStartChat}
        />
      )}

      <BottomNavigation />
    </div>
  );
};

// Like Card Component
interface LikeCardProps {
  profile: LikeProfile;
  index: number;
  isPremium: boolean;
  onPress: () => void;
}

const LikeCard = ({ profile, index, isPremium, onPress }: LikeCardProps) => {
  const { subscription } = useUserSubscription(profile.id);

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onClick={onPress}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden group tap-highlight"
    >
      {/* Background image - blurred for non-premium */}
      <div className="absolute inset-0">
        <img
          src={profile.avatarUrl}
          alt={profile.displayName}
          className={`w-full h-full object-cover transition-all duration-300 ${
            isPremium ? "group-hover:scale-105" : "blur-xl scale-110"
          }`}
        />
        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
      </div>

      {/* Lock icon for non-premium */}
      {!isPremium && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="p-4 rounded-full bg-black/50 backdrop-blur-sm">
            <Lock className="w-8 h-8 text-white" />
          </div>
        </div>
      )}

      {/* Rose / Super Like badge */}
      {(profile.hasRose || profile.isSuperLike) && (
        <div className="absolute top-2 right-2 z-10">
          {profile.hasRose ? (
            <span className="text-2xl drop-shadow-lg">🌹</span>
          ) : (
            <div className="p-1.5 rounded-full bg-blue-500/90 shadow-lg">
              <Star className="w-4 h-4 text-white fill-white" />
            </div>
          )}
        </div>
      )}

      {/* Subscription badge */}
      {subscription && (subscription.tier === "premium" || subscription.tier === "vip") && isPremium && (
        <div className="absolute top-2 left-2 z-10">
          <SubscriptionBadge tier={subscription.tier} size="sm" />
        </div>
      )}

      {/* Profile info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <div className="flex items-center gap-1.5">
          <h3 className={`font-semibold text-white ${isPremium ? "" : "blur-sm"}`}>
            {isPremium ? profile.displayName : "••••••"}
          </h3>
          {profile.age && isPremium && (
            <span className="text-white/80">, {profile.age}</span>
          )}
        </div>
        {profile.location && isPremium && (
          <p className="text-xs text-white/60 mt-0.5 truncate">{profile.location}</p>
        )}
      </div>

      {/* Border glow for special likes */}
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none ${
          profile.hasRose
            ? "ring-2 ring-rose-500/50"
            : profile.isSuperLike
            ? "ring-2 ring-blue-500/50"
            : ""
        }`}
      />
    </motion.button>
  );
};

export default Likes;
