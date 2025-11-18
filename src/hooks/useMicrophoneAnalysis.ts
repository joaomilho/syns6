"use client";

import { useEffect, useRef, useState } from "react";

export interface DrumComponents {
  kick: number; // 0-1, bass drum (40-80Hz)
  snare: number; // 0-1, snare drum (150-250Hz)
  hihat: number; // 0-1, hi-hat (8-12kHz)
  cymbal: number; // 0-1, cymbals (4-8kHz)
  toms: number; // 0-1, tom drums (80-150Hz)
}

export interface InstrumentLevels {
  drums: number; // 0-1, overall percussion/drums
  drumComponents: DrumComponents; // individual drum parts
  bass: number; // 0-1, bass guitar/synth
  guitar: number; // 0-1, electric/acoustic guitar
  piano: number; // 0-1, piano/keys
  brass: number; // 0-1, trumpet/trombone
  strings: number; // 0-1, violin/cello
}

export interface VocalAnalysis {
  strength: number; // 0-1, overall voice strength
  clarity: number; // 0-1, how clear/isolated the voice is
  pitch: number; // 0-1, relative pitch (0=low, 1=high)
  harmonics: number; // 0-1, harmonic richness
}

export interface MicrophoneData {
  volume: number; // 0-1, current volume level
  bass: number; // 0-1, bass frequencies
  mid: number; // 0-1, mid frequencies
  treble: number; // 0-1, treble frequencies
  energy: number; // 0-1, overall energy
  isLoud: boolean; // sudden loud sound detected
  isVoice: boolean; // voice detected (human vocal range)
  voiceStrength: number; // 0-1, how strong the voice signal is
  vocal: VocalAnalysis; // detailed voice analysis
  instruments: InstrumentLevels; // instrument detection
  // Raw spectrum data for visualization
  frequencyData?: Uint8Array;
  sampleRate?: number;
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
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);
  const timeDataArrayRef = useRef<Uint8Array | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(0);
  const previousEnergyRef = useRef<number[]>([]);

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
        analyser.fftSize = 4096; // Higher resolution for better frequency analysis
        analyser.smoothingTimeConstant = 0.3; // Less smoothing for more responsive detection

        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDataArrayRef.current = new Uint8Array(analyser.fftSize);

        // Start analysis loop
        const analyze = () => {
          if (
            !analyserRef.current ||
            !dataArrayRef.current ||
            !timeDataArrayRef.current
          )
            return;

          // Get both frequency and time domain data
          analyserRef.current.getByteFrequencyData(dataArrayRef.current);
          analyserRef.current.getByteTimeDomainData(timeDataArrayRef.current);

          const freqData = dataArrayRef.current;
          const timeData = timeDataArrayRef.current;
          const bufferLength = freqData.length;

          // === STEP 1: Calculate RMS (Root Mean Square) for true volume ===
          let rmsSum = 0;
          for (let i = 0; i < timeData.length; i++) {
            const normalized = (timeData[i] - 128) / 128; // Convert to -1 to 1
            rmsSum += normalized * normalized;
          }
          const rms = Math.sqrt(rmsSum / timeData.length);
          const volume = Math.min(1, rms * 3); // Amplify for better range

          // === STEP 2: Calculate Zero Crossing Rate (ZCR) ===
          // ZCR helps distinguish voice (moderate ZCR) from noise (high ZCR) and bass (low ZCR)
          let zeroCrossings = 0;
          for (let i = 1; i < timeData.length; i++) {
            if (
              (timeData[i] >= 128 && timeData[i - 1] < 128) ||
              (timeData[i] < 128 && timeData[i - 1] >= 128)
            ) {
              zeroCrossings++;
            }
          }
          const zcr = zeroCrossings / timeData.length;

          // === STEP 3: Frequency analysis setup ===
          const sampleRate = audioContextRef.current?.sampleRate || 48000;
          const nyquist = sampleRate / 2;
          const binWidth = nyquist / bufferLength;

          const getEnergy = (startHz: number, endHz: number): number => {
            const startBin = Math.floor(startHz / binWidth);
            const endBin = Math.min(
              Math.floor(endHz / binWidth),
              bufferLength - 1
            );
            let sum = 0;
            for (let i = startBin; i <= endBin; i++) {
              sum += freqData[i] / 255;
            }
            return sum / (endBin - startBin + 1);
          };

          // === STEP 4: Calculate frequency bands ===
          const bass = getEnergy(20, 250);
          const mid = getEnergy(250, 2000);
          const treble = getEnergy(2000, 8000);
          const energy = bass * 0.3 + mid * 0.4 + treble * 0.3;

          // === STEP 5: VOICE DETECTION using multiple features ===
          const vocalRange = getEnergy(300, 3400); // Main vocal range
          const subBass = getEnergy(20, 80); // Voice doesn't produce this

          // Voice characteristics:
          // 1. Strong energy in 300-3400Hz
          // 2. Moderate ZCR (0.05-0.15) - not too high (noise), not too low (bass)
          // 3. Low sub-bass
          const vocalStrength = vocalRange;
          const vocalClarity = volume > 0.01 ? vocalRange / (volume + 0.01) : 0;
          const vocalPitch = getEnergy(85, 300); // Fundamental
          const vocalHarmonics = getEnergy(1000, 4000); // Harmonics

          // Track energy history for temporal analysis
          previousEnergyRef.current.push(vocalRange);
          if (previousEnergyRef.current.length > 5) {
            previousEnergyRef.current.shift();
          }
          const energyVariance =
            previousEnergyRef.current.length > 1
              ? Math.abs(
                  vocalRange -
                    previousEnergyRef.current[
                      previousEnergyRef.current.length - 2
                    ]
                )
              : 0;

          // Voice detection: strong vocal range + moderate ZCR + minimal sub-bass
          const isVoice =
            vocalRange > 0.15 &&
            zcr > 0.03 &&
            zcr < 0.2 &&
            subBass < 0.3 &&
            volume > 0.05;

          // === STEP 6: DRUM COMPONENT DETECTION ===
          // Kick drum: Very low frequencies with sharp attack
          const kickLevel = Math.min(1, getEnergy(40, 80) * 2.5);

          // Snare drum: Mid-low with high transient
          const snareLevel = Math.min(1, getEnergy(150, 250) * 2);

          // Hi-hat: Very high frequencies, crisp
          const hihatLevel = Math.min(1, getEnergy(8000, 12000) * 2);

          // Cymbals: High frequencies, sustained
          const cymbalLevel = Math.min(1, getEnergy(4000, 8000) * 1.5);

          // Toms: Between kick and snare
          const tomsLevel = Math.min(1, getEnergy(80, 150) * 2);

          // Overall drums (combination of all components)
          const drumsLevel = Math.min(
            1,
            (kickLevel +
              snareLevel +
              hihatLevel * 0.5 +
              cymbalLevel * 0.5 +
              tomsLevel) /
              3
          );

          // === STEP 7: OTHER INSTRUMENT DETECTION ===
          const bassLevel = Math.min(1, getEnergy(30, 250) * 2);
          const guitarLevel = Math.min(
            1,
            (getEnergy(80, 400) + getEnergy(400, 3000) * 1.5) / 2
          );
          const pianoLevel = Math.min(
            1,
            (getEnergy(27, 500) + getEnergy(500, 4000)) / 2
          );
          const brassLevel = Math.min(
            1,
            (getEnergy(150, 600) + getEnergy(600, 5000) * 1.2) / 2
          );
          const stringsLevel = Math.min(
            1,
            (getEnergy(200, 800) + getEnergy(800, 4000)) / 2
          );

          // === STEP 7: Detect sudden loud sounds ===
          const volumeChange = volume - previousVolumeRef.current;
          const isLoud = volumeChange > 0.15 && volume > 0.3;
          previousVolumeRef.current = volume;

          setMicData({
            volume,
            bass,
            mid,
            treble,
            energy,
            isLoud,
            isVoice,
            voiceStrength: vocalStrength,
            vocal: {
              strength: vocalStrength,
              clarity: vocalClarity,
              pitch: vocalPitch,
              harmonics: vocalHarmonics,
            },
            instruments: {
              drums: drumsLevel,
              drumComponents: {
                kick: kickLevel,
                snare: snareLevel,
                hihat: hihatLevel,
                cymbal: cymbalLevel,
                toms: tomsLevel,
              },
              bass: bassLevel,
              guitar: guitarLevel,
              piano: pianoLevel,
              brass: brassLevel,
              strings: stringsLevel,
            },
            // Include raw frequency data for visualization
            frequencyData: new Uint8Array(freqData),
            sampleRate: audioContextRef.current?.sampleRate,
          });

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err) {
        console.error("Error accessing microphone:", err);
        setError(
          err instanceof Error ? err.message : "Failed to access microphone"
        );
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
