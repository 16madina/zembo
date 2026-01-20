import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRoseReceived } from "@/hooks/useRoseReceived";
import RoseReceivedModal from "@/components/RoseReceivedModal";
import RosePetalsAnimation from "@/components/RosePetalsAnimation";
import { Haptics, ImpactStyle } from "@capacitor/haptics";

/**
 * Global component to handle rose notifications on any page.
 * When a user receives a rose, this component shows the modal
 * and navigates to the Messages page to view the sender's profile.
 */
const GlobalRoseHandler = () => {
  const navigate = useNavigate();
  const { 
    roseReceived, 
    isModalOpen, 
    closeModal 
  } = useRoseReceived();
  
  const [showPetalsAnimation, setShowPetalsAnimation] = useState(false);

  // Trigger the petals animation when a rose is received
  useEffect(() => {
    if (isModalOpen && roseReceived) {
      setShowPetalsAnimation(true);
      
      // Trigger haptic feedback for the rose received
      Haptics.impact({ style: ImpactStyle.Heavy }).catch(() => {});
    }
  }, [isModalOpen, roseReceived]);

  const handleAnimationComplete = useCallback(() => {
    setShowPetalsAnimation(false);
  }, []);

  const handleViewProfile = () => {
    closeModal();
    setShowPetalsAnimation(false);
    
    if (roseReceived) {
      // Store the sender info in sessionStorage so Messages page can open their profile
      sessionStorage.setItem("openRoseProfile", JSON.stringify({
        id: roseReceived.id,
        name: roseReceived.name,
        photo: roseReceived.photo,
      }));
      
      // Navigate to messages page
      navigate("/messages");
    }
  };

  const handleClose = () => {
    closeModal();
    setShowPetalsAnimation(false);
  };

  return (
    <>
      {/* Rose petals explosion animation */}
      <RosePetalsAnimation 
        isVisible={showPetalsAnimation} 
        onComplete={handleAnimationComplete} 
      />
      
      <RoseReceivedModal
        isOpen={isModalOpen}
        onClose={handleClose}
        onViewProfile={handleViewProfile}
        senderName={roseReceived?.name || ""}
        senderPhoto={roseReceived?.photo || ""}
        message={roseReceived?.message || ""}
        senderId={roseReceived?.id}
      />
    </>
  );
};

export default GlobalRoseHandler;
