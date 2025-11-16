"use client";

import { SyncedAudioData } from "@/lib/audioSync";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";

interface AudioFeatures {
  energy: number;
  tempo: number;
  valence: number;
  danceability: number;
  acousticness: number;
}

interface VisualizationProps {
  audioFeatures: AudioFeatures | null;
  isPlaying: boolean;
  syncedData: SyncedAudioData | null;
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
  audioFeatures,
  isPlaying,
  syncedData,
  micData,
}: VisualizationProps) {
  // Debug logging
  console.log("🔍 Debug Viz - audioFeatures:", audioFeatures);
  console.log("🔍 Debug Viz - syncedData:", syncedData);
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

        {/* Data Status Warnings */}
        {!audioFeatures && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(255, 68, 68, 0.2)",
              border: "2px solid #ff4444",
              borderRadius: "8px",
              marginBottom: "16px",
              color: "#ff4444",
              fontFamily: "monospace",
              textAlign: "center",
            }}
          >
            ⚠️ Audio Features not loaded - Make sure a song is playing!
          </div>
        )}
        {!syncedData && (
          <div
            style={{
              padding: "16px",
              backgroundColor: "rgba(255, 170, 68, 0.2)",
              border: "2px solid #ffaa44",
              borderRadius: "8px",
              marginBottom: "16px",
              color: "#ffaa44",
              fontFamily: "monospace",
              textAlign: "center",
            }}
          >
            ⚠️ Real-time Audio Analysis not loaded
          </div>
        )}

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

        {/* Song Audio Features */}
        <DebugSection title="🎵 Song Audio Features (Spotify)">
          <DebugBar
            label="Energy"
            value={audioFeatures?.energy || 0}
            color="#ff6b6b"
          />
          <DebugBar
            label="Tempo"
            value={(audioFeatures?.tempo || 0) / 200}
            color="#4ecdc4"
            unit=" BPM"
          />
          <DebugBar
            label="Valence (Happiness)"
            value={audioFeatures?.valence || 0}
            color="#ffe66d"
          />
          <DebugBar
            label="Danceability"
            value={audioFeatures?.danceability || 0}
            color="#a8e6cf"
          />
          <DebugBar
            label="Acousticness"
            value={audioFeatures?.acousticness || 0}
            color="#ffd3b6"
          />
        </DebugSection>

        {/* Real-time Synced Data */}
        <DebugSection title="⚡ Real-time Audio Analysis">
          <DebugBar
            label="Interpolated Loudness"
            value={syncedData?.interpolatedLoudness || 0}
            color="#ff5555"
          />
          <DebugBar
            label="Beat Intensity"
            value={syncedData?.beatIntensity || 0}
            color="#ff88ff"
          />
          <DebugBar
            label="Is On Beat"
            value={syncedData?.isOnBeat ? 1 : 0}
            color="#ff00ff"
          />
          <DebugBar
            label="Beat Progress"
            value={syncedData?.beatProgress || 0}
            color="#aa88ff"
          />
          <DebugBar
            label="Bar Progress"
            value={syncedData?.barProgress || 0}
            color="#8888ff"
          />
          <DebugBar
            label="Timbre Energy"
            value={syncedData?.timbreEnergy || 0}
            color="#88ffff"
          />
          <DebugBar
            label="Dominant Pitch"
            value={(syncedData?.dominantPitch || 0) / 12}
            color="#ffaa88"
          />
          <DebugBar
            label="Anticipation"
            value={syncedData?.anticipation || 0}
            color="#ffff88"
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
              <strong>Tempo:</strong>{" "}
              <span style={{ color: "#4ecdc4" }}>
                {audioFeatures?.tempo?.toFixed(1) || "N/A"} BPM
              </span>
            </div>
            <div>
              <strong>Current Section:</strong>{" "}
              <span style={{ color: "#ffe66d" }}>
                {syncedData?.currentSection || "N/A"}
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
          <strong>💡 TIP:</strong> Use this to understand what values your
          visualizations should react to.
          <br />
          Sing or speak into the mic to see voice detection in action!
        </div>
      </div>
    </div>
  );
}

