"use client";

import React, { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";
import { SyncedAudioData } from "@/lib/audioSync";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

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
  micData?: MicrophoneData;
  fps?: number;
}

// Mandelbrot set shader
const mandelbrotVertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const mandelbrotFragmentShader = `
  uniform float time;
  uniform float energy;
  uniform float zoom;
  uniform vec2 center;
  uniform float micEnergy;
  uniform float micBass;
  uniform float maxIterations;
  varying vec2 vUv;

  vec3 hsv2rgb(vec3 c) {
    vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
    return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
  }

  void main() {
    // Map UV to complex plane
    vec2 c = (vUv - 0.5) * zoom + center;
    
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    
    // Mandelbrot iteration - dynamic based on performance
    for(float i = 0.0; i < 512.0; i++) {
      if(i >= maxIterations || length(z) > 2.0) break;
      
      // z = z^2 + c
      z = vec2(
        z.x * z.x - z.y * z.y + c.x,
        2.0 * z.x * z.y + c.y
      );
      
      iterations = i;
    }
    
    // DRAMATIC psychedelic coloring with AGGRESSIVE microphone reactivity
    if(length(z) > 2.0) {
      float t = iterations / maxIterations;
      
      // MICROPHONE DRIVES COLOR SPEED - gets CRAZY fast with loud sounds
      float micSpeedBoost = 1.0 + micEnergy * 5.0; // Up to 6x faster with mic!
      float bassShift = micBass * 2.0; // Bass shifts hue dramatically
      
      // FAST cycling through ALL colors with dramatic shifts
      float hue1 = mod(t * 20.0 * micSpeedBoost + time * 0.3 + bassShift, 1.0);
      float hue2 = mod(t * 15.0 * micSpeedBoost - time * 0.4 - bassShift, 1.0);
      float hue3 = mod(t * 30.0 * micSpeedBoost + time * 0.2, 1.0);
      
      // Dramatic mixing with sharp transitions driven by mic
      float mixFactor = sin(time * 2.0 + micEnergy * 10.0) * 0.5 + 0.5;
      float hue = mix(hue1, mix(hue2, hue3, mixFactor), energy + micEnergy * 0.5);
      
      // MAXIMUM saturation boosted by microphone
      float saturation = 0.95 + (energy + micEnergy) * 0.05;
      
      // High contrast brightness with sharp bands - EXPLODES with mic input
      float brightness = 0.3 + t * 0.7 + sin(t * 20.0) * 0.2 + micEnergy * 0.3;
      
      vec3 color = hsv2rgb(vec3(hue, saturation, brightness));
      
      // Less reduction for more vibrant output, boosted by mic
      color *= 0.7 + micEnergy * 0.3;
      
      gl_FragColor = vec4(color, 1.0);
    } else {
      // Inside the set - dramatic dark with color shifts driven by bass
      float innerHue = mod(time * 0.2 + micBass * 3.0, 1.0);
      vec3 innerColor = hsv2rgb(vec3(innerHue, 0.8, 0.08 + (energy + micEnergy) * 0.15));
      gl_FragColor = vec4(innerColor, 1.0);
    }
  }
`;

