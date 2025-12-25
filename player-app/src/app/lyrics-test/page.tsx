"use client";

import { useState, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import Lyrics3D from "@/components/Lyrics3D";
import { LyricLine } from "@/lib/lyrics";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import styles from "./page.module.css";

// Mock lyrics with varying lengths for testing
const mockLyrics: LyricLine[] = [
  { time: 0, text: "Short line" },
  { time: 3000, text: "This is a medium length lyric line for testing" },
  { time: 6000, text: "Another short one" },
  { time: 9000, text: "This is a very long lyric line that should be split into multiple lines because it exceeds the maximum character limit" },
  { time: 12000, text: "Back to normal" },
  { time: 15000, text: "This line is almost at the break but not quite there" }, // 56 chars
  { time: 18000, text: "This is an extremely long lyric line that should theoretically be split into three or more lines because it contains so many words and characters that it definitely exceeds any reasonable maximum character limit for display" }, // 3+ line test
  { time: 21000, text: "Short" },
  { time: 24000, text: "This line has emojis 🎤 and special characters! @#$%" },
  { time: 27000, text: "Almost at the limit with fifty-nine characters here!" }, // 58 chars
  { time: 30000, text: "UPPERCASE TEXT FOR TESTING" },
  { time: 33000, text: "When you have a super mega ultra extremely incredibly long line of text with many many words that just keeps going and going without stopping it should definitely need multiple line breaks to display properly on screen" }, // Another 3+ line test
  { time: 36000, text: "This is exactly fifty-seven characters long for testing" }, // 57 chars
  { time: 39000, text: "A line with punctuation!!! Really??? Yes..." },
  { time: 42000, text: "Just below the sixty character threshold right here ok" }, // 55 chars
  { time: 45000, text: "Testing edge case with exactly fifty-eight chars now" }, // 58 chars
  { time: 48000, text: "I am singing a very very very very very long song with extremely lengthy lyrics that contain numerous words and phrases that make the line exceptionally extraordinarily unbelievably long requiring many line breaks" }, // 3+ line test
  { time: 50000, text: "Long gap before this line (>10s)" },
  { time: 53000, text: "Another line after gap" },
  { time: 56000, text: "Testing smooth scrolling behavior" },
  { time: 59000, text: "Almost at the end" },
  { time: 62000, text: "Final line" },
];

// Different test sets
const testSets = {
  "Varying Lengths": mockLyrics,
  "All Short": [
    { time: 0, text: "Line 1" },
    { time: 3000, text: "Line 2" },
    { time: 6000, text: "Line 3" },
    { time: 9000, text: "Line 4" },
    { time: 12000, text: "Line 5" },
    { time: 15000, text: "Line 6" },
    { time: 18000, text: "Line 7" },
    { time: 21000, text: "Line 8" },
  ],
  "All Long": [
    { time: 0, text: "This is the first very long lyric line that should be split into multiple lines for proper display" },
    { time: 5000, text: "This is the second very long lyric line that should be split into multiple lines for proper display" },
    { time: 10000, text: "This is the third very long lyric line that should be split into multiple lines for proper display" },
    { time: 15000, text: "This is the fourth very long lyric line that should be split into multiple lines for proper display" },
    { time: 20000, text: "This is the fifth very long lyric line that should be split into multiple lines for proper display" },
  ],
  "Rapid Fire": [
    { time: 0, text: "Fast" },
    { time: 500, text: "Lyrics" },
    { time: 1000, text: "Come" },
    { time: 1500, text: "One" },
    { time: 2000, text: "After" },
    { time: 2500, text: "Another" },
    { time: 3000, text: "Very" },
    { time: 3500, text: "Quickly" },
  ],
  "Big Gaps": [
    { time: 0, text: "First line" },
    { time: 15000, text: "Long gap before this" },
    { time: 30000, text: "Another long gap" },
    { time: 50000, text: "Final line after huge gap" },
  ],
};

export default function LyricsTestPage() {
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [selectedSet, setSelectedSet] = useState<keyof typeof testSets>("Varying Lengths");
  const [color, setColor] = useState("#ff0");
  const [position, setPosition] = useState<[number, number, number]>([0, 5, 0]);
  const [voiceStrength, setVoiceStrength] = useState(0);
  const [backgroundColor, setBackgroundColor] = useState("#1a0a2e");

  const lyrics = testSets[selectedSet];

  // Mock microphone data for voice simulation (always on)
  const mockMicData: MicrophoneData = {
    volume: voiceStrength,
    bass: 0.3,
    mid: 0.5,
    treble: 0.4,
    subBass: 0.2,
    presence: 0.6,
    energy: voiceStrength,
    isLoud: voiceStrength > 1.5,
    isVoice: true,
    voiceStrength: voiceStrength,
    vocal: {
      strength: voiceStrength,
      clarity: 0.8,
      pitch: 0.5,
      harmonics: 0.7,
    },
    instruments: {
      drums: 0.1,
      drumComponents: {
        kick: 0,
        snare: 0,
        hihat: 0,
        cymbal: 0,
        toms: 0,
      },
      bass: 0.1,
      guitar: 0.1,
      piano: 0.1,
      brass: 0,
      strings: 0,
    },
    frequencyData: new Uint8Array(128),
    waveform: new Float32Array(128),
  };

  // Auto-advance time when playing
  useEffect(() => {
    if (!isPlaying) return;

    const interval = setInterval(() => {
      setCurrentTimeMs((prev) => {
        const maxTime = lyrics[lyrics.length - 1]?.time || 0;
        if (prev >= maxTime + 5000) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 100; // Advance by 100ms
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, lyrics]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setCurrentTimeMs(0);
    setIsPlaying(false);
  };

  const handleStepForward = () => {
    setCurrentTimeMs((prev) => prev + 1000);
  };

  const handleStepBackward = () => {
    setCurrentTimeMs((prev) => Math.max(0, prev - 1000));
  };

  const handleJumpToLine = (time: number) => {
    setCurrentTimeMs(time);
  };

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className={styles.container}>
      <div className={styles.canvas} style={{ background: backgroundColor }}>
        <Canvas
          camera={{ position: [0, 0, 30], fov: 75 }}
          gl={{
            antialias: true,
            alpha: true,
            powerPreference: "high-performance",
            failIfMajorPerformanceCaveat: false,
          }}
          dpr={1}
        >
          <Lyrics3D
            lyrics={lyrics}
            currentTimeMs={currentTimeMs}
            color={color}
            position={position}
            micData={mockMicData}
          />
        </Canvas>
      </div>

      <div className={styles.controls}>
        <div className={styles.section}>
          <h2>Test Set</h2>
          <div className={styles.buttonGroup}>
            {(Object.keys(testSets) as Array<keyof typeof testSets>).map((key) => (
              <button
                key={key}
                onClick={() => {
                  setSelectedSet(key);
                  setCurrentTimeMs(0);
                  setIsPlaying(false);
                }}
                className={selectedSet === key ? styles.active : ""}
              >
                {key}
              </button>
            ))}
          </div>
        </div>

        <div className={styles.section}>
          <h2>Playback Controls</h2>
          <div className={styles.playbackInfo}>
            <span className={styles.time}>{formatTime(currentTimeMs)}</span>
            <span className={styles.timeSlider}>
              <input
                type="range"
                min="0"
                max={lyrics[lyrics.length - 1]?.time || 65000}
                value={currentTimeMs}
                onChange={(e) => setCurrentTimeMs(Number(e.target.value))}
                step="100"
              />
            </span>
          </div>
          <div className={styles.buttonGroup}>
            <button onClick={handleReset}>⏮ Reset</button>
            <button onClick={handleStepBackward}>⏪ -1s</button>
            <button onClick={handlePlayPause}>
              {isPlaying ? "⏸ Pause" : "▶️ Play"}
            </button>
            <button onClick={handleStepForward}>⏩ +1s</button>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Appearance</h2>
          <div className={styles.appearanceControls}>
            <label>
              Color:
              <select value={color} onChange={(e) => setColor(e.target.value)}>
                <option value="#ff0">Yellow</option>
                <option value="#0f6">Green</option>
                <option value="#fff">White</option>
                <option value="#f06">Pink</option>
                <option value="#06f">Blue</option>
              </select>
            </label>
            <label>
              Background:
              <select value={backgroundColor} onChange={(e) => setBackgroundColor(e.target.value)}>
                <option value="#1a0a2e">Purple Dark</option>
                <option value="#000">Black</option>
                <option value="#0a0a2e">Blue Dark</option>
                <option value="#2e0a0a">Red Dark</option>
                <option value="#0a2e0a">Green Dark</option>
                <option value="#1a1a1a">Gray Dark</option>
              </select>
            </label>
            <label>
              Y Position:
              <input
                type="range"
                min="-10"
                max="20"
                value={position[1]}
                onChange={(e) => setPosition([0, Number(e.target.value), 0])}
                step="0.5"
              />
              <span>{position[1]}</span>
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Voice</h2>
          <div className={styles.appearanceControls}>
            <label>
              Strength:
              <input
                type="range"
                min="0"
                max="2"
                value={voiceStrength}
                onChange={(e) => setVoiceStrength(Number(e.target.value))}
                step="0.1"
              />
              <span>{voiceStrength.toFixed(1)}</span>
            </label>
          </div>
        </div>

        <div className={styles.section}>
          <h2>Lyrics Timeline</h2>
          <div className={styles.timeline}>
            {lyrics.map((line, index) => (
              <div
                key={index}
                className={`${styles.timelineItem} ${
                  currentTimeMs >= line.time ? styles.passed : ""
                }`}
                onClick={() => handleJumpToLine(line.time)}
              >
                <span className={styles.timelineTime}>{formatTime(line.time)}</span>
                <span className={styles.timelineText}>{line.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

