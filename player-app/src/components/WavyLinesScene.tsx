"use client";

/**
 * Wavy Lines Scene - Extracted from WavyLinesVisualization
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { OrbitControls } from "@react-three/drei";
import { WavyLineField, FlowingParticles } from "./WavyLinesVisualization";

interface WavyLinesControls {
  numLines: number;
  colorPalette: 'default' | 'neon' | 'sunset' | 'forest' | 'candy';
  particleCount: number;
}

interface WavyLinesSceneProps {
  micData?: any;
  wavyLinesControls?: WavyLinesControls;
}

export default function WavyLinesScene({ micData, wavyLinesControls }: WavyLinesSceneProps) {
  return (
    <>
      <ambientLight intensity={0.2} />
      <pointLight position={[0, 0, 20]} intensity={0.5} color="#6666ff" />

      <WavyLineField 
        audioFeatures={null} 
        syncedData={null}
        energy={micData?.energy}
        volume={micData?.volume}
        bass={micData?.bass}
        drums={micData?.instruments?.drums}
        vocalStrength={micData?.vocal?.strength}
        wavyLinesControls={wavyLinesControls}
      />
      <FlowingParticles 
        audioFeatures={null} 
        syncedData={null} 
        wavyLinesControls={wavyLinesControls}
      />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={10}
        maxDistance={50}
        autoRotate={false}
      />
    </>
  );
}

