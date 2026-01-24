import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useTransform } from "framer-motion";

interface FireParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: string;
}

interface FireParticlesProps {
  isActive: boolean;
  yOffset: number;
  containerRef?: React.RefObject<HTMLElement>;
}

const FireParticles: React.FC<FireParticlesProps> = ({ isActive, yOffset, containerRef }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<FireParticle[]>([]);
  const animationRef = useRef<number>();
  const lastSpawnTimeRef = useRef<number>(0);
  
  const flameColors = [
    "#FF4500", // Orange Red
    "#FF6B35", // Bright Orange
    "#FFD700", // Gold
    "#FFA500", // Orange
    "#FF8C00", // Dark Orange
    "#FFFF00", // Yellow
  ];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    const updateCanvasSize = () => {
      if (containerRef?.current) {
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
      } else {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };
    
    updateCanvasSize();
    window.addEventListener("resize", updateCanvasSize);

    const spawnParticle = (centerX: number, centerY: number) => {
      const angle = (Math.random() * Math.PI) - (Math.PI / 2); // Upward spread
      const speed = 2 + Math.random() * 4;
      
      return {
        id: Date.now() + Math.random(),
        x: centerX + (Math.random() - 0.5) * 60,
        y: centerY,
        vx: Math.cos(angle) * speed * 0.5,
        vy: -Math.abs(Math.sin(angle) * speed) - 2,
        size: 4 + Math.random() * 8,
        life: 1,
        maxLife: 0.5 + Math.random() * 0.5,
        color: flameColors[Math.floor(Math.random() * flameColors.length)],
      };
    };

    const animate = (timestamp: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Spawn new particles when swiping up
      if (isActive && yOffset < -20) {
        const intensity = Math.min(Math.abs(yOffset) / 150, 1);
        const spawnRate = 50 / (1 + intensity * 3); // Faster spawning with more swipe
        
        if (timestamp - lastSpawnTimeRef.current > spawnRate) {
          const centerX = canvas.width / 2;
          const centerY = canvas.height * 0.6;
          
          // Spawn multiple particles based on intensity
          const particleCount = Math.floor(1 + intensity * 3);
          for (let i = 0; i < particleCount; i++) {
            particlesRef.current.push(spawnParticle(centerX, centerY));
          }
          
          lastSpawnTimeRef.current = timestamp;
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        // Update position
        particle.x += particle.vx;
        particle.y += particle.vy;
        particle.vy -= 0.05; // Slight upward acceleration (fire rises)
        
        // Reduce life
        particle.life -= 0.02;
        
        if (particle.life <= 0) return false;

        // Draw particle with glow
        const alpha = particle.life;
        const gradient = ctx.createRadialGradient(
          particle.x, particle.y, 0,
          particle.x, particle.y, particle.size
        );
        
        gradient.addColorStop(0, `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.5, `${particle.color}${Math.floor(alpha * 150).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, "transparent");
        
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add bright core
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 200, ${alpha * 0.8})`;
        ctx.fill();

        return true;
      });

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", updateCanvasSize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, yOffset, containerRef]);

  // Clear particles when not active
  useEffect(() => {
    if (!isActive) {
      particlesRef.current = [];
    }
  }, [isActive]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-50"
      style={{ mixBlendMode: "screen" }}
    />
  );
};

export default FireParticles;