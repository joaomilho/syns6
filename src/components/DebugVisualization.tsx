"use client";

import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { HueConfig } from "@/hooks/useHueLights";

interface VisualizationProps {
  micData?: MicrophoneData;
  hueDebugData?: { bass: number; brightness: number } | null;
  hueIsActive?: boolean;
  hueConfig?: HueConfig | null;
}

interface BarProps {
  label: string;
  value: number;
  color: string;
  unit?: string;
  maxValue?: number; // Maximum value for scaling (default 1.0)
}

function DebugBar({
  label,
  value,
  color,
  unit = "",
  maxValue = 1.0,
}: BarProps) {
  // Scale value to 0-100% based on maxValue
  const percentage = Math.min(100, Math.max(0, (value / maxValue) * 100));
  const isOverflow = value > maxValue;

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "4px",
          fontSize: "11px",
          fontFamily: "monospace",
          color: "#fff",
        }}
      >
        <span>{label}</span>
        <span style={{ color: isOverflow ? "#ff0000" : color }}>
          {percentage.toFixed(0)}%
        </span>
      </div>
      <div
        style={{
          width: "100%",
          height: "24px",
          position: "relative",
        }}
      >
        {/* Background bar */}
        <div
          style={{
            height: "6px",
            width: "100%",
            backgroundColor: "rgba(255, 255, 255, 0.1)",
            borderRadius: "4px",
            // border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          <div
            style={{
              width: `${percentage}%`,
              height: "100%",
              backgroundColor: color,
              boxShadow: `0 0 ${percentage / 10}px ${color}`,
              borderRadius: "4px",
              animation: "width 0.1s ease-in-out",
            }}
          ></div>
        </div>
        {/* Filled bar */}

        {/* 50% marker */}
        {[10, 20, 30, 40, 50, 60, 70, 80, 90].map((marker) => (
          <div
            key={marker}
            style={{
              position: "absolute",
              left: `${marker}%`,
              top: 0,
              bottom: 0,
              width: "2px",
              backgroundColor: "rgba(0,0,0, 0.3)",
              transform: "translateX(-1px)",
              zIndex: 10,
              height: "6px",
            }}
          />
        ))}
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

function MicSpectrumBars({
  frequencyData,
  sampleRate,
}: {
  frequencyData: Uint8Array;
  sampleRate: number;
}) {
  // Use more bins for better resolution
  const numBars = 150;
  const binsPerBar = Math.floor(frequencyData.length / numBars);

  const bars = [];
  for (let i = 0; i < numBars; i++) {
    // Average the frequency bins for this bar
    let sum = 0;
    const startBin = i * binsPerBar;
    const endBin = Math.min(startBin + binsPerBar, frequencyData.length);

    for (let j = startBin; j < endBin; j++) {
      sum += frequencyData[j];
    }
    const avgValue = sum / (endBin - startBin);
    const heightPercent = (avgValue / 255) * 100; // frequencyData is 0-255

    // Calculate frequency range for this bar
    const nyquist = sampleRate / 2;
    const freqPerBin = nyquist / frequencyData.length;
    const centerFreq = (startBin + binsPerBar / 2) * freqPerBin;

    // Color based on frequency range
    let color = "#ff4444"; // Bass (red)
    if (centerFreq > 250 && centerFreq <= 2000)
      color = "#ffaa00"; // Mid (orange)
    else if (centerFreq > 2000 && centerFreq <= 8000)
      color = "#00ff88"; // Treble (green)
    else if (centerFreq > 8000) color = "#8888ff"; // High (blue)

    bars.push(
      <div
        key={i}
        style={{
          flex: 1,
          height: `${heightPercent}%`,
          backgroundColor: color,
          opacity: 0.8,
          minWidth: "1px",
        }}
      />
    );
  }

  return (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        height: "170px",
        gap: "0.5px",
      }}
    >
      {bars}
    </div>
  );
}

