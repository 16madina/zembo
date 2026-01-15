import { motion } from "framer-motion";
import { X, Star, Heart, Undo2, Crown } from "lucide-react";
import { useSubscription } from "@/hooks/useSubscription";

interface ActionButtonsProps {
  onPass: () => void;
  onSuperLike: () => void;
  onLike: () => void;
  onUndo?: () => void;
  canUndo?: boolean;
}

const ActionButtons = ({ onPass, onSuperLike, onLike, onUndo, canUndo = false }: ActionButtonsProps) => {
  const { isPremium } = useSubscription();
  
  const buttonVariants = {
    tap: { scale: 0.9 },
    hover: { scale: 1.1 },
  };

  return (
    <div className="flex items-center justify-center gap-4">
      {/* Undo Button - Premium only */}
      {isPremium && (
        <motion.button
          onClick={onUndo}
          disabled={!canUndo}
          variants={buttonVariants}
          whileHover={canUndo ? "hover" : undefined}
          whileTap={canUndo ? "tap" : undefined}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative p-3 glass rounded-full transition-all ${
            canUndo 
              ? "text-amber-500 hover:glow-gold cursor-pointer" 
              : "text-muted-foreground/40 cursor-not-allowed"
          }`}
        >
          <div className={`absolute inset-0 rounded-full ${canUndo ? "bg-amber-500/10" : "bg-muted/5"}`} />
          <Undo2 className="w-5 h-5 relative z-10" />
          <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-500" fill="currentColor" />
        </motion.button>
      )}
      
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
