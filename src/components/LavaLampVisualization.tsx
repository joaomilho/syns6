"use client";

import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { MeshPhysicalMaterial, DoubleSide, Sphere, Vector3 } from "three";
import { MarchingCubes } from "@/lib/MarchingCubes";
import LavaLampScene from './LavaLampScene';

interface LavaLampVisualizationProps {
  energy?: number;
  bass?: number;
  mid?: number;
  treble?: number;
  volume?: number;
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
export function LavaLampBlobs({
  energy = 0,
  bass = 0,
  mid = 0,
  resolution = 32,
  blobCount = 18,
  globSize = 1.0,
  reactivity = 1.0,
}: {
  energy?: number;
  bass?: number;
  mid?: number;
  resolution?: number;
  blobCount?: number;
  globSize?: number;
  reactivity?: number;
}) {
  const effectRef = useRef<MarchingCubes | null>(null);
  const timeRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);
  const frameCountRef = useRef(0); // For throttling updates

  // Initialize marching cubes with optimized glowing material
  const material = useMemo(() => {
    // Create a MeshPhysicalMaterial - simplified for performance
    const mat = new MeshPhysicalMaterial({
      color: 0xff6644, // Warm orange-red
      roughness: 0.3,
      metalness: 0.7,
      emissive: 0x000000,
      emissiveIntensity: 1, // Increased from 2.0 for visibility at distance
      clearcoat: 0.6, // Reduced from 1.0 for performance
      clearcoatRoughness: 0.2,
      reflectivity: 0.5, // Reduced from 1.0
      side: DoubleSide,
      toneMapped: false,
    });
    mat.shadowSide = DoubleSide;
    return mat;
  }, []);

  // Cleanup and recreate marching cubes when resolution or blobCount changes
  useEffect(() => {
    // Force recreation on next frame by clearing the ref
    if (effectRef.current) {
      effectRef.current.parent?.remove(effectRef.current);
      effectRef.current.geometry?.dispose();
      effectRef.current = null;
      particlesRef.current = [];
    }
    
    return () => {
      if (effectRef.current) {
        effectRef.current.parent?.remove(effectRef.current);
        effectRef.current.geometry?.dispose();
        effectRef.current = null;
      }
    };
  }, [resolution, blobCount, globSize, reactivity]);

