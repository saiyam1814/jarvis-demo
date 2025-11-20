import React, { useEffect, useRef } from 'react';
import { DrawingPoint, AppMode } from '../types';

interface BackgroundTerminalProps {
  typedText: string;
  drawingPath: DrawingPoint[];
  cursorPos: { x: number; y: number };
  isDrawing: boolean;
  mode: AppMode;
  isMatrixActive: boolean;
  isSmiling: boolean;
  isProcessing: boolean;
  hologramText: string;
  rawLandmarks: any[];
}

class MatrixDrop {
  x: number;
  y: number;
  speed: number;
  text: string;
  color: string;
  
  constructor(w: number, isMatrix: boolean) {
    this.x = Math.random() * w;
    this.y = Math.random() * -100;
    this.speed = Math.random() * 5 + 5;
    this.color = isMatrix ? '#0F0' : '#0FF'; 
    this.text = this.generateChar(); 
  }

  generateChar() {
    const charCode = Math.floor(Math.random() * (126 - 33) + 33);
    return String.fromCharCode(charCode);
  }

  update(h: number) {
    this.y += this.speed;
    if (Math.random() < 0.05) {
      this.text = this.generateChar();
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = this.color;
    ctx.font = '16px "Share Tech Mono"';
    ctx.fillText(this.text, this.x, this.y);
  }
}

const BackgroundTerminal: React.FC<BackgroundTerminalProps> = ({ 
  typedText, 
  drawingPath, 
  cursorPos, 
  isDrawing,
  mode,
  isMatrixActive,
  isSmiling,
  isProcessing,
  hologramText,
  rawLandmarks
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const dropsRef = useRef<MatrixDrop[]>([]);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      rotationRef.current += 0.01;

      if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
      const W = canvas.width;
      const H = canvas.height;

      // 1. Clear
      if (mode === AppMode.MINECRAFT) {
        const gradient = ctx.createLinearGradient(0, 0, 0, H);
        gradient.addColorStop(0, '#6495ED'); 
        gradient.addColorStop(1, '#3b5998'); 
        ctx.fillStyle = gradient;
      } else {
        ctx.fillStyle = '#000000';
      }
      ctx.fillRect(0, 0, W, H);

      // 2. Grid
      ctx.strokeStyle = mode === AppMode.MINECRAFT ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 255, 255, 0.1)';
      ctx.lineWidth = 1;
      const gridSize = 60;
      for (let x = 0; x <= W; x += gridSize) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      }
      for (let y = 0; y <= H; y += gridSize) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
      }

      // 3. Rain Effects
      if (isMatrixActive || isSmiling) {
        const maxDrops = 200;
        if (dropsRef.current.length < maxDrops) {
             dropsRef.current.push(new MatrixDrop(W, isMatrixActive));
        }
        dropsRef.current.forEach((drop, index) => {
          drop.update(H);
          drop.draw(ctx);
          if (drop.y > H) dropsRef.current[index] = new MatrixDrop(W, isMatrixActive);
        });
      }

      // 4. Skeletons
      if (mode === AppMode.SKELETON && rawLandmarks && rawLandmarks.length > 0) {
         ctx.strokeStyle = '#FFFFFF';
         ctx.lineWidth = 3;
         ctx.lineCap = 'round';
         const connections = [
           [0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],
           [0,9],[9,10],[10,11],[11,12],[0,13],[13,14],[14,15],[15,16],
           [0,17],[17,18],[18,19],[19,20],[5,9],[9,13],[13,17]
         ];
         rawLandmarks.forEach((hand: any) => {
            for(let i=0; i<hand.length; i++) {
               const x = (1 - hand[i].x) * W; const y = hand[i].y * H;
               ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI*2); ctx.fillStyle='#ff00ff'; ctx.fill();
            }
            ctx.beginPath();
            connections.forEach(([start, end]) => {
               const p1 = hand[start]; const p2 = hand[end];
               ctx.moveTo((1 - p1.x) * W, p1.y * H); ctx.lineTo((1 - p2.x) * W, p2.y * H);
            });
            ctx.stroke();
         });
      }

      // 5. Drawing Path
      if (mode === AppMode.ACTIVE && drawingPath.length > 0) {
        ctx.shadowBlur = 20; ctx.shadowColor = '#00ffff';
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)'; ctx.lineWidth = 6;
        ctx.beginPath();
        let isFirst = true;
        for (const pt of drawingPath) {
           if (pt.isGap) { isFirst=true; continue; }
           if (isFirst) { ctx.moveTo(pt.x * W, pt.y * H); isFirst=false; }
           else { ctx.lineTo(pt.x * W, pt.y * H); }
        }
        ctx.stroke();
      }

      // 6. AI Processing Visuals
      if (isProcessing) {
          const cx = W/2;
          const cy = H/2;
          ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
          ctx.fillRect(cx - 150, cy - 50, 300, 100);
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 2;
          ctx.strokeRect(cx - 150, cy - 50, 300, 100);
          
          ctx.font = '20px "Share Tech Mono"';
          ctx.fillStyle = '#00ffff';
          ctx.textAlign = 'center';
          ctx.fillText("ANALYZING PATTERN...", cx, cy);
          
          // Loading bar
          const progress = (Date.now() % 1000) / 1000;
          ctx.fillStyle = '#00ffff';
          ctx.fillRect(cx - 130, cy + 20, 260 * progress, 4);
      }

      // 7. 2D Holograms (Fallback for 3D)
      if (!isProcessing && hologramText && mode === AppMode.ACTIVE) {
          const cx = W/2;
          const cy = H/2 - 100;
          const char = hologramText[0]?.toUpperCase();
          const size = 100;

          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate(rotationRef.current);
          
          ctx.strokeStyle = '#00ffff';
          ctx.lineWidth = 3;
          ctx.shadowBlur = 20;
          ctx.shadowColor = '#00ffff';

          // Draw Shape based on Char
          ctx.beginPath();
          if (char === 'A') {
              // Apple (Circle + Stem)
              ctx.arc(0, 0, size * 0.8, 0, Math.PI*2);
              ctx.moveTo(0, -size * 0.8);
              ctx.lineTo(size * 0.2, -size * 1.2);
              // Leaf
              ctx.moveTo(0, -size * 0.8);
              ctx.quadraticCurveTo(-size*0.4, -size*1.1, 0, -size*0.8);
          } else if (char === 'B') {
              // Box
              ctx.rect(-size/2, -size/2, size, size);
              // Inner box
              ctx.rect(-size/4, -size/4, size/2, size/2);
              // Connecting lines
              ctx.moveTo(-size/2, -size/2); ctx.lineTo(-size/4, -size/4);
              ctx.moveTo(size/2, -size/2); ctx.lineTo(size/4, -size/4);
              ctx.moveTo(size/2, size/2); ctx.lineTo(size/4, size/4);
              ctx.moveTo(-size/2, size/2); ctx.lineTo(-size/4, size/4);
          } else if (char === 'O') {
              // Orb
              ctx.arc(0, 0, size, 0, Math.PI*2);
              ctx.moveTo(size, 0);
              ctx.ellipse(0, 0, size, size * 0.4, 0, 0, Math.PI*2);
              ctx.moveTo(0, size);
              ctx.ellipse(0, 0, size * 0.4, size, 0, 0, Math.PI*2);
          } else if (char === 'I' || char === 'C') {
              // Cylinder / Tube
               ctx.ellipse(0, -size/2, size/2, size/6, 0, 0, Math.PI*2);
               ctx.moveTo(-size/2, -size/2);
               ctx.lineTo(-size/2, size/2);
               ctx.moveTo(size/2, -size/2);
               ctx.lineTo(size/2, size/2);
               ctx.ellipse(0, size/2, size/2, size/6, 0, 0, Math.PI*2);
          } else {
              // Generic Cube
              ctx.rect(-size/2, -size/2, size, size);
          }
          ctx.stroke();
          ctx.restore();

          // Label
          ctx.font = '30px "Rajdhani"';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.fillText(`IDENTIFIED: ${hologramText}`, cx, cy + size + 40);
      }

      // 8. Cursor
      if (mode === AppMode.ACTIVE) {
        const cx = cursorPos.x * W;
        const cy = cursorPos.y * H;
        ctx.strokeStyle = isDrawing ? '#ff00ff' : '#00ffff';
        ctx.shadowBlur = 0;
        ctx.beginPath(); ctx.arc(cx, cy, 15, 0, Math.PI*2); ctx.stroke();
        ctx.font = '12px "Share Tech Mono"';
        ctx.fillStyle = '#00ffff';
        ctx.fillText(`X:${Math.floor(cx)} Y:${Math.floor(cy)}`, cx + 20, cy - 20);
      }
      
      // 9. Buffer
      if (typedText) {
         ctx.font = '24px "Share Tech Mono"';
         ctx.fillStyle = '#008888';
         ctx.fillText(`INPUT_BUFFER: ${typedText}`, 50, H - 100);
      }
      
      ctx.font = '14px "Rajdhani"';
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.textAlign = 'center';
      ctx.fillText(`MODE: ${mode}`, W/2, H - 30);

      animationRef.current = requestAnimationFrame(render);
    };
    render();
    return () => cancelAnimationFrame(animationRef.current);
  }, [typedText, drawingPath, cursorPos, isDrawing, mode, isMatrixActive, isSmiling, isProcessing, hologramText, rawLandmarks]);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full z-0 bg-black" />;
};

export default BackgroundTerminal;