import { createPortal } from "react-dom";
import { motion, AnimatePresence, PanInfo } from "framer-motion";
import { X, MapPin, BadgeCheck, Heart, Star, User, Briefcase, GraduationCap, Ruler, Calendar, ChevronUp } from "lucide-react";
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
  const [showDetails, setShowDetails] = useState(false);

  if (!profile) return null;

  const handleDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      if (showDetails) {
        setShowDetails(false);
      } else {
        onClose();
      }
    } else if (info.offset.y < -80) {
      setShowDetails(true);
    }
  };

  const handleDetailsDragEnd = (_: any, info: PanInfo) => {
    if (info.offset.y > 100) {
      setShowDetails(false);
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (showDetails) {
        setShowDetails(false);
      } else {
        onClose();
      }
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
            className="absolute inset-0 bg-black/90"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          {/* Main Modal - Full screen photo */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={handleDragEnd}
            className="relative w-full max-w-lg h-[100dvh] overflow-hidden flex flex-col"
          >
            {/* Handle bar */}
            <div className="absolute top-0 left-0 right-0 z-30 flex justify-center py-3">
              <div className="w-10 h-1 bg-white/50 rounded-full" />
            </div>

            {/* Close button */}
            <motion.button
              onClick={onClose}
              className="absolute top-4 right-4 z-30 p-2.5 bg-black/40 backdrop-blur-sm rounded-full"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <X className="w-5 h-5 text-white" />
            </motion.button>

            {/* Full screen photo */}
            <div className="absolute inset-0">
              <motion.img
                key={currentPhotoIndex}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
                src={profile.photos[currentPhotoIndex]}
                alt={profile.name}
                className="w-full h-full object-cover"
              />
              
              {/* Photo navigation zones */}
              <div className="absolute inset-0 flex">
                <div className="w-1/3 h-full cursor-pointer" onClick={prevPhoto} />
                <div className="w-1/3 h-full" />
                <div className="w-1/3 h-full cursor-pointer" onClick={nextPhoto} />
              </div>

              {/* Photo indicators */}
              <div className="absolute top-12 left-4 right-4 flex gap-1.5 z-20">
                {profile.photos.map((_, index) => (
                  <motion.div
                    key={index}
                    className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                      index === currentPhotoIndex 
                        ? "bg-white" 
                        : "bg-white/40"
                    }`}
                  />
                ))}
              </div>

              {/* Strong gradient overlay at bottom */}
              <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-black via-black/60 to-transparent" />
            </div>

            {/* Profile info overlay at bottom */}
            <div className="absolute bottom-0 left-0 right-0 z-10 p-6 pb-32">
              {/* Name, age, verified */}
              <motion.div 
                className="flex items-center gap-3 mb-2"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <h2 className="text-3xl font-bold text-white">
                  {profile.name}, {profile.age}
                </h2>
                {profile.isVerified && (
                  <BadgeCheck className="w-7 h-7 text-primary" />
                )}
                {profile.isOnline && (
                  <span className="flex items-center gap-1.5">
                    <span className="relative">
                      <span className="w-3 h-3 bg-green-500 rounded-full block" />
                      <span className="absolute inset-0 w-3 h-3 bg-green-500 rounded-full animate-ping opacity-75" />
                    </span>
                  </span>
                )}
              </motion.div>

              {/* Location */}
              <motion.div 
                className="flex items-center gap-2 text-white/80 mb-4"
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

              {/* Quick info tags */}
              <motion.div 
                className="flex flex-wrap gap-2 mb-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {hasDetail(profile.occupation) && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white">
                    <Briefcase className="w-3.5 h-3.5" />
                    {profile.occupation}
                  </span>
                )}
                {hasDetail(profile.height) && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm text-white">
                    <Ruler className="w-3.5 h-3.5" />
                    {profile.height}
                  </span>
                )}
              </motion.div>

              {/* Swipe up hint */}
              <motion.div
                className="flex items-center justify-center gap-2 text-white/60 text-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, y: [0, -5, 0] }}
                transition={{ 
                  opacity: { delay: 0.3 },
                  y: { repeat: Infinity, duration: 1.5 }
                }}
                onClick={() => setShowDetails(true)}
              >
                <ChevronUp className="w-5 h-5" />
                <span>Glisser pour voir plus</span>
                <ChevronUp className="w-5 h-5" />
              </motion.div>
            </div>

            {/* Action buttons at bottom */}
            <motion.div 
              className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-6 p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <motion.button
                onClick={onSuperLike}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-4 bg-accent/20 backdrop-blur-md rounded-full border border-accent/50"
              >
                <Star className="w-7 h-7 text-accent" fill="currentColor" />
              </motion.button>
              <motion.button
                onClick={onLike}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                className="p-5 btn-gold rounded-full shadow-lg shadow-primary/30"
              >
                <Heart className="w-9 h-9 text-primary-foreground" fill="currentColor" />
              </motion.button>
            </motion.div>
          </motion.div>

          {/* Details panel (swipe up to reveal) */}
          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ y: "100%" }}
                animate={{ y: 0 }}
                exit={{ y: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                drag="y"
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.2}
                onDragEnd={handleDetailsDragEnd}
                className="absolute bottom-0 left-0 right-0 z-30 w-full max-w-lg mx-auto h-[85vh] bg-background rounded-t-[2rem] overflow-hidden"
              >
                {/* Handle bar */}
                <div className="flex justify-center py-4 flex-shrink-0 cursor-grab active:cursor-grabbing">
                  <div className="w-12 h-1.5 bg-muted-foreground/40 rounded-full" />
                </div>

                {/* Scrollable content */}
                <div className="h-full overflow-y-auto pb-32 px-6 space-y-6">
                  {/* Header with photo and name */}
                  <div className="flex items-center gap-4">
                    <img 
                      src={profile.photos[0]} 
                      alt={profile.name}
                      className="w-20 h-20 rounded-full object-cover border-2 border-primary"
                    />
                    <div>
                      <h2 className="text-2xl font-bold flex items-center gap-2">
                        {profile.name}, {profile.age}
                        {profile.isVerified && (
                          <BadgeCheck className="w-6 h-6 text-primary" />
                        )}
                      </h2>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <MapPin className="w-4 h-4" />
                        <span>{profile.location}</span>
                      </div>
                    </div>
                  </div>

                  {/* Personal details */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                      Informations personnelles
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      {hasDetail(profile.gender) && (
                        <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                          <User className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Genre</span>
                            <span className="text-sm font-medium">{profile.gender}</span>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                        <Calendar className="w-4 h-4 text-primary" />
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">Âge</span>
                          <span className="text-sm font-medium">{profile.age} ans</span>
                        </div>
                      </div>

                      {hasDetail(profile.height) && (
                        <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                          <Ruler className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Taille</span>
                            <span className="text-sm font-medium">{profile.height}</span>
                          </div>
                        </div>
                      )}

                      {hasDetail(profile.occupation) && (
                        <div className="flex items-center gap-2.5 p-3 glass rounded-xl">
                          <Briefcase className="w-4 h-4 text-primary" />
                          <div className="flex flex-col">
                            <span className="text-xs text-muted-foreground">Profession</span>
                            <span className="text-sm font-medium">{profile.occupation}</span>
                          </div>
                        </div>
                      )}

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
                  </div>

                  {/* Bio */}
                  {hasDetail(profile.bio) && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        À propos
                      </h3>
                      <p className="text-foreground/90 leading-relaxed p-4 glass rounded-xl">
                        {profile.bio}
                      </p>
                    </div>
                  )}

                  {/* Interests */}
                  {profile.interests && profile.interests.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">
                        Centres d'intérêt
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {profile.interests.map((interest, index) => (
                          <motion.span
                            key={interest}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + index * 0.03 }}
                            className={`px-4 py-2 rounded-full text-sm font-medium border ${interestColors[index % interestColors.length]}`}
                          >
                            {interest}
                          </motion.span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Action buttons fixed at bottom */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-background via-background to-transparent">
                  <div className="flex items-center justify-center gap-6">
                    <motion.button
                      onClick={() => { onSuperLike(); setShowDetails(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-4 glass rounded-full text-accent border border-accent/30"
                    >
                      <Star className="w-7 h-7" fill="currentColor" />
                    </motion.button>
                    <motion.button
                      onClick={() => { onLike(); setShowDetails(false); }}
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      className="p-5 btn-gold rounded-full"
                    >
                      <Heart className="w-9 h-9 text-primary-foreground" fill="currentColor" />
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return createPortal(modalContent, document.body);
};

export default ProfileModal;
