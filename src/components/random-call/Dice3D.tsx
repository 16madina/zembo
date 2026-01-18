import { useRef, useMemo, Suspense, useState, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { motion } from "framer-motion";

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
    <group ref={meshRef} scale={0.7}>
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

// Fallback 2D dice (toujours visible derrière le 3D si besoin)
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

const DiceLoading = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
  </div>
);

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

  useEffect(() => {
    setWebGLSupported(isWebGLAvailable());
  }, []);

  // If WebGL is not supported or there's an error, use 2D fallback
  if (!webGLSupported || hasError) {
    return (
      <div className="w-28 h-28 flex items-center justify-center">
        <DiceFallback2D isAnimating={isAnimating} />
      </div>
    );
  }

  return (
    <div className="relative w-28 h-28">
      {/* Fallback 2D toujours rendu (si le 3D ne s'affiche pas, on voit au moins ça) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <DiceFallback2D isAnimating={isAnimating} />
      </div>

      <div className="absolute inset-0">
        <Suspense fallback={<DiceLoading />}>
          <Canvas
            camera={{ position: [0, 0, 2.3], fov: 45 }}
            gl={{
              antialias: true,
              alpha: true,
              failIfMajorPerformanceCaveat: false,
              powerPreference: "default",
            }}
            style={{ background: "transparent" }}
            onCreated={() => {
              // Si tu ne vois pas ce log dans ta console, le Canvas ne monte pas.
              console.log("Dice3D Canvas created successfully");
            }}
          >
            <ambientLight intensity={0.8} />
            <directionalLight position={[5, 5, 5]} intensity={1.5} castShadow />
            <directionalLight position={[-3, -3, -3]} intensity={0.3} />
            <pointLight position={[0, 2, 2]} intensity={0.8} color="#d4af37" />
            <pointLight position={[-2, -1, 1]} intensity={0.4} color="#ffffff" />

            <Float
              speed={isAnimating ? 0 : 1.5}
              rotationIntensity={isAnimating ? 0 : 0.2}
              floatIntensity={isAnimating ? 0 : 0.3}
            >
              <AnimatedDice isAnimating={isAnimating} />
            </Float>

            {isAnimating && (
              <Sparkles
                count={30}
                scale={2}
                size={2}
                speed={3}
                color="#d4af37"
              />
            )}
          </Canvas>
        </Suspense>
      </div>
    </div>
  );
};

export default Dice3D;
