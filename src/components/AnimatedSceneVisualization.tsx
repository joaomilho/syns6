"use client";

import { useRef, useMemo, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, MeshDistortMaterial } from "@react-three/drei";
import * as THREE from "three";
import Lyrics3D from "./Lyrics3D";
import { LyricLine } from "@/lib/lyrics";

interface AnimatedSceneVisualizationProps {
  micData: {
    energy: number;
    bass: number;
    mid: number;
    treble: number;
    volume: number;
  } | null;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  isPlaying?: boolean;
}

// Metaball-like blob that morphs with music
function MorphingBlob({
  position,
  index,
  group,
  micData,
}: {
  position: [number, number, number];
  index: number;
  group: number;
  micData: AnimatedSceneVisualizationProps["micData"];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [color] = useState(() => {
    const hue = (index / 24) % 1;
    return new THREE.Color().setHSL(hue, 0.8, 0.5);
  });

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = micData?.energy || 0;
    const bass = micData?.bass || 0;
    const mid = micData?.mid || 0;

    // Tighter orbit so blobs can intersect
    const radius = 16 + Math.sin(time * 0.5 + index) * 2;
    const localIndex = index % 8;
    const angle = time * 0.3 + localIndex * ((Math.PI * 2) / 8);

    // Different orbit planes for each group
    if (group === 0) {
      // Horizontal orbit (XZ plane)
      meshRef.current.position.x = Math.cos(angle) * radius;
      meshRef.current.position.y = -12 + Math.sin(time * 0.7 + index * 0.5) * 6;
      meshRef.current.position.z = -12 + Math.sin(angle) * radius;
    } else if (group === 1) {
      // Vertical orbit (XY plane)
      meshRef.current.position.x = Math.cos(angle) * radius;
      meshRef.current.position.y = -12 + Math.sin(angle) * radius;
      meshRef.current.position.z = -12 + Math.sin(time * 0.7 + index * 0.5) * 6;
    } else {
      // Diagonal orbit (YZ plane)
      meshRef.current.position.x = -12 + Math.sin(time * 0.7 + index * 0.5) * 6;
      meshRef.current.position.y = -12 + Math.cos(angle) * radius;
      meshRef.current.position.z = -12 + Math.sin(angle) * radius;
    }

    // Scale with music
    const scale = 0.3 + bass * 0.4 + mid * 0.2;
    meshRef.current.scale.setScalar(scale);

    // Rotate
    meshRef.current.rotation.x += 0.01 + energy * 0.02;
    meshRef.current.rotation.y += 0.01 + energy * 0.02;
  });

  return (
    <mesh ref={meshRef} position={position}>
      <icosahedronGeometry args={[3, 4]} />
      <MeshDistortMaterial
        color={color}
        attach="material"
        distort={0.4}
        speed={2}
        roughness={0.1}
        metalness={1.0}
      />
    </mesh>
  );
}

// Central pulsing core
function CentralCore({
  micData,
}: {
  micData: AnimatedSceneVisualizationProps["micData"];
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const pointLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    if (!meshRef.current) return;

    const time = state.clock.getElapsedTime();
    const energy = micData?.energy || 0;
    const bass = micData?.bass || 0;

    // Pulse with music
    const scale = 1 + bass * 0.8 + energy * 0.3;
    meshRef.current.scale.setScalar(scale);

    // Rotate slowly
    meshRef.current.rotation.x = time * 0.2;
    meshRef.current.rotation.y = time * 0.3;

    // Change color with energy
    const material = meshRef.current.material as THREE.MeshStandardMaterial;
    const hue = (time * 0.1 + energy * 0.5) % 1;
    material.color.setHSL(hue, 0.8, 0.5);
    material.emissive.setHSL(hue, 0.8, 0.3);

    // Emissive intensity based on energy
    material.emissiveIntensity = 0.5 + energy * 0.5;

    // Update point light at sphere center
    if (pointLightRef.current) {
      pointLightRef.current.color.setHSL(hue, 1.0, 0.5);
      pointLightRef.current.intensity = 100 + energy * 100;
    }
  });

  return (
    <group position={[0, 0, -12]}>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[12, 3]} />
        <meshStandardMaterial
          metalness={0.9}
          roughness={0.1}
          emissiveIntensity={0.5}
        />
      </mesh>
      <pointLight
        ref={pointLightRef}
        position={[0, 0, 0]}
        intensity={10}
        decay={2}
      />
    </group>
  );
}

// Lighting that reacts to music
function Lighting({
  micData,
}: {
  micData: AnimatedSceneVisualizationProps["micData"];
}) {
  const pointLightRef = useRef<THREE.PointLight>(null);
  const spotLightRef = useRef<THREE.SpotLight>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const energy = micData?.energy || 0;
    const treble = micData?.treble || 0;

    if (pointLightRef.current) {
      // Orbit light around scene
      pointLightRef.current.position.x = Math.cos(time) * 15;
      pointLightRef.current.position.z = Math.sin(time) * 15;
      pointLightRef.current.intensity = 2 + energy * 3;

      // Change color
      const hue = (time * 0.2) % 1;
      pointLightRef.current.color.setHSL(hue, 0.8, 0.6);
    }

    if (spotLightRef.current) {
      spotLightRef.current.intensity = 1 + treble * 2;
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight
        ref={pointLightRef}
        position={[0, 15, 0]}
        intensity={3}
        distance={60}
      />
      <spotLight
        ref={spotLightRef}
        position={[30, 30, 30]}
        angle={0.3}
        penumbra={1}
        intensity={2}
        castShadow
      />
    </>
  );
}

export default function AnimatedSceneVisualization({
  micData,
  lyrics,
  currentTimeMs,
  isPlaying,
}: AnimatedSceneVisualizationProps) {
  // Create multiple groups of blobs orbiting in different directions
  const blobGroups = useMemo(() => {
    return [
      // Group 1: Horizontal orbit (XZ plane)
      ...Array.from({ length: 8 }, (_, i) => ({
        position: [0, 0, 0] as [number, number, number],
        index: i,
        group: 0,
      })),
      // Group 2: Vertical orbit (XY plane)
      ...Array.from({ length: 8 }, (_, i) => ({
        position: [0, 0, 0] as [number, number, number],
        index: i + 8,
        group: 1,
      })),
      // Group 3: Diagonal orbit (YZ plane)
      ...Array.from({ length: 8 }, (_, i) => ({
        position: [0, 0, 0] as [number, number, number],
        index: i + 16,
        group: 2,
      })),
    ];
  }, []);

  return (
    <Canvas shadows camera={{ position: [0, 0, 30], fov: 75 }}>
      <OrbitControls
        target={[0, 0, 0]}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={50}
      />

      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 15, 60]} />

      <Lighting micData={micData} />

      {/* Central core */}
      <CentralCore micData={micData} />

      {/* Orbiting blobs in multiple groups */}
      {blobGroups.map((blob) => (
        <MorphingBlob
          key={blob.index}
          position={blob.position}
          index={blob.index}
          group={blob.group}
          micData={micData}
        />
      ))}

      {/* 3D Lyrics */}
      {lyrics && lyrics.length > 0 && (
        <Lyrics3D
          lyrics={lyrics}
          currentTimeMs={currentTimeMs || 0}
          isPlaying={isPlaying || false}
          syncedData={null}
          micData={undefined}
        />
      )}
    </Canvas>
  );
}
