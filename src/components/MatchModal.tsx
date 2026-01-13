import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Heart, Sparkles } from "lucide-react";
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
      const duration = 3000;
      const end = Date.now() + duration;
      const colors = ['#D4A537', '#FFD700', '#FFA500', '#FF6B6B', '#4ECDC4', '#fff'];

      // Create a custom canvas for confetti with high z-index
      const canvas = document.createElement('canvas');
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100%';
      canvas.style.height = '100%';
      canvas.style.pointerEvents = 'none';
      canvas.style.zIndex = '9999';
      document.body.appendChild(canvas);

      const myConfetti = confetti.create(canvas, {
        resize: true,
        useWorker: true,
      });

      const frame = () => {
        myConfetti({
          particleCount: 4,
          angle: 60,
          spread: 55,
          origin: { x: 0, y: 0.65 },
          colors: colors,
        });
        myConfetti({
          particleCount: 4,
          angle: 120,
          spread: 55,
          origin: { x: 1, y: 0.65 },
          colors: colors,
        });

        if (Date.now() < end) {
          requestAnimationFrame(frame);
        }
      };

      frame();

      setTimeout(() => {
        myConfetti({
          particleCount: 150,
          spread: 100,
          origin: { x: 0.5, y: 0.4 },
          colors: colors,
        });
      }, 200);

      // Cleanup canvas after animation
      return () => {
        setTimeout(() => {
          if (canvas.parentNode) {
            canvas.parentNode.removeChild(canvas);
          }
        }, duration + 2000);
      };
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
          className="fixed inset-0 z-[100] flex items-center justify-center"
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-background/95 backdrop-blur-2xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          />

          {/* Close button */}
          <motion.button
            onClick={onClose}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.5 }}
            className="absolute top-6 right-6 p-3 glass rounded-full z-10 tap-highlight"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </motion.button>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            className="relative flex flex-col items-center text-center px-8 z-10"
          >
            {/* Sparkle decoration */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="absolute -top-16 text-primary/30"
            >
              <Sparkles className="w-32 h-32" />
            </motion.div>

            {/* Match Text */}
            <motion.div
              initial={{ y: -30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className="mb-10"
            >
              <h1 className="text-5xl font-bold text-gradient-gold mb-3 drop-shadow-lg">
                C'est un Match !
              </h1>
              <p className="text-lg text-muted-foreground">
                Vous et <span className="text-foreground font-semibold">{profile.name}</span> vous êtes likés
              </p>
            </motion.div>

            {/* Profile Photos */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: "spring", damping: 15 }}
              className="relative flex items-center justify-center mb-12"
            >
              {/* Your photo */}
              <motion.div 
                className="relative"
                animate={{ x: [-5, 5, -5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary glow-gold">
                  <img
                    src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop"
                    alt="Vous"
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>

              {/* Heart */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: [0, 1.3, 1] }}
                transition={{ delay: 0.5, duration: 0.6, type: "spring" }}
                className="absolute z-10 p-3 btn-gold rounded-full"
              >
                <Heart className="w-6 h-6 text-primary-foreground" fill="currentColor" />
              </motion.div>

              {/* Match's photo */}
              <motion.div 
                className="relative -ml-6"
                animate={{ x: [5, -5, 5] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-primary glow-gold">
                  <img
                    src={profile.photos[0]}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              </motion.div>
            </motion.div>

            {/* Action Buttons */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
              className="flex flex-col gap-3 w-full max-w-xs"
            >
              <motion.button
                onClick={onStartChat}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 btn-gold rounded-2xl font-semibold flex items-center justify-center gap-3"
              >
                <MessageCircle className="w-5 h-5 text-primary-foreground" />
                <span className="text-primary-foreground">Envoyer un message</span>
              </motion.button>
              <motion.button
                onClick={onClose}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full py-4 glass rounded-2xl font-semibold text-secondary-foreground"
              >
                Continuer à swiper
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default MatchModal;
