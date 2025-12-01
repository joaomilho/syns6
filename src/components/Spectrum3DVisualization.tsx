"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface Spectrum3DVisualizationProps {
  frequencyData?: Uint8Array;
  sampleRate?: number;
  colorPalette?: string;
}

// Get color palette - returns 4 colors for bass, mid, treble, high frequencies
function getSpectrum3DPalette(palette: string): { bass: string, mid: string, treble: string, high: string } {
  const palettes: Record<string, { bass: string, mid: string, treble: string, high: string }> = {
    default: { bass: '#ff3333', mid: '#ff9933', treble: '#00ff88', high: '#5588ff' }, // ORIGINAL
    vaporwave: { bass: '#ff71ce', mid: '#01cdfe', treble: '#05ffa1', high: '#b967ff' },
    sunset: { bass: '#ff6b6b', mid: '#ee5a6f', treble: '#f9ca24', high: '#f0932b' },
    fire: { bass: '#ff0000', mid: '#ff4500', treble: '#ffa500', high: '#ffff00' },
    neon: { bass: '#00ff00', mid: '#00ffff', treble: '#ff00ff', high: '#ffff00' },
  };
  return palettes[palette] || palettes.default;
}

export function Spectrum3DBars({ frequencyData, sampleRate = 48000, colorPalette = 'default' }: { frequencyData?: Uint8Array; sampleRate?: number; colorPalette?: string }) {
  const colors = getSpectrum3DPalette(colorPalette);
  const groupRef = useRef<Group>(null);
  const meshRefs = useRef<Mesh[]>([]);

  // Number of bars to display
  const numBars = 128;

  // Create bars
  const bars = useMemo(() => {
    const barArray = [];
    const spacing = 0.15;
    const totalWidth = numBars * spacing;

    for (let i = 0; i < numBars; i++) {
      barArray.push({
        index: i,
        x: i * spacing - totalWidth / 2,
      });
    }
    return barArray;
  }, [numBars]);

  useFrame(() => {
    if (!frequencyData || !groupRef.current) return;

    const binsPerBar = Math.floor(frequencyData.length / numBars);
    const nyquist = sampleRate / 2;
    const freqPerBin = nyquist / frequencyData.length;

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;

      // Calculate average frequency for this bar
      let sum = 0;
      const startBin = i * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, frequencyData.length);

      for (let j = startBin; j < endBin; j++) {
        sum += frequencyData[j];
      }
      const avgValue = sum / (endBin - startBin);
      const normalizedValue = avgValue / 255; // frequencyData is 0-255

      // Calculate height (scale up for visibility)
      const targetHeight = Math.max(0.1, normalizedValue * 15);

      // Smooth transition
      const currentHeight = mesh.scale.y;
      mesh.scale.y = MathUtils.lerp(currentHeight, targetHeight, 0.3);

      // Update position (bars grow from bottom)
      mesh.position.y = mesh.scale.y / 2;

      // Color distribution using Fibonacci-like pattern (like FFT)
      // 5, 11, 21, rest for better visual distribution
      const material = mesh.material as MeshStandardMaterial;

      let color: Color;
      if (i < 5) {
        color = new Color(colors.bass);
      } else if (i < 16) { // 5 + 11
        color = new Color(colors.mid);
      } else if (i < 37) { // 16 + 21
        color = new Color(colors.treble);
      } else {
        color = new Color(colors.high);
      }

      material.color = color;
      material.emissive = color;
      material.emissiveIntensity = normalizedValue * 0.5;
    });

    // Rotate the entire group slowly
    groupRef.current.rotation.y += 0.002;
  });

  return (
    <group ref={groupRef}>
      {bars.map((bar, index) => (
        <mesh
          key={bar.index}
          ref={(el) => {
            if (el) meshRefs.current[index] = el;
          }}
          position={[bar.x, 0, 0]}
        >
          <boxGeometry args={[0.12, 1, 0.12]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

export function CircularSpectrum3D({ frequencyData, sampleRate = 48000, colorPalette = 'default' }: { frequencyData?: Uint8Array; sampleRate?: number; colorPalette?: string }) {
  const colors = getSpectrum3DPalette(colorPalette);
  const groupRef = useRef<Group>(null);
  const meshRefs = useRef<Mesh[]>([]);

  const numBars = 128;
  const radius = 8;

  const bars = useMemo(() => {
    const barArray = [];
    const sampleRate = 48000;
    const nyquist = sampleRate / 2;
    const binsPerBar = 1024 / numBars; // Assuming typical FFT size

    for (let i = 0; i < numBars; i++) {
      const angle = (i / numBars) * Math.PI * 2;
      const centerFreq = (i * binsPerBar + binsPerBar / 2) * (nyquist / 1024);

      barArray.push({
        index: i,
        angle,
        x: Math.cos(angle) * radius,
        z: Math.sin(angle) * radius,
        frequency: centerFreq,
      });
    }
    return barArray;
  }, [numBars, radius]);

  useFrame(() => {
    if (!frequencyData || !groupRef.current) return;

    const binsPerBar = Math.floor(frequencyData.length / numBars);
    const nyquist = sampleRate / 2;
    const freqPerBin = nyquist / frequencyData.length;

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return;

      let sum = 0;
      const startBin = i * binsPerBar;
      const endBin = Math.min(startBin + binsPerBar, frequencyData.length);

      for (let j = startBin; j < endBin; j++) {
        sum += frequencyData[j];
      }
      const avgValue = sum / (endBin - startBin);
      const normalizedValue = avgValue / 255;

      const targetHeight = Math.max(0.1, normalizedValue * 24);
      const currentHeight = mesh.scale.y;
      mesh.scale.y = MathUtils.lerp(currentHeight, targetHeight, 0.3);

      // Bars grow outward from center
      const angle = bars[i].angle;
      const baseRadius = radius;
      const extendedRadius = baseRadius + mesh.scale.y / 2;
      mesh.position.x = Math.cos(angle) * extendedRadius;
      mesh.position.z = Math.sin(angle) * extendedRadius;

      // Color distribution using Fibonacci-like pattern (like FFT)
      // 5, 11, 21, rest for better visual distribution
      const material = mesh.material as MeshStandardMaterial;

      let color: Color;
      if (i < 5) {
        color = new Color(colors.bass);
      } else if (i < 16) { // 5 + 11
        color = new Color(colors.mid);
      } else if (i < 37) { // 16 + 21
        color = new Color(colors.treble);
      } else {
        color = new Color(colors.high);
      }

      material.color = color;
      material.emissive = color;
      material.emissiveIntensity = normalizedValue * 4.0;
    });

    groupRef.current.rotation.y += 0.005;
  });

  return (
    <group ref={groupRef}>
      {bars.map((bar, index) => (
        <mesh
          key={bar.index}
          ref={(el) => {
            if (el) meshRefs.current[index] = el;
          }}
          position={[bar.x, 0, bar.z]}
          rotation={[0, bar.angle, 0]}
        >
          <boxGeometry args={[0.15, 1, 0.15]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.2}
            metalness={0.8}
            roughness={0.2}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function Spectrum3DVisualization({
  frequencyData,
  sampleRate,
}: Spectrum3DVisualizationProps) {
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
          background: "linear-gradient(to bottom, #000000 0%, #1a0033 100%)",
        }}
        dpr={1}
      >
        <ambientLight intensity={0.3} />
        <pointLight position={[0, 10, 0]} intensity={1} color="#ffffff" />
        <pointLight position={[10, 0, 10]} intensity={0.5} color="#ff00ff" />
        <pointLight position={[-10, 0, -10]} intensity={0.5} color="#00ffff" />

        {/* Spectrum bars with angled view - positioned and rotated independently */}
        <group
          position={[0, -5, -10]}
          rotation={[-0.3, 0, 0]}
          scale={[3.5, 3.5, 3.5]}
        >
          <CircularSpectrum3D frequencyData={frequencyData} sampleRate={sampleRate} />
          {/* Grid floor for reference */}
          <gridHelper
            args={[70, 70, "#333333", "#111111"]}
            position={[0, -0.1, 0]}
          />
        </group>

        {/* Bloom effect for glow */}
        <EffectComposer>
          <Bloom
            intensity={2.5}
            luminanceThreshold={0.15}
            luminanceSmoothing={0.9}
            radius={1.0}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
