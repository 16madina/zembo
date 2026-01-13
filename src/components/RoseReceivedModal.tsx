import { motion, AnimatePresence } from "framer-motion";
import { Heart, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface RoseReceivedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onViewProfile: () => void;
  senderName: string;
  senderPhoto: string;
  message: string;
}

const RoseReceivedModal = ({
  isOpen,
  onClose,
  onViewProfile,
  senderName,
  senderPhoto,
  message,
}: RoseReceivedModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9998] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.8, opacity: 0, y: 50 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0, y: 50 }}
            transition={{ type: "spring", damping: 20, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm overflow-hidden"
          >
            {/* Rose Petals Background Effect */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(12)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ 
                    opacity: 0, 
                    y: -50, 
                    x: Math.random() * 300 - 150,
                    rotate: Math.random() * 360 
                  }}
                  animate={{ 
                    opacity: [0, 1, 1, 0],
                    y: 400,
                    rotate: Math.random() * 720,
                    x: Math.random() * 300 - 150,
                  }}
                  transition={{ 
                    duration: 3 + Math.random() * 2,
                    delay: Math.random() * 2,
                    repeat: Infinity,
                    ease: "easeOut"
                  }}
                  className="absolute text-2xl"
                  style={{ left: `${Math.random() * 100}%` }}
                >
                  🌹
                </motion.div>
              ))}
            </div>

            {/* Main Card */}
            <div className="relative bg-gradient-to-br from-rose-950/95 via-background/95 to-rose-900/90 backdrop-blur-xl rounded-3xl p-6 border border-rose-500/40 shadow-2xl">
              {/* Sender Photo */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="relative mx-auto w-24 h-24 mb-4"
              >
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-rose-400 via-rose-500 to-rose-600 animate-pulse" />
                <img
                  src={senderPhoto}
                  alt={senderName}
                  className="relative w-full h-full rounded-full object-cover border-4 border-rose-400"
                />
                <motion.div
                  initial={{ scale: 0, rotate: -45 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ delay: 0.4, type: "spring" }}
                  className="absolute -bottom-2 -right-2 text-3xl"
                >
                  🌹
                </motion.div>
              </motion.div>

              {/* Header */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-center mb-4"
              >
                <h2 className="text-2xl font-bold text-white mb-1">
                  {senderName} vous a offert une rose !
                </h2>
                <p className="text-rose-200/80 text-sm">
                  Un geste romantique qui mérite votre attention 💕
                </p>
              </motion.div>

              {/* Message */}
              {message && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 }}
                  className="bg-white/10 rounded-2xl p-4 mb-6 border border-rose-400/20"
                >
                  <div className="flex items-start gap-2">
                    <MessageCircle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
                    <p className="text-white/90 text-sm italic">"{message}"</p>
                  </div>
                </motion.div>
              )}

              {/* Action Buttons */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="flex gap-3"
              >
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="flex-1 border-rose-400/30 text-rose-200 hover:bg-rose-500/20"
                >
                  Plus tard
                </Button>
                <Button
                  onClick={onViewProfile}
                  className="flex-1 bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white gap-2"
                >
                  <Heart className="w-4 h-4" />
                  Voir le profil
                </Button>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default RoseReceivedModal;
