"use client";

import { useParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { MicrophoneData } from "@/hooks/useMicrophoneAnalysis";
import OrbitalVisualization from "@/components/OrbitalVisualization";
import PsychedelicVisualization from "@/components/PsychedelicVisualization";
import KaleidoscopeVisualization from "@/components/KaleidoscopeVisualization";
import WavyLinesVisualization from "@/components/WavyLinesVisualization";
import LavaLampVisualization from "@/components/LavaLampVisualization";
import Spectrum3DVisualization from "@/components/Spectrum3DVisualization";
import FFTSpectrumVisualization from "@/components/FFTSpectrumVisualization";
import CameraVisualization from "@/components/CameraVisualization";
import DebugVisualization from "@/components/DebugVisualization";
import YouTubeVisualization from "@/components/YouTubeVisualization";
import OscilloscopeVisualization from "@/components/OscilloscopeVisualization";
import LyricsOnlyVisualization from "@/components/LyricsOnlyVisualization";

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

      // Create INTENSE animated frequency data
      const frequencyData = new Uint8Array(512);
      for (let i = 0; i < 512; i++) {
        // Combine multiple sine waves for dramatic spectrum
        const bassFreq = Math.sin(t * 3 + i * 0.01) * 120 + 120;
        const midFreq = Math.sin(t * 5 + i * 0.02) * 100 + 100;
        const trebleFreq = Math.sin(t * 7 + i * 0.03) * 80 + 80;
        
        // Lower frequencies = more energy (typical music spectrum)
        const falloff = Math.exp(-i / 200);
        frequencyData[i] = Math.min(255, (bassFreq + midFreq + trebleFreq) * falloff);
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

      // INTENSE animated values with dramatic patterns for lava lamp
      const kick = Math.abs(Math.sin(t * 3)) * 1.0; // More frequent, stronger kicks
      const snare = Math.abs(Math.sin(t * 5 + 1)) * 0.9;
      const hihat = Math.abs(Math.sin(t * 10 + 2)) * 0.8;
      
      const bass = Math.abs(Math.sin(t * 2.5)) * 1.0; // Full range bass
      const mid = Math.abs(Math.sin(t * 3.5)) * 0.9;
      const treble = Math.abs(Math.sin(t * 4.5)) * 0.8;
      const volume = (bass + mid + treble) / 3;
      
      // Add dramatic bass hits every 2 seconds
      const bassHit = Math.floor(t * 0.5) % 2 === 0 && (t * 0.5) % 1 < 0.1 ? 1.0 : 0;

      setMicData({
        volume,
        bass: Math.max(bass, bassHit), // Use bass hit for dramatic kicks
        mid,
        treble,
        subBass: bass * 0.9,
        presence: treble * 0.9,
        energy: volume * 1.2 + bassHit * 0.3, // Higher energy, boost on bass hits
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
            kick: Math.max(kick, bassHit),
            snare,
            hihat,
            cymbal: Math.abs(Math.sin(t * 7)) * 0.8,
            toms: Math.abs(Math.sin(t * 4)) * 0.6,
          },
          bass: Math.max(bass, bassHit) * 0.95,
          guitar: Math.abs(Math.sin(t * 3.5)) * 0.9,
          piano: Math.abs(Math.cos(t * 3.0)) * 0.8,
          brass: Math.abs(Math.sin(t * 4.0)) * 0.7,
          strings: Math.abs(Math.cos(t * 3.5)) * 0.8,
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
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);

  // Initialize camera for camera visualization
  useEffect(() => {
    if (vizId !== 'camera') return;
    
    let video: HTMLVideoElement | null = null;
    
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { width: 1280, height: 720 } 
        });
        video = document.createElement('video');
        video.srcObject = stream;
        video.autoplay = true;
        video.playsInline = true;
        video.muted = true;
        await video.play();
        setVideoElement(video);
        console.log('📷 Camera initialized');
      } catch (err) {
        console.error('Failed to initialize camera:', err);
      }
    };
    
    initCamera();
    
    return () => {
      if (video) {
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    };
  }, [vizId]);

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
          <OrbitalVisualization
            bass={micData.bass}
            energy={micData.energy}
            treble={micData.treble}
            frequencyData={micData.frequencyData}
          />
        );
      case "psychedelic":
        return (
          <PsychedelicVisualization
            // Note: This viz doesn't need micData at all!
          />
        );
      case "kaleidoscope":
        return (
          <KaleidoscopeVisualization
            bass={micData.bass}
            albumArt="/Kaleidoscope/a3fcd0d7e20e42e687962a3d4519f7a7.jpg"
          />
        );
      case "waves":
        return (
          <WavyLinesVisualization
            energy={micData.energy}
            volume={micData.volume}
            bass={micData.bass}
            drums={micData.instruments.drums}
            vocalStrength={micData.vocal.strength}
          />
        );
      case "animated":
        return (
          <LavaLampVisualization
            energy={micData.energy}
            bass={micData.bass}
            mid={micData.mid}
            treble={micData.treble}
            volume={micData.volume}
          />
        );
      case "spectrum3d":
        return (
          <Spectrum3DVisualization
            frequencyData={micData.frequencyData}
            sampleRate={micData.sampleRate}
          />
        );
      case "fftspectrum":
        return (
          <FFTSpectrumVisualization
            frequencyData={micData.frequencyData}
          />
        );
      case "camera":
        return (
          <CameraVisualization
            micData={micData}
            videoElement={videoElement}
          />
        );
      case "debug":
        return (
          <DebugVisualization
            micData={micData}
          />
        );
      case "youtube":
        // Use the default fallback video from YouTubeVisualization
        const DEFAULT_VIDEO_ID = "L1vrPpM4eyM";
        return (
          <div
            style={{
              position: "fixed",
              top: 0,
              left: 0,
              width: "100vw",
              height: "100vh",
              zIndex: 0,
              background: "#000000",
            }}
          >
            <iframe
              width="100%"
              height="100%"
              src={`https://www.youtube.com/embed/${DEFAULT_VIDEO_ID}?autoplay=1&mute=1&controls=0&modestbranding=1&rel=0&start=10`}
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              style={{ border: 'none' }}
            />
          </div>
        );
      case "oscilloscope":
        return (
          <OscilloscopeVisualization
            waveform={micData.waveform}
            waveformLeft={micData.waveformLeft}
            waveformRight={micData.waveformRight}
            bass={micData.bass}
            energy={micData.energy}
            volume={micData.volume}
            treble={micData.treble}
          />
        );
      case "lyricsonly":
        return (
          <>
            <LyricsOnlyVisualization />
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 2,
                pointerEvents: 'none',
                fontFamily: 'system-ui, -apple-system, sans-serif',
              }}
            >
              {/* Past line */}
              <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '24px', marginBottom: '16px' }}>
                My my, how can I resist you?
              </div>
              {/* Current line */}
              <div style={{ 
                color: '#ffffff', 
                fontSize: '48px', 
                fontWeight: 'bold',
                textShadow: '0 0 20px rgba(255,255,255,0.5)',
              }}>
                Mamma mia!
              </div>
              {/* Next line */}
              <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: '32px', marginTop: '16px' }}>
                Here I go again
              </div>
            </div>
          </>
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

