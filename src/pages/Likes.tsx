import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Crown, Lock, ArrowLeft, Flame, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileModal from "@/components/ProfileModal";
import ConnectionModal from "@/components/ConnectionModal";
import RoseRevealModal from "@/components/RoseRevealModal";
import SubscriptionBadge from "@/components/SubscriptionBadge";
import { useUserSubscription } from "@/hooks/useUserSubscription";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

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

type TabType = "all" | "super" | "rose";

const Likes = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { isPremium, isVip } = useSubscription();

  const [likes, setLikes] = useState<LikeProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProfile, setSelectedProfile] = useState<LikeProfile | null>(null);
  const [selectedRoseProfile, setSelectedRoseProfile] = useState<LikeProfile | null>(null);
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<LikeProfile | null>(null);

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const tab = sessionStorage.getItem("likesOpenTab");
    if (tab === "super" || tab === "rose" || tab === "all") {
      sessionStorage.removeItem("likesOpenTab");
      return tab;
    }
    return "all";
  });

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

  // Filter likes based on active tab
  const filteredLikes = useMemo(() => {
    let filtered: LikeProfile[];
    
    switch (activeTab) {
      case "super":
        filtered = likes.filter((l) => l.isSuperLike && !l.hasRose);
        break;
      case "rose":
        filtered = likes.filter((l) => l.hasRose);
        break;
      default:
        filtered = likes.filter((l) => !l.isSuperLike && !l.hasRose);
    }

    // Sort by date
    return filtered.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [likes, activeTab]);

  // Count for each tab
  const counts = useMemo(() => ({
    all: likes.filter((l) => !l.isSuperLike && !l.hasRose).length,
    super: likes.filter((l) => l.isSuperLike && !l.hasRose).length,
    rose: likes.filter((l) => l.hasRose).length,
  }), [likes]);

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
            <Heart className="w-5 h-5 text-primary fill-primary" />
            <h1 className="text-lg font-semibold">Mes connexions</h1>
          </div>
          <div className="w-9" /> {/* Spacer */}
        </div>
      </motion.header>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabType)} className="w-full">
          <TabsList className="w-full grid grid-cols-3 h-12 bg-muted/50">
            <TabsTrigger
              value="all"
              className="flex items-center gap-1.5 data-[state=active]:bg-destructive/10 data-[state=active]:text-destructive"
            >
              <Heart className="w-4 h-4" />
              <span className="hidden sm:inline">Connexion</span>
              {counts.all > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-destructive/20 text-destructive font-medium">
                  {counts.all}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="super"
              className="flex items-center gap-1.5 data-[state=active]:bg-orange-500/10 data-[state=active]:text-orange-500"
            >
              <Flame className="w-4 h-4" />
              <span className="hidden sm:inline">ZFlamme</span>
              {counts.super > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-orange-500/20 text-orange-500 font-medium">
                  {counts.super}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="rose"
              className="flex items-center gap-1.5 data-[state=active]:bg-rose-500/10 data-[state=active]:text-rose-500"
            >
              <span className="text-base">🌹</span>
              <span className="hidden sm:inline">Rose</span>
              {counts.rose > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-rose-500/20 text-rose-500 font-medium">
                  {counts.rose}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
                {t.unlockWhoLikedYou}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                {likes.length} {t.peopleLikedYou}
                </p>
                <Button
                  onClick={() => navigate("/subscriptions")}
                  className="bg-gradient-to-r from-primary to-yellow-500 text-primary-foreground hover:opacity-90"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                {t.becomeGold}
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
        {!loading && filteredLikes.length === 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
              {activeTab === "all" && <Heart className="w-10 h-10 text-muted-foreground" />}
              {activeTab === "super" && <Flame className="w-10 h-10 text-muted-foreground" />}
              {activeTab === "rose" && <span className="text-4xl opacity-50">🌹</span>}
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {activeTab === "all" && t.noLikesYet}
              {activeTab === "super" && t.noSuperLikesYet}
              {activeTab === "rose" && t.noRosesYet}
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              {activeTab === "all" && t.keepSwipingForLikes}
              {activeTab === "super" && t.superLikesShowInterest}
              {activeTab === "rose" && t.rosesArePremium}
            </p>
            <Button
              onClick={() => navigate("/")}
              variant="outline"
              className="mt-6"
            >
              {t.discoverProfiles}
            </Button>
          </motion.div>
        )}

        {/* Likes grid */}
        {!loading && filteredLikes.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence>
              {filteredLikes.map((like, index) =>
                like.hasRose ? (
                  <SecretRoseCard
                    key={like.id}
                    profile={like}
                    index={index}
                    onPress={() => setSelectedRoseProfile(like)}
                  />
                ) : (
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
                )
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Profile Modal (for regular likes / super likes) */}
      {selectedProfile && !selectedProfile.hasRose && (
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

      {/* Rose Reveal Modal (secret flow for roses) */}
      {selectedRoseProfile && user && (
        <RoseRevealModal
          isOpen={!!selectedRoseProfile}
          onClose={() => setSelectedRoseProfile(null)}
          profile={{
            id: selectedRoseProfile.id,
            displayName: selectedRoseProfile.displayName,
            avatarUrl: selectedRoseProfile.avatarUrl,
            age: selectedRoseProfile.age,
            location: selectedRoseProfile.location,
            bio: selectedRoseProfile.bio,
            interests: selectedRoseProfile.interests,
            isVerified: selectedRoseProfile.isVerified,
          }}
          currentUserId={user.id}
          onMatch={() => {
            handleLikeBack(selectedRoseProfile);
            setSelectedRoseProfile(null);
          }}
        />
      )}

      {/* Match Modal */}
      {matchedProfile && (
        <ConnectionModal
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
            gender: "femme" as const,
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

      {/* Rose / ZFlamme badge */}
      {(profile.hasRose || profile.isSuperLike) && (
        <div className="absolute top-2 right-2 z-10">
          {profile.hasRose ? (
            <span className="text-2xl drop-shadow-lg">🌹</span>
          ) : (
            <div className="p-1.5 rounded-full bg-orange-500/90 shadow-lg">
              <Flame className="w-4 h-4 text-white fill-white" />
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

// Secret Rose Card Component (mystery card for roses)
interface SecretRoseCardProps {
  profile: LikeProfile;
  index: number;
  onPress: () => void;
}

const SecretRoseCard = ({ profile, index, onPress }: SecretRoseCardProps) => {
  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ delay: index * 0.05 }}
      onClick={onPress}
      className="relative aspect-[3/4] rounded-2xl overflow-hidden group tap-highlight"
    >
      {/* Mysterious gradient background */}
      <div className="absolute inset-0 bg-gradient-to-br from-rose-950 via-rose-900/80 to-rose-950">
        {/* Animated shimmer effect */}
        <motion.div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-500/10 to-transparent"
          animate={{
            x: ["-100%", "100%"],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            repeatDelay: 1,
          }}
        />
      </div>

      {/* Floating rose petals background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute text-xl opacity-30"
            style={{ left: `${20 + i * 15}%`, top: "-20px" }}
            animate={{
              y: [0, 300],
              x: [0, Math.sin(i) * 30],
              rotate: [0, 360],
              opacity: [0.3, 0],
            }}
            transition={{
              duration: 4 + i,
              repeat: Infinity,
              delay: i * 0.5,
            }}
          >
            🌹
          </motion.div>
        ))}
      </div>

      {/* Center rose icon */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
          }}
          className="text-5xl mb-3 drop-shadow-lg"
        >
          🌹
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-rose-200/80 text-xs font-medium px-3 py-1 rounded-full bg-rose-500/20 border border-rose-400/30"
        >
          Admirateur Secret
        </motion.div>
      </div>

      {/* Name at bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10 text-center">
        <h3 className="font-semibold text-white text-lg">{profile.displayName}</h3>
        <p className="text-rose-200/70 text-xs mt-0.5">Touche pour découvrir...</p>
      </div>

      {/* Glowing border */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none ring-2 ring-rose-500/60"
        animate={{
          boxShadow: [
            "0 0 15px rgba(244, 63, 94, 0.3)",
            "0 0 25px rgba(244, 63, 94, 0.5)",
            "0 0 15px rgba(244, 63, 94, 0.3)",
          ],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
        }}
      />
    </motion.button>
  );
};

export default Likes;
