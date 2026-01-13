import { useState, useEffect, useMemo, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, SearchX, Loader2, MapPin } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";
import FilterSheet, { FilterValues } from "@/components/FilterSheet";
import NearbyMap from "@/components/NearbyMap";
import SuperLikeExplosion from "@/components/SuperLikeExplosion";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useProfilesWithDistance, ProfileWithDistance } from "@/hooks/useProfilesWithDistance";
import { useGifts } from "@/hooks/useGifts";
import { useCoins } from "@/hooks/useCoins";
import { useToast } from "@/hooks/use-toast";
// Profile interface matching database structure (kept for compatibility)
export interface Profile {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female';
  location: string;
  distance: string;
  bio: string;
  photos: string[];
  isOnline: boolean;
  isVerified: boolean;
  interests: string[];
}

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const { gifts, sendGift } = useGifts();
  const { balance } = useCoins();
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "nearby">("discover");
  const [userCountry, setUserCountry] = useState<string | null>(null);
  
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  const [receivedLikes, setReceivedLikes] = useState<Set<string>>(new Set());
  const [showSuperLikeExplosion, setShowSuperLikeExplosion] = useState(false);
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    ageMin: 18,
    ageMax: 50,
    distance: 50,
    genders: ["all"],
  });

  // Use the new hook with distance calculation
  const {
    profiles: profilesWithDistance,
    isLoading: isLoadingProfiles,
    isLoadingMore,
    hasMore,
    loadMore,
    userLocation,
  } = useProfilesWithDistance({
    pageSize: 10,
    maxDistance: filters.distance,
    ageMin: filters.ageMin,
    ageMax: filters.ageMax,
    genders: filters.genders,
  });

  // Transform profiles for compatibility with existing components
  const profiles: Profile[] = useMemo(() => 
    profilesWithDistance.map(p => ({
      id: p.id,
      name: p.name,
      age: p.age,
      gender: p.gender,
      location: p.location,
      distance: p.distance,
      bio: p.bio,
      photos: p.photos,
      isOnline: p.isOnline,
      isVerified: p.isVerified,
      interests: p.interests,
    }))
  , [profilesWithDistance]);

  // Fetch user's country and received likes from database
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      // Fetch user's country
      const { data: profileData } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (profileData?.location) {
        setUserCountry(profileData.location);
      }
      
      // Fetch likes received by this user (people who liked me)
      const { data: likesData } = await supabase
        .from("likes")
        .select("liker_id")
        .eq("liked_id", user.id);
      
      if (likesData) {
        setReceivedLikes(new Set(likesData.map(l => l.liker_id)));
      }
      
      // Fetch likes already sent by this user
      const { data: sentLikesData } = await supabase
        .from("likes")
        .select("liked_id")
        .eq("liker_id", user.id);
      
      if (sentLikesData) {
        setLikedProfiles(new Set(sentLikesData.map(l => l.liked_id)));
      }
    };
    
    fetchUserData();
  }, [user]);

  // Load more profiles when nearing the end of the stack
  useEffect(() => {
    if (currentIndex >= profiles.length - 3 && hasMore && !isLoadingMore) {
      loadMore();
    }
  }, [currentIndex, profiles.length, hasMore, isLoadingMore, loadMore]);

  // Check if filters are modified from default
  const hasActiveFilters = 
    filters.ageMin !== 18 || 
    filters.ageMax !== 50 || 
    filters.distance !== 50 || 
    (filters.genders.length !== 1 || !filters.genders.includes("all"));

  const currentProfile = profiles.length > 0 
    ? profiles[currentIndex % profiles.length] 
    : null;

  // Check for match using real database data
  const checkForMatch = (profileId: string) => {
    // A match occurs if the other person already liked us
    return receivedLikes.has(profileId);
  };

  const handleSwipe = async (direction: "left" | "right" | "up") => {
    const swipedProfile = currentProfile;
    if (!swipedProfile || !user) return;
    
    if (direction === "right" || direction === "up") {
      const isSuperLike = direction === "up";
      
      // Trigger super like explosion animation
      if (isSuperLike) {
        setShowSuperLikeExplosion(true);
      }
      // Save like to database
      try {
        const { error: likeError } = await supabase
          .from("likes")
          .upsert({
            liker_id: user.id,
            liked_id: swipedProfile.id,
            is_super_like: isSuperLike,
          }, { onConflict: 'liker_id,liked_id' });
        
        if (likeError) {
          console.error("Error saving like:", likeError);
        } else {
          setLikedProfiles((prev) => new Set([...prev, swipedProfile.id]));
          
          // Send like notification
          await supabase.functions.invoke("notify-like", {
            body: {
              liker_id: user.id,
              liked_id: swipedProfile.id,
              is_super_like: isSuperLike,
            },
          });
          
          // Check for match - the database trigger will create the match automatically
          if (checkForMatch(swipedProfile.id)) {
            setMatchedProfile(swipedProfile);
            setIsMatchModalOpen(true);
          }
        }
      } catch (err) {
        console.error("Error processing like:", err);
      }
    }

    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Try to load more if available
      if (hasMore) {
        loadMore();
      }
      setCurrentIndex(0);
    }
  };

  const handlePass = () => handleSwipe("left");
  
  const handleLike = () => {
    if (isModalOpen) setIsModalOpen(false);
    handleSwipe("right");
  };
  
  const handleSuperLike = () => {
    if (isModalOpen) setIsModalOpen(false);
    handleSwipe("up");
  };

  const handleSuperLikeExplosionComplete = useCallback(() => {
    setShowSuperLikeExplosion(false);
  }, []);

  const handleInfoClick = () => {
    setSelectedProfile(currentProfile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
  };

  const handleCloseMatchModal = () => {
    setIsMatchModalOpen(false);
    setMatchedProfile(null);
  };

  const handleStartChat = () => {
    setIsMatchModalOpen(false);
    navigate("/messages");
  };

  const handleSendRose = async () => {
    if (!selectedProfile || !user) return;
    
    const roseGift = gifts.find(g => g.name === "Rose");
    if (!roseGift) {
      toast({
        title: "Cadeau indisponible",
        description: "La rose n'est pas disponible pour le moment",
        variant: "destructive",
      });
      return;
    }
    
    if (balance < roseGift.price_coins) {
      toast({
        title: "Solde insuffisant",
        description: `Vous avez besoin de ${roseGift.price_coins} coins pour envoyer une rose`,
        variant: "destructive",
      });
      return;
    }
    
    const result = await sendGift(roseGift, selectedProfile.id, "Une rose pour toi 🌹");
    
    if (result.success) {
      toast({
        title: "Rose envoyée ! 🌹",
        description: `${selectedProfile.name} a reçu votre rose`,
      });
      setIsModalOpen(false);
    } else {
      toast({
        title: "Erreur",
        description: result.error || "Impossible d'envoyer la rose",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden pt-[env(safe-area-inset-top)] pb-[calc(88px+env(safe-area-inset-bottom))]">
      {/* Header */}
      <motion.header 
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-center gap-2">
          <ZemboLogo />
          {userLocation.latitude && userLocation.longitude && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/20 border border-green-500/30"
            >
              <MapPin className="w-3 h-3 text-green-500" />
              <span className="text-xs text-green-500 font-medium">GPS</span>
            </motion.div>
          )}
        </div>
        <motion.button 
          onClick={() => setIsFilterOpen(true)}
          className={`relative p-2 rounded-lg tap-highlight ${hasActiveFilters ? 'bg-primary/20 border border-primary/30' : 'glass'}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SlidersHorizontal className={`w-4 h-4 ${hasActiveFilters ? 'text-primary' : 'text-muted-foreground'}`} />
          {hasActiveFilters && (
            <motion.span 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-primary rounded-full border-2 border-background"
            />
          )}
        </motion.button>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.div 
        className="flex justify-center gap-2 px-4 mb-1.5 flex-shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {[
          { key: "discover", label: t.discover },
          { key: "nearby", label: t.nearby }
        ].map((tab) => (
          <motion.button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as "discover" | "nearby")}
            className={`relative px-4 py-1.5 rounded-full font-medium text-sm transition-colors duration-200 ${
              activeTab === tab.key
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-secondary-foreground"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === tab.key && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 btn-gold rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {activeTab !== tab.key && (
              <div className="absolute inset-0 glass rounded-full" />
            )}
            <span className="relative z-10">{tab.label}</span>
          </motion.button>
        ))}
      </motion.div>

      {/* Card Stack or Map */}
      <div className="flex-1 px-2 max-w-md md:max-w-lg lg:max-w-xl xl:max-w-2xl mx-auto w-full flex flex-col min-h-0">
        <AnimatePresence mode="wait">
          {activeTab === "discover" ? (
            <motion.div 
              key="discover"
              className="relative flex-1 min-h-0"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {/* Background cards (stack effect) */}
              {profiles.slice(currentIndex + 1, currentIndex + 3).map((profile, index) => (
                <motion.div
                  key={profile.id}
                  className="absolute w-full h-full rounded-3xl overflow-hidden"
                  initial={false}
                  animate={{
                    scale: 1 - (index + 1) * 0.05,
                    y: (index + 1) * 8,
                    opacity: 1 - (index + 1) * 0.3,
                  }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  style={{ zIndex: -index - 1 }}
                >
                  <div className="w-full h-full glass-strong rounded-3xl overflow-hidden">
                    <img
                      src={profile.photos[0]}
                      alt={profile.name}
                      className="w-full h-full object-cover opacity-80"
                      draggable={false}
                    />
                    <div className="absolute inset-0 bg-background/20" />
                  </div>
                </motion.div>
              ))}

              {/* Active card or empty/loading state */}
              <AnimatePresence mode="popLayout">
                {isLoadingProfiles ? (
                  <motion.div
                    key="loading"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center glass-strong rounded-3xl p-6 text-center"
                  >
                    <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Chargement des profils...
                    </h3>
                  </motion.div>
                ) : currentProfile ? (
                  <ProfileCard
                    key={currentProfile.id}
                    profile={currentProfile}
                    onSwipe={handleSwipe}
                    onInfoClick={handleInfoClick}
                    onLike={handleLike}
                    onPass={handlePass}
                    onSuperLike={handleSuperLike}
                  />
                ) : (
                  <motion.div
                    key="empty"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="absolute inset-0 flex flex-col items-center justify-center glass-strong rounded-3xl p-6 text-center"
                  >
                    <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mb-4">
                      <SearchX className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      {profiles.length === 0 ? "Aucun profil disponible" : t.noProfilesFound}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {profiles.length === 0 ? "Soyez le premier à vous inscrire dans votre région !" : t.modifyFilters}
                    </p>
                    {profiles.length > 0 && (
                      <div className="flex gap-2">
                        <motion.button
                          onClick={() => {
                            setFilters({
                              ageMin: 18,
                              ageMax: 50,
                              distance: 50,
                              genders: ["all"],
                            });
                            setCurrentIndex(0);
                          }}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 glass rounded-xl text-sm font-medium text-foreground"
                        >
                          {t.reset}
                        </motion.button>
                        <motion.button
                          onClick={() => setIsFilterOpen(true)}
                          whileTap={{ scale: 0.95 }}
                          className="px-4 py-2 btn-gold rounded-xl text-sm font-medium"
                        >
                          {t.modify}
                        </motion.button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ) : (
            <motion.div 
              key="nearby"
              className="relative flex-1 min-h-0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
            >
              <NearbyMap 
                profiles={profiles} 
                userCountry={userCountry}
                onProfileClick={(profile) => {
                  setSelectedProfile(profile);
                  setIsModalOpen(true);
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <ProfileModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLike}
        onSuperLike={handleSuperLike}
        onSendRose={handleSendRose}
      />

      <MatchModal
        profile={matchedProfile}
        isOpen={isMatchModalOpen}
        onClose={handleCloseMatchModal}
        onStartChat={handleStartChat}
      />

      <FilterSheet
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onApply={setFilters}
      />

      <SuperLikeExplosion 
        isVisible={showSuperLikeExplosion} 
        onComplete={handleSuperLikeExplosionComplete} 
      />

      <BottomNavigation />
    </div>
  );
};

export default Home;
