"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface VisualizationProps {
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
}

// Recursive fractal tree structure
function FractalBranch({
  position,
  rotation,
  scale,
  depth,
  audioFeatures,
  isPlaying,
  time,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  scale: number;
  depth: number;
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
  time: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame(() => {
    if (!meshRef.current || !isPlaying) return;
    
    const energy = audioFeatures?.energy || 0.5;
    
    // Subtle rotation based on depth
    meshRef.current.rotation.z = Math.sin(time * 0.5 + depth) * 0.2 * energy;
  });

  if (depth > 5) return null;

  const valence = audioFeatures?.valence || 0.5;
  const hue = (depth * 0.15 + valence * 0.3 + time * 0.05) % 1;
  const color = new THREE.Color().setHSL(hue, 1, 0.5);

  return (
    <group position={position} rotation={rotation}>
      <mesh ref={meshRef}>
        <cylinderGeometry args={[scale * 0.1, scale * 0.15, scale, 6]} />
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={0.5}
          wireframe
        />
      </mesh>

      {/* Recursive branches */}
      <FractalBranch
        position={[0, scale * 0.8, 0]}
        rotation={[0, 0, Math.PI / 6]}
        scale={scale * 0.7}
        depth={depth + 1}
        audioFeatures={audioFeatures}
        isPlaying={isPlaying}
        time={time}
      />
      <FractalBranch
        position={[0, scale * 0.8, 0]}
        rotation={[0, 0, -Math.PI / 6]}
        scale={scale * 0.7}
        depth={depth + 1}
        audioFeatures={audioFeatures}
        isPlaying={isPlaying}
        time={time}
      />
      <FractalBranch
        position={[0, scale * 0.8, 0]}
        rotation={[0, Math.PI / 3, 0]}
        scale={scale * 0.65}
        depth={depth + 1}
        audioFeatures={audioFeatures}
        isPlaying={isPlaying}
        time={time}
      />
    </group>
  );
}

function FractalTree({ audioFeatures, isPlaying }: VisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);
  const timeRef = useRef(0);

  useFrame((state) => {
    if (!groupRef.current) return;
    
    timeRef.current = state.clock.getElapsedTime();
    
    if (isPlaying) {
      const tempo = audioFeatures?.tempo || 120;
      const rotationSpeed = (tempo / 120) * 0.2;
      groupRef.current.rotation.y += rotationSpeed * 0.01;
      
      const energy = audioFeatures?.energy || 0.5;
      const breathe = 1 + Math.sin(timeRef.current * 2) * 0.1 * energy;
      groupRef.current.scale.set(breathe, breathe, breathe);
    }
  });

  return (
    <group ref={groupRef}>
      <FractalBranch
        position={[0, -8, 0]}
        rotation={[0, 0, 0]}
        scale={3}
        depth={0}
        audioFeatures={audioFeatures}
        isPlaying={isPlaying}
        time={timeRef.current}
      />
    </group>
  );
}

function MandelboxSphere({ audioFeatures, isPlaying }: VisualizationProps) {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (!meshRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const danceability = audioFeatures?.danceability || 0.5;

    meshRef.current.rotation.x = time * 0.3 * danceability;
    meshRef.current.rotation.y = time * 0.2 * danceability;

    const scale = 1.5 + Math.sin(time * 3) * 0.3 * energy;
    meshRef.current.scale.set(scale, scale, scale);
  });

  const valence = audioFeatures?.valence || 0.5;
  const color = new THREE.Color().setHSL(0.8 - valence * 0.3, 1, 0.5);

  return (
    <mesh ref={meshRef}>
      <dodecahedronGeometry args={[4, 2]} />
      <meshStandardMaterial
        color={color}
        emissive={color}
        emissiveIntensity={0.6}
        wireframe
      />
    </mesh>
  );
}

function SpiralParticles({ audioFeatures, isPlaying }: VisualizationProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 1000;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const t = (i / particleCount) * Math.PI * 8;
      const radius = 15 * (i / particleCount);
      
      positions[i3] = radius * Math.cos(t);
      positions[i3 + 1] = (i / particleCount) * 30 - 15;
      positions[i3 + 2] = radius * Math.sin(t);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const tempo = audioFeatures?.tempo || 120;
    
    pointsRef.current.rotation.y = time * (tempo / 120) * 0.3;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.2}
        color="#00ffff"
        transparent
        opacity={0.6}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function FractalVisualization({
  audioFeatures,
  isPlaying,
}: VisualizationProps) {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 25], fov: 75 }}
        style={{ background: "radial-gradient(circle, #1a0033 0%, #000000 100%)" }}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#ff00ff" />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#00ffff" />

        <FractalTree audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <MandelboxSphere audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <SpiralParticles audioFeatures={audioFeatures} isPlaying={isPlaying} />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          autoRotate={isPlaying}
          autoRotateSpeed={0.3}
        />
      </Canvas>
    </div>
  );
}

