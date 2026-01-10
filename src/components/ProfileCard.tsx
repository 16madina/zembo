import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, BadgeCheck } from "lucide-react";
import { Profile } from "@/data/mockProfiles";
import { useRef } from "react";

interface ProfileCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right" | "up") => void;
  onInfoClick: () => void;
}

const ProfileCard = ({ profile, onSwipe, onInfoClick }: ProfileCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const isDragging = useRef(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  
  const rotate = useTransform(x, [-200, 200], [-12, 12]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);
  const scale = useTransform(
    x,
    [-200, 0, 200],
    [0.95, 1, 0.95]
  );

  const handleDragStart = (_: any, info: PanInfo) => {
    isDragging.current = true;
    dragStartPos.current = { x: info.point.x, y: info.point.y };
  };

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 500;

    // Check if it was a significant drag
    const dragDistance = Math.sqrt(
      Math.pow(info.offset.x, 2) + Math.pow(info.offset.y, 2)
    );

    if (dragDistance > 10) {
      if (info.offset.y < -threshold || info.velocity.y < -velocity) {
        onSwipe("up");
      } else if (info.offset.x > threshold || info.velocity.x > velocity) {
        onSwipe("right");
      } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
        onSwipe("left");
      }
    }

    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  };

  const handleCardClick = (e: React.MouseEvent) => {
    // Only open modal if it wasn't a drag
    if (!isDragging.current) {
      onInfoClick();
    }
  };

  return (
    <motion.div
      className="absolute w-full h-full cursor-pointer"
      style={{ x, y, rotate, scale }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={0.9}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      exit={{
        x: x.get() > 0 ? 400 : x.get() < 0 ? -400 : 0,
        y: y.get() < -50 ? -400 : 0,
        opacity: 0,
        scale: 0.8,
        transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] }
      }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <div 
        className="relative w-full h-full rounded-3xl overflow-hidden glass-strong"
        onClick={handleCardClick}
      >
        {/* Profile Photo */}
        <img
          src={profile.photos[0]}
          alt={profile.name}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* Shine overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />

        {/* LIKE Overlay */}
        <motion.div
          className="absolute top-10 left-6 px-5 py-2.5 border-[3px] border-success rounded-xl -rotate-12 bg-success/10 backdrop-blur-sm pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-3xl font-bold text-success tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE Overlay */}
        <motion.div
          className="absolute top-10 right-6 px-5 py-2.5 border-[3px] border-destructive rounded-xl rotate-12 bg-destructive/10 backdrop-blur-sm pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-3xl font-bold text-destructive tracking-wider">NOPE</span>
        </motion.div>

        {/* SUPER LIKE Overlay */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none"
          style={{ opacity: superLikeOpacity }}
        >
          <span className="text-7xl">⭐</span>
          <span className="text-xl font-bold text-accent tracking-wider">SUPER LIKE</span>
        </motion.div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-56 overlay-gradient pointer-events-none" />

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-3 pointer-events-none">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-foreground drop-shadow-lg">
              {profile.name}, {profile.age}
            </h2>
            {profile.isVerified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <BadgeCheck className="w-7 h-7 text-primary drop-shadow-lg" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-4">
            {profile.isOnline && (
              <span className="flex items-center gap-2 text-sm font-medium">
                <span className="relative">
                  <span className="w-2.5 h-2.5 bg-success rounded-full block" />
                  <span className="absolute inset-0 w-2.5 h-2.5 bg-success rounded-full animate-ping opacity-75" />
                </span>
                <span className="text-success">En ligne</span>
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-foreground/70">
              <MapPin className="w-4 h-4" />
              {profile.distance}
            </span>
          </div>

          <p className="text-foreground/80 text-sm line-clamp-2 leading-relaxed">{profile.bio}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
