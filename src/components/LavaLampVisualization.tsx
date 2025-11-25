"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import Lyrics3D from "./Lyrics3D";
import { LyricLine } from "@/lib/lyrics";
import { MarchingCubes } from "@/lib/MarchingCubes";

interface LavaLampVisualizationProps {
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

// Physics-based particle system for blobs
interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
}

// Morphing blobs using Marching Cubes algorithm with physics
function LavaLampBlobs({
  micData,
}: {
  micData: LavaLampVisualizationProps["micData"];
}) {
  const effectRef = useRef<MarchingCubes | null>(null);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  // Initialize marching cubes with premium GLOWING material
  const material = useMemo(() => {
    // Create a MeshPhysicalMaterial for advanced effects
    return new THREE.MeshPhysicalMaterial({
      color: 0xff6644, // Warm orange-red
      roughness: 0.2,
      metalness: 0.8,
      emissive: 0xff3300,
      emissiveIntensity: 2.0,
      clearcoat: 1.0, // Glass-like coating
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      ior: 1.5, // Index of refraction
      thickness: 1.0,
      transmission: 0.0, // Adjust for transparency
      side: THREE.DoubleSide,
      toneMapped: false,
    });
  }, []);

  useFrame((state, delta) => {
    if (!effectRef.current) {
      // Initialize on first frame - optimized resolution for performance
      const resolution = 28; // Balanced quality/performance
      const effect = new MarchingCubes(resolution, material, false, false, 100000);
      effect.position.set(0, -5, -20); // Moved further back to avoid lyrics
      effect.scale.set(25, 25, 25);
      effect.isolation = 80;
      effectRef.current = effect;
      state.scene.add(effect);

      // Initialize particles inside the main blob - they'll get kicked out by bass
      const numParticles = 20; // Reduced for better performance
      particlesRef.current = Array.from({ length: numParticles }, () => {
        // Start particles inside/near the center blob
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const radius = 0.08 + Math.random() * 0.12; // Tighter starting positions
        
        const x = 0.5 + Math.cos(angle1) * Math.sin(angle2) * radius;
        const y = 0.5 + Math.sin(angle1) * Math.sin(angle2) * radius;
        const z = 0.5 + Math.cos(angle2) * radius;
        
        // Very gentle initial velocity - let bass do the kicking
        return {
          x, y, z,
          vx: (Math.random() - 0.5) * 0.005,
          vy: (Math.random() - 0.5) * 0.005,
          vz: (Math.random() - 0.5) * 0.005,
        };
      });
    }

    const effect = effectRef.current;
    const energy = micData?.energy || 0;
    const bass = micData?.bass || 0;
    const mid = micData?.mid || 0;

    // Update time
    timeRef.current += delta * 0.5;
    const time = timeRef.current;

    // Reset the field
    effect.reset();

    // Add large central ball that PULSES with BASS - creates pressure on small blobs
    const centralStrength = 6.0 + bass * 10.0 + energy * 1.5;
    const centralSubtract = 2;
    effect.addBall(0.5, 0.5, 0.5, centralStrength, centralSubtract);

    // Physics constants for BASS-REACTIVE LAVA LAMP effect
    const centerX = 0.5, centerY = 0.5, centerZ = 0.5;
    const gravityStrength = 0.36; // Constant gentle pull towards center
    const repulsionStrength = bass * 4 ; // BASS KICKS THEM OUT!
    const repulsionDistance = 0.16 + bass * 0.16; // Larger repulsion zone when bass hits
    const damping = 0.995; // Less friction for smoother movement
    const maxSpeed = 0.05 + bass * 0.08; // Faster movement when bass hits
    const maxSpeedSq = maxSpeed * maxSpeed; // Precompute for optimization

    // Update particle physics
    const particles = particlesRef.current;
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];

      // Calculate distance from center
      const dx = centerX - p.x;
      const dy = centerY - p.y;
      const dz = centerZ - p.z;
      const distSq = dx * dx + dy * dy + dz * dz;
      const dist = Math.sqrt(distSq);

      if (dist > 0.001) {
        const nx = dx / dist;
        const ny = dy / dist;
        const nz = dz / dist;

        // Gravity force (gentle pull towards center)
        const gravityForce = gravityStrength * delta;
        p.vx += nx * gravityForce;
        p.vy += ny * gravityForce;
        p.vz += nz * gravityForce;

        // BASS-DRIVEN Repulsion force - kicks blobs out!
        if (dist < repulsionDistance) {
          // Exponential repulsion - bass makes it explosive
          const proximityFactor = Math.pow(1 - dist / repulsionDistance, 2);
          const repulsionForce = repulsionStrength * proximityFactor * delta * 5.0;
          p.vx -= nx * repulsionForce;
          p.vy -= ny * repulsionForce;
          p.vz -= nz * repulsionForce;
        }
      }

      // Subtle random perturbations for organic movement
      p.vx += (Math.random() - 0.5) * 0.0003;
      p.vy += (Math.random() - 0.5) * 0.0003;
      p.vz += (Math.random() - 0.5) * 0.0003;

      // Apply damping
      p.vx *= damping;
      p.vy *= damping;
      p.vz *= damping;

      // Limit speed (using squared values to avoid sqrt)
      const speedSq = p.vx * p.vx + p.vy * p.vy + p.vz * p.vz;
      if (speedSq > maxSpeedSq) {
        const speed = Math.sqrt(speedSq);
        const scale = maxSpeed / speed;
        p.vx *= scale;
        p.vy *= scale;
        p.vz *= scale;
      }

      // Update position
      p.x += p.vx;
      p.y += p.vy;
      p.z += p.vz;

      // Keep particles in bounds [0.05, 0.95] with gentle bounce
      if (p.x < 0.05) { p.x = 0.05; p.vx *= -0.7; }
      if (p.x > 0.95) { p.x = 0.95; p.vx *= -0.7; }
      if (p.y < 0.05) { p.y = 0.05; p.vy *= -0.7; }
      if (p.y > 0.95) { p.y = 0.95; p.vy *= -0.7; }
      if (p.z < 0.05) { p.z = 0.05; p.vz *= -0.7; }
      if (p.z > 0.95) { p.z = 0.95; p.vz *= -0.7; }

      // Add particle to marching cubes - size based on distance from center
      // Reuse already calculated distance for performance
      const normalizedDist = Math.min(dist / 0.3, 1.0); // 0.3 is max distance for size variation
      const strength = 0.8 - normalizedDist * 0.5; // 0.8 when inside, 0.3 when far
      const subtract = 13 + normalizedDist * 3; // 13 when inside, 16 when far
      
      effect.addBall(p.x, p.y, p.z, strength, subtract);
    }

    // Update the mesh
    effect.update();

    // Update material with beautiful color cycling and balanced glow
    const hue = (time * 0.1 + energy * 0.3) % 1;
    
    // Use warmer, more saturated colors
    material.color.setHSL(hue, 0.9, 0.5 + energy * 0.1);
    material.emissive.setHSL(hue, 1.0, 0.4 + energy * 0.3);
    material.emissiveIntensity = 1.5 + energy * 2.0 + bass * 1.2; // Strong emissive for bloom
    
    // Dynamic surface properties for interesting reflections
    material.roughness = 0.15 + Math.sin(time * 0.5) * 0.05;
    material.metalness = 0.8 + Math.cos(time * 0.3) * 0.1;
    
    // Clearcoat creates a glass-like shine
    material.clearcoat = 0.9 + energy * 0.1;
    material.clearcoatRoughness = 0.1 - energy * 0.05;
  });

  return null;
}

