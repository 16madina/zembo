import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import CompatibilityTestGame from "./CompatibilityTestGame";

interface CompatibilityGameModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CompatibilityGameModal = ({ isOpen, onClose }: CompatibilityGameModalProps) => {
  const [gameStarted, setGameStarted] = useState(false);

  const handleStartGame = () => {
    setGameStarted(true);
  };

  const handleCloseGame = () => {
    setGameStarted(false);
    onClose();
  };

  // If game started, show full-screen game
  if (gameStarted) {
    return <CompatibilityTestGame onClose={handleCloseGame} />;
  }

  // Clicking on the card opens directly the game
  if (isOpen) {
    return <CompatibilityTestGame onClose={onClose} />;
  }

  return null;
};

export default CompatibilityGameModal;
