import { useRef, useMemo, useState, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { Dice1 } from "lucide-react";

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

  // Randomize spin direction for more dynamic effect
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
      // Fast spinning animation with wobble
      meshRef.current.rotation.x += spinSpeed.current.x * delta;
      meshRef.current.rotation.y += spinSpeed.current.y * delta;
      meshRef.current.rotation.z += spinSpeed.current.z * delta;
      
      // Add slight position wobble
      meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 8) * 0.1;
      meshRef.current.position.x = Math.cos(state.clock.elapsedTime * 6) * 0.05;
    } else {
      // Gentle floating animation when not spinning
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
      meshRef.current.rotation.y += 0.008;
      meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.7) * 0.1;
      meshRef.current.position.y = 0;
      meshRef.current.position.x = 0;
    }
  });

  return (
    <group ref={meshRef} scale={0.7}>
      {/* Main dice body - premium glossy white with gold edges */}
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
      
      {/* Gold edge highlight */}
      <RoundedBox args={[1.02, 1.02, 1.02]} radius={0.16} smoothness={8}>
        <meshStandardMaterial 
          color="#d4af37" 
          roughness={0.3}
          metalness={0.8}
          transparent
          opacity={0.15}
        />
      </RoundedBox>

      {/* Face 1 - Front (with red center dot) */}
      <group position={[0, 0, 0.51]}>
        <DiceDot position={[0, 0, 0]} isRed={true} />
      </group>

      {/* Face 6 - Back */}
      <group position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[-0.22, 0, 0]} />
        <DiceDot position={[0.22, 0, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      {/* Face 2 - Right */}
      <group position={[0.51, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      {/* Face 5 - Left */}
      <group position={[-0.51, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[0, 0, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      {/* Face 3 - Top */}
      <group position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0, 0, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>

      {/* Face 4 - Bottom */}
      <group position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <DiceDot position={[-0.22, 0.22, 0]} />
        <DiceDot position={[0.22, 0.22, 0]} />
        <DiceDot position={[-0.22, -0.22, 0]} />
        <DiceDot position={[0.22, -0.22, 0]} />
      </group>
    </group>
  );
};

interface Dice3DProps {
  isAnimating?: boolean;
}

// Fallback component when WebGL fails
const DiceFallback = ({ isAnimating }: { isAnimating: boolean }) => (
  <div className="w-full h-full flex items-center justify-center">
    <div 
      className={`w-16 h-16 bg-white rounded-xl shadow-lg border-2 border-primary/30 flex items-center justify-center ${isAnimating ? 'animate-spin' : 'animate-pulse'}`}
    >
      <Dice1 className="w-10 h-10 text-primary" />
    </div>
  </div>
);

// Loading component
const DiceLoading = () => (
  <div className="w-full h-full flex items-center justify-center">
    <div className="w-12 h-12 rounded-xl bg-primary/20 animate-pulse" />
  </div>
);

const Dice3D = ({ isAnimating = false }: Dice3DProps) => {
  const [hasError, setHasError] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  // Check if WebGL is supported
  const isWebGLSupported = useMemo(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }, []);

  if (hasError || !isWebGLSupported) {
    return (
      <div className="w-32 h-32">
        <DiceFallback isAnimating={isAnimating} />
      </div>
    );
  }

  return (
    <div className="w-32 h-32">
      <Suspense fallback={<DiceLoading />}>
        <Canvas 
          camera={{ position: [0, 0, 2.3], fov: 45 }}
          onCreated={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
          gl={{ 
            antialias: true,
            alpha: true,
            failIfMajorPerformanceCaveat: false,
          }}
          style={{ 
            background: 'transparent',
            opacity: isLoaded ? 1 : 0,
            transition: 'opacity 0.3s ease-in'
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
          
          {/* Golden sparkles around the dice */}
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
      {!isLoaded && <DiceLoading />}
    </div>
  );
};

export default Dice3D;
