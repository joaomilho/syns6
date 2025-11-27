"use client";

/**
 * Orbital Scene - Scene content only (no Canvas wrapper)
 * Extracted from OrbitalVisualization for use in unified canvas
 * 
 * This is just a re-export of the SceneContent from OrbitalVisualization
 */

import { useRef } from "react";
import { OrbitControls } from "@react-three/drei";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { 
  CameraShake,
  OrbitalPaths,
  FrequencyCircles,
  CenterCore
} from "./OrbitalVisualization";

interface OrbitalSceneProps {
  micData?: MicrophoneData;
  fps?: number;
}

export default function OrbitalScene({
  micData,
  fps = 60,
}: OrbitalSceneProps) {
  // Shared positions map so planets can follow their rings
  const ringPositions = useRef(new Map<number, Float32Array>());

  return (
    <>
      <CameraShake micData={micData} />
      
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight
        position={[-10, -10, -10]}
        color="#ff00ff"
        intensity={0.5}
      />

      {/* Orbital path guides - must render first to create positions */}
      <OrbitalPaths micData={micData} ringPositions={ringPositions} fps={fps} />
      
      {/* Frequency circles orbiting - follow the rings */}
      <FrequencyCircles micData={micData} ringPositions={ringPositions} fps={fps} />
      
      {/* Center core */}
      <CenterCore micData={micData} />

      <OrbitControls
        enableZoom={true}
        enablePan={false}
        minDistance={20}
        maxDistance={80}
        autoRotate={false}
        autoRotateSpeed={0}
      />
    </>
  );
}

