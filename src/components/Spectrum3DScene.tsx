"use client";

/**
 * Spectrum3D Scene - Extracted from Spectrum3DVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { CircularSpectrum3D } from "./Spectrum3DVisualization";

export default function Spectrum3DScene({ micData }: { micData?: any }) {
  return (
    <>
      <ambientLight intensity={0.3} />
      <pointLight position={[0, 10, 0]} intensity={1} color="#ffffff" />
      <pointLight position={[10, 0, 10]} intensity={0.5} color="#ff00ff" />
      <pointLight position={[-10, 0, -10]} intensity={0.5} color="#00ffff" />

      {/* Spectrum bars with angled view */}
      <group
        position={[0, -5, -10]}
        rotation={[-0.3, 0, 0]}
        scale={[3.5, 3.5, 3.5]}
      >
        <CircularSpectrum3D 
          frequencyData={micData?.frequencyData}
          sampleRate={micData?.sampleRate}
        />
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
    </>
  );
}

