"use client";

/**
 * FFT Spectrum Scene - Extracted from FFTSpectrumVisualization
 * This is just the scene content (no Canvas wrapper) for the unified canvas
 */

export { FFTSpectrumPlanes } from "./FFTSpectrumVisualization";
import { FFTSpectrumPlanes } from "./FFTSpectrumVisualization";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { calculateBassIntensity } from "@/lib/audioAnalysis";

interface FFTSpectrumSceneProps {
  micData?: MicrophoneData;
}

export default function FFTSpectrumScene({ micData }: FFTSpectrumSceneProps) {
  const rows = 100; // Fixed at 100 rows for performance
  const bassIntensity = calculateBassIntensity(micData?.frequencyData || new Uint8Array(512).fill(0));

  return (
    <>
      {/* Orbit Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={5}
        maxDistance={50}
      />

      {/* FFT Spectrum grid - rotated 180 degrees so wave comes toward you, mirrored on X to fix RTL */}
      <group
        position={[0, -8, 10]}
        rotation={[0.3, Math.PI, 0]}
        scale={[-1.5, 1.5, 1.5]}
      >
        <FFTSpectrumPlanes 
          micData={micData} 
          bassIntensity={bassIntensity} 
          rows={rows}
        />
      
        {/* Grid floor */}
        <gridHelper
          args={[80, 80, "#333344", "#111122"]}
          position={[0, -0.1, 0]}
        />
      </group>
      
      {/* Bloom Effect */}
      <EffectComposer>
        <Bloom 
          intensity={Math.pow(bassIntensity * 4,2)}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          radius={0.4}
        />
      </EffectComposer>
    </>
  );
}

