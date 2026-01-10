import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, MapPin, BadgeCheck, Heart, Star, MessageCircle, User, Briefcase, GraduationCap, Ruler, Calendar } from "lucide-react";
import { useState } from "react";

interface ProfileData {
  id: string;
  name: string;
  age: number;
  location: string;
  bio?: string;
  photos: string[];
  isOnline?: boolean;
  isVerified?: boolean;
  interests?: string[];
  distance?: string;
  gender?: string;
  occupation?: string;
  education?: string;
  height?: string;
}

interface ProfileModalProps {
  profile: ProfileData | null;
  isOpen: boolean;
  onClose: () => void;
  onLike: () => void;
  onSuperLike: () => void;
}

const interestColors = [
  'bg-pink-500/20 text-pink-300 border-pink-500/30',
  'bg-purple-500/20 text-purple-300 border-purple-500/30',
  'bg-blue-500/20 text-blue-300 border-blue-500/30',
  'bg-green-500/20 text-green-300 border-green-500/30',
  'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  'bg-orange-500/20 text-orange-300 border-orange-500/30',
  'bg-red-500/20 text-red-300 border-red-500/30',
  'bg-teal-500/20 text-teal-300 border-teal-500/30',
  'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
  'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
];

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

  // Helper to check if a detail exists
  const hasDetail = (value: string | undefined | null) => value && value.trim() !== '';

  const modalContent = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[9999] flex items-end justify-center"
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

            {/* Photo gallery - reduced height */}
            <div className="relative h-[35vh] min-h-[200px] max-h-[300px] flex-shrink-0">
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
              <div className="absolute bottom-0 left-0 right-0 h-20 overlay-gradient" />
            </div>

            {/* Profile info */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 scrollbar-hide">
              {/* Name, age, verified, online status */}
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

              {/* Location and distance */}
              <motion.div 
                className="flex items-center gap-2 text-muted-foreground"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
              >
                <MapPin className="w-4 h-4" />
                <span>{profile.location}</span>
                {profile.distance && (
                  <span className="text-primary font-semibold">• {profile.distance}</span>
                )}
              </motion.div>

              {/* Personal details section */}
              <motion.div 
                className="space-y-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                  Informations personnelles
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  {/* Gender */}
                  {hasDetail(profile.gender) && (
                    <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                      <User className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Genre</span>
                        <span className="text-sm font-medium">{profile.gender}</span>
                      </div>
                    </div>
                  )}

                  {/* Age */}
                  <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                    <Calendar className="w-4 h-4 text-primary" />
                    <div className="flex flex-col">
                      <span className="text-xs text-muted-foreground">Âge</span>
                      <span className="text-sm font-medium">{profile.age} ans</span>
                    </div>
                  </div>

                  {/* Height */}
                  {hasDetail(profile.height) && (
                    <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                      <Ruler className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Taille</span>
                        <span className="text-sm font-medium">{profile.height}</span>
                      </div>
                    </div>
                  )}

                  {/* Occupation */}
                  {hasDetail(profile.occupation) && (
                    <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Profession</span>
                        <span className="text-sm font-medium">{profile.occupation}</span>
                      </div>
                    </div>
                  )}

                  {/* Education */}
                  {hasDetail(profile.education) && (
                    <div className="flex items-center gap-2.5 p-3 glass rounded-xl col-span-2">
                      <GraduationCap className="w-4 h-4 text-primary" />
                      <div className="flex flex-col">
                        <span className="text-xs text-muted-foreground">Études</span>
                        <span className="text-sm font-medium">{profile.education}</span>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Bio section */}
              {hasDetail(profile.bio) && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                    À propos
                  </h3>
                  <p className="text-foreground/90 leading-relaxed p-4 glass rounded-xl">
                    {profile.bio}
                  </p>
                </motion.div>
              )}

              {/* Interests */}
              {profile.interests && profile.interests.length > 0 && (
                <motion.div 
                  className="space-y-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
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
                        transition={{ delay: 0.35 + index * 0.05 }}
                        className={`px-4 py-2 rounded-full text-sm font-medium border ${interestColors[index % interestColors.length]}`}
                      >
                        {interest}
                      </motion.span>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Action buttons */}
            <motion.div 
              className="flex items-center justify-center gap-5 p-6 border-t border-border/50 flex-shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
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
