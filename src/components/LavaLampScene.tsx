"use client";

/**
 * Lava Lamp Scene - Extracted from LavaLampVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { LavaLampBlobs, LavaLampLighting } from "./LavaLampVisualization";

export default function LavaLampScene({ micData }: { micData?: any }) {
  const bloomIntensity = 0.4 + (micData?.bass || 0) * 3;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 30, 90]} />

      {/* OrbitControls removed - it was causing skewed lyrics view */}

      <LavaLampLighting micData={micData} />
      <LavaLampBlobs micData={micData} />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.6}
          luminanceSmoothing={2}
          radius={0.5}
          levels={4}
          mipmapBlur={false}
        />
      </EffectComposer>
    </>
  );
}

