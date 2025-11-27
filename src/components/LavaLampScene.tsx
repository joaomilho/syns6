"use client";

/**
 * Lava Lamp Scene - Extracted from LavaLampVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { LavaLampBlobs, LavaLampLighting } from "./LavaLampVisualization";

export default function LavaLampScene({ micData }: { micData?: any }) {
  const bloomIntensity = 0.9 + (micData?.bass || 0) * 9;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 15, 60]} />

      <OrbitControls
        target={[0, -5, -20]}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        minDistance={10}
        maxDistance={60}
      />

      <LavaLampLighting micData={micData} />
      <LavaLampBlobs micData={micData} />

      <EffectComposer multisampling={8}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.35}
          luminanceSmoothing={6}
          radius={0.8}
          levels={8}
          mipmapBlur={true}
        />
      </EffectComposer>
    </>
  );
}

