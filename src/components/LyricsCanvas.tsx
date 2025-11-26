"use client";

import { Canvas } from "@react-three/fiber";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import Lyrics3D from "./Lyrics3D";

interface LyricsCanvasProps {
  lyrics: LyricLine[] | null;
  currentTimeMs: number;
  isPlaying: boolean;
  micData?: MicrophoneData;
  color?: string;
}

/**
 * Standalone lyrics canvas that renders on top of any visualization
 * This allows lyrics to persist when switching visualizations
 */
export default function LyricsCanvas({
  lyrics,
  currentTimeMs,
  isPlaying,
  micData,
  color = "#1ed760",
}: LyricsCanvasProps) {
  // Don't render if no lyrics
  if (!lyrics || lyrics.length === 0) {
    return null;
  }

  return (
    <Canvas
      camera={{ position: [0, 0, 30], fov: 75 }}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none', // Let clicks pass through to visualization
        zIndex: 10, // Above visualizations
      }}
      gl={{ 
        antialias: true,
        alpha: true, // Transparent background
        powerPreference: "high-performance",
        failIfMajorPerformanceCaveat: false,
      }}
      dpr={[1, 2]}
    >
      {/* 3D Lyrics - crisp, no bloom */}
      <Lyrics3D
        lyrics={lyrics}
        currentTimeMs={currentTimeMs}
        isPlaying={isPlaying}
        syncedData={null}
        micData={micData}
        reducedEmissive={false} // Full emissive since no bloom affects this canvas
        color={color}
      />
    </Canvas>
  );
}

