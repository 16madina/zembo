import { motion, AnimatePresence } from "framer-motion";
import type { OverlayType } from "@/hooks/useSnapchatFilters";

interface FilterOverlayProps {
  overlay: OverlayType | null;
  vignetteStyle?: React.CSSProperties;
  grainStyle?: React.CSSProperties;
}

// Animated overlay elements
const OverlayAnimations: Record<OverlayType, React.ReactNode> = {
  hearts: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(8)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-2xl"
          initial={{ 
            x: Math.random() * 100 + "%", 
            y: "110%", 
            opacity: 0.8,
            scale: 0.5 + Math.random() * 0.5
          }}
          animate={{ 
            y: "-10%", 
            opacity: 0,
            rotate: Math.random() * 40 - 20
          }}
          transition={{ 
            duration: 4 + Math.random() * 2, 
            repeat: Infinity, 
            delay: i * 0.5,
            ease: "linear"
          }}
        >
          💕
        </motion.div>
      ))}
    </div>
  ),
  stars: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(12)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-xl"
          style={{
            left: `${10 + (i * 8) % 90}%`,
            top: `${10 + Math.random() * 80}%`,
          }}
          animate={{ 
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
            rotate: [0, 180, 360]
          }}
          transition={{ 
            duration: 2 + Math.random(), 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
        >
          ⭐
        </motion.div>
      ))}
    </div>
  ),
  sparkles: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ 
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
          }}
          transition={{ 
            duration: 1.5, 
            repeat: Infinity, 
            delay: i * 0.3,
            repeatDelay: Math.random() * 2
          }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  ),
  crown: (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div
        className="absolute top-[8%] left-1/2 -translate-x-1/2 text-6xl"
        animate={{ 
          y: [0, -5, 0],
          rotateZ: [-3, 3, -3]
        }}
        transition={{ 
          duration: 2, 
          repeat: Infinity, 
          ease: "easeInOut" 
        }}
      >
        👑
      </motion.div>
      {/* Sparkles around crown */}
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-sm"
          style={{
            top: `${5 + Math.random() * 10}%`,
            left: `${35 + i * 8}%`,
          }}
          animate={{ 
            scale: [0.5, 1, 0.5],
            opacity: [0.3, 1, 0.3],
          }}
          transition={{ 
            duration: 1, 
            repeat: Infinity, 
            delay: i * 0.2 
          }}
        >
          ✨
        </motion.div>
      ))}
    </div>
  ),
  bunny: (
    <div className="absolute inset-0 pointer-events-none">
      {/* Bunny ears */}
      <motion.div
        className="absolute top-[3%] left-[30%] text-5xl"
        style={{ transform: "rotate(-20deg)" }}
        animate={{ rotate: [-25, -15, -25] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🐰
      </motion.div>
      <motion.div
        className="absolute top-[3%] right-[30%] text-5xl"
        style={{ transform: "rotate(20deg) scaleX(-1)" }}
        animate={{ rotate: [15, 25, 15] }}
        transition={{ duration: 1.5, repeat: Infinity }}
      >
        🐰
      </motion.div>
      {/* Nose */}
      <motion.div
        className="absolute top-[45%] left-1/2 -translate-x-1/2 text-2xl"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        🐽
      </motion.div>
    </div>
  ),
  cat: (
    <div className="absolute inset-0 pointer-events-none">
      {/* Cat ears */}
      <motion.div
        className="absolute top-[5%] left-[25%] text-4xl"
        animate={{ rotate: [-5, 5, -5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐱
      </motion.div>
      <motion.div
        className="absolute top-[5%] right-[25%] text-4xl"
        style={{ transform: "scaleX(-1)" }}
        animate={{ rotate: [5, -5, 5] }}
        transition={{ duration: 2, repeat: Infinity }}
      >
        🐱
      </motion.div>
      {/* Whiskers simulation with lines */}
      <div className="absolute top-[48%] left-[20%] w-12 h-[1px] bg-foreground/30 rotate-6" />
      <div className="absolute top-[50%] left-[20%] w-14 h-[1px] bg-foreground/30" />
      <div className="absolute top-[52%] left-[20%] w-12 h-[1px] bg-foreground/30 -rotate-6" />
      <div className="absolute top-[48%] right-[20%] w-12 h-[1px] bg-foreground/30 -rotate-6" />
      <div className="absolute top-[50%] right-[20%] w-14 h-[1px] bg-foreground/30" />
      <div className="absolute top-[52%] right-[20%] w-12 h-[1px] bg-foreground/30 rotate-6" />
    </div>
  ),
  dog: (
    <div className="absolute inset-0 pointer-events-none">
      {/* Dog ears */}
      <motion.div
        className="absolute top-[2%] left-[20%] text-5xl"
        animate={{ rotate: [-10, 0, -10] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        🐕
      </motion.div>
      <motion.div
        className="absolute top-[2%] right-[20%] text-5xl"
        style={{ transform: "scaleX(-1)" }}
        animate={{ rotate: [10, 0, 10] }}
        transition={{ duration: 1, repeat: Infinity }}
      >
        🐕
      </motion.div>
      {/* Tongue */}
      <motion.div
        className="absolute bottom-[35%] left-1/2 -translate-x-1/2 text-3xl"
        animate={{ y: [0, 3, 0] }}
        transition={{ duration: 0.5, repeat: Infinity }}
      >
        👅
      </motion.div>
    </div>
  ),
  glasses: (
    <div className="absolute inset-0 pointer-events-none">
      <motion.div
        className="absolute top-[32%] left-1/2 -translate-x-1/2 text-7xl"
        animate={{ 
          y: [0, -2, 0],
        }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        🕶️
      </motion.div>
    </div>
  ),
  butterfly: (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute text-3xl"
          initial={{
            x: `${-10 + Math.random() * 20}%`,
            y: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            x: [`${-10 + Math.random() * 20}%`, `${80 + Math.random() * 20}%`],
            y: [
              `${20 + Math.random() * 60}%`,
              `${10 + Math.random() * 30}%`,
              `${40 + Math.random() * 40}%`,
            ],
          }}
          transition={{
            duration: 8 + Math.random() * 4,
            repeat: Infinity,
            delay: i * 1.5,
            ease: "easeInOut",
          }}
        >
          🦋
        </motion.div>
      ))}
    </div>
  ),
};

const FilterOverlay = ({ overlay, vignetteStyle, grainStyle }: FilterOverlayProps) => {
  return (
    <>
      {/* Vignette Effect */}
      {vignetteStyle && Object.keys(vignetteStyle).length > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none z-10"
          style={vignetteStyle}
        />
      )}

      {/* Grain Effect */}
      {grainStyle && Object.keys(grainStyle).length > 0 && (
        <div 
          className="absolute inset-0 pointer-events-none z-10 bg-noise mix-blend-overlay"
          style={{
            ...grainStyle,
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          }}
        />
      )}

      {/* AR Overlays */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20"
          >
            {OverlayAnimations[overlay]}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FilterOverlay;
