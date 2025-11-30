"use client";

/**
 * Lava Lamp Scene - Extracted from LavaLampVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { LavaLampBlobs, LavaLampLighting } from "./LavaLampVisualization";

export default function LavaLampScene({ micData }: { micData?: any }) {
  const bloomIntensity = 0.5 + (micData?.bass || 0) * 2;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 20, 70]} />

      <OrbitControls
        target={[0, -8, -25]}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
      />

      <LavaLampLighting micData={micData} />
      <LavaLampBlobs micData={micData} />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.5}
          luminanceSmoothing={2}
          radius={0.6}
          levels={4}
          mipmapBlur={false}
        />
      </EffectComposer>
    </>
  );
}

