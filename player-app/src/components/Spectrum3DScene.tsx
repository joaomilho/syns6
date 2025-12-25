"use client";

/**
 * Spectrum3D Scene - Extracted from Spectrum3DVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Group } from "three";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { CircularSpectrum3D, Spectrum3DBars } from "./Spectrum3DVisualization";

interface Spectrum3DControls {
  shape: 'circle' | 'row';
  neonIntensity: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
}

interface Spectrum3DSceneProps {
  micData?: any;
  spectrum3DControls?: Spectrum3DControls;
}

export default function Spectrum3DScene({ micData, spectrum3DControls }: Spectrum3DSceneProps) {
  const shape = spectrum3DControls?.shape ?? 'circle';
  const neonIntensity = spectrum3DControls?.neonIntensity ?? 2.5;
  const colorPalette = spectrum3DControls?.colorPalette ?? 'default';
  
  const groupRef = useRef<Group>(null);
  
  // Animate rotation
  useFrame((state) => {
    if (!groupRef.current) return;
    groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.3;
  });

  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={1} color="#ffffff" />
      <pointLight position={[10, 0, 10]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[-10, 0, -10]} intensity={0.5} color="#00ffff" />

      {/* Spectrum bars with animated rotation */}
      <group
        ref={groupRef}
        position={[0, 0, -15]}
        scale={[3.5, 3.5, 3.5]}
      >
        {shape === 'circle' ? (
          <CircularSpectrum3D 
            frequencyData={micData?.frequencyData}
            sampleRate={micData?.sampleRate}
            colorPalette={colorPalette}
          />
        ) : (
          <Spectrum3DBars 
            frequencyData={micData?.frequencyData}
            sampleRate={micData?.sampleRate}
            colorPalette={colorPalette}
          />
        )}
        <gridHelper
          args={[70, 70, "#333333", "#111111"]}
          position={[0, -0.1, 0]}
        />
      </group>

      {/* Bloom effect for glow */}
      <EffectComposer>
        <Bloom
          intensity={neonIntensity}
          luminanceThreshold={0}
          luminanceSmoothing={0}
          radius={0.1}
        />
        
        <Bloom
          intensity={neonIntensity}
          luminanceThreshold={0}
          luminanceSmoothing={0}
          radius={1}
        />
      </EffectComposer>
    </>
  );
}

