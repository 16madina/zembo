import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { MapPin, BadgeCheck, Info } from "lucide-react";
import { Profile } from "@/data/mockProfiles";

interface ProfileCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right" | "up") => void;
  onInfoClick: () => void;
}

const ProfileCard = ({ profile, onSwipe, onInfoClick }: ProfileCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  
  const rotate = useTransform(x, [-200, 200], [-15, 15]);
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);
  const superLikeOpacity = useTransform(y, [-100, 0], [1, 0]);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 100;
    const velocity = 500;

    if (info.offset.y < -threshold || info.velocity.y < -velocity) {
      onSwipe("up");
    } else if (info.offset.x > threshold || info.velocity.x > velocity) {
      onSwipe("right");
    } else if (info.offset.x < -threshold || info.velocity.x < -velocity) {
      onSwipe("left");
    }
  };

  const handleInfoClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onInfoClick();
  };

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing"
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      onDragEnd={handleDragEnd}
      whileTap={{ scale: 1.02 }}
      exit={{
        x: x.get() > 0 ? 500 : x.get() < 0 ? -500 : 0,
        y: y.get() < -50 ? -500 : 0,
        opacity: 0,
        transition: { duration: 0.3 }
      }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden card-gradient shadow-[var(--shadow-card)]">
        {/* Profile Photo */}
        <img
          src={profile.photos[0]}
          alt={profile.name}
          className="w-full h-full object-cover"
          draggable={false}
        />

        {/* LIKE Overlay */}
        <motion.div
          className="absolute top-8 left-8 px-4 py-2 border-4 border-primary rounded-lg -rotate-12"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-4xl font-bold text-primary tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE Overlay */}
        <motion.div
          className="absolute top-8 right-8 px-4 py-2 border-4 border-destructive rounded-lg rotate-12"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-4xl font-bold text-destructive tracking-wider">NOPE</span>
        </motion.div>

        {/* SUPER LIKE Overlay */}
        <motion.div
          className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ opacity: superLikeOpacity }}
        >
          <span className="text-6xl">⭐</span>
        </motion.div>

        {/* Info Button */}
        <button
          onClick={handleInfoClick}
          className="absolute top-4 right-4 p-3 bg-background/30 backdrop-blur-sm rounded-full transition-colors hover:bg-background/50 z-10"
        >
          <Info className="w-5 h-5 text-foreground" />
        </button>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48 overlay-gradient" />

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <div className="flex items-center gap-3">
            <h2 className="text-3xl font-bold text-foreground">
              {profile.name}, {profile.age}
            </h2>
            {profile.isVerified && (
              <BadgeCheck className="w-6 h-6 text-primary" />
            )}
          </div>

          <div className="flex items-center gap-4">
            {profile.isOnline && (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <span className="w-2 h-2 bg-success rounded-full animate-pulse-glow" />
                En ligne
              </span>
            )}
            <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              {profile.distance}
            </span>
          </div>

          <p className="text-foreground/80 text-sm line-clamp-2">{profile.bio}</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProfileCard;
