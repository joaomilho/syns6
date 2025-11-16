"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { SyncedAudioData, getDominantPitch } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
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
  micData?: MicrophoneData;
}

function ParticleField({
  audioFeatures,
  isPlaying,
  syncedData,
  micData,
}: VisualizationProps) {
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

  // Animation based on audio features AND real-time beats - SUPER AGGRESSIVE + MIC
  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const valence = audioFeatures?.valence || 0.5;
    const tempo = audioFeatures?.tempo || 120;

    // MICROPHONE DATA - AGGRESSIVE BOOST
    const micEnergy = micData?.energy || 0;
    const micBass = micData?.bass || 0;
    const micVolume = micData?.volume || 0;

    // ENHANCED: Use all new synced data for maximum reactivity!
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatIntensity = syncedData?.beatIntensity || 1.0;
    const timbreEnergy = syncedData?.timbreEnergy || 0.5;
    const anticipation = syncedData?.anticipation || 0;

    // CHILL beat pulse baseline, AGGRESSIVE with mic
    const onBeatPulse = syncedData?.isOnBeat ? 1.2 : 1.0; // Much subtler
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 1.5);
    const beatScale = onBeatPulse + beatDecay * 0.2 * beatIntensity; // Reduced

    // Anticipation builds before beat
    const anticipationScale = 1 + anticipation * 0.1; // Reduced

    // Rotate based on tempo (BPM) - SUPER CHILL baseline, subtle mic boost
    const micSpinBoost = micEnergy * 2; // 0 to 2x with mic
    const rotationSpeed = (tempo / 100) * 0.002 * (1 + micSpinBoost); // VERY slow baseline
    pointsRef.current.rotation.y = time * rotationSpeed;
    pointsRef.current.rotation.x = time * rotationSpeed * 0.6;
    pointsRef.current.rotation.z = time * micBass * 0.3; // Bass adds subtle Z rotation

    // Scale with beats, loudness, and anticipation + subtle mic boost
    const micScale = 1 + micVolume * 0.4; // Mic makes it slightly bigger
    const scale =
      beatScale *
      anticipationScale *
      (1 + loudness * 0.1) * // Reduced baseline
      (1 + timbreEnergy * 0.05) * // Reduced baseline
      micScale;
    pointsRef.current.scale.set(scale, scale, scale);

    // Update particle positions for wave effect - SUBTLE baseline, EXPLOSIVE with mic
    const positionAttribute = pointsRef.current.geometry.attributes.position;
    for (let i = 0; i < particleCount; i++) {
      const i3 = i * 3;
      const x = positions[i3];
      const y = positions[i3 + 1];
      const z = positions[i3 + 2];

      // Add wave motion based on valence, loudness, and timbre - REDUCED baseline
      const wave =
        Math.sin(time * 2 + i * 0.001) *
        valence *
        0.5 *
        loudness *
        (1 + timbreEnergy * 0.02);

      // Beat wave - extra movement on beats - REDUCED
      const beatWave = syncedData?.isOnBeat
        ? Math.sin(i * 0.01) * beatIntensity * 0.5
        : 0;

      // MIC WAVE - creates subtle particle movement
      const micWave = Math.sin(time * 5 + i * 0.02) * micEnergy * 1;
      const micBassWave = Math.cos(time * 3 + i * 0.03) * micBass * 0.7;

      positionAttribute.setXYZ(
        i,
        x + wave + beatWave + micWave,
        y + wave + micBassWave,
        z + wave + micWave
      );
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
  }, [
    audioFeatures?.valence,
    syncedData?.dominantPitch,
    syncedData?.timbreEnergy,
  ]);

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

function CenterSphere({
  audioFeatures,
  isPlaying,
  syncedData,
  micData,
}: VisualizationProps) {
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

    // MIC DATA
    const micEnergy = micData?.energy || 0;
    const micVolume = micData?.volume || 0;

    // Rotate - FASTER with danceability + subtle mic boost
    const micSpinBoost = 1 + micEnergy * 0.8; // Up to 1.8x faster
    meshRef.current.rotation.y +=
      0.015 * danceability * (1 + loudness * 0.5) * micSpinBoost;
    meshRef.current.rotation.x += 0.008 * danceability * micSpinBoost;

    // SUPER AGGRESSIVE beat-synchronized pulsate + subtle mic boost
    const onBeatPulse = syncedData?.isOnBeat ? 2.5 : 1.0;
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 1.8);
    const basePulse = 1 + Math.sin(time * 3) * 0.4 * energy;
    const anticipationPulse = 1 + anticipation * 0.4;
    const micPulse = 1 + micVolume * 0.3; // Mic makes it slightly bigger
    const scale =
      basePulse *
      (1 + beatDecay * (onBeatPulse - 1) * beatIntensity * 0.7) *
      anticipationPulse *
      micPulse;

    meshRef.current.scale.set(scale, scale, scale);

    // Color shift based on section and loudness - MORE DRAMATIC
    if (materialRef.current) {
      const sectionKey = syncedData?.currentSection?.key || 0;
      const hue = (time * 0.15 + sectionKey / 12 + loudness * 0.1) % 1;
      materialRef.current.color.setHSL(hue, 1, 0.5);
      materialRef.current.emissive.setHSL(
        hue,
        1,
        0.2 + energy * loudness * 0.5
      );
      materialRef.current.emissiveIntensity =
        0.3 + loudness * beatIntensity * 0.7;
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

function WireframeRings({
  audioFeatures,
  isPlaying,
  syncedData,
  micData,
}: VisualizationProps) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame((state) => {
    if (!groupRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const acousticness = audioFeatures?.acousticness || 0.5;

    // MIC DATA
    const micEnergy = micData?.energy || 0;
    const micTreble = micData?.treble || 0;

    // ENHANCED: React to bars AND beats for more movement
    const barPulse = (syncedData?.barProgress || 0) < 0.1 ? 1.4 : 1.0;
    const beatPulse = syncedData?.isOnBeat ? 1.2 : 1.0;

    // Rotate in opposite direction - FASTER + subtle mic boost
    const micSpinBoost = 1 + micEnergy * 0.8; // Up to 1.8x faster
    groupRef.current.rotation.z =
      time * 0.6 * (1 - acousticness) * micSpinBoost;
    groupRef.current.rotation.x =
      Math.sin(time * 0.7) * 0.6 * (1 + micTreble * 0.4);

    // Scale with bars and beats - MORE DRAMATIC + subtle mic boost
    const micPulse = 1 + micEnergy * 0.25;
    const combinedPulse = barPulse * beatPulse * micPulse;
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
        style={{
          background: "radial-gradient(circle, #0a0a0a 0%, #000000 100%)",
        }}
      >
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight
          position={[-10, -10, -10]}
          color="#ff00ff"
          intensity={0.5}
        />

        <ParticleField
          audioFeatures={audioFeatures}
          isPlaying={isPlaying}
          syncedData={syncedData}
          micData={micData}
        />
        <CenterSphere
          audioFeatures={audioFeatures}
          isPlaying={isPlaying}
          syncedData={syncedData}
          micData={micData}
        />
        <WireframeRings
          audioFeatures={audioFeatures}
          isPlaying={isPlaying}
          syncedData={syncedData}
          micData={micData}
        />

        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={syncedData}
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
