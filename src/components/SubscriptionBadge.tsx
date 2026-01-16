import { motion } from "framer-motion";
import { Crown, Gem } from "lucide-react";

interface SubscriptionBadgeProps {
  tier: "premium" | "vip" | "free" | string | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const SubscriptionBadge = ({ 
  tier, 
  size = "md", 
  showLabel = true,
  className = "" 
}: SubscriptionBadgeProps) => {
  if (!tier || tier === "free") return null;

  const isVip = tier === "vip";
  const isPremium = tier === "premium";

  if (!isVip && !isPremium) return null;

  const sizeClasses = {
    sm: "px-1.5 py-0.5 text-[10px] gap-0.5",
    md: "px-2 py-1 text-xs gap-1",
    lg: "px-3 py-1.5 text-sm gap-1.5",
  };

  const iconSize = {
    sm: "w-2.5 h-2.5",
    md: "w-3.5 h-3.5",
    lg: "w-4 h-4",
  };

  return (
    <motion.div
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className={`
        inline-flex items-center font-bold rounded-full
        ${sizeClasses[size]}
        ${isVip 
          ? "bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white shadow-lg shadow-purple-500/30" 
          : "bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 text-black shadow-lg shadow-amber-500/30"
        }
        ${className}
      `}
    >
      {isVip ? (
        <Gem className={iconSize[size]} />
      ) : (
        <Crown className={iconSize[size]} />
      )}
      {showLabel && (
        <span>{isVip ? "PLATINUM" : "GOLD"}</span>
      )}
    </motion.div>
  );
};

export default SubscriptionBadge;
