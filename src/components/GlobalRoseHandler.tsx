import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useRoseReceived } from "@/hooks/useRoseReceived";
import RoseReceivedModal from "@/components/RoseReceivedModal";

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

  const handleViewProfile = () => {
    closeModal();
    
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

  return (
    <RoseReceivedModal
      isOpen={isModalOpen}
      onClose={closeModal}
      onViewProfile={handleViewProfile}
      senderName={roseReceived?.name || ""}
      senderPhoto={roseReceived?.photo || ""}
      message={roseReceived?.message || ""}
      senderId={roseReceived?.id}
    />
  );
};

export default GlobalRoseHandler;
