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
  subBass: number; // 0-1, sub-bass frequencies (20-80Hz)
  presence: number; // 0-1, presence frequencies (4-6kHz)
  energy: number; // 0-1, overall energy
  isLoud: boolean; // sudden loud sound detected
  isVoice: boolean; // voice detected (human vocal range)
  voiceStrength: number; // 0-1, how strong the voice signal is
  vocal: VocalAnalysis; // detailed voice analysis
  instruments: InstrumentLevels; // instrument detection
  // Raw spectrum data for visualization
  frequencyData?: Uint8Array;
  waveform?: Float32Array; // time-domain waveform data for oscilloscope (Float32 like woscope)
  waveformLeft?: Float32Array; // LEFT channel (X-axis) - direct signal
  waveformRight?: Float32Array; // RIGHT channel (Y-axis) - phase-shifted for patterns
  sampleRate?: number;
}

export function useMicrophoneAnalysis() {
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
  });
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const timeDataArrayRef = useRef<Float32Array<ArrayBuffer> | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const previousVolumeRef = useRef(0);
  const previousEnergyRef = useRef<number[]>([]);
  
  // Auto-request microphone on page load - check saved preference
  useEffect(() => {
    const checkMicrophonePreference = async () => {
      const { getMicrophoneEnabled } = await import('@/lib/storage');
      const savedPreference = await getMicrophoneEnabled();
      
      // Always try to enable mic (app requires it)
      setIsEnabled(true);
    };
    checkMicrophonePreference();
  }, []);

  useEffect(() => {
    if (!isEnabled) return;

    let stream: MediaStream | null = null;

    const setupMicrophone = async () => {
      try {
        // Check if mediaDevices is available
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error(
            'MediaDevices API not available. This usually means:\n' +
            '1. Using HTTP on non-localhost domain (requires HTTPS)\n' +
            '2. Browser doesn\'t support microphone access\n' +
            '3. Insecure context (mixed HTTP/HTTPS content)'
          );
        }

        // Request microphone access with minimal processing
        const constraints = {
          audio: {
            echoCancellation: false, // Disable processing for pure audio
            noiseSuppression: false,
            autoGainControl: false,
          }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);

        // Create audio context and analyser (MONO only - phase shift for oscilloscope)
        const audioContext = new AudioContext();
        const source = audioContext.createMediaStreamSource(stream);
        
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 4096;
        analyser.smoothingTimeConstant = 0.3;
        source.connect(analyser);

        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        timeDataArrayRef.current = new Float32Array(analyser.fftSize);

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
          analyserRef.current.getFloatTimeDomainData(timeDataArrayRef.current);

          const freqData = dataArrayRef.current;
          const timeData = timeDataArrayRef.current;
          const bufferLength = freqData.length;
          
          // Create pseudo-stereo for X-Y oscilloscope
          // Left (X) = direct signal
          const timeDataLeft = new Float32Array(timeData);
          
          // Right (Y) - Quarter-cycle phase shift
          const timeDataRight = new Float32Array(timeData.length);
          const phaseShift = Math.floor(timeData.length / 4);
          for (let i = 0; i < timeData.length; i++) {
            timeDataRight[i] = timeData[(i + phaseShift) % timeData.length];
          }

          // === STEP 1: Calculate RMS (Root Mean Square) for true volume ===
          let rmsSum = 0;
          for (let i = 0; i < timeData.length; i++) {
            // timeData is already Float32Array in -1 to 1 range
            rmsSum += timeData[i] * timeData[i];
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
          const subBass = getEnergy(20, 80); // Sub-bass (very low frequencies)
          const bass = getEnergy(20, 250);
          const mid = getEnergy(250, 2000);
          const treble = getEnergy(2000, 8000);
          const presence = getEnergy(4000, 6000); // Presence (vocal clarity)
          const energy = bass * 0.3 + mid * 0.4 + treble * 0.3;

          // === STEP 5: VOICE DETECTION (BACK TO BASICS) ===
          // Use the ORIGINAL approach that worked, with minimal bass filtering
          const vocalFundamental = getEnergy(85, 300); // Core voice frequencies
          const vocalHarmonics = getEnergy(300, 3400); // Overtones
          const vocalLowMid = getEnergy(300, 1000); // Important for speech clarity
          const vocalHighMid = getEnergy(1000, 3400); // Sibilance and brightness
          // subBass already calculated above

          // Original calculation that worked well
          const rawVocalStrength =
            (vocalFundamental * 2.0 + // Fundamental is most important
              vocalLowMid * 1.5 + // Speech clarity
              vocalHighMid * 0.8) / // Brightness/sibilance
            4.3; // Normalize

          // Simple bass check: if there's PURE sub-bass (20-80Hz), reduce voice slightly
          // But don't kill it completely - just reduce by the amount of sub-bass
          const bassReduction = Math.max(0.5, 1.0 - subBass * 0.5); // Reduce by up to 50%

          // Apply 2x boost and bass reduction
          const vocalStrength = Math.min(
            1.0,
            rawVocalStrength * 2.0 * bassReduction
          );

          const vocalClarity =
            volume > 0.01 ? vocalStrength / (volume + 0.01) : 0;
          const vocalPitch = vocalFundamental;

          // Track energy history for temporal analysis
          previousEnergyRef.current.push(vocalStrength);
          if (previousEnergyRef.current.length > 5) {
            previousEnergyRef.current.shift();
          }
          const energyVariance =
            previousEnergyRef.current.length > 1
              ? Math.abs(
                  vocalStrength -
                    previousEnergyRef.current[
                      previousEnergyRef.current.length - 2
                    ]
                )
              : 0;

          // Improved voice detection:
          // - Strong vocal strength (fundamentals + harmonics)
          // - Moderate ZCR (not noise, not pure bass)
          // - Minimal sub-bass (voice doesn't go that low)
          // - Sufficient volume
          const isVoice =
            vocalStrength > 0.12 &&
            zcr > 0.03 &&
            zcr < 0.25 &&
            subBass < 0.4 &&
            volume > 0.03;

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
            subBass,
            presence,
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
            waveform: new Float32Array(timeData), // Float32Array like woscope
            waveformLeft: new Float32Array(timeDataLeft), // LEFT channel (X-axis) - direct
            waveformRight: new Float32Array(timeDataRight), // RIGHT channel (Y-axis) - phase-shifted
            sampleRate: audioContextRef.current?.sampleRate,
          });

          animationFrameRef.current = requestAnimationFrame(analyze);
        };

        analyze();
      } catch (err) {
        console.error("❌ Error accessing microphone:", err);
        console.log("💡 Please click the microphone button or check browser permissions");
        setError(
          err instanceof Error ? err.message : "Failed to access microphone"
        );
        // Don't mark as denied - app needs mic, will request again on next load
        const { saveMicrophoneEnabled } = await import('@/lib/storage');
        await saveMicrophoneEnabled(false);
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

  const enable = async () => {
    const { saveMicrophoneEnabled } = await import('@/lib/storage');
    await saveMicrophoneEnabled(true);
    setIsEnabled(true);
  };
  
  const disable = async () => {
    const { saveMicrophoneEnabled } = await import('@/lib/storage');
    await saveMicrophoneEnabled(false);
    setIsEnabled(false);
  };

  return {
    micData,
    isEnabled,
    enable,
    disable,
    error,
  };
}
