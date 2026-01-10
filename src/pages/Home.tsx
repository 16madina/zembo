import { useState } from "react";
import { AnimatePresence } from "framer-motion";
import { SlidersHorizontal } from "lucide-react";
import ZemboLogo from "@/components/ZemboLogo";
import BottomNavigation from "@/components/BottomNavigation";
import ProfileCard from "@/components/ProfileCard";
import ProfileModal from "@/components/ProfileModal";
import ActionButtons from "@/components/ActionButtons";
import { mockProfiles, Profile } from "@/data/mockProfiles";

const Home = () => {
  const [profiles, setProfiles] = useState<Profile[]>(mockProfiles);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"discover" | "nearby">("discover");

  const currentProfile = profiles[currentIndex];

  const handleSwipe = (direction: "left" | "right" | "up") => {
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      // Reset to start when all profiles are viewed
      setCurrentIndex(0);
    }
  };

  const handlePass = () => handleSwipe("left");
  const handleLike = () => {
    handleSwipe("right");
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };
  const handleSuperLike = () => {
    handleSwipe("up");
    if (isModalOpen) {
      setIsModalOpen(false);
    }
  };

  const handleInfoClick = () => {
    setSelectedProfile(currentProfile);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedProfile(null);
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

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
};

export default Home;
