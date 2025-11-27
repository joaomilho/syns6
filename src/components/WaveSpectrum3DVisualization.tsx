"use client";

import { useRef, useMemo } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

interface WaveSpectrum3DVisualizationProps {
  micData?: MicrophoneData;
}

function WaveSpectrumBars({ micData }: { micData?: MicrophoneData }) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRefs = useRef<THREE.Mesh[]>([]);

  const numBars = 128;
  const barWidth = 0.25;
  const barSpacing = 0.3;

  const bars = useMemo(() => {
    const barArray = [];
    const totalWidth = numBars * barSpacing;
    const sampleRate = 48000;
    const nyquist = sampleRate / 2;
    const binsPerBar = 1024 / numBars;

    for (let i = 0; i < numBars; i++) {
      const centerFreq = (i * binsPerBar + binsPerBar / 2) * (nyquist / 1024);
      barArray.push({
        index: i,
        x: i * barSpacing - totalWidth / 2,
        frequency: centerFreq,
      });
    }
    return barArray;
  }, [numBars, barSpacing]);

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
      const normalizedValue = avgValue / 255;

      // Calculate height with smooth lerp
      const targetHeight = Math.max(0.2, normalizedValue * 20);
      const currentHeight = mesh.scale.y;
      mesh.scale.y = THREE.MathUtils.lerp(currentHeight, targetHeight, 0.25);

      // Update position (bars grow from bottom)
      mesh.position.y = mesh.scale.y / 2;

      // Color based on frequency
      const centerFreq = bars[i].frequency;
      const material = mesh.material as THREE.MeshStandardMaterial;

      let color: THREE.Color;
      if (centerFreq <= 250) {
        // Bass - Red
        color = new THREE.Color(1, 0.1, 0.1);
      } else if (centerFreq <= 2000) {
        // Mid - Orange/Yellow
        color = new THREE.Color(1, 0.5, 0);
      } else if (centerFreq <= 8000) {
        // Treble - Cyan/Green
        color = new THREE.Color(0, 1, 0.6);
      } else {
        // High - Blue/Purple
        color = new THREE.Color(0.4, 0.4, 1);
      }

      material.color = color;
      material.emissive = color;
      material.emissiveIntensity = normalizedValue * 3.5;
    });

    // Subtle rotation for wave effect
    groupRef.current.rotation.y = Math.sin(Date.now() * 0.0003) * 0.1;
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
          <boxGeometry args={[barWidth, 1, barWidth]} />
          <meshStandardMaterial
            color="#ff0000"
            emissive="#ff0000"
            emissiveIntensity={0.2}
            metalness={0.7}
            roughness={0.3}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function WaveSpectrum3DVisualization({
  micData,
}: WaveSpectrum3DVisualizationProps) {
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
        camera={{ position: [0, 8, 25], fov: 75 }}
        dpr={1}
        style={{
          background: "linear-gradient(to bottom, #000000 0%, #0a0a1a 100%)",
        }}
      >
        <ambientLight intensity={0.2} />
        <pointLight position={[0, 15, 10]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-20, 5, 0]} intensity={0.8} color="#ff00ff" />
        <pointLight position={[20, 5, 0]} intensity={0.8} color="#00ffff" />

        {/* Wave spectrum bars - positioned and angled for wave effect */}
        <group position={[0, -5, -5]} rotation={[-0.4, 0, 0]} scale={[1.2, 1.2, 1.2]}>
          <WaveSpectrumBars micData={micData} />
          {/* Grid floor for reference */}
          <gridHelper
            args={[60, 60, "#222222", "#111111"]}
            position={[0, -0.1, 0]}
          />
        </group>

        {/* Bloom effect for glow */}
        <EffectComposer>
          <Bloom
            intensity={2.0}
            luminanceThreshold={0.2}
            luminanceSmoothing={0.9}
            radius={0.9}
          />
        </EffectComposer>
      </Canvas>
    </div>
  );
}

