import { useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface DiceDotProps {
  position: [number, number, number];
}

const DiceDot = ({ position }: DiceDotProps) => (
  <mesh position={position}>
    <sphereGeometry args={[0.08, 16, 16]} />
    <meshStandardMaterial color="#1a1a2e" />
  </mesh>
);

// Dot positions for each face of the dice
const dotPositions: Record<number, [number, number, number][]> = {
  1: [[0, 0, 0.51]], // Center (red dot)
  2: [[-0.25, 0.25, 0], [0.25, -0.25, 0]],
  3: [[-0.25, 0.25, 0], [0, 0, 0], [0.25, -0.25, 0]],
  4: [[-0.25, 0.25, 0], [0.25, 0.25, 0], [-0.25, -0.25, 0], [0.25, -0.25, 0]],
  5: [[-0.25, 0.25, 0], [0.25, 0.25, 0], [0, 0, 0], [-0.25, -0.25, 0], [0.25, -0.25, 0]],
  6: [[-0.25, 0.25, 0], [0.25, 0.25, 0], [-0.25, 0, 0], [0.25, 0, 0], [-0.25, -0.25, 0], [0.25, -0.25, 0]],
};

interface AnimatedDiceProps {
  isAnimating: boolean;
}

const AnimatedDice = ({ isAnimating }: AnimatedDiceProps) => {
  const meshRef = useRef<THREE.Group>(null);
  const targetRotation = useRef({ x: 0, y: 0, z: 0 });
  const velocity = useRef({ x: 0, y: 0, z: 0 });

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    if (isAnimating) {
      // Continuous spinning animation
      velocity.current.x = 8;
      velocity.current.y = 10;
      velocity.current.z = 6;
      
      meshRef.current.rotation.x += velocity.current.x * delta;
      meshRef.current.rotation.y += velocity.current.y * delta;
      meshRef.current.rotation.z += velocity.current.z * delta;
    } else {
      // Gentle floating animation when not spinning
      meshRef.current.rotation.x = Math.sin(Date.now() * 0.001) * 0.1;
      meshRef.current.rotation.y += 0.005;
      meshRef.current.rotation.z = Math.cos(Date.now() * 0.0015) * 0.05;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main dice body */}
      <RoundedBox args={[1, 1, 1]} radius={0.1} smoothness={4}>
        <meshStandardMaterial color="#f0f0f5" />
      </RoundedBox>

      {/* Face 1 - Front (with red center dot) */}
      <group position={[0, 0, 0.51]}>
        <mesh position={[0, 0, 0]}>
          <sphereGeometry args={[0.12, 16, 16]} />
          <meshStandardMaterial color="#e63946" />
        </mesh>
      </group>

      {/* Face 6 - Back */}
      <group position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]}>
        {dotPositions[6].map((pos, i) => (
          <DiceDot key={`back-${i}`} position={[pos[0], pos[1], 0]} />
        ))}
      </group>

      {/* Face 2 - Right */}
      <group position={[0.51, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        {dotPositions[2].map((pos, i) => (
          <DiceDot key={`right-${i}`} position={[pos[0], pos[1], 0]} />
        ))}
      </group>

      {/* Face 5 - Left */}
      <group position={[-0.51, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {dotPositions[5].map((pos, i) => (
          <DiceDot key={`left-${i}`} position={[pos[0], pos[1], 0]} />
        ))}
      </group>

      {/* Face 3 - Top */}
      <group position={[0, 0.51, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        {dotPositions[3].map((pos, i) => (
          <DiceDot key={`top-${i}`} position={[pos[0], pos[1], 0]} />
        ))}
      </group>

      {/* Face 4 - Bottom */}
      <group position={[0, -0.51, 0]} rotation={[Math.PI / 2, 0, 0]}>
        {dotPositions[4].map((pos, i) => (
          <DiceDot key={`bottom-${i}`} position={[pos[0], pos[1], 0]} />
        ))}
      </group>
    </group>
  );
};

interface Dice3DProps {
  isAnimating?: boolean;
}

const Dice3D = ({ isAnimating = false }: Dice3DProps) => {
  return (
    <div className="w-48 h-48">
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} />
        <directionalLight position={[-5, -5, -5]} intensity={0.3} />
        <pointLight position={[0, 2, 2]} intensity={0.5} color="#d4af37" />
        <AnimatedDice isAnimating={isAnimating} />
      </Canvas>
    </div>
  );
};

export default Dice3D;
