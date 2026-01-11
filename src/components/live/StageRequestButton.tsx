import { motion } from "framer-motion";
import { Hand, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StageRequestButtonProps {
  hasRequest: boolean;
  isOnStage: boolean;
  isLoading: boolean;
  onRequest: () => void;
  onCancel: () => void;
  onLeave: () => void;
}

const StageRequestButton = ({
  hasRequest,
  isOnStage,
  isLoading,
  onRequest,
  onCancel,
  onLeave,
}: StageRequestButtonProps) => {
  if (isOnStage) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onLeave}
        className="w-12 h-12 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center active:bg-destructive transition-colors"
      >
        <X className="w-6 h-6 text-white" />
      </motion.button>
    );
  }

  if (hasRequest) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onCancel}
        className="w-12 h-12 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center relative"
      >
        <Hand className="w-6 h-6 text-white" />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onRequest}
      disabled={isLoading}
      className={cn(
        "w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center active:bg-primary/80 transition-colors",
        isLoading && "opacity-50"
      )}
    >
      {isLoading ? (
        <Loader2 className="w-6 h-6 text-foreground animate-spin" />
      ) : (
        <Hand className="w-6 h-6 text-foreground" />
      )}
    </motion.button>
  );
};

export default StageRequestButton;
