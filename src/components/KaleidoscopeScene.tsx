"use client";

/**
 * Kaleidoscope Scene - Scene content only (no Canvas wrapper) for unified canvas
 */

import { KaleidoscopeShader } from "./KaleidoscopeVisualization";

export default function KaleidoscopeScene({ micData, albumArt }: { micData?: any; albumArt?: string }) {
  return (
    <>
      <KaleidoscopeShader 
        audioFeatures={null} 
        syncedData={null} 
        bass={micData?.bass}
        albumArt={albumArt} 
      />
    </>
  );
}

