"use client";

import { useEffect, useRef, useState } from "react";

export interface MicrophoneData {
  volume: number; // 0-1, current volume level
  bass: number; // 0-1, bass frequencies
  mid: number; // 0-1, mid frequencies
  treble: number; // 0-1, treble frequencies
  energy: number; // 0-1, overall energy
  isLoud: boolean; // sudden loud sound detected
  isVoice: boolean; // voice detected (human vocal range)
  voiceStrength: number; // 0-1, how strong the voice signal is
}

export function useMicrophoneAnalysis() {
  const [micData, setMicData] = useState<MicrophoneData>({
    volume: 0,
    bass: 0,
    mid: 0,
    treble: 0,
    energy: 0,
    isLoud: false,
    isVoice: false,
    voiceStrength: 0,
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(0);

  useEffect(() => {
    if (!isEnabled) return;

    let stream: MediaStream | null = null;

    const setupMicrophone = async () => {
      try {
        // Request microphone access
        stream = await navigator.mediaDevices.getUserMedia({ audio: true });

        // Create audio context and analyser
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.8;

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);

        // Start analysis loop
        const analyze = () => {
          if (!analyserRef.current || !dataArrayRef.current) return;

          analyserRef.current.getByteFrequencyData(dataArrayRef.current);

          const bufferLength = dataArrayRef.current.length;
          const data = dataArrayRef.current;

          // Calculate overall volume (0-1)
          let sum = 0;
          for (let i = 0; i < bufferLength; i++) {
            sum += data[i];
          }
          const volume = sum / (bufferLength * 255);

          // Split into frequency bands
          const bassEnd = Math.floor(bufferLength * 0.1); // Low frequencies
          const midEnd = Math.floor(bufferLength * 0.4); // Mid frequencies
          // Treble is the rest

          let bassSum = 0;
          for (let i = 0; i < bassEnd; i++) {
            bassSum += data[i];
          }
          const bass = bassSum / (bassEnd * 255);

          let midSum = 0;
          for (let i = bassEnd; i < midEnd; i++) {
            midSum += data[i];
          }
          const mid = midSum / ((midEnd - bassEnd) * 255);

          let trebleSum = 0;
          for (let i = midEnd; i < bufferLength; i++) {
            trebleSum += data[i];
          }
          const treble = trebleSum / ((bufferLength - midEnd) * 255);

          // Calculate energy (weighted by frequency importance)
          const energy = bass * 0.4 + mid * 0.3 + treble * 0.3;

          // Detect sudden loud sounds (threshold crossing)
          const volumeChange = volume - previousVolumeRef.current;
          const isLoud = volumeChange > 0.15 && volume > 0.3;
          previousVolumeRef.current = volume;

          // VOICE DETECTION
          // Human voice fundamental: 85-255 Hz (male) to 165-255 Hz (female)
          // Voice harmonics: 300 Hz - 4000 Hz (most energy in 300-3400 Hz)
          // Sample rate is typically 48000 Hz, so Nyquist is 24000 Hz
          const sampleRate = audioContextRef.current?.sampleRate || 48000;
          const nyquist = sampleRate / 2;
          const binWidth = nyquist / bufferLength;

          // Calculate frequency ranges for voice detection
          const voiceFundamentalStart = Math.floor(85 / binWidth); // 85 Hz
          const voiceFundamentalEnd = Math.floor(300 / binWidth); // 300 Hz
          const voiceHarmonicsStart = Math.floor(300 / binWidth); // 300 Hz
          const voiceHarmonicsEnd = Math.floor(4000 / binWidth); // 4000 Hz

          // Measure energy in voice fundamental range
          let voiceFundamentalSum = 0;
          for (let i = voiceFundamentalStart; i < voiceFundamentalEnd && i < bufferLength; i++) {
            voiceFundamentalSum += data[i];
          }
          const voiceFundamental = voiceFundamentalSum / ((voiceFundamentalEnd - voiceFundamentalStart) * 255);

          // Measure energy in voice harmonics range
          let voiceHarmonicsSum = 0;
          for (let i = voiceHarmonicsStart; i < voiceHarmonicsEnd && i < bufferLength; i++) {
            voiceHarmonicsSum += data[i];
          }
          const voiceHarmonics = voiceHarmonicsSum / ((voiceHarmonicsEnd - voiceHarmonicsStart) * 255);

          // Voice detection: strong presence in both fundamental and harmonics
          // AND low bass (to filter out music/instruments)
          const voiceStrength = (voiceFundamental * 0.4 + voiceHarmonics * 0.6);
          const isVoice = voiceStrength > 0.15 && volume > 0.1 && bass < 0.3;

          setMicData({
            volume,
            bass,
            mid,
            treble,
            energy,
            isLoud,
            isVoice,
            voiceStrength,
          });

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setError(err instanceof Error ? err.message : "Failed to access microphone");
        setIsEnabled(false);
      }
    };

    setupMicrophone();

    // Cleanup
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, [isEnabled]);

  const enable = () => setIsEnabled(true);
  const disable = () => setIsEnabled(false);

  return {
    micData,
    isEnabled,
    enable,
    disable,
    error,
  };
}

