import { useEffect, useRef } from "react";

interface RosePetalsAnimationProps {
  isVisible: boolean;
  onComplete: () => void;
}

interface Petal {
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
  type: "petal" | "sparkle" | "heart";
}

const RosePetalsAnimation = ({ isVisible, onComplete }: RosePetalsAnimationProps) => {
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

    // Rose color palette
    const petalColors = [
      "#E11D48", // Rose red
      "#FB7185", // Light pink
      "#BE123C", // Deep rose
      "#FDA4AF", // Soft pink
      "#F43F5E", // Bright rose
      "#FFC0CB", // Pink
    ];

    // Create petals
    const petals: Petal[] = [];
    const numPetals = 50;

    for (let i = 0; i < numPetals; i++) {
      const angle = (Math.PI * 2 * i) / numPetals + Math.random() * 0.5;
      const speed = 6 + Math.random() * 10;
      
      petals.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2, // Slight upward bias
        size: 12 + Math.random() * 20,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 0.15,
        opacity: 1,
        color: petalColors[Math.floor(Math.random() * petalColors.length)],
        scale: 0,
        type: "petal",
      });
    }

    // Add hearts
    const numHearts = 15;
    for (let i = 0; i < numHearts; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 4 + Math.random() * 8;
      
      petals.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: 10 + Math.random() * 15,
        rotation: 0,
        rotationSpeed: (Math.random() - 0.5) * 0.1,
        opacity: 1,
        color: petalColors[Math.floor(Math.random() * 3)],
        scale: 0,
        type: "heart",
      });
    }

    // Add sparkles
    const numSparkles = 30;
    for (let i = 0; i < numSparkles; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 12;
      
      petals.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 4,
        rotation: 0,
        rotationSpeed: 0,
        opacity: 1,
        color: "#FFFFFF",
        scale: 0,
        type: "sparkle",
      });
    }

    const gravity = 0.12;
    const friction = 0.985;
    let frame = 0;
    const maxFrames = 100;

    // Draw petal shape (curved teardrop)
    const drawPetal = (x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      // Outer glow
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.5;
      
      // Draw petal shape using bezier curves
      ctx.beginPath();
      ctx.moveTo(0, -size / 2);
      ctx.bezierCurveTo(
        size / 2, -size / 3,
        size / 2, size / 3,
        0, size / 2
      );
      ctx.bezierCurveTo(
        -size / 2, size / 3,
        -size / 2, -size / 3,
        0, -size / 2
      );
      ctx.closePath();
      
      // Gradient fill
      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
      gradient.addColorStop(0, color);
      gradient.addColorStop(0.7, color);
      gradient.addColorStop(1, adjustColor(color, -30));
      
      ctx.fillStyle = gradient;
      ctx.fill();
      
      // Add vein line
      ctx.beginPath();
      ctx.moveTo(0, -size / 3);
      ctx.lineTo(0, size / 3);
      ctx.strokeStyle = adjustColor(color, -40);
      ctx.lineWidth = 0.5;
      ctx.globalAlpha = opacity * 0.5;
      ctx.stroke();
      
      ctx.restore();
    };

    // Draw heart shape
    const drawHeart = (x: number, y: number, size: number, rotation: number, color: string, opacity: number) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rotation);
      ctx.globalAlpha = opacity;
      
      ctx.shadowColor = color;
      ctx.shadowBlur = size * 0.6;
      
      ctx.beginPath();
      const topCurveHeight = size * 0.3;
      ctx.moveTo(0, topCurveHeight);
      // Left curve
      ctx.bezierCurveTo(
        -size / 2, -topCurveHeight,
        -size, topCurveHeight / 2,
        0, size
      );
      // Right curve
      ctx.moveTo(0, topCurveHeight);
      ctx.bezierCurveTo(
        size / 2, -topCurveHeight,
        size, topCurveHeight / 2,
        0, size
      );
      ctx.closePath();
      
      ctx.fillStyle = color;
      ctx.fill();
      
      ctx.restore();
    };

    // Draw sparkle
    const drawSparkle = (x: number, y: number, size: number, opacity: number) => {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.shadowColor = "#FFD700";
      ctx.shadowBlur = size * 3;
      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();
      ctx.restore();
    };

    // Helper to darken/lighten color
    function adjustColor(hex: string, amount: number): string {
      const num = parseInt(hex.replace("#", ""), 16);
      const r = Math.min(255, Math.max(0, (num >> 16) + amount));
      const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
      const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
      return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
    }

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Initial burst scale animation
      const burstProgress = Math.min(frame / 8, 1);
      
      petals.forEach((petal) => {
        // Scale up effect at start
        petal.scale = Math.min(petal.scale + 0.15, 1);
        
        // Update position
        petal.x += petal.vx;
        petal.y += petal.vy;
        petal.vy += gravity;
        petal.vx *= friction;
        petal.vy *= friction;
        petal.rotation += petal.rotationSpeed;
        
        // Flutter effect for petals
        if (petal.type === "petal") {
          petal.vx += Math.sin(frame * 0.1 + petal.rotation) * 0.1;
        }
        
        // Fade out
        if (frame > maxFrames * 0.5) {
          petal.opacity -= 0.02;
        }
        
        // Draw
        if (petal.opacity > 0) {
          const scaledSize = petal.size * petal.scale * burstProgress;
          
          if (petal.type === "petal") {
            drawPetal(
              petal.x,
              petal.y,
              scaledSize,
              petal.rotation,
              petal.color,
              petal.opacity
            );
          } else if (petal.type === "heart") {
            drawHeart(
              petal.x,
              petal.y,
              scaledSize,
              petal.rotation,
              petal.color,
              petal.opacity
            );
          } else {
            drawSparkle(petal.x, petal.y, scaledSize, petal.opacity);
          }
        }
      });

      frame++;
      
      if (frame < maxFrames && petals.some(p => p.opacity > 0)) {
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

export default RosePetalsAnimation;