export default function DebugVisualization({
  micData,
  hueDebugData,
  hueIsActive,
  hueConfig,
}: VisualizationProps) {
  const vocal = micData?.vocal;
  const instruments = micData?.instruments;

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

        {/* RAW VALUES - What we're actually hearing */}
        <DebugSection title="📊 RAW AUDIO DATA">
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: "#fff",
              backgroundColor: "rgba(255, 255, 255, 0.05)",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
          >
            <div>
              <strong>Volume (RMS):</strong> {(micData?.volume || 0).toFixed(4)}
            </div>
            <div>
              <strong>Bass (20-250Hz):</strong>{" "}
              {(micData?.bass || 0).toFixed(4)}
            </div>
            <div>
              <strong>Mid (250-2000Hz):</strong>{" "}
              {(micData?.mid || 0).toFixed(4)}
            </div>
            <div>
              <strong>Treble (2000-8000Hz):</strong>{" "}
              {(micData?.treble || 0).toFixed(4)}
            </div>
            <div>
              <strong>Energy:</strong> {(micData?.energy || 0).toFixed(4)}
            </div>
          </div>

          <DebugBar
            label="Volume"
            value={micData?.volume || 0}
            color="#00ff88"
            maxValue={1.0}
          />
          <DebugBar
            label="Bass"
            value={micData?.bass || 0}
            color="#ff4444"
            maxValue={1.0}
          />
          <DebugBar
            label="Mid"
            value={micData?.mid || 0}
            color="#ffaa44"
            maxValue={1.0}
          />
          <DebugBar
            label="Treble"
            value={micData?.treble || 0}
            color="#44aaff"
            maxValue={1.0}
          />
          <DebugBar
            label="Energy"
            value={micData?.energy || 0}
            color="#ffff44"
            maxValue={1.0}
          />
        </DebugSection>

        {/* Voice Analysis Section */}
        <DebugSection title="🎙️ Voice Analysis">
          <div
            style={{
              fontFamily: "monospace",
              fontSize: "14px",
              color: "#fff",
              backgroundColor: "rgba(255, 0, 255, 0.1)",
              padding: "12px",
              borderRadius: "4px",
              marginBottom: "12px",
            }}
          >
            <div>
              <strong>Vocal Range (300-3400Hz):</strong>{" "}
              {(vocal?.strength || 0).toFixed(4)}
            </div>
            <div>
              <strong>Vocal Clarity:</strong> {(vocal?.clarity || 0).toFixed(4)}
            </div>
            <div>
              <strong>Vocal Pitch (85-300Hz):</strong>{" "}
              {(vocal?.pitch || 0).toFixed(4)}
            </div>
            <div>
              <strong>Vocal Harmonics (1-4kHz):</strong>{" "}
              {(vocal?.harmonics || 0).toFixed(4)}
            </div>
            <div
              style={{
                marginTop: "8px",
                color: micData?.isVoice ? "#00ff00" : "#ff0000",
              }}
            >
              <strong>VOICE DETECTED:</strong>{" "}
              {micData?.isVoice ? "YES ✓" : "NO ✗"}
            </div>
          </div>

          <DebugBar
            label="Vocal Strength (300-3400Hz)"
            value={vocal?.strength || 0}
            color="#ff00ff"
            maxValue={1.0}
          />
          <DebugBar
            label="Vocal Clarity"
            value={vocal?.clarity || 0}
            color="#ff66ff"
            maxValue={1.0}
          />
        </DebugSection>

        {/* Drum Components Section */}
        <DebugSection title="🥁 Drum Components">
          <DebugBar
            label="🥁 Overall Drums"
            value={instruments?.drums || 0}
            color="#ff4444"
            maxValue={1.0}
          />
          <DebugBar
            label="💥 Kick (40-80Hz)"
            value={instruments?.drumComponents?.kick || 0}
            color="#ff0000"
            maxValue={1.0}
          />
          <DebugBar
            label="📀 Snare (150-250Hz)"
            value={instruments?.drumComponents?.snare || 0}
            color="#ff6600"
            maxValue={1.0}
          />
          <DebugBar
            label="🎩 Hi-Hat (8-12kHz)"
            value={instruments?.drumComponents?.hihat || 0}
            color="#ffcc00"
            maxValue={1.0}
          />
          <DebugBar
            label="✨ Cymbal (4-8kHz)"
            value={instruments?.drumComponents?.cymbal || 0}
            color="#ffff00"
            maxValue={1.0}
          />
          <DebugBar
            label="🛢️ Toms (80-150Hz)"
            value={instruments?.drumComponents?.toms || 0}
            color="#ff3300"
            maxValue={1.0}
          />
        </DebugSection>

        {/* Other Instruments Section */}
        <DebugSection title="🎸 Other Instruments">
          <DebugBar
            label="🎸 Bass Guitar"
            value={instruments?.bass || 0}
            color="#ff6644"
            maxValue={1.0}
          />
          <DebugBar
            label="🎸 Guitar"
            value={instruments?.guitar || 0}
            color="#ffaa44"
            maxValue={1.0}
          />
          <DebugBar
            label="🎹 Piano/Keys"
            value={instruments?.piano || 0}
            color="#44aaff"
            maxValue={1.0}
          />
          <DebugBar
            label="🎺 Brass"
            value={instruments?.brass || 0}
            color="#ffdd44"
            maxValue={1.0}
          />
          <DebugBar
            label="🎻 Strings"
            value={instruments?.strings || 0}
            color="#ff88ff"
            maxValue={1.0}
          />
        </DebugSection>

        {/* Microphone Spectrum (Web Audio API - Direct) */}
        {micData?.frequencyData && micData?.sampleRate && (
          <DebugSection title="📊 MICROPHONE SPECTRUM (Web Audio API - Direct)">
            <div
              style={{
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#aaa",
                marginBottom: "8px",
              }}
            >
              Frequency bins: {micData.frequencyData.length} | Sample rate:{" "}
              {micData.sampleRate}Hz | Resolution:{" "}
              {(micData.sampleRate / 2 / micData.frequencyData.length).toFixed(
                2
              )}
              Hz/bin
            </div>
            <div
              style={{
                position: "relative",
                height: "200px",
                backgroundColor: "rgba(0, 0, 0, 0.5)",
                borderRadius: "4px",
                marginBottom: "16px",
                overflow: "hidden",
              }}
            >
              {/* Labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "10px",
                  color: "#666",
                  marginBottom: "4px",
                  fontFamily: "monospace",
                }}
              >
                <span style={{ color: "#ff4444" }}>BASS</span>
                <span style={{ color: "#ffaa00" }}>MID</span>
                <span style={{ color: "#00ff88" }}>TREBLE</span>
                <span style={{ color: "#8888ff" }}>HIGH</span>
              </div>
              {/* Bars container */}
              <MicSpectrumBars
                frequencyData={micData.frequencyData}
                sampleRate={micData.sampleRate}
              />
              {/* Frequency labels */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "9px",
                  color: "#666",
                  marginTop: "4px",
                  fontFamily: "monospace",
                }}
              >
                <span>20Hz</span>
                <span>~2kHz</span>
                <span>~{(micData.sampleRate / 2 / 1000).toFixed(0)}kHz</span>
              </div>
            </div>
          </DebugSection>
        )}

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
          <strong>💡 TIP:</strong> Enable the microphone (⦿ button) to see
          realtime audio analysis.
          <br />
          Sing, speak, or play instruments to see detection in action!
          <br />
          <br />
          <strong>🎵 DETECTION:</strong> Frequency-based detection for Drums,
          Bass, Guitar, Piano, Brass, Strings, and Vocals using Web Audio API.
        </div>

        {/* Hue Debug Panel */}
        {hueDebugData && hueIsActive && (
          <div
            style={{
              marginTop: "32px",
              padding: "16px",
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              borderRadius: "8px",
              fontFamily: "monospace",
              fontSize: "14px",
            }}
          >
            <div
              style={{
                marginBottom: "12px",
                fontWeight: "bold",
                borderBottom: "1px solid #666",
                paddingBottom: "8px",
                fontSize: "16px",
              }}
            >
              💡 Hue Light Debug
            </div>
            <div style={{ marginBottom: "8px" }}>
              Bass Input:{" "}
              <span style={{ color: "#ff6b6b", fontWeight: "bold" }}>
                {(hueDebugData.bass * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Voice Input:{" "}
              <span style={{ color: "#4ecdc4", fontWeight: "bold" }}>
                {micData ? (micData.voiceStrength * 100).toFixed(1) : 0}%
              </span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Drums Input:{" "}
              <span style={{ color: "#ffd93d", fontWeight: "bold" }}>
                {micData && micData.instruments?.drumComponents
                  ? (
                      (((micData.instruments.drumComponents.hihat || 0) * 2.0 +
                        (micData.instruments.drumComponents.cymbal || 0) * 2.0 +
                        (micData.instruments.drumComponents.snare || 0) * 1.0) /
                        5.0) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </span>
              <span
                style={{ fontSize: "10px", color: "#999", marginLeft: "8px" }}
              >
                (H:{micData?.instruments?.drumComponents?.hihat?.toFixed(2) || 0}{" "}
                C:{micData?.instruments?.drumComponents?.cymbal?.toFixed(2) || 0}{" "}
                S:{micData?.instruments?.drumComponents?.snare?.toFixed(2) || 0})
              </span>
            </div>
            <div style={{ marginBottom: "8px" }}>
              Brightness:{" "}
              <span style={{ color: "#4ecdc4", fontWeight: "bold" }}>
                {hueDebugData.brightness}/254
              </span>
              <span style={{ marginLeft: "8px", fontSize: "12px", color: "#999" }}>
                ({((hueDebugData.brightness / 254) * 100).toFixed(0)}% bright)
              </span>
            </div>
            <div
              style={{
                marginTop: "12px",
                fontSize: "11px",
                color: "#666",
                borderTop: "1px solid #444",
                paddingTop: "8px",
              }}
            >
              Bucket: {Math.round(hueDebugData.brightness / (254 / 12))} / 12
            </div>
            <div style={{ marginTop: "5px", fontSize: "10px", color: "#888" }}>
              Lights: {hueConfig?.selectedLights.length || 0} selected
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
