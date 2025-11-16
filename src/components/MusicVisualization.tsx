"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

interface AudioFeatures {
  energy: number; // 0-1
  tempo: number; // BPM
  valence: number; // 0-1 (happiness)
  danceability: number; // 0-1
  acousticness: number; // 0-1
}

interface VisualizationProps {
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
}

function ParticleField({ audioFeatures, isPlaying }: VisualizationProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 2000;

  // Create particle positions
  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const radius = 10 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  // Animation based on audio features
  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const valence = audioFeatures?.valence || 0.5;
    const tempo = audioFeatures?.tempo || 120;

    // Rotate based on tempo (BPM)
    const rotationSpeed = (tempo / 120) * 0.3;
    pointsRef.current.rotation.y = time * rotationSpeed;
    pointsRef.current.rotation.x = time * rotationSpeed * 0.5;

    // Pulsate based on energy
    const scale = 1 + Math.sin(time * energy * 2) * 0.2 * energy;
    pointsRef.current.scale.set(scale, scale, scale);

    // Update particle positions for wave effect
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Add wave motion based on valence (happiness)
      const wave = Math.sin(time * 2 + i * 0.01) * valence * 2;
      positionAttribute.setXYZ(i, x + wave, y + wave, z + wave);
    }
    positionAttribute.needsUpdate = true;
  });

  // Color based on valence (happiness)
  const color = useMemo(() => {
    const valence = audioFeatures?.valence || 0.5;
    // Blue (sad) to Yellow/Orange (happy)
    const hue = valence * 0.15; // 0 (red) to 0.15 (yellow-orange)
    return new THREE.Color().setHSL(0.6 - hue, 1, 0.5 + valence * 0.2);
  }, [audioFeatures?.valence]);

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
        size={0.15}
        color={color}
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function CenterSphere({ audioFeatures, isPlaying }: VisualizationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const danceability = audioFeatures?.danceability || 0.5;

    // Rotate
    meshRef.current.rotation.y += 0.01 * danceability;
    meshRef.current.rotation.x += 0.005 * danceability;

    // Pulsate based on energy
    const scale = 1 + Math.sin(time * 3) * 0.3 * energy;
    meshRef.current.scale.set(scale, scale, scale);

    // Color shift
    if (materialRef.current) {
      const hue = (time * 0.1) % 1;
      materialRef.current.color.setHSL(hue, 1, 0.5);
      materialRef.current.emissive.setHSL(hue, 1, 0.3 * energy);
    }
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[2, 1]} />
      <meshStandardMaterial
        ref={materialRef}
        wireframe
        emissive="#ff00ff"
        emissiveIntensity={0.5}
      />
    </mesh>
  );
}

function WireframeRings({ audioFeatures, isPlaying }: VisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const acousticness = audioFeatures?.acousticness || 0.5;

    // Rotate in opposite direction
    groupRef.current.rotation.z = time * 0.5 * (1 - acousticness);
    groupRef.current.rotation.x = Math.sin(time * 0.5) * 0.5;
  });

  return (
    <group ref={groupRef}>
      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[8, 0.1, 16, 100]} />
        <meshBasicMaterial color="#00ffff" wireframe />
      </mesh>
      <mesh rotation={[0, Math.PI / 2, 0]}>
        <torusGeometry args={[8, 0.1, 16, 100]} />
        <meshBasicMaterial color="#ff00ff" wireframe />
      </mesh>
      <mesh>
        <torusGeometry args={[8, 0.1, 16, 100]} />
        <meshBasicMaterial color="#ffff00" wireframe />
      </mesh>
    </group>
  );
}

export default function MusicVisualization({
  audioFeatures,
  isPlaying,
}: VisualizationProps) {
  return (
    <div style={{ 
      position: "fixed", 
      top: 0, 
      left: 0, 
      width: "100vw", 
      height: "100vh", 
      zIndex: 0 
    }}>
      <Canvas
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ background: "radial-gradient(circle, #0a0a0a 0%, #000000 100%)" }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} color="#ff00ff" intensity={0.5} />
        
        <ParticleField audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <CenterSphere audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <WireframeRings audioFeatures={audioFeatures} isPlaying={isPlaying} />
        
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          autoRotate={isPlaying}
          autoRotateSpeed={0.5}
        />
      </Canvas>
    </div>
  );
}