  useFrame((state, delta) => {
    frameCountRef.current++;
    
    if (!effectRef.current) {
      // Initialize on first frame - higher resolution needed to prevent edge clipping
      // resolution prop passed in - Higher resolution = more interior cells = less edge clipping
      const effect = new MarchingCubes(resolution, material, false, false, 50000);
      effect.position.set(0, 0, -120); // FAR back behind lyrics - lyrics are at z=5
      effect.scale.set(90, 90, 90); // Much larger scale to fill screen from far away
      effect.isolation = 80;
      
      // Fix bounding sphere to prevent frustum culling - match larger scale
      effect.geometry.boundingSphere = new Sphere(
        new Vector3(0, 0, 0),
        150
      );
      effect.frustumCulled = false;
      
      effectRef.current = effect;
      state.scene.add(effect);

      // Initialize particles inside the main blob - they'll get kicked out by bass
      // Use blobCount prop directly as the number of particles/blobs
      const numParticles = blobCount;
      particlesRef.current = Array.from({ length: numParticles }, () => {
        // Start particles spread across safe zone
        const angle1 = Math.random() * Math.PI * 2;
        const angle2 = Math.random() * Math.PI;
        const radius = 0.1 + Math.random() * 0.25; // Spread them out
        
        const x = 0.5 + Math.cos(angle1) * Math.sin(angle2) * radius;
        const y = 0.5 + Math.sin(angle1) * Math.sin(angle2) * radius;
        const z = 0.5 + Math.cos(angle2) * radius;
        
        // Ultra gentle initial velocity - calm start
        return {
          x, y, z,
          vx: (Math.random() - 0.5) * 0.002,
          vy: (Math.random() - 0.5) * 0.002,
          vz: (Math.random() - 0.5) * 0.002,
        };
      });
    }

    const effect = effectRef.current;

    // Update time
    timeRef.current += delta * 0.5;
    const time = timeRef.current;

    // Reset the field
    effect.reset();

    // No central ball - pure newtonian liquid of individual blobs (better performance too!)

    // Physics constants for BASS-REACTIVE LAVA LAMP effect
    // Scale movement with energy - VERY calm in silence, active when energetic
    const energyFactor = Math.max(0.1, energy); // Lower minimum for calmer silence
    const centerX = 0.5, centerY = 0.5, centerZ = 0.5;
    
    // Adjust gravity based on glob size - smaller globs need stronger pull to return to center
    const gravityMultiplier = 1.0 / Math.max(0.5, globSize); // Inverse relationship: smaller = stronger
    const gravityStrength = 0.08 * energyFactor * reactivity * gravityMultiplier;
    
    const repulsionStrength = bass * 6 * reactivity; // Reactivity affects bass response
    
    // Smaller globs need smaller repulsion distance to merge better with center
    const repulsionDistance = (0.14 + bass * 0.15) * globSize; 
    
    const damping = 0.985 + (1 - energyFactor) * 0.012; // Much more damping in silence (0.997 when calm)
    const maxSpeed = (0.015 + bass * 0.12) * energyFactor * reactivity; // Reactivity affects speed
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

      // Subtle random perturbations for organic movement - scales with energy
      const perturbation = 0.00005 * energyFactor * reactivity; // Reactivity affects random movement
      p.vx += (Math.random() - 0.5) * perturbation;
      p.vy += (Math.random() - 0.5) * perturbation;
      p.vz += (Math.random() - 0.5) * perturbation;

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

      // Hard bounce at safe boundaries - keeps balls ALWAYS in processable zone
      // For resolution 32, cells 1-30 are processed = ~0.06 to 0.94 in normalized coords
      // Use 0.15-0.85 as SAFE zone to account for ball radius
      const bounceStrength = 0.8;
      if (p.x < 0.15) { p.x = 0.15; p.vx = Math.abs(p.vx) * bounceStrength; }
      if (p.x > 0.85) { p.x = 0.85; p.vx = -Math.abs(p.vx) * bounceStrength; }
      if (p.y < 0.15) { p.y = 0.15; p.vy = Math.abs(p.vy) * bounceStrength; }
      if (p.y > 0.85) { p.y = 0.85; p.vy = -Math.abs(p.vy) * bounceStrength; }
      if (p.z < 0.15) { p.z = 0.15; p.vz = Math.abs(p.vz) * bounceStrength; }
      if (p.z > 0.85) { p.z = 0.85; p.vz = -Math.abs(p.vz) * bounceStrength; }

      // Small balls that stay fully within safe zone
      const strength = 0.6 * globSize; // Glob size affects ball size
      const subtract = 12;
      
      effect.addBall(p.x, p.y, p.z, strength, subtract);
    }

    // Add central sphere - slightly moves with music
    const centralOffset = energy * 0.02 * reactivity;
    const centralX = 0.5 + Math.sin(time * 0.3) * centralOffset;
    const centralY = 0.5 + Math.cos(time * 0.2) * centralOffset;
    const centralZ = 0.5;
    
    // Larger strength = bigger sphere, larger subtract = sharper edges
    const centralStrength = (1.2 + bass * 0.3) * globSize; // Glob size affects central sphere
    const centralSubtract = 8;
    
    effect.addBall(centralX, centralY, centralZ, centralStrength, centralSubtract);

    // Update the mesh
    effect.update();

    // Update material with beautiful color cycling and balanced glow
    // Only update every 4th frame for performance
    if (frameCountRef.current % 4 === 0) {
      const hue = (time * 0.1 + energy * 0.3) % 1;
      
      // Use warmer, more saturated colors
      material.color.setHSL(hue, 0.9, 0.5 + energy * 0.1);
      material.emissive.setHSL(hue, 1.0, 0.4 + energy * 0.3);
    }
    
    material.emissiveIntensity = 0.4 + bass * 2; // Strong emissive for visibility at distance
  });

  return null;
}

export default function LavaLampVisualization({
  energy,
  bass,
  mid,
  treble,
  volume,
}: LavaLampVisualizationProps) {
  return (
    <Canvas camera={{ position: [0, 0, 30], fov: 275, near: 0.1, far: 1000 }} dpr={1}>
      <LavaLampScene 
        energy={energy}
        bass={bass}
        mid={mid}
        treble={treble}
        volume={volume}
      />
    </Canvas>
  );
}

