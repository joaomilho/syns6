"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { SyncedAudioData } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import Lyrics3D from "./Lyrics3D";

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
  syncedData: SyncedAudioData | null;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
}

function WavyLine({
  yPosition,
  zPosition,
  audioFeatures,
  isPlaying,
  syncedData,
  offset,
}: {
  yPosition: number;
  zPosition: number;
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
  syncedData: SyncedAudioData | null;
  offset: number;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const materialRef = useRef<THREE.LineBasicMaterial>(null);
  const pointCount = 200;

  // Create line geometry
  const geometry = useMemo(() => {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(pointCount * 3);

    for (let i = 0; i < pointCount; i++) {
      const x = (i / pointCount) * 60 - 30; // -30 to 30 (left to right)
      positions[i * 3] = x;
      positions[i * 3 + 1] = yPosition;
      positions[i * 3 + 2] = zPosition;
    }

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    return geometry;
  }, [yPosition, zPosition]);

  useFrame((state) => {
    if (!lineRef.current || !materialRef.current || !isPlaying) return;

    const time = state.clock.getElapsedTime();
    const energy = audioFeatures?.energy || 0.5;
    const tempo = audioFeatures?.tempo || 120;

    // ENHANCED: Use ALL the new synced data!
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatIntensity = syncedData?.beatIntensity || 1.0;
    const timbreEnergy = syncedData?.timbreEnergy || 0.5;
    const anticipation = syncedData?.anticipation || 0;

    // AGGRESSIVE beat pulse - MUCH bigger impact
    const onBeatMultiplier = syncedData?.isOnBeat ? 2.5 : 1.0;
    const beatDecay = Math.pow(1 - (syncedData?.beatProgress || 0), 2); // Exponential decay
    const beatPulse = 1 + (onBeatMultiplier - 1) * beatDecay;

    // Anticipation effect - build up before beat
    const anticipationBoost = 1 + anticipation * 0.5;

    // Calculate wave intensity - MUCH MORE AGGRESSIVE
    const baseWaveAmount = (tempo / 100) * 1.5; // Increased from 120 divisor
    const waveIntensity = baseWaveAmount * 
                          energy * 
                          loudness * 
                          beatPulse * 
                          anticipationBoost *
                          (0.8 + timbreEnergy * 0.4); // Timbre adds variation

    // Update line positions to create waves
    const positionAttribute = lineRef.current.geometry.attributes.position;

    for (let i = 0; i < pointCount; i++) {
      const x = (i / pointCount) * 60 - 30;
      
      // Multiple wave frequencies for complexity - MORE DRAMATIC
      const wave1 = Math.sin(x * 0.3 + time * 2 + offset) * waveIntensity * 5; // Increased from 3
      const wave2 = Math.sin(x * 0.5 - time * 1.5 + offset * 2) * waveIntensity * 3.5; // Increased from 2
      const wave3 = Math.sin(x * 0.8 + time * 3 + offset * 1.5) * waveIntensity * 2; // Increased from 1
      
      // Add beat pulse directly to y position
      const beatWave = syncedData?.isOnBeat ? Math.sin(x * 0.2) * beatPulse * 2 : 0;
      
      const y = yPosition + wave1 + wave2 + wave3 + beatWave;

      positionAttribute.setXYZ(i, x, y, zPosition);
    }

    positionAttribute.needsUpdate = true;

    // Color based on intensity - MORE DRAMATIC SHIFT
    const intensity = energy * loudness * beatPulse * (1 + anticipation);
    
    // Clamp intensity for color calculation
    const clampedIntensity = Math.min(1, intensity);
    
    // Low intensity: deep blue/purple (hue ~0.7)
    // High intensity: bright red (hue ~0.0)
    const hue = 0.7 - clampedIntensity * 0.7; // Full range from blue to red
    const saturation = 0.7 + clampedIntensity * 0.3; // More saturated when intense
    const lightness = 0.35 + clampedIntensity * 0.45; // Brighter when intense

    materialRef.current.color.setHSL(hue, saturation, lightness);
    materialRef.current.opacity = 0.5 + clampedIntensity * 0.45; // More visible when intense
  });

  return (
    <line ref={lineRef} geometry={geometry}>
      <lineBasicMaterial
        ref={materialRef}
        color="#6666ff"
        transparent
        opacity={0.6}
        linewidth={2}
      />
    </line>
  );
}

function WavyLineField({ audioFeatures, isPlaying, syncedData }: VisualizationProps) {
  const lineCount = 40;

  const lines = useMemo(() => {
    return Array.from({ length: lineCount }, (_, i) => {
      const yPosition = (i / lineCount) * 30 - 15; // Spread vertically
      const zPosition = -5 + (i / lineCount) * 10; // Depth variation
      const offset = i * 0.5; // Phase offset for each line
      
      return {
        key: i,
        yPosition,
        zPosition,
        offset,
      };
    });
  }, []);

  return (
    <>
      {lines.map((line) => (
        <WavyLine
          key={line.key}
          yPosition={line.yPosition}
          zPosition={line.zPosition}
          audioFeatures={audioFeatures}
          isPlaying={isPlaying}
          syncedData={syncedData}
          offset={line.offset}
        />
      ))}
    </>
  );
}

// Particle accents that move left to right
function FlowingParticles({ audioFeatures, isPlaying, syncedData }: VisualizationProps) {
  const pointsRef = useRef<THREE.Points>(null);
  const particleCount = 500;

  const positions = useMemo(() => {
    const positions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = Math.random() * 60 - 30; // x: -30 to 30
      positions[i * 3 + 1] = Math.random() * 30 - 15; // y: -15 to 15
      positions[i * 3 + 2] = Math.random() * 15 - 5; // z: -5 to 10
    }
    return positions;
  }, []);

  const velocities = useMemo(() => {
    return new Float32Array(particleCount).fill(0).map(() => Math.random() * 0.5 + 0.5);
  }, []);

  useFrame((state) => {
    if (!pointsRef.current || !isPlaying) return;

    const energy = audioFeatures?.energy || 0.5;
    const loudness = syncedData?.interpolatedLoudness || 0.5;
    const beatPulse = syncedData?.isOnBeat ? 2.0 : 1.0;

    // MUCH faster speed with beats
    const speed = 0.2 * energy * loudness * beatPulse;

    const positionAttribute = pointsRef.current.geometry.attributes.position;

    for (let i = 0; i < particleCount; i++) {
      let x = positionAttribute.getX(i);
      const y = positionAttribute.getY(i);
      const z = positionAttribute.getZ(i);

      // Move left to right - FASTER
      x += speed * velocities[i];

      // Wrap around when reaching right edge
      if (x > 30) {
        x = -30;
      }

      positionAttribute.setXYZ(i, x, y, z);
    }

    positionAttribute.needsUpdate = true;

    // Color matches wave intensity - MORE DRAMATIC
    const material = pointsRef.current.material as THREE.PointsMaterial;
    const intensity = Math.min(1, energy * loudness * beatPulse);
    const hue = 0.7 - intensity * 0.7;
    material.color.setHSL(hue, 0.9, 0.6 + intensity * 0.3);
    material.opacity = 0.4 + intensity * 0.5;
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
        size={0.15}
        color="#6666ff"
        transparent
        opacity={0.5}
        sizeAttenuation
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

export default function WavyLinesVisualization({
  audioFeatures,
  isPlaying,
  syncedData,
  lyrics,
  currentTimeMs,
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
        style={{ background: "linear-gradient(to bottom, #0a0015 0%, #000000 100%)" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 0, 20]} intensity={0.5} color="#6666ff" />

        <WavyLineField audioFeatures={audioFeatures} isPlaying={isPlaying} syncedData={syncedData} />
        <FlowingParticles audioFeatures={audioFeatures} isPlaying={isPlaying} syncedData={syncedData} />

        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={syncedData}
          />
        )}
      </Canvas>
    </div>
  );
}

