import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

interface SuperLikeExplosionProps {
  isVisible: boolean;
  onComplete: () => void;
}

interface Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  color: string;
  scale: number;
}

const SuperLikeExplosion = ({ isVisible, onComplete }: SuperLikeExplosionProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isVisible) return;

    // Create canvas
    const canvas = document.createElement("canvas");
    canvas.style.position = "fixed";
    canvas.style.top = "0";
    canvas.style.left = "0";
    canvas.style.width = "100vw";
    canvas.style.height = "100vh";
    canvas.style.pointerEvents = "none";
    canvas.style.zIndex = "9998";
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    document.body.appendChild(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext("2d")!;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Star colors - gold and blue theme
    const colors = [
      "#FFD700", // Gold
      "#FFC107", // Amber
      "#FFEB3B", // Yellow
      "#4FC3F7", // Light blue
      "#2196F3", // Blue
      "#00BCD4", // Cyan
      "#FFFFFF", // White
    ];

    // Create stars
    const stars: Star[] = [];
    const numStars = 60;

    for (let i = 0; i < numStars; i++) {
      const angle = (Math.PI * 2 * i) / numStars + Math.random() * 0.5;
      const speed = 8 + Math.random() * 12;
      
      stars.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 8 + Math.random() * 16,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.3,
        opacity: 1,
        color: colors[Math.floor(Math.random() * colors.length)],
        scale: 0,
      });
    }

    // Add some sparkles
    const numSparkles = 40;
    for (let i = 0; i < numSparkles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      
      stars.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        rotation: 0,
        rotationSpeed: 0,
        opacity: 1,
        color: "#FFFFFF",
        scale: 0,
      });
    }

    const gravity = 0.15;
    const friction = 0.98;
    let frame = 0;
    const maxFrames = 90;

    // Draw star shape
    const drawStar = (x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.8;
      
      ctx.beginPath();
      const spikes = 4;
      const outerRadius = size;
      const innerRadius = size * 0.4;
      
      for (let i = 0; i < spikes * 2; i++) {
        const radius = i % 2 === 0 ? outerRadius : innerRadius;
        const angle = (Math.PI * i) / spikes - Math.PI / 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        
        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      
      ctx.closePath();
      ctx.fillStyle = color;
      ctx.fill();
      
      // Add inner bright core
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      
      ctx.restore();
    };

    // Draw sparkle (small circle)
    const drawSparkle = (x: number, y: number, size: number, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowColor = "#FFFFFF";
      ctx.shadowBlur = size * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Initial burst scale animation
      const burstProgress = Math.min(frame / 10, 1);
      
      stars.forEach((star, index) => {
        // Scale up effect at start
        star.scale = Math.min(star.scale + 0.2, 1);
        
        // Update position
        star.x += star.vx;
        star.y += star.vy;
        star.vy += gravity;
        star.vx *= friction;
        star.vy *= friction;
        star.rotation += star.rotationSpeed;
        
        // Fade out
        if (frame > maxFrames * 0.5) {
          star.opacity -= 0.025;
        }
        
        // Draw
        if (star.opacity > 0) {
          if (index < numStars) {
            drawStar(
              star.x,
              star.y,
              star.size * star.scale * burstProgress,
              star.rotation,
              star.color,
              star.opacity
            );
          } else {
            drawSparkle(star.x, star.y, star.size * star.scale, star.opacity);
          }
        }
      });

      frame++;
      
      if (frame < maxFrames && stars.some(s => s.opacity > 0)) {
        animationRef.current = requestAnimationFrame(animate);
      } else {
        // Cleanup
        if (canvasRef.current) {
          document.body.removeChild(canvasRef.current);
          canvasRef.current = null;
        }
        onComplete();
      }
    };

    // Start animation
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (canvasRef.current && document.body.contains(canvasRef.current)) {
        document.body.removeChild(canvasRef.current);
        canvasRef.current = null;
      }
    };
  }, [isVisible, onComplete]);

  return null;
};

export default SuperLikeExplosion;
