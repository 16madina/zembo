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
          className="fixed inset-0 z-[100] flex items-end justify-center bg-background/80 backdrop-blur-sm"
          onClick={handleBackdropClick}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="w-full max-w-lg h-[90vh] bg-card rounded-t-3xl overflow-hidden flex flex-col"
          >
            {/* Handle bar */}
            <div className="flex justify-center py-3">
              <div className="w-12 h-1.5 bg-muted rounded-full" />
            </div>

            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 z-10 p-2 bg-background/50 backdrop-blur-sm rounded-full"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Photo gallery */}
            <div className="relative aspect-[3/4] flex-shrink-0">
              <img
                src={profile.photos[currentPhotoIndex]}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              
              {/* Photo navigation */}
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full" onClick={prevPhoto} />
                <div className="w-1/2 h-full" onClick={nextPhoto} />
              </div>

              {/* Photo indicators */}
              <div className="absolute top-4 left-4 right-4 flex gap-1">
                {profile.photos.map((_, index) => (
                  <div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      index === currentPhotoIndex 
                        ? "bg-foreground" 
                        : "bg-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Gradient overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-32 overlay-gradient" />
            </div>

            {/* Profile info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">
                  {profile.name}, {profile.age}
                </h2>
                {profile.isVerified && (
                  <BadgeCheck className="w-6 h-6 text-primary" />
                )}
                {profile.isOnline && (
                  <span className="flex items-center gap-1.5 text-sm text-success">
                    <span className="w-2 h-2 bg-success rounded-full animate-pulse-glow" />
                    En ligne
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
                <span className="text-primary font-medium">• {profile.distance}</span>
              </div>

              <p className="text-foreground/90 leading-relaxed">{profile.bio}</p>

              {/* Interests */}
              <div className="space-y-2">
                <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                  Centres d'intérêt
                </h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1.5 bg-secondary text-secondary-foreground rounded-full text-sm font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-center gap-6 p-6 border-t border-border">
              <button
                onClick={onSuperLike}
                className="p-4 bg-accent/20 text-accent rounded-full glow-blue transition-transform hover:scale-110"
              >
                <Star className="w-7 h-7" fill="currentColor" />
              </button>
              <button
                onClick={onLike}
                className="p-5 btn-gold rounded-full transition-transform hover:scale-110"
              >
                <Heart className="w-8 h-8 text-primary-foreground" fill="currentColor" />
              </button>
              <button className="p-4 bg-success/20 text-success rounded-full transition-transform hover:scale-110">
                <MessageCircle className="w-7 h-7" />
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
