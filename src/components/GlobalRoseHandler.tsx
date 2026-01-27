import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useRoseReceived } from "@/hooks/useRoseReceived";
import RoseReceivedModal from "@/components/RoseReceivedModal";
import RosePetalsAnimation from "@/components/RosePetalsAnimation";
import { haptics, isNative } from "@/lib/capacitor";

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
    closeModal,
    openRoseBySenderId,
  } = useRoseReceived();

  const [showPetalsAnimation, setShowPetalsAnimation] = useState(false);

  // If we arrive from a push notification, open the rose modal (even if realtime event was missed)
  useEffect(() => {
    const pending = sessionStorage.getItem("pendingRoseFromPush");
    if (!pending) return;

    try {
      const data = JSON.parse(pending) as {
        sender_id?: string;
        sender_name?: string;
        sender_avatar?: string;
      };
      sessionStorage.removeItem("pendingRoseFromPush");

      if (data.sender_id) {
        openRoseBySenderId(data.sender_id, {
          name: data.sender_name,
          photo: data.sender_avatar,
        });
      }
    } catch (e) {
      console.error("Error parsing pendingRoseFromPush:", e);
      sessionStorage.removeItem("pendingRoseFromPush");
    }
  }, [openRoseBySenderId]);

  // Trigger the petals animation when a rose modal opens
  useEffect(() => {
    if (isModalOpen && roseReceived) {
      setShowPetalsAnimation(true);
      if (isNative) {
        haptics.impact('heavy');
      }
    }
  }, [isModalOpen, roseReceived]);

  const handleAnimationComplete = useCallback(() => {
    setShowPetalsAnimation(false);
  }, []);

  const handleViewProfile = () => {
    closeModal();
    setShowPetalsAnimation(false);

    if (roseReceived) {
      sessionStorage.setItem(
        "openRoseProfile",
        JSON.stringify({
          id: roseReceived.id,
          name: roseReceived.name,
          photo: roseReceived.photo,
        })
      );

      navigate("/messages");
    }
  };

  const handleClose = () => {
    closeModal();
    setShowPetalsAnimation(false);
  };

  return (
    <>
      <RosePetalsAnimation isVisible={showPetalsAnimation} onComplete={handleAnimationComplete} />

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
