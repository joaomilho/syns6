"use client";

/**
 * Kaleidoscope Scene - Scene content only (no Canvas wrapper) for unified canvas
 */

import { KaleidoscopeShader } from "./KaleidoscopeVisualization";

interface KaleidoscopeControls {
  mode: 'album' | 'video';
  rgbDistance: number;
  reactivity: number;
}

export default function KaleidoscopeScene({ 
  micData, 
  albumArt, 
  videoElement,
  kaleidoscopeControls 
}: { 
  micData?: any; 
  albumArt?: string;
  videoElement?: HTMLVideoElement | null;
  kaleidoscopeControls?: KaleidoscopeControls;
}) {
  return (
    <>
      <KaleidoscopeShader 
        audioFeatures={null} 
        syncedData={null} 
        bass={micData?.bass}
        albumArt={albumArt}
        videoElement={videoElement}
        kaleidoscopeControls={kaleidoscopeControls}
      />
    </>
  );
}

