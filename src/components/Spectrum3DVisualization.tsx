"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Color, Group, MathUtils, Mesh, MeshStandardMaterial } from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface Spectrum3DVisualizationProps {
  micData?: MicrophoneData;
}

function Spectrum3DBars({ micData }: { micData?: MicrophoneData }) {
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
    if (!micData?.frequencyData || !groupRef.current) return;

    const frequencyData = micData.frequencyData;
    const binsPerBar = Math.floor(frequencyData.length / numBars);
    const sampleRate = micData.sampleRate || 48000;
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

      // Color based on frequency range
      const centerFreq = (startBin + binsPerBar / 2) * freqPerBin;
      const material = mesh.material as MeshStandardMaterial;

      let color: Color;
      if (centerFreq <= 250) {
        // Bass - Red
        color = new Color(1, 0.2, 0.2);
      } else if (centerFreq <= 2000) {
        // Mid - Orange/Yellow
        color = new Color(1, 0.6, 0);
      } else if (centerFreq <= 8000) {
        // Treble - Green/Cyan
        color = new Color(0, 1, 0.5);
      } else {
        // High - Blue/Purple
        color = new Color(0.5, 0.5, 1);
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

export function CircularSpectrum3D({ micData }: { micData?: MicrophoneData }) {
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
    if (!micData?.frequencyData || !groupRef.current) return;

    const frequencyData = micData.frequencyData;
    const binsPerBar = Math.floor(frequencyData.length / numBars);
    const sampleRate = micData.sampleRate || 48000;
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

      // Color based on frequency - use pre-calculated frequency from bars array
      const centerFreq = bars[i].frequency;
      const material = mesh.material as MeshStandardMaterial;

      let color: Color;
      if (centerFreq <= 250) {
        // Bass - Red
        color = new Color(1, 0.2, 0.2);
      } else if (centerFreq <= 2000) {
        // Mid - Orange/Yellow
        color = new Color(1, 0.6, 0);
      } else if (centerFreq <= 8000) {
        // Treble - Green/Cyan
        color = new Color(0, 1, 0.5);
      } else {
        // High - Blue/Purple
        color = new Color(0.5, 0.5, 1);
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
  micData,
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
          <CircularSpectrum3D micData={micData} />
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