// Lighting that reacts to music - optimized
function LavaLampLighting({
  micData,
}: {
  micData: LavaLampVisualizationProps["micData"];
}) {
  const pointLightRef = useRef<THREE.PointLight>(null);
  const centralLightRef = useRef<THREE.PointLight>(null);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    const energy = micData?.energy || 0;
    const bass = micData?.bass || 0;

    if (pointLightRef.current) {
      // Orbit light around scene
      pointLightRef.current.position.x = Math.cos(time) * 15;
      pointLightRef.current.position.z = Math.sin(time) * 15;
      pointLightRef.current.intensity = 2 + energy * 3;

      // Change color
      const hue = (time * 0.2) % 1;
      pointLightRef.current.color.setHSL(hue, 0.8, 0.6);
    }

    // Central light that gives the main blob its luminosity - BRIGHTER with music
    if (centralLightRef.current) {
      const hue = (time * 0.1 + energy * 0.3) % 1;
      centralLightRef.current.color.setHSL(hue, 1.0, 0.5);
      centralLightRef.current.intensity = 150 + bass * 150 + energy * 100; // Much brighter!
    }
  });

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[0.5, 0.5, 1]} intensity={2.5} color="#ffffff" />
      
      {/* Strong central light to make the main blob luminous */}
      <pointLight
        ref={centralLightRef}
        position={[0, -5, -20]}
        intensity={150}
        color="#ff7c00"
        decay={2}
        distance={100}
      />
      
      {/* Single accent light for material definition */}
      <pointLight
        ref={pointLightRef}
        position={[0, 15, 0]}
        intensity={3}
        distance={60}
        decay={2}
      />
    </>
  );
}

export default function LavaLampVisualization({
  micData,
  lyrics,
  currentTimeMs,
  isPlaying,
}: LavaLampVisualizationProps) {
  // Calculate bloom intensity based on music - subtle glow
  const bloomIntensity = 0.9 + (micData?.bass || 0) * 9;

  return (
    <Canvas camera={{ position: [0, 0, 30], fov: 75 }}>
      <OrbitControls
        target={[0, -5, -20]}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
      />

      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 15, 60]} />

      <LavaLampLighting micData={micData} />

      {/* Morphing blobs using marching cubes - includes central sphere */}
      <LavaLampBlobs micData={micData} />

      {/* 3D Lyrics - positioned forward */}
      {lyrics && lyrics.length > 0 && (
        <Lyrics3D
          lyrics={lyrics}
          currentTimeMs={currentTimeMs || 0}
          isPlaying={isPlaying || false}
          syncedData={null}
          micData={undefined}
          position={[0, 3, 8.2]}
        />
      )}

      {/* Post-processing for refined GLOW effect */}
      <EffectComposer multisampling={8}>
        <Bloom 
          intensity={bloomIntensity}
          luminanceThreshold={0.35}
          luminanceSmoothing={6}
          radius={0.8}
          levels={8}
          mipmapBlur={true}
        />
      </EffectComposer>
    </Canvas>
  );
}

