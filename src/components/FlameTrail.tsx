import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface FlameParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  color: string;
  rotation: number;
  rotationSpeed: number;
}

interface FlameTrailProps {
  isVisible: boolean;
  onComplete?: () => void;
  duration?: number;
}

const FlameTrail: React.FC<FlameTrailProps> = ({ 
  isVisible, 
  onComplete,
  duration = 3000 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<FlameParticle[]>([]);
  const animationRef = useRef<number>();
  const startTimeRef = useRef<number>(0);
  const [isRendering, setIsRendering] = useState(false);
  
  const flameColors = [
    "#FF4500", // Orange Red
    "#FF6B35", // Bright Orange
    "#FFD700", // Gold
    "#FFA500", // Orange
    "#FF8C00", // Dark Orange
    "#FFFF00", // Yellow
    "#FF3300", // Red Orange
    "#FFE4B5", // Moccasin (light flame tip)
  ];

  useEffect(() => {
    if (!isVisible) return;
    
    setIsRendering(true);
    startTimeRef.current = performance.now();
    
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Create initial burst of particles along a vertical trail
    const createTrailParticles = () => {
      const centerX = canvas.width / 2;
      const particles: FlameParticle[] = [];
      
      // Create particles along the trail path
      for (let i = 0; i < 80; i++) {
        const progress = i / 80;
        const y = canvas.height * (0.8 - progress * 0.7);
        const spread = 40 + progress * 60; // Wider at top
        
        particles.push({
          id: Date.now() + Math.random(),
          x: centerX + (Math.random() - 0.5) * spread,
          y: y + (Math.random() - 0.5) * 30,
          vx: (Math.random() - 0.5) * 2,
          vy: -1 - Math.random() * 3,
          size: 8 + Math.random() * 16 * (1 - progress * 0.5),
          life: 0.7 + Math.random() * 0.3,
          color: flameColors[Math.floor(Math.random() * flameColors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        });
      }
      
      // Add some ember particles
      for (let i = 0; i < 30; i++) {
        particles.push({
          id: Date.now() + Math.random() + 1000,
          x: centerX + (Math.random() - 0.5) * 100,
          y: canvas.height * (0.3 + Math.random() * 0.5),
          vx: (Math.random() - 0.5) * 4,
          vy: -2 - Math.random() * 4,
          size: 3 + Math.random() * 5,
          life: 0.8 + Math.random() * 0.2,
          color: "#FFD700",
          rotation: 0,
          rotationSpeed: 0,
        });
      }
      
      return particles;
    };

    particlesRef.current = createTrailParticles();

    const animate = (timestamp: number) => {
      const elapsed = timestamp - startTimeRef.current;
      const fadeProgress = Math.min(elapsed / duration, 1);
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Global fade based on time
      const globalAlpha = 1 - Math.pow(fadeProgress, 2);

      // Add some new particles in the first half of the animation
      if (fadeProgress < 0.5 && Math.random() > 0.7) {
        const centerX = canvas.width / 2;
        particlesRef.current.push({
          id: Date.now() + Math.random(),
          x: centerX + (Math.random() - 0.5) * 80,
          y: canvas.height * (0.4 + Math.random() * 0.3),
          vx: (Math.random() - 0.5) * 3,
          vy: -2 - Math.random() * 4,
          size: 6 + Math.random() * 12,
          life: 0.6 + Math.random() * 0.4,
          color: flameColors[Math.floor(Math.random() * flameColors.length)],
          rotation: Math.random() * Math.PI * 2,
          rotationSpeed: (Math.random() - 0.5) * 0.1,
        });
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter((particle) => {
        // Update position with some wobble
        particle.x += particle.vx + Math.sin(timestamp * 0.01 + particle.id) * 0.5;
        particle.y += particle.vy;
        particle.vy -= 0.03; // Upward acceleration
        particle.rotation += particle.rotationSpeed;
        
        // Reduce life faster as animation progresses
        const lifeDecay = 0.008 + fadeProgress * 0.015;
        particle.life -= lifeDecay;
        
        if (particle.life <= 0) return false;

        // Calculate alpha with global fade
        const alpha = particle.life * globalAlpha;
        if (alpha <= 0) return false;

        // Draw flame particle with glow
        ctx.save();
        ctx.translate(particle.x, particle.y);
        ctx.rotate(particle.rotation);
        
        // Outer glow
        const glowSize = particle.size * 2;
        const glowGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glowSize);
        glowGradient.addColorStop(0, `${particle.color}${Math.floor(alpha * 100).toString(16).padStart(2, '0')}`);
        glowGradient.addColorStop(0.5, `${particle.color}${Math.floor(alpha * 50).toString(16).padStart(2, '0')}`);
        glowGradient.addColorStop(1, "transparent");
        
        ctx.beginPath();
        ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
        ctx.fillStyle = glowGradient;
        ctx.fill();
        
        // Inner flame gradient
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, particle.size);
        gradient.addColorStop(0, `rgba(255, 255, 220, ${alpha})`);
        gradient.addColorStop(0.3, `${particle.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(0.7, `${particle.color}${Math.floor(alpha * 150).toString(16).padStart(2, '0')}`);
        gradient.addColorStop(1, "transparent");
        
        ctx.beginPath();
        ctx.arc(0, 0, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        ctx.restore();

        return true;
      });

      // Continue animation or complete
      if (fadeProgress < 1 && particlesRef.current.length > 0) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        setIsRendering(false);
        particlesRef.current = [];
        onComplete?.();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isVisible, duration, onComplete]);

  if (!isVisible && !isRendering) return null;

  return (
    <motion.canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[100]"
      style={{ mixBlendMode: "screen" }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    />
  );
};

export default FlameTrail;