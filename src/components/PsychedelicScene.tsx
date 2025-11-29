"use client";

/**
 * Psychedelic Scene - Extracted from PsychedelicVisualization  
 * Scene content only (no Canvas wrapper) for unified canvas
 */

import { KaleidoscopeShader } from "./PsychedelicVisualization";

export default function PsychedelicScene({ micData, albumArt }: { micData?: any; albumArt?: string }) {
  return (
    <>
      <KaleidoscopeShader audioFeatures={null} syncedData={null} micData={micData} albumArt={albumArt} />
    </>
  );
}

