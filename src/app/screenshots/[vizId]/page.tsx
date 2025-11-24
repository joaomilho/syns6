"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import { LyricLine } from "@/lib/lyrics";
import MusicVisualization from "@/components/MusicVisualization";
import FractalVisualization from "@/components/FractalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import AnimatedSceneVisualization from "@/components/AnimatedSceneVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import WaveSpectrum3DVisualization from "@/components/WaveSpectrum3DVisualization";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import OscilloscopeVisualization from "@/components/OscilloscopeVisualization";

// Empty mock lyrics (prevents "no lyrics found" messages)
const mockLyrics: LyricLine[] = [
  { time: 0, text: "" },
];

// Generate realistic animated microphone data
function useAnimatedMicData(): MicrophoneData {
  const [micData, setMicData] = useState<MicrophoneData>({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    subBass: 0,
    presence: 0,
    energy: 0,
    isLoud: false,
    isVoice: false,
    voiceStrength: 0,
    vocal: {
      strength: 0,
      clarity: 0,
      pitch: 0,
      harmonics: 0,
    },
    instruments: {
      drums: 0,
      drumComponents: {
        kick: 0,
        snare: 0,
        hihat: 0,
        cymbal: 0,
        toms: 0,
      },
      bass: 0,
      guitar: 0,
      piano: 0,
      brass: 0,
      strings: 0,
    },
    frequencyData: new Uint8Array(512),
    sampleRate: 48000,
  });

  const frameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.016; // ~60fps
      const t = timeRef.current;

      // Create realistic animated frequency data
      const frequencyData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        // Combine multiple sine waves for realistic spectrum
        const bass = Math.sin(t * 2 + i * 0.01) * 80 + 80;
        const mid = Math.sin(t * 4 + i * 0.02) * 60 + 60;
        const treble = Math.sin(t * 6 + i * 0.03) * 40 + 40;
        
        // Lower frequencies = more energy (typical music spectrum)
        const falloff = Math.exp(-i / 200);
        frequencyData[i] = Math.min(255, (bass + mid + treble) * falloff);
      }

      // Create waveform data for oscilloscope (Float32Array in -1 to 1 range)
      const waveformSize = 4096;
      const waveform = new Float32Array(waveformSize);
      const waveformLeft = new Float32Array(waveformSize);
      const waveformRight = new Float32Array(waveformSize);
      
      for (let i = 0; i < waveformSize; i++) {
        // Complex waveform: mix of frequencies
        const freq1 = Math.sin(t * 2 + i * 0.02) * 0.3;
        const freq2 = Math.sin(t * 3 + i * 0.03) * 0.2;
        const freq3 = Math.sin(t * 5 + i * 0.01) * 0.15;
        waveform[i] = freq1 + freq2 + freq3;
        waveformLeft[i] = waveform[i];
        
        // Phase-shifted for right channel
        const phaseShift = Math.floor(waveformSize / 4);
        waveformRight[i] = waveform[(i + phaseShift) % waveformSize];
      }

      // Animated values with realistic patterns
      const kick = Math.abs(Math.sin(t * 2)) * 0.8 + 0.2;
      const snare = Math.abs(Math.sin(t * 4 + 1)) * 0.6 + 0.1;
      const hihat = Math.abs(Math.sin(t * 8 + 2)) * 0.5 + 0.3;
      
      const bass = Math.abs(Math.sin(t * 1.5)) * 0.7 + 0.3;
      const mid = Math.abs(Math.sin(t * 2.5)) * 0.6 + 0.2;
      const treble = Math.abs(Math.sin(t * 3.5)) * 0.5 + 0.2;
      const volume = (bass + mid + treble) / 3;

      setMicData({
        volume,
        bass,
        mid,
        treble,
        subBass: bass * 0.8,
        presence: treble * 0.9,
        energy: volume * 0.9,
        isLoud: Math.random() > 0.95,
        isVoice: Math.random() > 0.7,
        voiceStrength: Math.abs(Math.sin(t * 3)) * 0.6,
        vocal: {
          strength: Math.abs(Math.sin(t * 3)) * 0.6,
          clarity: Math.abs(Math.cos(t * 2.5)) * 0.7,
          pitch: Math.abs(Math.sin(t * 4)) * 0.5 + 0.3,
          harmonics: Math.abs(Math.cos(t * 3.5)) * 0.6,
        },
        instruments: {
          drums: (kick + snare + hihat) / 3,
          drumComponents: {
            kick,
            snare,
            hihat,
            cymbal: Math.abs(Math.sin(t * 6)) * 0.4,
            toms: Math.abs(Math.sin(t * 3)) * 0.3,
          },
          bass: bass * 0.9,
          guitar: Math.abs(Math.sin(t * 2.8)) * 0.7,
          piano: Math.abs(Math.cos(t * 2.2)) * 0.5,
          brass: Math.abs(Math.sin(t * 3.3)) * 0.4,
          strings: Math.abs(Math.cos(t * 2.7)) * 0.6,
        },
        frequencyData,
        waveform,
        waveformLeft,
        waveformRight,
        sampleRate: 48000,
      });

      frameRef.current = requestAnimationFrame(animate);
    };

    frameRef.current = requestAnimationFrame(animate);
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return micData;
}

export default function ScreenshotPage() {
  const params = useParams();
  const vizId = params.vizId as string;
  const micData = useAnimatedMicData();
  const [currentTime, setCurrentTime] = useState(0);

  // Keep time progression for visualizations that depend on it
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime((prev) => (prev + 100) % 20000); // Loop every 20 seconds
    }, 100);
    return () => clearInterval(interval);
  }, []);

  const renderVisualization = () => {
    switch (vizId) {
      case "particles":
        return (
          <MusicVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "fractal":
        return (
          <FractalVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "psychedelic":
        return (
          <PsychedelicVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "waves":
        return (
          <WavyLinesVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "animated":
        return (
          <AnimatedSceneVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "spectrum3d":
        return (
          <Spectrum3DVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "wavespectrum":
        return (
          <WaveSpectrum3DVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "fftspectrum":
        return (
          <FFTSpectrumVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "camera":
        return (
          <CameraVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "debug":
        return (
          <DebugVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      case "youtube":
        return (
          <YouTubeVisualization
            currentTimeMs={currentTime}
            lyrics={mockLyrics}
          />
        );
      case "oscilloscope":
        return (
          <OscilloscopeVisualization
            isPlaying={true}
            lyrics={mockLyrics}
            currentTimeMs={currentTime}
            micData={micData}
          />
        );
      default:
        return (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100vh",
              color: "white",
              fontSize: "24px",
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}
          >
            Unknown visualization: {vizId}
          </div>
        );
    }
  };

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden" }}>
      {renderVisualization()}
    </div>
  );
}

