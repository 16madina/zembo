import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";

import { mockProfiles, Profile } from "@/data/mockProfiles";

const Home = () => {
  const navigate = useNavigate();
  const [profiles] = useState<Profile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "nearby">("discover");
  
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());

  const currentProfile = profiles[currentIndex];
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

    if (currentIndex < profiles.length - 1) {
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
          className="p-2 glass rounded-lg tap-highlight"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <SlidersHorizontal className="w-4 h-4 text-muted-foreground" />
        </motion.button>
      </motion.header>

      {/* Navigation Tabs */}
      <motion.div 
        className="flex justify-center gap-2 px-4 mb-1.5 flex-shrink-0"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
      >
        {["discover", "nearby"].map((tab) => (
          <motion.button
            key={tab}
            onClick={() => setActiveTab(tab as "discover" | "nearby")}
            className={`relative px-4 py-1.5 rounded-full font-medium text-sm transition-colors duration-200 ${
              activeTab === tab
                ? "text-primary-foreground"
                : "text-muted-foreground hover:text-secondary-foreground"
            }`}
            whileTap={{ scale: 0.95 }}
          >
            {activeTab === tab && (
              <motion.div
                layoutId="activeTabBg"
                className="absolute inset-0 btn-gold rounded-full"
                transition={{ type: "spring", stiffness: 500, damping: 35 }}
              />
            )}
            {activeTab !== tab && (
              <div className="absolute inset-0 glass rounded-full" />
            )}
            <span className="relative z-10">
              {tab === "discover" ? "Découvrir" : "À proximité"}
            </span>
          </motion.button>
        ))}
      </motion.div>

      {/* Card Stack */}
      <div className="flex-1 px-2 max-w-md mx-auto w-full flex flex-col min-h-0">
        <motion.div 
          className="relative flex-1 min-h-0"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
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

          {/* Active card */}
          <AnimatePresence mode="popLayout">
            {currentProfile && (
              <ProfileCard
                key={currentProfile.id}
                profile={currentProfile}
                onSwipe={handleSwipe}
                onInfoClick={handleInfoClick}
                onLike={handleLike}
                onPass={handlePass}
                onSuperLike={handleSuperLike}
              />
            )}
          </AnimatePresence>
        </motion.div>
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

      <BottomNavigation />
    </div>
  );
};

export default Home;
