import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { HandGestureState, GestureType, CityData } from '../types';
import { soundService } from '../services/soundService';

// Augment JSX namespace to include Three.js elements
declare global {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      shaderMaterial: any;
      gridHelper: any;
    }
  }
}

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      ambientLight: any;
      pointLight: any;
      group: any;
      mesh: any;
      sphereGeometry: any;
      meshBasicMaterial: any;
      planeGeometry: any;
      shaderMaterial: any;
      gridHelper: any;
    }
  }
}

interface HolographicGlobeProps {
  gesture: HandGestureState;
  onCitySelect: (city: CityData | null) => void;
}

// Mock Data for cities
const CITIES: CityData[] = [
  { name: "NEW YORK", population: "8.4M", temp: "12°C", coordinates: [40.7128, -74.0060] },
  { name: "TOKYO", population: "13.9M", temp: "18°C", coordinates: [35.6762, 139.6503] },
  { name: "LONDON", population: "8.9M", temp: "9°C", coordinates: [51.5074, -0.1278] },
  { name: "DUBAI", population: "3.3M", temp: "32°C", coordinates: [25.2048, 55.2708] },
  { name: "SINGAPORE", population: "5.7M", temp: "28°C", coordinates: [1.3521, 103.8198] },
];

// Helper to convert Lat/Lon to Vector3
const latLonToVector3 = (lat: number, lon: number, radius: number) => {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = (radius * Math.sin(phi) * Math.sin(theta));
  const y = (radius * Math.cos(phi));
  return new THREE.Vector3(x, y, z);
};

const GlobeMesh: React.FC<{ gesture: HandGestureState; onSelect: (c: CityData) => void }> = ({ gesture, onSelect }) => {
  const groupRef = useRef<THREE.Group>(null);
  const [targetRotation, setTargetRotation] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1.5);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);

  // Interactive Logic
  useFrame((state, delta) => {
    if (groupRef.current) {
      // Idle Rotation
      if (gesture.type === GestureType.NONE || gesture.type === GestureType.OPEN_PALM) {
        groupRef.current.rotation.y += 0.002;
      }

      // Gesture Control: Rotate
      if (gesture.type === GestureType.POINTING || gesture.type === GestureType.OPEN_PALM) {
         // Map hand X position (0-1) to rotation speed
         const rotationSpeed = (gesture.position.x - 0.5) * 0.05;
         groupRef.current.rotation.y += rotationSpeed;
         
         const tiltSpeed = (gesture.position.y - 0.5) * 0.05;
         groupRef.current.rotation.x += tiltSpeed;
      }

      // Gesture Control: Zoom (Pinch)
      if (gesture.type === GestureType.PINCH && gesture.pinchDistance) {
         // Inverse pinch: smaller distance = zoom out, larger = zoom in logic is tricky directly.
         // Let's say if pinch distance < 0.05, we zoom in.
         const targetZ = 3.5 - (gesture.pinchDistance * 5);
         const clampedZ = Math.max(2, Math.min(6, targetZ));
         state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, clampedZ, 0.1);
      } else {
         // Return to base zoom
         state.camera.position.z = THREE.MathUtils.lerp(state.camera.position.z, 4.5, 0.05);
      }
    }
  });

  // City Markers
  const cityMarkers = useMemo(() => {
    return CITIES.map((city) => {
      const pos = latLonToVector3(city.coordinates[0], city.coordinates[1], 1.55);
      return (
        <group key={city.name} position={pos}>
          <mesh 
            onClick={() => onSelect(city)}
            onPointerOver={() => { setHoveredCity(city.name); soundService.playHoverSound(); }}
            onPointerOut={() => setHoveredCity(null)}
          >
            <sphereGeometry args={[0.04, 16, 16]} />
            <meshBasicMaterial color={hoveredCity === city.name ? "#ff9900" : "#00ffff"} />
          </mesh>
          {hoveredCity === city.name && (
            <mesh position={[0.1, 0.1, 0]}>
               <planeGeometry args={[0.5, 0.2]} />
               <meshBasicMaterial color="#001133" transparent opacity={0.8} side={THREE.DoubleSide} />
            </mesh>
          )}
        </group>
      );
    });
  }, [hoveredCity, onSelect]);

  return (
    <group ref={groupRef}>
      {/* Wireframe Globe */}
      <mesh>
        <sphereGeometry args={[1.5, 32, 32]} />
        <meshBasicMaterial 
          color="#003366" 
          wireframe 
          transparent 
          opacity={0.15} 
        />
      </mesh>

      {/* Glowing Atmosphere */}
      <mesh>
        <sphereGeometry args={[1.48, 64, 64]} />
        <shaderMaterial
          transparent
          side={THREE.BackSide}
          uniforms={{
             c: { value: 1.0 },
             p: { value: 3.0 },
             glowColor: { value: new THREE.Color(0x00ffff) },
             viewVector: { value: new THREE.Vector3(0, 0, 4) }
          }}
          vertexShader={`
            uniform vec3 viewVector;
            uniform float c;
            uniform float p;
            varying float intensity;
            void main() {
              vec3 vNormal = normalize( normalMatrix * normal );
              vec3 vNormel = normalize( normalMatrix * viewVector );
              intensity = pow( c - dot(vNormal, vNormel), p );
              gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
            }
          `}
          fragmentShader={`
            uniform vec3 glowColor;
            varying float intensity;
            void main() {
              vec3 glow = glowColor * intensity;
              gl_FragColor = vec4( glow, 1.0 );
            }
          `}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Grid Lines */}
      <gridHelper args={[30, 30, 0x0044aa, 0x002244]} position={[0, -1.6, 0]} />
      
      {cityMarkers}
    </group>
  );
};

const HolographicGlobe: React.FC<HolographicGlobeProps> = ({ gesture, onCitySelect }) => {
  return (
    <div className="w-full h-full absolute top-0 left-0 pointer-events-auto z-10">
      <Canvas camera={{ position: [0, 0, 4.5], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffff" />
        <GlobeMesh gesture={gesture} onSelect={onCitySelect} />
      </Canvas>
    </div>
  );
};

export default HolographicGlobe;