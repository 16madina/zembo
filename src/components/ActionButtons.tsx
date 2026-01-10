import { motion } from "framer-motion";
import { X, Star, Heart } from "lucide-react";

interface ActionButtonsProps {
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
}

const ActionButtons = ({ onPass, onSuperLike, onLike }: ActionButtonsProps) => {
  const buttonVariants = {
    tap: { scale: 0.9 },
    hover: { scale: 1.1 },
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Pass Button */}
      <motion.button
        onClick={onPass}
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        className="relative p-4 glass rounded-full text-destructive transition-shadow hover:glow-red"
      >
        <div className="absolute inset-0 rounded-full bg-destructive/10" />
        <X className="w-6 h-6 relative z-10" strokeWidth={3} />
      </motion.button>

      {/* Super Like Button */}
      <motion.button
        onClick={onSuperLike}
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        className="relative p-3 glass rounded-full text-accent transition-shadow hover:glow-blue"
      >
        <div className="absolute inset-0 rounded-full bg-accent/10" />
        <Star className="w-5 h-5 relative z-10" fill="currentColor" />
      </motion.button>

      {/* Like Button */}
      <motion.button
        onClick={onLike}
        variants={buttonVariants}
        whileHover="hover"
        whileTap="tap"
        className="relative p-4 btn-gold rounded-full animate-glow-pulse"
      >
        <Heart className="w-6 h-6 text-primary-foreground relative z-10" fill="currentColor" />
      </motion.button>
    </div>
  );
};

export default ActionButtons;
