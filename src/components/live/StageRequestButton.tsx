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
        className="w-10 h-10 rounded-full bg-destructive/80 backdrop-blur-sm flex items-center justify-center active:bg-destructive transition-colors"
      >
        <X className="w-5 h-5 text-white" />
      </motion.button>
    );
  }

  if (hasRequest) {
    return (
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onCancel}
        className="w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center relative"
      >
        <Hand className="w-5 h-5 text-white" />
        <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
      </motion.button>
    );
  }

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onRequest}
      disabled={isLoading}
      className={cn(
        "w-10 h-10 rounded-full bg-primary/80 backdrop-blur-sm flex items-center justify-center active:bg-primary transition-colors relative",
        isLoading && "opacity-50"
      )}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2, repeat: Infinity, repeatType: "loop" }}
    >
      {isLoading ? (
        <Loader2 className="w-5 h-5 text-white animate-spin" />
      ) : (
        <Hand className="w-5 h-5 text-white" />
      )}
      <span className="absolute -bottom-5 whitespace-nowrap text-[10px] text-primary font-medium">
        Rejoindre
      </span>
    </motion.button>
  );
};

export default StageRequestButton;
