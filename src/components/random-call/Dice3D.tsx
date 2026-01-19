import { useRef, Suspense, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Preload } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

interface AnimatedDiceProps {
  isAnimating: boolean;
}

// Simple dice with rounded edges and gold pips
const AnimatedDice = ({ isAnimating }: AnimatedDiceProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const spinSpeed = useRef({ x: 0, y: 0, z: 0 });

  useEffect(() => {
    spinSpeed.current = {
      x: 6 + Math.random() * 4,
      y: 8 + Math.random() * 4,
      z: 4 + Math.random() * 3,
    };
  }, [isAnimating]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    if (isAnimating) {
      meshRef.current.rotation.x += spinSpeed.current.x * delta;
      meshRef.current.rotation.y += spinSpeed.current.y * delta;
      meshRef.current.rotation.z += spinSpeed.current.z * delta;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.1;
    } else {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.1;
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.7) * 0.08;
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
    }
  });

  // Pip positions for each face (standard dice configuration)
  const pipRadius = 0.08;
  const pipOffset = 0.28;
  const faceOffset = 0.51;

  return (
    <group ref={meshRef} scale={1.8}>
      {/* Main dice cube - white with slight rounding via geometry */}
      <mesh castShadow receiveShadow>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial 
          color="#ffffff" 
          roughness={0.15}
          metalness={0.05}
        />
      </mesh>

      {/* Gold edge highlight */}
      <lineSegments>
        <edgesGeometry args={[new THREE.BoxGeometry(1.01, 1.01, 1.01)]} />
        <lineBasicMaterial color="#d4af37" linewidth={2} />
      </lineSegments>

      {/* Face 1 - Front (1 pip center) */}
      <mesh position={[0, 0, faceOffset]}>
        <circleGeometry args={[pipRadius, 32]} />
        <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
      </mesh>

      {/* Face 6 - Back (6 pips) */}
      <group position={[0, 0, -faceOffset]} rotation={[0, Math.PI, 0]}>
        <mesh position={[-pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-pipOffset, 0, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, 0, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Face 2 - Right (2 pips diagonal) */}
      <group position={[faceOffset, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh position={[-pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Face 5 - Left (5 pips) */}
      <group position={[-faceOffset, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <mesh position={[-pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Face 3 - Top (3 pips diagonal) */}
      <group position={[0, faceOffset, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh position={[-pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0, 0, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>

      {/* Face 4 - Bottom (4 pips corners) */}
      <group position={[0, -faceOffset, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <mesh position={[-pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[-pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[pipOffset, -pipOffset, 0]}>
          <circleGeometry args={[pipRadius, 32]} />
          <meshStandardMaterial color="#d4af37" metalness={0.7} roughness={0.2} />
        </mesh>
      </group>
    </group>
  );
};

// Probe component to detect when first 3D frame is rendered
const RenderReadyProbe = ({ onReady }: { onReady: () => void }) => {
  const hasCalledRef = useRef(false);
  
  useFrame(() => {
    if (!hasCalledRef.current) {
      hasCalledRef.current = true;
      onReady();
    }
  });
  
  return null;
};

// Loading placeholder
const DiceLoadingPlaceholder = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="w-16 h-16 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
  >
    <motion.div
      className="w-12 h-12 rounded-lg bg-primary/10"
      animate={{ 
        opacity: [0.3, 0.6, 0.3],
        scale: [0.95, 1, 0.95]
      }}
      transition={{ 
        duration: 1.5, 
        repeat: Infinity, 
        ease: "easeInOut" 
      }}
    />
  </motion.div>
);

// Fallback 2D dice
const DiceFallback2D = ({ isAnimating }: { isAnimating: boolean }) => (
  <motion.div
    className="w-16 h-16 rounded-xl bg-card shadow-lg border border-primary/40 flex items-center justify-center relative"
    animate={isAnimating ? {
      rotateX: [0, 360, 720],
      rotateY: [0, 360, 720],
      scale: [1, 1.08, 1],
    } : {
      rotateY: [0, 360],
      y: [0, -3, 0],
    }}
    transition={isAnimating ? {
      duration: 0.8,
      ease: "easeOut",
    } : {
      rotateY: { duration: 4, repeat: Infinity, ease: "linear" },
      y: { duration: 2, repeat: Infinity, ease: "easeInOut" },
    }}
    style={{ transformStyle: "preserve-3d" }}
  >
    <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-sm" />
    <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-primary/60" />
    <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-primary/60" />
  </motion.div>
);

interface Dice3DProps {
  isAnimating?: boolean;
}

// Check if WebGL is available
const isWebGLAvailable = (): boolean => {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return gl instanceof WebGLRenderingContext;
  } catch {
    return false;
  }
};

const Dice3D = ({ isAnimating = false }: Dice3DProps) => {
  const [webGLSupported, setWebGLSupported] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [is3DReady, setIs3DReady] = useState(false);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const placeholderTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const failsafeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const handle3DReady = useCallback(() => {
    setIs3DReady(true);
    if (placeholderTimeoutRef.current) {
      clearTimeout(placeholderTimeoutRef.current);
      placeholderTimeoutRef.current = null;
    }
    if (failsafeTimeoutRef.current) {
      clearTimeout(failsafeTimeoutRef.current);
      failsafeTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const isSupported = isWebGLAvailable();
    setWebGLSupported(isSupported);
    
    if (isSupported) {
      placeholderTimeoutRef.current = setTimeout(() => {
        if (!is3DReady) {
          setShowPlaceholder(true);
        }
      }, 200);
      
      failsafeTimeoutRef.current = setTimeout(() => {
        if (!is3DReady) {
          console.warn("Dice3D: 3D rendering failed after timeout, using 2D fallback");
          setHasError(true);
        }
      }, 3000);
    }
    
    return () => {
      if (placeholderTimeoutRef.current) clearTimeout(placeholderTimeoutRef.current);
      if (failsafeTimeoutRef.current) clearTimeout(failsafeTimeoutRef.current);
    };
  }, []);

  if (!webGLSupported || hasError) {
    return (
      <div className="w-20 h-20 flex items-center justify-center">
        <DiceFallback2D isAnimating={isAnimating} />
      </div>
    );
  }

  return (
    <div className="relative w-20 h-20">
      <AnimatePresence>
        {showPlaceholder && !is3DReady && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <DiceLoadingPlaceholder />
          </div>
        )}
      </AnimatePresence>

      <motion.div 
        className="absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: is3DReady ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Suspense fallback={null}>
          <Canvas
            className="w-full h-full"
            camera={{ position: [0, 0, 4], fov: 45 }}
            dpr={[1, 1.5]}
            gl={{
              antialias: true,
              alpha: true,
              failIfMajorPerformanceCaveat: false,
              powerPreference: "default",
              preserveDrawingBuffer: false,
            }}
            style={{ background: "transparent", width: "100%", height: "100%" }}
          >
            <RenderReadyProbe onReady={handle3DReady} />
            
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1.2} />
            <directionalLight position={[-3, -3, -3]} intensity={0.3} />
            <pointLight position={[0, 2, 2]} intensity={0.6} color="#d4af37" />

            <AnimatedDice isAnimating={isAnimating} />
            
            <Preload all />
          </Canvas>
        </Suspense>
      </motion.div>
    </div>
  );
};

export default Dice3D;
