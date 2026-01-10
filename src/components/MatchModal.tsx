import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Heart } from "lucide-react";
import { Profile } from "@/data/mockProfiles";
import { useEffect } from "react";
import confetti from "canvas-confetti";

interface MatchModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onStartChat: () => void;
}

const MatchModal = ({ profile, isOpen, onClose, onStartChat }: MatchModalProps) => {
  useEffect(() => {
    if (isOpen) {
      // Fire confetti from both sides
      const duration = 3000;
      const end = Date.now() + duration;

      const colors = ['#D4A537', '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4'];

      const frame = () => {
        confetti({
          particleCount: 3,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.7 },
          colors: colors,
        });
        confetti({
          particleCount: 3,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.7 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      // Big burst in the center
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { x: 0.5, y: 0.5 },
          colors: colors,
        });
      }, 300);
    }
  }, [isOpen]);

  if (!profile) return null;

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/90 backdrop-blur-md"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-6 right-6 p-2 bg-card/50 backdrop-blur-sm rounded-full z-10"
          >
            <X className="w-6 h-6 text-muted-foreground" />
          </button>

          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="flex flex-col items-center text-center px-8"
          >
            {/* Match Text */}
            <motion.div
              initial={{ y: -50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="mb-8"
            >
              <h1 className="text-5xl font-bold text-gradient-gold mb-2">
                C'est un Match !
              </h1>
              <p className="text-lg text-muted-foreground">
                Vous et {profile.name} vous êtes likés mutuellement
              </p>
            </motion.div>

            {/* Profile Photos */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 15 }}
              className="relative flex items-center justify-center mb-10"
            >
              {/* Your photo (placeholder) */}
              <div className="relative">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary glow-gold">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                    alt="Vous"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* Heart in the middle */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: 0.5, duration: 0.5 }}
                className="absolute z-10 p-3 bg-primary rounded-full glow-gold"
              >
                <Heart className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              </motion.div>

              {/* Match's photo */}
              <div className="relative -ml-8">
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary glow-gold">
                  <img
                    src={profile.photos[0]}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3 w-full max-w-xs"
            >
              <button
                onClick={onStartChat}
                className="w-full py-4 btn-gold rounded-full font-semibold flex items-center justify-center gap-3 transition-transform hover:scale-105"
              >
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground">Envoyer un message</span>
              </button>
              <button
                onClick={onClose}
                className="w-full py-4 bg-secondary text-secondary-foreground rounded-full font-semibold transition-colors hover:bg-muted"
              >
                Continuer à swiper
              </button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default MatchModal;
