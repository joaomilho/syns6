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

interface FFTControls {
  neonIntensity: number;
  colorPalette: string;
  lineWidth: number;
}

interface FFTSpectrumSceneProps {
  micData?: MicrophoneData;
  fftControls?: FFTControls;
}

export default function FFTSpectrumScene({ micData, fftControls }: FFTSpectrumSceneProps) {
  const rows = 100; // Fixed at 100 rows for performance
  const bassIntensity = calculateBassIntensity(micData?.frequencyData || new Uint8Array(512).fill(0));
  
  const neonIntensity = fftControls?.neonIntensity ?? 1.6;
  const colorPalette = fftControls?.colorPalette ?? 'default';
  const lineWidth = fftControls?.lineWidth ?? 0.04;

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
          frequencyData={micData?.frequencyData}
          bassIntensity={bassIntensity} 
          rows={rows}
          colorPalette={colorPalette}
          lineWidth={lineWidth}
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
          intensity={Math.pow(bassIntensity * 4, 2) * neonIntensity}
          luminanceThreshold={0}
          luminanceSmoothing={0.6}
          radius={0.4}
        />
      </EffectComposer>
    </>
  );
}

