"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { useRef } from "react";
import * as THREE from "three";
import { AudioFeatures, SyncedAudioData } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import Lyrics3D from "./Lyrics3D";

interface VisualizationProps {
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
  syncedData: SyncedAudioData | null;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  micData?: MicrophoneData;
}

// Pulsing dark light source (very dim white light)
function PulsingDarkLight() {
  const lightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (lightRef.current) {
      // Pulsing intensity
      const pulse = Math.sin(state.clock.getElapsedTime() * 2) * 0.3 + 1;
      lightRef.current.intensity = 5 * pulse; // Much dimmer
    }
  });

  return (
    <group position={[0, 0, 10]}>
      {/* Dim pulsing white light */}
      <pointLight
        ref={lightRef}
        color="#ffffff"
        intensity={5}
        distance={100}
        decay={2}
      />

      {/* Small visible dark sphere at light source */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial
          color="#0a0a0a"
          emissive="#0a0a0a"
          emissiveIntensity={0.1}
        />
      </mesh>
    </group>
  );
}

// PROPER Pentagram - 5-pointed star
function SimplePentagram({
  position,
  scale = 1,
  color = "#ff0000",
  emissiveIntensity = 4,
  floatSpeed = 0.5,
  floatAmount = 0.3,
}: {
  position: [number, number, number];
  scale?: number;
  color?: string;
  emissiveIntensity?: number;
  floatSpeed?: number;
  floatAmount?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const initialY = position[1];

  useFrame((state) => {
    if (groupRef.current) {
      // Float up and down instead of spinning
      const time = state.clock.getElapsedTime();
      groupRef.current.position.y =
        initialY + Math.sin(time * floatSpeed) * floatAmount;
    }
  });

  // Create actual pentagram star lines connecting every other point
  const starLines = [];
  const radius = 5;
  const points = [];

  // Calculate 5 points of the star
  for (let i = 0; i < 5; i++) {
    const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
    points.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    });
  }

  // Connect points in star pattern (0->2->4->1->3->0)
  const starOrder = [0, 2, 4, 1, 3, 0];
  for (let i = 0; i < starOrder.length - 1; i++) {
    const start = points[starOrder[i]];
    const end = points[starOrder[i + 1]];
    starLines.push({ start, end });
  }

  return (
    <group ref={groupRef} position={position} scale={scale}>
      {/* Draw star lines as thick cylinders */}
      {starLines.map((line, i) => {
        const dx = line.end.x - line.start.x;
        const dy = line.end.y - line.start.y;
        const length = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx);
        const midX = (line.start.x + line.end.x) / 2;
        const midY = (line.start.y + line.end.y) / 2;

        return (
          <mesh key={i} position={[midX, midY, 0]} rotation={[0, 0, angle]}>
            <boxGeometry args={[length, 0.4, 0.4]} />
            <meshStandardMaterial color={color} />
          </mesh>
        );
      })}
    </group>
  );
}

// Hundreds of small black pentagrams floating around
function BlackPentagramField() {
  const pentagrams = [];

  // Generate 200 small RED pentagrams scattered throughout the scene
  for (let i = 0; i < 200; i++) {
    pentagrams.push({
      position: [
        (Math.random() - 0.5) * 80, // X: -40 to 40
        (Math.random() - 0.5) * 60, // Y: -30 to 30
        (Math.random() - 0.5) * 100 - 20, // Z: -70 to -20 (behind everything)
      ] as [number, number, number],
      scale: 0.1 + Math.random() * 0.3, // Small scale: 0.1 to 0.4
      floatSpeed: 0.3 + Math.random() * 0.5, // Random float speed
      floatAmount: 0.2 + Math.random() * 0.5, // Random float distance
    });
  }

  return (
    <>
      {pentagrams.map((pentagram, i) => (
        <SimplePentagram
          key={`red-${i}`}
          position={pentagram.position}
          scale={pentagram.scale}
          color="#ff0000"
          emissiveIntensity={0}
          floatSpeed={pentagram.floatSpeed}
          floatAmount={pentagram.floatAmount}
        />
      ))}
    </>
  );
}

// UPSIDE-DOWN Cross (inverted cross) - rotated 180 degrees
function SimpleCross({
  position,
  scale = 1,
}: {
  position: [number, number, number];
  scale?: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  useFrame(() => {
    if (groupRef.current) {
      groupRef.current.rotation.y += 0.005;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      scale={scale}
      rotation={[0, 0, Math.PI]}
    >
      {/* Vertical beam - RED but not glowing */}
      <mesh position={[0, 0.5, 0]}>
        <boxGeometry args={[0.6, 6, 0.6]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>

      {/* Horizontal beam - RED but not glowing - positioned lower to raise intersection */}
      <mesh position={[0, 1.7, 0]}>
        <boxGeometry args={[4, 0.6, 0.6]} />
        <meshStandardMaterial color="#ff0000" />
      </mesh>
    </group>
  );
}

export default function BlackMetalVisualization({
  audioFeatures,
  isPlaying,
  syncedData,
  lyrics,
  currentTimeMs,
  micData,
}: VisualizationProps) {
  console.log("BlackMetalVisualization rendering");

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        background: "linear-gradient(to bottom, #000000, #1a0000)",
        zIndex: 1,
      }}
    >
      <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
        <color attach="background" args={["#000000"]} />

        {/* MINIMAL lighting - almost pure darkness */}
        <ambientLight intensity={0.1} color="#ffffff" />

        {/* Hundreds of small RED pentagrams in background */}
        <BlackPentagramField />

        {/* NO light source - objects are just red, not glowing */}

        {/* GIANT central pentagram - RED */}
        <SimplePentagram
          position={[0, 0, -5]}
          scale={2}
          color="#ff0000"
          emissiveIntensity={0}
        />

        {/* Scattered RED pentagrams */}
        <SimplePentagram
          position={[-15, 8, -10]}
          scale={1.5}
          color="#ff0000"
          emissiveIntensity={0}
        />
        <SimplePentagram
          position={[15, -8, -10]}
          scale={1.5}
          color="#ff0000"
          emissiveIntensity={0}
        />
        <SimplePentagram
          position={[-12, -10, -15]}
          scale={1.2}
          color="#ff0000"
          emissiveIntensity={0}
        />
        <SimplePentagram
          position={[12, 10, -15]}
          scale={1.2}
          color="#ff0000"
          emissiveIntensity={0}
        />

        {/* BIGGER Crosses scattered around */}
        <SimpleCross position={[-18, 5, -8]} scale={1.5} />
        <SimpleCross position={[18, -5, -8]} scale={1.5} />
        <SimpleCross position={[-12, -8, -12]} scale={1.2} />
        <SimpleCross position={[12, 8, -12]} scale={1.2} />
        <SimpleCross position={[0, 15, -5]} scale={1.3} />
        <SimpleCross position={[0, -15, -5]} scale={1.3} />

        {/* 3D Lyrics - always show, component handles "not found" */}
        {currentTimeMs !== undefined && (
          <Lyrics3D
            lyrics={lyrics || null}
            currentTimeMs={currentTimeMs}
            isPlaying={isPlaying}
            syncedData={syncedData}
            font="/fonts/fraktur.ttf"
            color="#ff0000"
            micData={micData}
          />
        )}

        <OrbitControls
          enableZoom={true}
          enablePan={true}
          minDistance={10}
          maxDistance={50}
        />

        {/* Post-processing for REAL GLOW */}
        <EffectComposer>
          <Bloom
            intensity={2.0}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
            radius={1}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
