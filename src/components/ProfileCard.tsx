import React, { useRef, useState, useCallback, useEffect } from "react";
import { motion, useMotionValue, useTransform, useAnimation, PanInfo } from "framer-motion";
import { MapPin, BadgeCheck, X, Star, Heart } from "lucide-react";
import { Profile } from "@/data/mockProfiles";

interface ProfileCardProps {
  profile: Profile;
  onSwipe: (direction: "left" | "right" | "up") => void;
  onInfoClick: () => void;
  onLike: () => void;
  onPass: () => void;
  onSuperLike: () => void;
  onSendRose?: () => void;
}

const ProfileCard = ({ profile, onSwipe, onInfoClick, onLike, onPass, onSuperLike, onSendRose }: ProfileCardProps) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const controls = useAnimation();
  const isDragging = useRef(false);
  const hasTriggeredSwipe = useRef(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "up" | null>(null);
  
  // Smooth rotation following swipe direction
  const rotate = useTransform(x, [-300, 0, 300], [-25, 0, 25]);
  
  // Opacity for overlays - smoother transition
  const likeOpacity = useTransform(x, [0, 50, 150], [0, 0.5, 1]);
  const nopeOpacity = useTransform(x, [-150, -50, 0], [1, 0.5, 0]);
  const superLikeOpacity = useTransform(y, [-150, -50, 0], [1, 0.5, 0]);
  
  // Background color tint based on swipe direction
  const cardBgOpacity = useTransform(
    x,
    [-150, -50, 0, 50, 150],
    [0.3, 0.15, 0, 0.15, 0.3]
  );

  const handleDragStart = useCallback(() => {
    isDragging.current = true;
    hasTriggeredSwipe.current = false;
  }, []);

  const handleDrag = useCallback((_: any, info: PanInfo) => {
    // Provide haptic feedback at threshold on mobile (if not already triggered)
    if (!hasTriggeredSwipe.current) {
      const threshold = 80;
      if (Math.abs(info.offset.x) > threshold || info.offset.y < -threshold) {
        hasTriggeredSwipe.current = true;
        // Trigger haptic on native
        if (typeof window !== 'undefined' && 'navigator' in window && 'vibrate' in navigator) {
          navigator.vibrate(10);
        }
      }
    }
  }, []);

  const handleDragEnd = useCallback(async (_: any, info: PanInfo) => {
    const swipeThreshold = 80;
    const velocityThreshold = 400;

    // Determine swipe direction based on offset and velocity
    const absX = Math.abs(info.offset.x);
    const absY = Math.abs(info.offset.y);
    const velocityX = Math.abs(info.velocity.x);
    const velocityY = Math.abs(info.velocity.y);

    let direction: "left" | "right" | "up" | null = null;

    // Determine if horizontal or vertical movement is dominant
    const isVerticalDominant = absY > absX * 1.5; // Must be significantly more vertical
    const isHorizontalDominant = absX > absY * 0.8; // Horizontal is dominant if X > Y

    // Check for horizontal swipe FIRST (most common action)
    if (isHorizontalDominant) {
      if (info.offset.x > swipeThreshold || info.velocity.x > velocityThreshold) {
        direction = "right";
      } else if (info.offset.x < -swipeThreshold || info.velocity.x < -velocityThreshold) {
        direction = "left";
      }
    }
    
    // Check for up swipe (super like) ONLY if clearly vertical
    if (!direction && isVerticalDominant) {
      if (info.offset.y < -swipeThreshold || info.velocity.y < -velocityThreshold) {
        direction = "up";
      }
    }

    if (direction) {
      setExitDirection(direction);
      
      // Animate card flying off screen
      const flyDistance = 500;
      const exitX = direction === "right" ? flyDistance : direction === "left" ? -flyDistance : 0;
      const exitY = direction === "up" ? -flyDistance : 0;
      const exitRotation = direction === "right" ? 30 : direction === "left" ? -30 : 0;

      await controls.start({
        x: exitX,
        y: exitY,
        rotate: exitRotation,
        opacity: 0,
        transition: { 
          duration: 0.35, 
          ease: [0.32, 0.72, 0, 1] 
        }
      });

      onSwipe(direction);
    } else {
      // Snap back to center with spring animation
      controls.start({
        x: 0,
        y: 0,
        rotate: 0,
        transition: { type: "spring", stiffness: 500, damping: 30 }
      });
    }

    setTimeout(() => {
      isDragging.current = false;
    }, 50);
  }, [controls, onSwipe]);

  const handleCardClick = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    // Only open modal if it wasn't a drag
    if (!isDragging.current) {
      onInfoClick();
    }
  }, [onInfoClick]);

  // Handle button swipe animations
  const triggerSwipeAnimation = useCallback(async (direction: "left" | "right" | "up") => {
    setExitDirection(direction);
    
    const flyDistance = 500;
    const exitX = direction === "right" ? flyDistance : direction === "left" ? -flyDistance : 0;
    const exitY = direction === "up" ? -flyDistance : 0;
    const exitRotation = direction === "right" ? 30 : direction === "left" ? -30 : 0;

    await controls.start({
      x: exitX,
      y: exitY,
      rotate: exitRotation,
      opacity: 0,
      transition: { duration: 0.35, ease: [0.32, 0.72, 0, 1] }
    });

    onSwipe(direction);
  }, [controls, onSwipe]);

  const buttonVariants = {
    hover: { scale: 1.1 },
    tap: { scale: 0.9 },
  };

  // Animate entrance on mount
  React.useEffect(() => {
    controls.start({ scale: 1, opacity: 1 });
  }, [controls]);

  return (
    <motion.div
      className="absolute w-full h-full cursor-grab active:cursor-grabbing touch-none select-none"
      style={{ x, y, rotate }}
      drag
      dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
      dragElastic={1}
      dragMomentum={false}
      onDragStart={handleDragStart}
      onDrag={handleDrag}
      onDragEnd={handleDragEnd}
      animate={controls}
      initial={{ scale: 0.95, opacity: 0 }}
      whileDrag={{ scale: 1.02 }}
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
          className="absolute top-8 left-4 px-4 py-2 border-[3px] border-success rounded-xl -rotate-12 bg-success/10 backdrop-blur-sm pointer-events-none"
          style={{ opacity: likeOpacity }}
        >
          <span className="text-2xl font-bold text-success tracking-wider">LIKE</span>
        </motion.div>

        {/* NOPE Overlay */}
        <motion.div
          className="absolute top-8 right-4 px-4 py-2 border-[3px] border-destructive rounded-xl rotate-12 bg-destructive/10 backdrop-blur-sm pointer-events-none"
          style={{ opacity: nopeOpacity }}
        >
          <span className="text-2xl font-bold text-destructive tracking-wider">NOPE</span>
        </motion.div>

        {/* SUPER LIKE Overlay */}
        <motion.div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-2 pointer-events-none"
          style={{ opacity: superLikeOpacity }}
        >
          <span className="text-6xl">⭐</span>
          <span className="text-lg font-bold text-accent tracking-wider">SUPER LIKE</span>
        </motion.div>

        {/* Gradient Overlay */}
        <div className="absolute bottom-0 left-0 right-0 h-48 overlay-gradient pointer-events-none" />

        {/* Profile Info */}
        <div className="absolute bottom-0 left-0 right-0 p-4 space-y-2 pointer-events-none">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-foreground drop-shadow-lg">
              {profile.name}, {profile.age}
            </h2>
            {profile.isVerified && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
              >
                <BadgeCheck className="w-5 h-5 text-primary drop-shadow-lg" />
              </motion.div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {profile.isOnline && (
              <span className="flex items-center gap-1.5 text-xs font-medium">
                <span className="relative">
                  <span className="w-2 h-2 bg-success rounded-full block" />
                  <span className="absolute inset-0 w-2 h-2 bg-success rounded-full animate-ping opacity-75" />
                </span>
                <span className="text-success">En ligne</span>
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-foreground/70">
              <MapPin className="w-3 h-3" />
              {profile.distance}
            </span>
          </div>

          <p className="text-foreground/80 text-xs line-clamp-2 leading-relaxed">{profile.bio}</p>

          {/* Action Buttons on card */}
          <div className="flex items-center justify-center gap-4 pt-2 pointer-events-auto">
            {/* Pass Button */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); triggerSwipeAnimation("left"); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="relative p-3 glass rounded-full text-destructive transition-shadow hover:glow-red"
            >
              <div className="absolute inset-0 rounded-full bg-destructive/10" />
              <X className="w-5 h-5 relative z-10" strokeWidth={3} />
            </motion.button>

            {/* Super Like Button */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); triggerSwipeAnimation("up"); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="relative p-2.5 glass rounded-full text-accent transition-shadow hover:glow-blue"
            >
              <div className="absolute inset-0 rounded-full bg-accent/10" />
              <Star className="w-4 h-4 relative z-10" fill="currentColor" />
            </motion.button>

            {/* Rose Button */}
            {onSendRose && (
              <motion.button
                onClick={(e) => { e.stopPropagation(); onSendRose(); }}
                onTouchEnd={(e) => { e.stopPropagation(); }}
                variants={buttonVariants}
                whileHover="hover"
                whileTap="tap"
                className="relative p-2.5 glass rounded-full text-rose-500 transition-shadow"
              >
                <div className="absolute inset-0 rounded-full bg-rose-500/20 animate-pulse" />
                <span className="text-lg relative z-10">🌹</span>
              </motion.button>
            )}

            {/* Like Button */}
            <motion.button
              onClick={(e) => { e.stopPropagation(); triggerSwipeAnimation("right"); }}
              onTouchEnd={(e) => { e.stopPropagation(); }}
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              className="relative p-3 btn-gold rounded-full animate-glow-pulse"
            >
              <Heart className="w-5 h-5 text-primary-foreground relative z-10" fill="currentColor" />
            </motion.button>
          </div>
        </div>

        {/* Swipe direction tint overlay */}
        <motion.div 
          className="absolute inset-0 rounded-3xl pointer-events-none"
          style={{
            background: `linear-gradient(${x.get() > 0 ? '90deg' : '-90deg'}, transparent 0%, ${x.get() > 0 ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)'} 100%)`,
            opacity: cardBgOpacity
          }}
        />
      </div>
    </motion.div>
  );
};

export default ProfileCard;
