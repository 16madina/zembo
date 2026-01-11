import { motion, AnimatePresence } from "framer-motion";
import type { OverlayType } from "@/hooks/useSnapchatFilters";
import type { FaceLandmarks } from "@/hooks/useFaceTracking";

interface FaceTrackingOverlayProps {
  overlay: OverlayType | null;
  landmarks: FaceLandmarks | null;
  isTracking: boolean;
  vignetteStyle?: React.CSSProperties;
  grainStyle?: React.CSSProperties;
}

// Helper to convert normalized coords to CSS position
const toPosition = (point: { x: number; y: number }) => ({
  left: `${point.x * 100}%`,
  top: `${point.y * 100}%`,
});

// Get scale based on face size
const getFaceScale = (landmarks: FaceLandmarks) => {
  // Base scale on eye distance (normalized around 0.25 being "normal")
  return landmarks.eyeDistance / 0.25;
};

const FaceTrackingOverlay = ({
  overlay,
  landmarks,
  isTracking,
  vignetteStyle,
  grainStyle,
}: FaceTrackingOverlayProps) => {
  const renderTrackedOverlay = () => {
    if (!overlay || !landmarks || !isTracking) return null;

    const scale = getFaceScale(landmarks);
    const { yaw, pitch, roll } = landmarks;

    switch (overlay) {
      case "crown":
        return (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              ...toPosition(landmarks.forehead),
              transform: `translate(-50%, -120%) scale(${scale}) rotateZ(${roll}deg)`,
            }}
            animate={{
              y: [0, -5, 0],
            }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          >
            <span className="text-6xl">👑</span>
            {/* Sparkles around crown */}
            {[...Array(5)].map((_, i) => (
              <motion.span
                key={i}
                className="absolute text-sm"
                style={{
                  left: `${-20 + i * 15}px`,
                  top: `${Math.sin(i) * 10}px`,
                }}
                animate={{
                  scale: [0.5, 1, 0.5],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              >
                ✨
              </motion.span>
            ))}
          </motion.div>
        );

      case "bunny":
        return (
          <>
            {/* Left ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(-150%, -100%) scale(${scale * 0.8}) rotateZ(${roll - 15}deg)`,
              }}
              animate={{ rotate: [-25, -15, -25] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-5xl">🐰</span>
            </motion.div>
            {/* Right ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(50%, -100%) scale(${scale * 0.8}) scaleX(-1) rotateZ(${-roll + 15}deg)`,
              }}
              animate={{ rotate: [15, 25, 15] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              <span className="text-5xl">🐰</span>
            </motion.div>
            {/* Nose */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.noseTip),
                transform: `translate(-50%, -30%) scale(${scale * 0.7})`,
              }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span className="text-2xl">🐽</span>
            </motion.div>
          </>
        );

      case "cat":
        return (
          <>
            {/* Left ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(-130%, -80%) scale(${scale * 0.7}) rotateZ(${roll - 10}deg)`,
              }}
              animate={{ rotate: [-5, 5, -5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-4xl">🐱</span>
            </motion.div>
            {/* Right ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(30%, -80%) scale(${scale * 0.7}) scaleX(-1) rotateZ(${-roll + 10}deg)`,
              }}
              animate={{ rotate: [5, -5, 5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <span className="text-4xl">🐱</span>
            </motion.div>
            {/* Whiskers - left side */}
            <div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.leftCheek),
                transform: `translate(-100%, -50%) rotateZ(${roll}deg)`,
              }}
            >
              <div className="w-10 h-[1px] bg-foreground/40 rotate-6 mb-1" />
              <div className="w-12 h-[1px] bg-foreground/40 mb-1" />
              <div className="w-10 h-[1px] bg-foreground/40 -rotate-6" />
            </div>
            {/* Whiskers - right side */}
            <div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.rightCheek),
                transform: `translate(0%, -50%) rotateZ(${roll}deg)`,
              }}
            >
              <div className="w-10 h-[1px] bg-foreground/40 -rotate-6 mb-1" />
              <div className="w-12 h-[1px] bg-foreground/40 mb-1" />
              <div className="w-10 h-[1px] bg-foreground/40 rotate-6" />
            </div>
          </>
        );

      case "dog":
        return (
          <>
            {/* Left ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(-140%, -70%) scale(${scale * 0.8}) rotateZ(${roll - 15}deg)`,
              }}
              animate={{ rotate: [-10, 0, -10] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-5xl">🐕</span>
            </motion.div>
            {/* Right ear */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.forehead),
                transform: `translate(40%, -70%) scale(${scale * 0.8}) scaleX(-1) rotateZ(${-roll + 15}deg)`,
              }}
              animate={{ rotate: [10, 0, 10] }}
              transition={{ duration: 1, repeat: Infinity }}
            >
              <span className="text-5xl">🐕</span>
            </motion.div>
            {/* Tongue */}
            <motion.div
              className="absolute pointer-events-none"
              style={{
                ...toPosition(landmarks.chin),
                transform: `translate(-50%, -80%) scale(${scale * 0.8})`,
              }}
              animate={{ y: [0, 3, 0] }}
              transition={{ duration: 0.5, repeat: Infinity }}
            >
              <span className="text-3xl">👅</span>
            </motion.div>
          </>
        );

      case "glasses":
        return (
          <motion.div
            className="absolute pointer-events-none"
            style={{
              left: `${((landmarks.leftEye.x + landmarks.rightEye.x) / 2) * 100}%`,
              top: `${((landmarks.leftEye.y + landmarks.rightEye.y) / 2) * 100}%`,
              transform: `translate(-50%, -50%) scale(${scale * 1.2}) rotateZ(${roll}deg)`,
            }}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 3, repeat: Infinity }}
          >
            <span className="text-7xl">🕶️</span>
          </motion.div>
        );

      case "hearts":
        return (
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(8)].map((_, i) => (
              <motion.div
                key={i}
                className="absolute text-2xl"
                initial={{
                  x: Math.random() * 100 + "%",
                  y: "110%",
                  opacity: 0.8,
                  scale: 0.5 + Math.random() * 0.5,
                }}
                animate={{
                  y: "-10%",
                  opacity: 0,
                  rotate: Math.random() * 40 - 20,
                }}
                transition={{
                  duration: 4 + Math.random() * 2,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "linear",
                }}
              >
                💕
              </motion.div>
            ))}
          </div>
        );

      case "stars":
        return (
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
                  rotate: [0, 180, 360],
                }}
                transition={{
                  duration: 2 + Math.random(),
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
              >
                ⭐
              </motion.div>
            ))}
          </div>
        );

      case "sparkles":
        return (
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
                  repeatDelay: Math.random() * 2,
                }}
              >
                ✨
              </motion.div>
            ))}
          </div>
        );

      case "butterfly":
        return (
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
        );

      default:
        return null;
    }
  };

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

      {/* AR Overlays with Face Tracking */}
      <AnimatePresence>
        {overlay && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20"
          >
            {renderTrackedOverlay()}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tracking indicator (debug) */}
      {/* 
      {isTracking && landmarks && (
        <div className="absolute bottom-4 left-4 bg-green-500/50 text-white text-xs px-2 py-1 rounded z-50">
          Tracking: Yaw {landmarks.yaw.toFixed(1)}° Pitch {landmarks.pitch.toFixed(1)}°
        </div>
      )}
      */}
    </>
  );
};

export default FaceTrackingOverlay;
