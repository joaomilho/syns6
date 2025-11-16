"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SyncedAudioData, getDominantPitch } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import Lyrics3D from "./Lyrics3D";

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
  syncedData: SyncedAudioData | null;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
}

function ParticleField({ audioFeatures, isPlaying, syncedData }: VisualizationProps) {
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

  // Animation based on audio features AND real-time beats - SUPER AGGRESSIVE
  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const valence = audioFeatures?.valence || 0.5;
    const tempo = audioFeatures?.tempo || 120;

    // ENHANCED: Use all new synced data for maximum reactivity!
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatIntensity = syncedData?.beatIntensity || 1.0;
    const timbreEnergy = syncedData?.timbreEnergy || 0.5;
    const anticipation = syncedData?.anticipation || 0;

    // MUCH MORE AGGRESSIVE beat pulse
    const onBeatPulse = syncedData?.isOnBeat ? 2.0 : 1.0; // Doubled from 1.3
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 1.5); // Faster decay
    const beatScale = onBeatPulse + beatDecay * 0.8 * beatIntensity;

    // Anticipation builds before beat
    const anticipationScale = 1 + anticipation * 0.3;

    // Rotate based on tempo (BPM) - FASTER
    const rotationSpeed = (tempo / 100) * 0.4; // Increased from 120/0.3
    pointsRef.current.rotation.y = time * rotationSpeed;
    pointsRef.current.rotation.x = time * rotationSpeed * 0.6;

    // Scale with beats, loudness, and anticipation - MUCH MORE DRAMATIC
    const scale = beatScale * anticipationScale * (1 + loudness * 0.4) * (1 + timbreEnergy * 0.2);
    pointsRef.current.scale.set(scale, scale, scale);

    // Update particle positions for wave effect - MORE INTENSE
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Add wave motion based on valence, loudness, and timbre - AMPLIFIED
      const wave = Math.sin(time * 2 + i * 0.01) * valence * 3 * loudness * (1 + timbreEnergy);
      
      // Beat wave - extra movement on beats
      const beatWave = syncedData?.isOnBeat ? Math.sin(i * 0.05) * beatIntensity * 2 : 0;
      
      positionAttribute.setXYZ(i, x + wave + beatWave, y + wave, z + wave);
    }
    positionAttribute.needsUpdate = true;
  });

  // Color based on pitch, valence, and timbre - MORE DYNAMIC
  const color = useMemo(() => {
    const valence = audioFeatures?.valence || 0.5;
    const pitch = syncedData?.dominantPitch || 0;
    const timbre = syncedData?.timbreEnergy || 0.5;
    
    // Mix valence, pitch, and timbre for dynamic color
    const hue = 0.6 - (valence * 0.15 + pitch * 0.25 + timbre * 0.1);
    const saturation = 0.9 + timbre * 0.1;
    const lightness = 0.5 + valence * 0.2 + timbre * 0.1;
    
    return new THREE.Color().setHSL(hue, saturation, lightness);
  }, [audioFeatures?.valence, syncedData?.dominantPitch, syncedData?.timbreEnergy]);

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

function CenterSphere({ audioFeatures, isPlaying, syncedData }: VisualizationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);

  useFrame((state) => {
    if (!meshRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const danceability = audioFeatures?.danceability || 0.5;

    // ENHANCED: Use synced data for MUCH more aggressive reactions
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatIntensity = syncedData?.beatIntensity || 1.0;
    const anticipation = syncedData?.anticipation || 0;

    // Rotate - FASTER with danceability
    meshRef.current.rotation.y += 0.015 * danceability * (1 + loudness * 0.5);
    meshRef.current.rotation.x += 0.008 * danceability;

    // SUPER AGGRESSIVE beat-synchronized pulsate
    const onBeatPulse = syncedData?.isOnBeat ? 2.5 : 1.0; // Massive pulse
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 1.8);
    const basePulse = 1 + Math.sin(time * 3) * 0.4 * energy;
    const anticipationPulse = 1 + anticipation * 0.4;
    const scale = basePulse * (1 + beatDecay * (onBeatPulse - 1) * beatIntensity * 0.7) * anticipationPulse;
    
    meshRef.current.scale.set(scale, scale, scale);

    // Color shift based on section and loudness - MORE DRAMATIC
    if (materialRef.current) {
      const sectionKey = syncedData?.currentSection?.key || 0;
      const hue = (time * 0.15 + sectionKey / 12 + loudness * 0.1) % 1;
      materialRef.current.color.setHSL(hue, 1, 0.5);
      materialRef.current.emissive.setHSL(hue, 1, 0.2 + energy * loudness * 0.5);
      materialRef.current.emissiveIntensity = 0.3 + loudness * beatIntensity * 0.7;
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

function WireframeRings({ audioFeatures, isPlaying, syncedData }: VisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const acousticness = audioFeatures?.acousticness || 0.5;

    // ENHANCED: React to bars AND beats for more movement
    const barPulse = (syncedData?.barProgress || 0) < 0.1 ? 1.4 : 1.0; // Bigger pulse
    const beatPulse = syncedData?.isOnBeat ? 1.2 : 1.0;

    // Rotate in opposite direction - FASTER
    groupRef.current.rotation.z = time * 0.6 * (1 - acousticness);
    groupRef.current.rotation.x = Math.sin(time * 0.7) * 0.6;
    
    // Scale with bars and beats - MORE DRAMATIC
    const combinedPulse = barPulse * beatPulse;
    groupRef.current.scale.setScalar(combinedPulse);
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
  syncedData,
  lyrics,
  currentTimeMs,
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
        
        <ParticleField audioFeatures={audioFeatures} isPlaying={isPlaying} syncedData={syncedData} />
        <CenterSphere audioFeatures={audioFeatures} isPlaying={isPlaying} syncedData={syncedData} />
        <WireframeRings audioFeatures={audioFeatures} isPlaying={isPlaying} syncedData={syncedData} />
        
        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={syncedData}
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

