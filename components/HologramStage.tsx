import React, { useRef, Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { AppMode } from '../types';

// Fix for missing JSX types
declare global {
  namespace JSX {
    interface IntrinsicElements {
      group: any;
      mesh: any;
      planeGeometry: any;
      meshStandardMaterial: any;
      boxGeometry: any;
      ambientLight: any;
      pointLight: any;
      meshBasicMaterial: any;
    }
  }
}

interface HologramStageProps {
  text: string;
  mode: AppMode;
}

const MinecraftWorld: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame(() => {
     if(groupRef.current) {
       groupRef.current.rotation.y += 0.005;
     }
  });

  return (
    <group ref={groupRef}>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI/2, 0, 0]} position={[0, -3, 0]}>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#44aa44" wireframe={false} />
      </mesh>
      
      {/* Floating Block 1 (Dirt) */}
      <mesh position={[-2, 0, 0]}>
         <boxGeometry args={[1.5, 1.5, 1.5]} />
         <meshStandardMaterial color="#8B4513" />
      </mesh>
      
      {/* Floating Block 2 (Stone) */}
      <mesh position={[2, 1, 1]}>
         <boxGeometry args={[1.5, 1.5, 1.5]} />
         <meshStandardMaterial color="#777777" />
      </mesh>
      
      {/* Floating Block 3 (Gold) */}
      <mesh position={[0, 2, -2]}>
         <boxGeometry args={[1.5, 1.5, 1.5]} />
         <meshStandardMaterial color="#FFD700" roughness={0.3} metalness={0.8} />
      </mesh>

      {/* Sun */}
      <mesh position={[5, 5, -5]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#FFFF00" />
      </mesh>
    </group>
  );
};

const HologramStage: React.FC<HologramStageProps> = ({ text, mode }) => {
  // Only render in Minecraft Mode
  if (mode !== AppMode.MINECRAFT) return null;

  return (
    <div className="absolute inset-0 z-10 pointer-events-none">
      <Canvas camera={{ position: [0, 2, 8], fov: 60 }} gl={{ alpha: true }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} color="#ffffff" intensity={1} />
        <Suspense fallback={null}>
           <MinecraftWorld />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default HologramStage;