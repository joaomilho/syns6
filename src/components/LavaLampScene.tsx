"use client";

/**
 * Lava Lamp Scene - Extracted from LavaLampVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { LavaLampBlobs } from "./LavaLampVisualization";

interface LavaLampControls {
  resolution: number;
  blobCount: number;
  globSize: number;
  reactivity: number;
}

export default function LavaLampScene({ micData, lavaLampControls }: { micData?: any; lavaLampControls?: LavaLampControls }) {
  const bloomIntensity = 0.1 + (micData?.bass || 0) * 5;
  const resolution = lavaLampControls?.resolution ?? 32;
  const blobCount = lavaLampControls?.blobCount ?? 18;
  const globSize = lavaLampControls?.globSize ?? 1.0;
  const reactivity = lavaLampControls?.reactivity ?? 1.0;

  return (
    <>
      <color attach="background" args={["#050505"]} />
      <fog attach="fog" args={["#050505", 60, 150]} />

      {/* OrbitControls removed - it was causing skewed lyrics view */}

      
      <LavaLampBlobs 
        energy={micData?.energy}
        bass={micData?.bass}
        mid={micData?.mid}
        resolution={resolution}
        blobCount={blobCount}
        globSize={globSize}
        reactivity={reactivity}
      />

      <EffectComposer multisampling={0}>
        <Bloom
          intensity={bloomIntensity}
          luminanceThreshold={0.6}
          luminanceSmoothing={0.9}
          radius={0}
          levels={6}
          mipmapBlur={true}
        />
      </EffectComposer>
    </>
  );
}

