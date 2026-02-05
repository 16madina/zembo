 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import CompatibilityTestGame from "./CompatibilityTestGame";
 import AIConsentModal from "@/components/AIConsentModal";
 import { useAIDataConsent } from "@/hooks/useAIDataConsent";

interface CompatibilityGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CompatibilityGameModal = ({ isOpen, onClose }: CompatibilityGameModalProps) => {
  const [gameStarted, setGameStarted] = useState(false);
   const [showConsentModal, setShowConsentModal] = useState(false);
   const { hasConsented, isLoading } = useAIDataConsent();

  const handleCloseGame = () => {
    setGameStarted(false);
     setShowConsentModal(false);
    onClose();
  };

   const handleConsentGranted = () => {
     setShowConsentModal(false);
     setGameStarted(true);
   };
 
  // If game started, show full-screen game
  if (gameStarted) {
    return <CompatibilityTestGame onClose={handleCloseGame} />;
  }

   // If open and consent needed, show consent modal first
  if (isOpen) {
     // Check if user already has consent
     if (!isLoading && hasConsented) {
       // Already consented, go directly to game
       return <CompatibilityTestGame onClose={handleCloseGame} />;
     }
 
     // Show consent modal first
     return (
       <AIConsentModal
         isOpen={true}
         onClose={handleCloseGame}
         onConsent={handleConsentGranted}
       />
     );
  }

  return null;
};

export default CompatibilityGameModal;
