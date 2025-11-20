
import React, { useRef, useEffect } from 'react';
import { FaceLandmarkerResult } from '@mediapipe/tasks-vision';

interface ExosuitOverlayProps {
  faceResult: FaceLandmarkerResult | null;
  width: number;
  height: number;
}

const ExosuitOverlay: React.FC<ExosuitOverlayProps> = ({ faceResult, width, height }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rotationRef = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.clearRect(0, 0, width, height);

    if (!faceResult || !faceResult.faceLandmarks || faceResult.faceLandmarks.length === 0) {
      return;
    }

    const landmarks = faceResult.faceLandmarks[0];
    
    // Helper
    const getPt = (idx: number) => ({
      x: landmarks[idx].x * width,
      y: landmarks[idx].y * height
    });

    // Update Rotation for animations
    rotationRef.current += 0.02;

    // --- SINGLE EYE MONOCLE (LEFT EYE) ---
    // Landmarks: 468 is Left Iris Center (if using iris model), but standard face mesh uses:
    // 33 (inner corner), 133 (outer corner), 159 (upper lid), 145 (lower lid) for LEFT eye region.
    // Center approx:
    const leftEyeInner = getPt(33);
    const leftEyeOuter = getPt(133);
    
    const centerX = (leftEyeInner.x + leftEyeOuter.x) / 2;
    const centerY = (leftEyeInner.y + leftEyeOuter.y) / 2;
    
    // Calculate radius based on eye width
    const eyeWidth = Math.hypot(leftEyeOuter.x - leftEyeInner.x, leftEyeOuter.y - leftEyeInner.y);
    const radius = eyeWidth * 1.2;

    ctx.strokeStyle = '#00ffff';
    ctx.shadowBlur = 5;
    ctx.shadowColor = '#00ffff';
    ctx.lineWidth = 2;

    // 1. Main Ring
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();

    // 2. Rotating Dashed Ring
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotationRef.current);
    ctx.beginPath();
    ctx.setLineDash([5, 10]);
    ctx.arc(0, 0, radius * 1.4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 3. Counter-Rotating Ring
    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(-rotationRef.current * 1.5);
    ctx.beginPath();
    ctx.setLineDash([2, 15]);
    ctx.strokeStyle = '#ff00ff'; // Accent color
    ctx.arc(0, 0, radius * 1.2, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    // 4. Crosshair
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(centerX - radius * 2, centerY);
    ctx.lineTo(centerX + radius * 2, centerY);
    ctx.moveTo(centerX, centerY - radius * 2);
    ctx.lineTo(centerX, centerY + radius * 2);
    ctx.stroke();

    // 5. Data Connection to Ear/Temple
    // Landmark 127 is near the cheekbone/temple
    const temple = getPt(127);
    ctx.beginPath();
    ctx.moveTo(centerX + radius, centerY); // Start right of eye
    ctx.lineTo(temple.x, temple.y);
    ctx.lineTo(temple.x + 20, temple.y - 10); // Artifical endpoint
    
    // Draw small node at temple
    ctx.fillStyle = '#00ffff';
    ctx.fillRect(temple.x - 2, temple.y - 2, 4, 4);
    ctx.stroke();

    // 6. Text Data near Eye
    ctx.font = '8px "Share Tech Mono"';
    ctx.fillStyle = '#00ffff';
    ctx.fillText(`TARGET: [LOCKED]`, centerX + radius + 5, centerY - 10);
    ctx.fillText(`DIST: ${(1/eyeWidth).toFixed(1)}m`, centerX + radius + 5, centerY);

  }, [faceResult, width, height]);

  return (
    <canvas 
      ref={canvasRef} 
      width={width}
      height={height}
      // Mirroring applied via CSS parent or handled here if needed. 
      // Since the video is mirrored in CSS, we mirror this canvas too in the parent.
      className="absolute top-0 left-0 pointer-events-none"
    />
  );
};

export default ExosuitOverlay;
