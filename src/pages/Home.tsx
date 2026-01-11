import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal, SearchX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";
import FilterSheet, { FilterValues } from "@/components/FilterSheet";
import NearbyMap from "@/components/NearbyMap";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

import { mockProfiles, Profile } from "@/data/mockProfiles";

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useLanguage();
  const [profiles] = useState<Profile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "nearby">("discover");
  const [userCountry, setUserCountry] = useState<string | null>(null);
  
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());
  
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [filters, setFilters] = useState<FilterValues>({
    ageMin: 18,
    ageMax: 50,
    distance: 50,
    genders: ["all"],
  });

  // Fetch user's country from profile
  useEffect(() => {
    const fetchUserCountry = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from("profiles")
        .select("location")
        .eq("user_id", user.id)
        .maybeSingle();
      
      if (data?.location) {
        setUserCountry(data.location);
      }
    };
    
    fetchUserCountry();
  }, [user]);

  // Filter profiles based on criteria
  const filteredProfiles = profiles.filter((profile) => {
    // Age filter
    if (profile.age < filters.ageMin || profile.age > filters.ageMax) {
      return false;
    }
    
    // Distance filter (extract number from "X km" string)
    const distanceNum = parseInt(profile.distance.replace(/[^0-9]/g, ""), 10);
    if (distanceNum > filters.distance) {
      return false;
    }
    
    return true;
  });

  // Check if filters are modified from default
  const hasActiveFilters = 
    filters.ageMin !== 18 || 
    filters.ageMax !== 50 || 
    filters.distance !== 50 || 
    (filters.genders.length !== 1 || !filters.genders.includes("all"));

  const currentProfile = filteredProfiles.length > 0 
    ? filteredProfiles[currentIndex % filteredProfiles.length] 
    : null;
  const profilesWhoLikedUser = new Set(["1", "3", "5"]);

  const checkForMatch = (profileId: string) => {
    return profilesWhoLikedUser.has(profileId);
  };

  const handleSwipe = (direction: "left" | "right" | "up") => {
    const swipedProfile = currentProfile;
    
    if (direction === "right" || direction === "up") {
      setLikedProfiles((prev) => new Set([...prev, swipedProfile.id]));
      
      if (checkForMatch(swipedProfile.id)) {
        setMatchedProfile(swipedProfile);
        setIsMatchModalOpen(true);
      }
    }

    if (currentIndex < filteredProfiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
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

  return (
    <div className="h-[100dvh] flex flex-col overflow-hidden pb-[88px]">
      {/* Header */}
      <motion.header 
        className="flex items-center justify-between px-3 py-1.5 flex-shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <ZemboLogo />
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
      <div className="flex-1 px-2 max-w-md mx-auto w-full flex flex-col min-h-0">
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
              {filteredProfiles.slice(currentIndex + 1, currentIndex + 3).map((profile, index) => (
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

              {/* Active card or empty state */}
              <AnimatePresence mode="popLayout">
                {currentProfile ? (
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
                      {t.noProfilesFound}
                    </h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {t.modifyFilters}
                    </p>
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
                profiles={filteredProfiles} 
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

      <BottomNavigation />
    </div>
  );
};

export default Home;