function MandelbrotPlane({
  audioFeatures,
  isPlaying,
  syncedData,
  micData,
  fps = 60,
}: VisualizationProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  // Dynamic iterations based on FPS
  
  

  // Famous Mandelbrot locations with infinite detail and mini-mandelbrots
  const interestingLocations = useMemo(
    () => [
      { x: -0.7463, y: 0.1102 }, // Spiral with mini-mandelbrots
      { x: -0.7269, y: 0.1889 }, // Seahorse valley
      { x: 0.285, y: 0.01 }, // Elephant valley
      { x: -0.748, y: 0.1 }, // Double spiral
      { x: -0.1592, y: -1.0317 }, // Triple spiral
      { x: -0.7453, y: 0.1127 }, // Scepter valley
    ],
    []
  );

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      energy: { value: 0.5 },
      zoom: { value: 4.0 },
      center: { value: new THREE.Vector2(-0.7463, 0.1102) },
      micEnergy: { value: 0 },
      micBass: { value: 0 },
      maxIterations: { value: 36 },
    }),
    []
  );
  
  // Update maxIterations uniform when it changes

  useFrame((state) => {
    if (!materialRef.current) return;

    const time = state.clock.getElapsedTime();
    materialRef.current.uniforms.time.value = time;

    // Cycle through interesting locations every 2 minutes
    const locationCycleDuration = 120;
    const locationIndex =
      Math.floor(time / locationCycleDuration) % interestingLocations.length;
    const currentLocation = interestingLocations[locationIndex];
    const cycleTime = time % locationCycleDuration;

    // Zoom in continuously within each cycle
    const zoomSpeed = 0.15; // Zoom speed
    const baseZoom = 4.0;
    const zoomFactor = Math.exp(-cycleTime * zoomSpeed);
    const currentZoom = baseZoom * zoomFactor;
    // Clamp to prevent going too deep
    const finalZoom = Math.max(currentZoom, 0.0001);
    materialRef.current.uniforms.zoom.value = finalZoom;

    // Update center to current interesting location
    materialRef.current.uniforms.center.value.set(
      currentLocation.x,
      currentLocation.y
    );

    // AGGRESSIVE MICROPHONE REACTIVITY - always update
    materialRef.current.uniforms.micEnergy.value = micData?.energy || 0;
    materialRef.current.uniforms.micBass.value = micData?.bass || 0;

    if (isPlaying && audioFeatures) {
      const energy = audioFeatures.energy || 0.5;

      // Animate energy
      materialRef.current.uniforms.energy.value = energy;

      // React to beats
      if (syncedData?.isOnBeat) {
        const beatIntensity = syncedData.beatProgress || 0;
        materialRef.current.uniforms.energy.value =
          energy + beatIntensity * 0.3;
      }
    } else {
      // Default energy when not playing
      materialRef.current.uniforms.energy.value = 0.5;
    }
  });

  return (
    <mesh ref={meshRef} position={[0, 0, -10]}>
      <planeGeometry args={[200, 200, 1, 1]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={mandelbrotVertexShader}
        fragmentShader={mandelbrotFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        toneMapped={false}
      />
    </mesh>
  );
}

// Additional floating mandelbrot spheres for depth
function MandelbrotSphere({
  position,
  audioFeatures,
  isPlaying,
  offset = 0,
}: VisualizationProps & {
  position: [number, number, number];
  offset?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      time: { value: 0 },
      energy: { value: 0.5 },
      zoom: { value: 3.0 },
      center: { value: new THREE.Vector2(-0.5, 0.0) },
    }),
    []
  );

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const time = state.clock.getElapsedTime();
    materialRef.current.uniforms.time.value = time + offset;

    if (isPlaying && audioFeatures) {
      const energy = audioFeatures.energy || 0.5;
      materialRef.current.uniforms.energy.value = energy;

      // Rotate
      meshRef.current.rotation.x = time * 0.3 + offset;
      meshRef.current.rotation.y = time * 0.2 + offset;

      // Float up and down
      meshRef.current.position.y = position[1] + Math.sin(time + offset) * 2;

      // Pulse with music
      const scale = 1 + energy * 0.3;
      meshRef.current.scale.set(scale, scale, scale);
    }
  });

  return (
    <mesh ref={meshRef} position={position}>
      <sphereGeometry args={[3, 64, 64]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={mandelbrotVertexShader}
        fragmentShader={mandelbrotFragmentShader}
        uniforms={uniforms}
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
    if (!pointsRef.current) return;

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
          args={[positions, 3]}
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
  syncedData,
  micData,
  fps = 60,
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
        style={{ background: "black" }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[10, 10, 10]} intensity={0.5} color="#ff00ff" />
        <pointLight
          position={[-10, -10, -10]}
          intensity={0.5}
          color="#00ffff"
        />

        {/* Main large Mandelbrot plane */}
        <MandelbrotPlane
          audioFeatures={audioFeatures || null}
          isPlaying={isPlaying}
          syncedData={syncedData || null}
          micData={micData}
          fps={fps}
        />

        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={10}
          maxDistance={40}
          autoRotate={false}
          autoRotateSpeed={0}
        />

        {/* Post-processing for glow effect on lyrics - reduced to not affect mandelbrot */}
        <EffectComposer>
          <Bloom
            intensity={1.5}
            luminanceThreshold={0.5}
            luminanceSmoothing={0.9}
            mipmapBlur={true}
            radius={0.8}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
