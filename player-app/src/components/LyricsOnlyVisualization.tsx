"use client";

/**
 * Lyrics Only Visualization
 * 
 * A minimal visualization that shows only a clean gradient background.
 * The lyrics are rendered separately via LyricsCanvas in the player.
 */
export default function LyricsOnlyVisualization() {
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        background: "radial-gradient(circle at center, #1a1a2e 0%, #0a0a0f 100%)",
        zIndex: 0,
      }}
    />
  );
}

