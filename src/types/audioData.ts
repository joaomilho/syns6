/**
 * Lightweight audio data types for performance optimization.
 * These interfaces ensure visualizations only receive the data they actually need,
 * avoiding unnecessary memory overhead and re-renders.
 */

// Base interface with just scalar values (most common needs)
export interface AudioScalars {
  bass?: number;
  mid?: number;
  treble?: number;
  energy?: number;
  volume?: number;
  subBass?: number;
  presence?: number;
}

// For visualizations that need instrument-specific data
export interface AudioInstruments extends AudioScalars {
  drums?: number;
  vocalStrength?: number;
}

// For visualizations that need frequency spectrum data
export interface AudioFrequency extends AudioScalars {
  frequencyData: Uint8Array;
  sampleRate?: number;
}

// For visualizations that need waveform data (oscilloscope, etc)
export interface AudioWaveform extends AudioScalars {
  waveform?: Float32Array;
  waveformLeft?: Float32Array;
  waveformRight?: Float32Array;
  sampleRate?: number;
}

// Full interface for components that genuinely need everything
export interface AudioComplete extends AudioFrequency, AudioInstruments {
  waveform?: Float32Array;
  waveformLeft?: Float32Array;
  waveformRight?: Float32Array;
  isLoud?: boolean;
  isVoice?: boolean;
}

