import { useRef, useMemo, Suspense, useState, useEffect, useCallback } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Float, Sparkles, Preload } from "@react-three/drei";
import * as THREE from "three";
import { motion, AnimatePresence } from "framer-motion";

interface DiceDotProps {
  position: [number, number, number];
  isRed?: boolean;
}

const DiceDot = ({ position, isRed = false }: DiceDotProps) => (
  <mesh position={position}>
    <sphereGeometry args={[0.06, 32, 32]} />
    <meshStandardMaterial 
      color={isRed ? "#d4af37" : "#d4af37"} 
      roughness={0.2}
      metalness={0.8}
      emissive="#d4af37"
      emissiveIntensity={0.2}
    />
  </mesh>
);

interface AnimatedDiceProps {
  isAnimating: boolean;
}

const AnimatedDice = ({ isAnimating }: AnimatedDiceProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const spinSpeed = useRef({ x: 0, y: 0, z: 0 });

  useMemo(() => {
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
      meshRef.current.position.x = Math.cos(state.clock.elapsedTime * 6) * 0.05;
    } else {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      meshRef.current.rotation.y += 0.008;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.7) * 0.1;
      meshRef.current.position.y = 0;
      meshRef.current.position.x = 0;
    }
  });

  return (
    <group ref={meshRef} scale={4.5}>
      <RoundedBox args={[1, 1, 1]} radius={0.15} smoothness={8}>
        <meshPhysicalMaterial 
          color="#ffffff" 
          roughness={0.05}
          metalness={0.1}
          clearcoat={1}
          clearcoatRoughness={0.1}
          reflectivity={0.9}
        />
      </RoundedBox>
      
      <RoundedBox args={[1.02, 1.02, 1.02]} radius={0.16} smoothness={8}>
        <meshStandardMaterial 
          color="#d4af37" 
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.15}
        />
      </RoundedBox>

      <group position={[0, 0, 0.51]}>
        <DiceDot position={[0, 0, 0]} isRed={true} />
      </group>

      <group position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[-0.22, 0, 0]} />
        <DiceDot position={[0.22, 0, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      <group position={[0.51, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      <group position={[-0.51, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[0, 0, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      <group position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0, 0, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      <group position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
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

// Loading placeholder (shimmer effect instead of 2D dice)
const DiceLoadingPlaceholder = () => (
  <motion.div
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
    transition={{ duration: 0.15 }}
    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/30 flex items-center justify-center"
  >
    <motion.div
      className="w-16 h-16 rounded-xl bg-primary/10"
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

// Fallback 2D dice (only shown if WebGL fails permanently)
const DiceFallback2D = ({ isAnimating }: { isAnimating: boolean }) => (
  <motion.div
    className="w-20 h-20 rounded-2xl bg-card shadow-lg border border-primary/40 flex items-center justify-center relative"
    animate={isAnimating ? {
      rotateX: [0, 360, 720],
      rotateY: [0, 360, 720],
      scale: [1, 1.08, 1],
    } : {
      rotateY: [0, 360],
      y: [0, -5, 0],
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
    <div className="w-3 h-3 rounded-full bg-primary shadow-sm" />
    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-primary/60" />
    <div className="absolute bottom-3 right-3 w-2 h-2 rounded-full bg-primary/60" />
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
    // Clear any pending timeouts
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
      // Show placeholder after 200ms if 3D not ready yet
      placeholderTimeoutRef.current = setTimeout(() => {
        if (!is3DReady) {
          setShowPlaceholder(true);
        }
      }, 200);
      
      // Failsafe: if 3D not ready after 3s, switch to permanent 2D
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

  // If WebGL is not supported or there's an error, use 2D fallback permanently
  if (!webGLSupported || hasError) {
    return (
      <div className="w-28 h-28 flex items-center justify-center">
        <DiceFallback2D isAnimating={isAnimating} />
      </div>
    );
  }

  return (
    <div className="relative w-28 h-28">
      {/* Loading placeholder - only shows briefly while 3D loads */}
      <AnimatePresence>
        {showPlaceholder && !is3DReady && (
          <div className="absolute inset-0 flex items-center justify-center z-0">
            <DiceLoadingPlaceholder />
          </div>
        )}
      </AnimatePresence>

      {/* Canvas 3D with fade-in transition */}
      <motion.div 
        className="absolute inset-0 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: is3DReady ? 1 : 0 }}
        transition={{ duration: 0.2 }}
      >
        <Suspense fallback={null}>
          <Canvas
            className="w-full h-full"
            camera={{ position: [0, 0, 2], fov: 50 }}
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
            
            <ambientLight intensity={0.9} />
            <directionalLight position={[5, 5, 5]} intensity={1.7} />
            <directionalLight position={[-3, -3, -3]} intensity={0.35} />
            <pointLight position={[0, 2, 2]} intensity={0.9} color="#d4af37" />
            <pointLight position={[-2, -1, 1]} intensity={0.45} color="#ffffff" />

            <Float
              speed={isAnimating ? 0 : 1.5}
              rotationIntensity={isAnimating ? 0 : 0.25}
              floatIntensity={isAnimating ? 0 : 0.35}
            >
              <AnimatedDice isAnimating={isAnimating} />
            </Float>

            {isAnimating && (
              <Sparkles count={30} scale={2} size={2} speed={3} color="#d4af37" />
            )}
            
            {/* Preload all drei assets for faster initial render */}
            <Preload all />
          </Canvas>
        </Suspense>
      </motion.div>
    </div>
  );
};

export default Dice3D;
