import { useRef, useState, useCallback } from "react";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Reply } from "lucide-react";
import { isNative } from "@/lib/capacitor";

interface SwipeableMessageProps {
  children: React.ReactNode;
  onSwipeReply: () => void;
  isMe: boolean;
}

const SWIPE_THRESHOLD = 60;

const SwipeableMessage = ({ children, onSwipeReply, isMe }: SwipeableMessageProps) => {
  const x = useMotionValue(0);
  const [isDragging, setIsDragging] = useState(false);
  const hasTriggeredRef = useRef(false);
  
  // For left-aligned messages (not me), swipe right to reply
  // For right-aligned messages (me), swipe left to reply
  const direction = isMe ? -1 : 1;
  
  // Transform for the reply icon opacity and scale
  const replyOpacity = useTransform(
    x, 
    isMe ? [-SWIPE_THRESHOLD, -20, 0] : [0, 20, SWIPE_THRESHOLD],
    isMe ? [1, 0.5, 0] : [0, 0.5, 1]
  );
  
  const replyScale = useTransform(
    x,
    isMe ? [-SWIPE_THRESHOLD, -30, 0] : [0, 30, SWIPE_THRESHOLD],
    isMe ? [1, 0.6, 0.4] : [0.4, 0.6, 1]
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    hasTriggeredRef.current = false;
  }, []);

  const handleDrag = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const currentX = info.offset.x;
    
    // Check if threshold is crossed in the correct direction
    const shouldTrigger = isMe 
      ? currentX < -SWIPE_THRESHOLD 
      : currentX > SWIPE_THRESHOLD;
    
    if (shouldTrigger && !hasTriggeredRef.current) {
      hasTriggeredRef.current = true;
      // Haptic feedback
      if (isNative && navigator.vibrate) {
        navigator.vibrate(10);
      }
    }
  }, [isMe]);

  const handleDragEnd = useCallback((event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    setIsDragging(false);
    
    const currentX = info.offset.x;
    const shouldTrigger = isMe 
      ? currentX < -SWIPE_THRESHOLD 
      : currentX > SWIPE_THRESHOLD;
    
    if (shouldTrigger) {
      onSwipeReply();
    }
  }, [isMe, onSwipeReply]);

  return (
    <div className={`relative w-full flex ${isMe ? "justify-end" : "justify-start"}`}>
      {/* Reply indicator - positioned on the opposite side */}
      <motion.div
        className={`absolute top-1/2 -translate-y-1/2 flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 ${
          isMe ? "left-2" : "right-2"
        }`}
        style={{ 
          opacity: replyOpacity,
          scale: replyScale,
        }}
      >
        <Reply className="w-4 h-4 text-primary" />
      </motion.div>

      {/* Swipeable content */}
      <motion.div
        drag="x"
        dragConstraints={{ left: isMe ? -100 : 0, right: isMe ? 0 : 100 }}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragEnd={handleDragEnd}
        style={{ x }}
        className={`max-w-[80%] ${isDragging ? "cursor-grabbing" : ""}`}
        whileTap={{ cursor: "grabbing" }}
      >
        {children}
      </motion.div>
    </div>
  );
};

export default SwipeableMessage;
