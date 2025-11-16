"use client";

import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

interface VisualizationProps {
  isPlaying: boolean;
  lyrics?: LyricLine[] | null;
  currentTimeMs?: number;
  micData?: MicrophoneData;
}

interface BarProps {
  label: string;
  value: number;
  color: string;
  unit?: string;
}

function DebugBar({ label, value, color, unit = "" }: BarProps) {
  const percentage = Math.min(100, Math.max(0, value * 100));
  const displayValue = unit ? `${value.toFixed(3)}${unit}` : value.toFixed(3);

  return (
    <div style={{ marginBottom: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: "12px",
          fontFamily: "monospace",
          color: "#fff",
        }}
      >
        <span>{label}</span>
        <span style={{ color }}>{displayValue}</span>
      </div>
      <div
        style={{
          width: "100%",
          height: "20px",
          backgroundColor: "rgba(255, 255, 255, 0.1)",
          borderRadius: "4px",
          overflow: "hidden",
          border: "1px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <div
          style={{
            width: `${percentage}%`,
            height: "100%",
            backgroundColor: color,
            transition: "width 0.1s ease-out",
          }}
        />
      </div>
    </div>
  );
}

function DebugSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        marginBottom: "24px",
        padding: "16px",
        backgroundColor: "rgba(0, 0, 0, 0.6)",
        borderRadius: "8px",
        border: "1px solid rgba(255, 255, 255, 0.2)",
      }}
    >
      <h3
        style={{
          margin: "0 0 16px 0",
          fontSize: "16px",
          fontFamily: "monospace",
          color: "#fff",
          textTransform: "uppercase",
          letterSpacing: "1px",
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

export default function DebugVisualization({
  isPlaying,
  micData,
}: VisualizationProps) {
  // Debug logging
  console.log("🔍 Debug Viz - isPlaying:", isPlaying);
  console.log("🔍 Debug Viz - micData:", micData);

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: 0,
        background: "linear-gradient(to bottom, #1a1a2e 0%, #0f0f1e 100%)",
        overflow: "auto",
        padding: "40px",
      }}
    >
      <div style={{ maxWidth: "800px", margin: "0 auto" }}>
        <h1
          style={{
            color: "#fff",
            fontFamily: "monospace",
            fontSize: "32px",
            marginBottom: "32px",
            textAlign: "center",
            textTransform: "uppercase",
            letterSpacing: "2px",
          }}
        >
          🔍 Debug Visualization
        </h1>

        {/* Microphone Section */}
        <DebugSection title="🎤 Microphone Input">
          <DebugBar
            label="Volume"
            value={micData?.volume || 0}
            color="#00ff88"
          />
          <DebugBar
            label="Voice Strength (SINGING/SPEAKING)"
            value={micData?.voiceStrength || 0}
            color="#ff00ff"
          />
          <DebugBar
            label="Is Voice Detected"
            value={micData?.isVoice ? 1 : 0}
            color="#ff00ff"
          />
          <DebugBar label="Bass" value={micData?.bass || 0} color="#ff4444" />
          <DebugBar label="Mid" value={micData?.mid || 0} color="#ffaa44" />
          <DebugBar
            label="Treble"
            value={micData?.treble || 0}
            color="#44aaff"
          />
          <DebugBar
            label="Energy"
            value={micData?.energy || 0}
            color="#ffff44"
          />
          <DebugBar
            label="Is Loud (Sudden)"
            value={micData?.isLoud ? 1 : 0}
            color="#ff0000"
          />
        </DebugSection>

        {/* Status */}
        <DebugSection title="📊 Status">
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: "#fff",
              lineHeight: "1.8",
            }}
          >
            <div>
              <strong>Playing:</strong>{" "}
              <span style={{ color: isPlaying ? "#00ff88" : "#ff4444" }}>
                {isPlaying ? "YES" : "NO"}
              </span>
            </div>
            <div>
              <strong>Mic Enabled:</strong>{" "}
              <span style={{ color: micData ? "#00ff88" : "#ff4444" }}>
                {micData ? "YES" : "NO"}
              </span>
            </div>
          </div>
        </DebugSection>

        {/* Legend */}
        <div
          style={{
            marginTop: "32px",
            padding: "16px",
            backgroundColor: "rgba(0, 0, 0, 0.4)",
            borderRadius: "8px",
            fontFamily: "monospace",
            fontSize: "12px",
            color: "#aaa",
            textAlign: "center",
          }}
        >
          <strong>💡 TIP:</strong> Enable the microphone (🎤 button) to see realtime audio analysis.
          <br />
          Sing or speak to see voice detection in action!
          <br />
          <br />
          <strong>⚠️ NOTE:</strong> Spotify audio features/analysis endpoints are deprecated for new apps (Nov 27, 2024).
          <br />
          All visualizations now react to microphone input only.
        </div>
      </div>
    </div>
  );
}
