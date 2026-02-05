 import { useState } from "react";
 import { motion, AnimatePresence } from "framer-motion";
 import CompatibilityTestGame from "./CompatibilityTestGame";

interface CompatibilityGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CompatibilityGameModal = ({ isOpen, onClose }: CompatibilityGameModalProps) => {
  const [gameStarted, setGameStarted] = useState(false);

  const handleCloseGame = () => {
    setGameStarted(false);
    onClose();
  };

  // If game started, show full-screen game
  if (gameStarted) {
    return <CompatibilityTestGame onClose={handleCloseGame} />;
  }

   // Consent is now handled by Random.tsx before opening this modal
  if (isOpen) {
     return <CompatibilityTestGame onClose={handleCloseGame} />;
  }

  return null;
};

export default CompatibilityGameModal;
