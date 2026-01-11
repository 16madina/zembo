import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import type { VirtualGift } from "@/hooks/useGifts";

interface GiftAnimationProps {
  gift: VirtualGift | null;
  senderName?: string;
  onComplete?: () => void;
}

const GiftAnimation = ({ gift, senderName, onComplete }: GiftAnimationProps) => {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (gift) {
      setShow(true);

      // Trigger confetti for special gifts
      if (gift.animation_type === "premium" || gift.price_coins >= 100) {
        const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#FF69B4", "#9B59B6"];
        
        confetti({
          particleCount: 80,
          spread: 100,
          origin: { x: 0.5, y: 0.6 },
          colors,
        });
      } else if (gift.animation_type === "sparkle" || gift.price_coins >= 50) {
        confetti({
          particleCount: 30,
          spread: 60,
          origin: { x: 0.5, y: 0.6 },
          colors: ["#FFD700", "#FFA500"],
        });
      }

      // Auto-hide after animation
      const timer = setTimeout(() => {
        setShow(false);
        onComplete?.();
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [gift, onComplete]);

  if (!gift) return null;

  const getAnimationVariant = () => {
    switch (gift.animation_type) {
      case "premium":
        return {
          initial: { scale: 0, rotate: -180, opacity: 0 },
          animate: {
            scale: [0, 1.5, 1],
            rotate: [0, 360],
            opacity: 1,
          },
          exit: { scale: 0, opacity: 0, y: -50 },
        };
      case "sparkle":
        return {
          initial: { scale: 0, opacity: 0 },
          animate: {
            scale: [0, 1.3, 1],
            opacity: 1,
          },
          exit: { scale: 1.5, opacity: 0 },
        };
      case "float":
        return {
          initial: { y: 100, opacity: 0 },
          animate: {
            y: 0,
            opacity: 1,
          },
          exit: { y: -100, opacity: 0 },
        };
      default:
        return {
          initial: { scale: 0, opacity: 0 },
          animate: { scale: 1, opacity: 1 },
          exit: { scale: 0, opacity: 0 },
        };
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="flex flex-col items-center gap-4"
            {...getAnimationVariant()}
            transition={{ type: "spring", damping: 12, stiffness: 150 }}
          >
            {/* Gift Emoji */}
            <motion.div
              className="relative"
              animate={{
                scale: [1, 1.1, 1],
              }}
              transition={{
                repeat: 3,
                duration: 0.5,
              }}
            >
              <span className="text-8xl filter drop-shadow-lg">{gift.emoji}</span>
              
              {/* Sparkle effects for premium */}
              {(gift.animation_type === "premium" || gift.price_coins >= 100) && (
                <>
                  {[...Array(6)].map((_, i) => (
                    <motion.div
                      key={i}
                      className="absolute w-2 h-2 bg-primary rounded-full"
                      initial={{
                        opacity: 0,
                        scale: 0,
                        x: 0,
                        y: 0,
                      }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: Math.cos((i * Math.PI * 2) / 6) * 60,
                        y: Math.sin((i * Math.PI * 2) / 6) * 60,
                      }}
                      transition={{
                        duration: 1,
                        repeat: 2,
                        delay: i * 0.1,
                      }}
                      style={{
                        top: "50%",
                        left: "50%",
                        transform: "translate(-50%, -50%)",
                      }}
                    />
                  ))}
                </>
              )}
            </motion.div>

            {/* Gift Info */}
            <motion.div
              className="bg-background/90 backdrop-blur-sm px-6 py-3 rounded-full shadow-xl border border-border"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              <p className="text-center font-semibold text-foreground">
                <span className="text-primary">{senderName || "Quelqu'un"}</span>
                {" a envoyé "}
                <span className="text-primary">{gift.name}</span>
              </p>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default GiftAnimation;
