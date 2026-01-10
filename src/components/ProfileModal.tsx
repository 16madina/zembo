import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, MapPin, BadgeCheck, Heart, Star, MessageCircle } from "lucide-react";
import { Profile } from "@/data/mockProfiles";
import { useState } from "react";

interface ProfileModalProps {
  profile: Profile | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: () => void;
  onSuperLike: () => void;
}

const ProfileModal = ({ profile, isOpen, onClose, onLike, onSuperLike }: ProfileModalProps) => {
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  if (!profile) return null;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      onClose();
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const nextPhoto = () => {
    setCurrentPhotoIndex((prev) => 
      prev < profile.photos.length - 1 ? prev + 1 : prev
    );
  };

  const prevPhoto = () => {
    setCurrentPhotoIndex((prev) => prev > 0 ? prev - 1 : prev);
  };

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[100] flex items-end justify-center"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <motion.div 
            className="absolute inset-0 bg-background/80 backdrop-blur-xl"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative w-full max-w-lg h-[92vh] glass-strong rounded-t-[2rem] overflow-hidden flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3 flex-shrink-0">
              <div className="w-10 h-1 bg-muted-foreground/30 rounded-full" />
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 z-20 p-2.5 glass rounded-full tap-highlight"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5 text-foreground" />
            </motion.button>

            {/* Photo gallery */}
            <div className="relative aspect-[3/4] flex-shrink-0">
              <motion.img
                key={currentPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.2 }}
                src={profile.photos[currentPhotoIndex]}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              
              {/* Photo navigation */}
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full cursor-pointer" onClick={prevPhoto} />
                <div className="w-1/2 h-full cursor-pointer" onClick={nextPhoto} />
              </div>

              {/* Photo indicators */}
              <div className="absolute top-4 left-4 right-16 flex gap-1.5">
                {profile.photos.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      index === currentPhotoIndex 
                        ? "bg-foreground" 
                        : "bg-foreground/30"
                    }`}
                    initial={false}
                    animate={{
                      scaleX: index === currentPhotoIndex ? 1 : 0.95,
                    }}
                  />
                ))}
              </div>

              {/* Gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-40 overlay-gradient" />
            </div>

            {/* Profile info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
              <motion.div 
                className="flex items-center gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-2xl font-bold">
                  {profile.name}, {profile.age}
                </h2>
                {profile.isVerified && (
                  <BadgeCheck className="w-6 h-6 text-primary" />
                )}
                {profile.isOnline && (
                  <span className="flex items-center gap-1.5 text-sm text-success font-medium">
                    <span className="relative">
                      <span className="w-2 h-2 bg-success rounded-full block" />
                      <span className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-75" />
                    </span>
                    En ligne
                  </span>
                )}
              </motion.div>

              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
                <span className="text-primary font-semibold">• {profile.distance}</span>
              </motion.div>

              <motion.p 
                className="text-foreground/90 leading-relaxed"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {profile.bio}
              </motion.p>

              {/* Interests */}
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.25 }}
              >
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Centres d'intérêt
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest, index) => (
                    <motion.span
                      key={interest}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 + index * 0.05 }}
                      className="px-4 py-2 glass rounded-full text-sm font-medium text-secondary-foreground"
                    >
                      {interest}
                    </motion.span>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Action buttons */}
            <motion.div 
              className="flex items-center justify-center gap-5 p-6 border-t border-border/50 flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <motion.button
                onClick={onSuperLike}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-4 glass rounded-full text-accent hover:glow-blue transition-shadow"
              >
                <Star className="w-7 h-7" fill="currentColor" />
              </motion.button>
              <motion.button
                onClick={onLike}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-5 btn-gold rounded-full"
              >
                <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-4 glass rounded-full text-success hover:glow-green transition-shadow"
              >
                <MessageCircle className="w-7 h-7" />
              </motion.button>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
