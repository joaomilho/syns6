"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SyncedAudioData } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import Lyrics3D from "./Lyrics3D";

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface VisualizationProps {
  audioFeatures?: AudioFeatures | null;
  isPlaying: boolean;
  syncedData?: SyncedAudioData | null;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  micData?: MicrophoneData;
}

// Morphing blob with shader-like color effects
function PsychedelicBlob({ audioFeatures, isPlaying }: VisualizationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const danceability = audioFeatures?.danceability || 0.5;

    // Morph the geometry
    const geometry = meshRef.current.geometry;
    const positionAttribute = geometry.attributes.position;

    for (let i = 0; i < positionAttribute.count; i++) {
      const x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      const distance = Math.sqrt(x * x + y * y + z * z);
      const wave = Math.sin(distance * 0.5 + time * 2) * energy * 2;

      positionAttribute.setXYZ(
        i,
        x + Math.sin(time + y) * wave * 0.1,
        y + Math.cos(time + x) * wave * 0.1,
        z + Math.sin(time + x + y) * wave * 0.1
      );
    }
    positionAttribute.needsUpdate = true;

    // Rotate
    meshRef.current.rotation.x = time * 0.2 * danceability;
    meshRef.current.rotation.y = time * 0.3 * danceability;

    // Color shift
    const hue = (time * 0.2) % 1;
    materialRef.current.color.setHSL(hue, 1, 0.5);
    materialRef.current.emissive.setHSL((hue + 0.5) % 1, 1, 0.4 * energy);
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[5, 4]} />
      <meshStandardMaterial ref={materialRef} color="#ff00ff" emissive="#ff00ff" />
    </mesh>
  );
}

// Kaleidoscope effect with rotating planes
function KaleidoscopePlanes({ audioFeatures, isPlaying }: VisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current) return;

    const time = state.clock.getElapsedTime();
    const tempo = audioFeatures?.tempo || 120;

    groupRef.current.rotation.z = time * (tempo / 120) * 0.5;
  });

  const planeCount = 8;
  const planes = useMemo(() => {
    return Array.from({ length: planeCount }, (_, i) => {
      const angle = (i / planeCount) * Math.PI * 2;
      return {
        rotation: [0, 0, angle] as [number, number, number],
        hue: i / planeCount,
      };
    });
  }, []);

  return (
    <group ref={groupRef}>
      {planes.map((plane, i) => (
        <AnimatedPlane
          key={i}
          rotation={plane.rotation}
          hue={plane.hue}
          audioFeatures={audioFeatures || null}
          isPlaying={isPlaying}
          index={i}
        />
      ))}
    </group>
  );
}

function AnimatedPlane({
  rotation,
  hue,
  audioFeatures,
  isPlaying,
  index,
}: {
  rotation: [number, number, number];
  hue: number;
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
  index: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !materialRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const valence = audioFeatures?.valence || 0.5;

    // Pulsate
    const scale = 1 + Math.sin(time * 2 + index) * 0.3 * energy;
    meshRef.current.scale.set(scale, scale, 1);

    // Color cycle
    const currentHue = (hue + time * 0.1 + valence * 0.2) % 1;
    materialRef.current.color.setHSL(currentHue, 1, 0.5);
    materialRef.current.opacity = 0.3 + Math.sin(time + index) * 0.2;
  });

  return (
    <mesh ref={meshRef} rotation={rotation}>
      <planeGeometry args={[20, 20, 32, 32]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#ff00ff"
        side={THREE.DoubleSide}
        transparent
        opacity={0.3}
        wireframe
      />
    </mesh>
  );
}

// Spiraling liquid-like particles
function LiquidParticles({ audioFeatures, isPlaying }: VisualizationProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 3000;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const radius = 8 + Math.random() * 12;

      positions[i3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = radius * Math.cos(phi);
    }
    return positions;
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const valence = audioFeatures?.valence || 0.5;

    const positionAttribute = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Liquid flow effect
      const flow = Math.sin(time * 2 + i * 0.01) * energy * 3;
      const twist = time * valence;

      const newX = x * Math.cos(twist) - z * Math.sin(twist) + flow * 0.1;
      const newY = y + Math.sin(time * 3 + i * 0.02) * valence * 2;
      const newZ = x * Math.sin(twist) + z * Math.cos(twist);

      positionAttribute.setXYZ(i, newX, newY, newZ);
    }

    positionAttribute.needsUpdate = true;

    // Color shift
    const material = pointsRef.current.material as THREE.PointsMaterial;
    const hue = (time * 0.15) % 1;
    material.color.setHSL(hue, 1, 0.6);
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={particleCount}
          array={positions}
          itemSize={3}
          args={[positions, 3]}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.1}
        color="#ff00ff"
        transparent
        opacity={0.8}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function PsychedelicVisualization({
  audioFeatures,
  isPlaying,
  syncedData,
  lyrics,
  currentTimeMs,
  micData,
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
        camera={{ position: [0, 0, 30], fov: 75 }}
        style={{ background: "radial-gradient(circle, #330033 0%, #000000 100%)" }}
      >
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff00ff" />
        <pointLight position={[-10, -10, -10]} intensity={1} color="#00ffff" />
        <pointLight position={[0, 10, -10]} intensity={1} color="#ffff00" />

        <PsychedelicBlob audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <KaleidoscopePlanes audioFeatures={audioFeatures} isPlaying={isPlaying} />
        <LiquidParticles audioFeatures={audioFeatures} isPlaying={isPlaying} />

        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={null}
            micData={micData}
          />
        )}

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={15}
          maxDistance={50}
          autoRotate={false}
          autoRotateSpeed={0}
        />
      </Canvas>
    </div>
  );
}

