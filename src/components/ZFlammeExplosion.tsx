import { useEffect, useRef } from "react";

interface ZFlammeExplosionProps {
  isVisible: boolean;
  onComplete: () => void;
}

interface Flame {
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

const ZFlammeExplosion = ({ isVisible, onComplete }: ZFlammeExplosionProps) => {
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

    // Flame colors - orange, red, yellow theme
    const colors = [
      "#FF6B00", // Deep Orange
      "#FF8C00", // Dark Orange
      "#FFA500", // Orange
      "#FF4500", // Red Orange
      "#FFD700", // Gold
      "#FF5722", // Flame Red
      "#FFEB3B", // Yellow
    ];

    // Create flames
    const flames: Flame[] = [];
    const numFlames = 60;

    for (let i = 0; i < numFlames; i++) {
      const angle = (Math.PI * 2 * i) / numFlames + Math.random() * 0.5;
      const speed = 8 + Math.random() * 12;
      
      flames.push({
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
      
      flames.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3 + Math.random() * 5,
        rotation: 0,
        rotationSpeed: 0,
        opacity: 1,
        color: "#FFEB3B",
        scale: 0,
      });
    }

    const gravity = 0.15;
    const friction = 0.98;
    let frame = 0;
    const maxFrames = 90;

    // Draw flame shape
    const drawFlame = (x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 1.2;
      
      // Draw flame teardrop shape
      ctx.beginPath();
      ctx.moveTo(0, -size);
      ctx.bezierCurveTo(size * 0.8, -size * 0.3, size * 0.6, size * 0.5, 0, size);
      ctx.bezierCurveTo(-size * 0.6, size * 0.5, -size * 0.8, -size * 0.3, 0, -size);
      ctx.closePath();
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, "#FFFFFF");
      gradient.addColorStop(0.3, "#FFEB3B");
      gradient.addColorStop(0.6, color);
      gradient.addColorStop(1, "rgba(255, 69, 0, 0.5)");
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      ctx.restore();
    };

    // Draw sparkle (small circle)
    const drawSparkle = (x: number, y: number, size: number, opacity: number, color: string) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 2;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.restore();
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Initial burst scale animation
      const burstProgress = Math.min(frame / 10, 1);
      
      flames.forEach((flame, index) => {
        // Scale up effect at start
        flame.scale = Math.min(flame.scale + 0.2, 1);
        
        // Update position
        flame.x += flame.vx;
        flame.y += flame.vy;
        flame.vy += gravity;
        flame.vx *= friction;
        flame.vy *= friction;
        flame.rotation += flame.rotationSpeed;
        
        // Fade out
        if (frame > maxFrames * 0.5) {
          flame.opacity -= 0.025;
        }
        
        // Draw
        if (flame.opacity > 0) {
          if (index < numFlames) {
            drawFlame(
              flame.x,
              flame.y,
              flame.size * flame.scale * burstProgress,
              flame.rotation,
              flame.color,
              flame.opacity
            );
          } else {
            drawSparkle(flame.x, flame.y, flame.size * flame.scale, flame.opacity, flame.color);
          }
        }
      });

      frame++;
      
      if (frame < maxFrames && flames.some(f => f.opacity > 0)) {
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

export default ZFlammeExplosion;