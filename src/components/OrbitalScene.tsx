"use client";

/**
 * Orbital Scene - Scene content only (no Canvas wrapper)
 * Extracted from OrbitalVisualization for use in unified canvas
 * 
 * This is just a re-export of the SceneContent from OrbitalVisualization
 */

import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { SceneContent } from "./OrbitalVisualization";

interface OrbitalControls {
  intensity: number;
  numOrbits: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
  orbitDistance: number;
}

interface OrbitalSceneProps {
  micData?: MicrophoneData;
  fps?: number;
  orbitalControls?: OrbitalControls;
}

export default function OrbitalScene({
  micData,
  fps = 60,
  orbitalControls,
}: OrbitalSceneProps) {
  return (
    <SceneContent
      bass={micData?.bass}
      energy={micData?.energy}
      treble={micData?.treble}
      frequencyData={micData?.frequencyData}
      fps={fps}
      orbitalControls={orbitalControls}
    />
  );
}

