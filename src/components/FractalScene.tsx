"use client";

/**
 * Fractal Scene - Extracted from FractalVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { MandelbrotPlane } from "./FractalVisualization";

export default function FractalScene({ micData }: { micData?: any }) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[10, 10, 10]} intensity={0.5} color="#ff00ff" />
      <pointLight
        position={[-10, -10, -10]}
        intensity={0.5}
        color="#00ffff"
      />

      {/* Main large Mandelbrot plane */}
      <MandelbrotPlane
        audioFeatures={null}
        syncedData={null}
        micData={micData}
        fps={60}
      />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={10}
        maxDistance={40}
        autoRotate={false}
        autoRotateSpeed={0}
      />

      {/* Post-processing for glow effect */}
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.5}
          luminanceSmoothing={0.9}
          mipmapBlur={true}
          radius={0.8}
        />
      </EffectComposer>
    </>
  );
}

