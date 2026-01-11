import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox, Float, Sparkles } from "@react-three/drei";
import * as THREE from "three";

interface DiceDotProps {
  position: [number, number, number];
  isRed?: boolean;
}

const DiceDot = ({ position, isRed = false }: DiceDotProps) => (
  <mesh position={position}>
    <sphereGeometry args={[0.08, 16, 16]} />
    <meshStandardMaterial color={isRed ? "#e63946" : "#1a1a2e"} />
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
    <group ref={meshRef}>
      {/* Main dice body with gradient-like effect */}
      <RoundedBox args={[1, 1, 1]} radius={0.12} smoothness={4}>
        <meshStandardMaterial 
          color="#f8f8fc" 
          roughness={0.2}
          metalness={0.1}
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

const Dice3D = ({ isAnimating = false }: Dice3DProps) => {
  return (
    <div className="w-52 h-52">
      <Canvas camera={{ position: [0, 0, 3.2], fov: 45 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 5, 5]} intensity={1.2} />
        <directionalLight position={[-3, -3, -3]} intensity={0.4} />
        <pointLight position={[0, 2, 2]} intensity={0.6} color="#d4af37" />
        
        <Float
          speed={isAnimating ? 0 : 2}
          rotationIntensity={isAnimating ? 0 : 0.3}
          floatIntensity={isAnimating ? 0 : 0.5}
        >
          <AnimatedDice isAnimating={isAnimating} />
        </Float>
        
        {/* Golden sparkles around the dice */}
        {isAnimating && (
          <Sparkles
            count={50}
            scale={3}
            size={3}
            speed={2}
            color="#d4af37"
          />
        )}
      </Canvas>
    </div>
  );
};

export default Dice3D;
