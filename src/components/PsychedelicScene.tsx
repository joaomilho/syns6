"use client";

/**
 * Psychedelic Scene - Extracted from PsychedelicVisualization  
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { OrbitControls } from "@react-three/drei";
import { PsychedelicBlob, KaleidoscopePlanes, LiquidParticles } from "./PsychedelicVisualization";

export default function PsychedelicScene({ micData }: { micData?: any }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#ff00ff" />
      <pointLight position={[-10, -10, -10]} intensity={1} color="#00ffff" />
      <pointLight position={[0, 10, -10]} intensity={1} color="#ffff00" />

      <PsychedelicBlob audioFeatures={null} />
      <KaleidoscopePlanes audioFeatures={null} />
      <LiquidParticles audioFeatures={null} />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={15}
        maxDistance={50}
        autoRotate={false}
        autoRotateSpeed={0}
      />
    </>
  );
}

