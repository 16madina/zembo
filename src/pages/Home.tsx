import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import MatchModal from "@/components/MatchModal";
import ActionButtons from "@/components/ActionButtons";
import { mockProfiles, Profile } from "@/data/mockProfiles";

const Home = () => {
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "nearby">("discover");
  
  // Match system state
  const [isMatchModalOpen, setIsMatchModalOpen] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [likedProfiles, setLikedProfiles] = useState<Set<string>>(new Set());

  const currentProfile = profiles[currentIndex];

  // Simulate which profiles have "liked" the user (for demo purposes)
  const profilesWhoLikedUser = new Set(["1", "3", "5"]); // Sophie, Léa, Chloé

  const checkForMatch = (profileId: string) => {
    // Check if this profile has liked the user
    if (profilesWhoLikedUser.has(profileId)) {
      return true;
    }
    return false;
  };

  const handleSwipe = (direction: "left" | "right" | "up") => {
    const swipedProfile = currentProfile;
    
    if (direction === "right" || direction === "up") {
      // Add to liked profiles
      setLikedProfiles((prev) => new Set([...prev, swipedProfile.id]));
      
      // Check for match
      if (checkForMatch(swipedProfile.id)) {
        setMatchedProfile(swipedProfile);
        setIsMatchModalOpen(true);
      }
    }

    // Move to next profile
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePass = () => handleSwipe("left");
  
  const handleLike = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
    }
    handleSwipe("right");
  };
  
  const handleSuperLike = () => {
    if (isModalOpen) {
      setIsModalOpen(false);
    }
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
    <div className="min-h-screen flex flex-col pb-20">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4">
        <div className="w-10" />
        <ZemboLogo />
        <button className="p-2.5 bg-card/80 backdrop-blur-sm rounded-xl border border-border transition-colors hover:bg-secondary">
          <SlidersHorizontal className="w-5 h-5 text-muted-foreground" />
        </button>
      </header>

      {/* Navigation Tabs */}
      <div className="flex justify-center gap-4 px-6 mb-6">
        <button
          onClick={() => setActiveTab("discover")}
          className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
            activeTab === "discover"
              ? "btn-gold text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          Découvrir
        </button>
        <button
          onClick={() => setActiveTab("nearby")}
          className={`px-6 py-2.5 rounded-full font-medium text-sm transition-all duration-200 ${
            activeTab === "nearby"
              ? "btn-gold text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-muted"
          }`}
        >
          À proximité
        </button>
      </div>

      {/* Card Stack */}
      <div className="flex-1 px-4 max-w-md mx-auto w-full">
        <div className="relative h-[60vh] min-h-[450px]">
          <AnimatePresence>
            {currentProfile && (
              <ProfileCard
                key={currentProfile.id}
                profile={currentProfile}
                onSwipe={handleSwipe}
                onInfoClick={handleInfoClick}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Action Buttons */}
        <div className="mt-6">
          <ActionButtons
            onPass={handlePass}
            onSuperLike={handleSuperLike}
            onLike={handleLike}
          />
        </div>
      </div>

      {/* Profile Modal */}
      <ProfileModal
        profile={selectedProfile}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onLike={handleLike}
        onSuperLike={handleSuperLike}
      />

      {/* Match Modal */}
      <MatchModal
        profile={matchedProfile}
        isOpen={isMatchModalOpen}
        onClose={handleCloseMatchModal}
        onStartChat={handleStartChat}
      />

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Home;
