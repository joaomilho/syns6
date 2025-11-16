export interface AudioAnalysis {
  beats: Beat[];
  bars: Bar[];
  sections: Section[];
  segments: Segment[];
  tatums: Tatum[];
}

export interface Beat {
  start: number;
  duration: number;
  confidence: number;
}

export interface Bar {
  start: number;
  duration: number;
  confidence: number;
}

export interface Section {
  start: number;
  duration: number;
  confidence: number;
  loudness: number;
  tempo: number;
  key: number;
  mode: number;
  time_signature: number;
}

export interface Segment {
  start: number;
  duration: number;
  confidence: number;
  loudness_start: number;
  loudness_max: number;
  loudness_max_time: number;
  pitches: number[]; // 12 values for each pitch class
  timbre: number[]; // Texture descriptors
}

export interface Tatum {
  start: number;
  duration: number;
  confidence: number;
}

export interface SyncedAudioData {
  currentBeat: Beat | null;
  currentBar: Bar | null;
  currentSection: Section | null;
  currentSegment: Segment | null;
  currentTatum: Tatum | null;
  beatProgress: number; // 0-1, how far into current beat
  barProgress: number; // 0-1, how far into current bar
  isOnBeat: boolean; // True if within beat threshold
  timeSinceLastBeat: number;
  interpolatedLoudness: number; // Smoothly interpolated loudness
  beatIntensity: number; // How strong this beat is
  dominantPitch: number; // 0-1 normalized pitch
  timbreEnergy: number; // 0-1 from timbre data
  anticipation: number; // 0-1, increases before beat
}

/**
 * Sync current playback position with audio analysis data
 * Enhanced with better interpolation and prediction
 */
export function syncAudioAnalysis(
  progressMs: number,
  analysis: AudioAnalysis | null
): SyncedAudioData {
  const progressSec = progressMs / 1000;

  if (!analysis) {
    return {
      currentBeat: null,
      currentBar: null,
      currentSection: null,
      currentSegment: null,
      currentTatum: null,
      beatProgress: 0,
      barProgress: 0,
      isOnBeat: false,
      timeSinceLastBeat: 0,
      interpolatedLoudness: 0.5,
      beatIntensity: 1.0,
      dominantPitch: 0,
      timbreEnergy: 0.5,
      anticipation: 0,
    };
  }

  // Find current beat
  const currentBeat = findCurrentItem(analysis.beats, progressSec);
  const beatProgress = currentBeat
    ? (progressSec - currentBeat.start) / currentBeat.duration
    : 0;

  // More aggressive beat detection - larger window
  const isOnBeat = beatProgress < 0.15;
  const timeSinceLastBeat = currentBeat ? progressSec - currentBeat.start : 0;

  // Beat intensity based on confidence and position in bar
  const beatIntensity = currentBeat ? Math.min(1.5, currentBeat.confidence * 1.3) : 1.0;

  // Find current bar
  const currentBar = findCurrentItem(analysis.bars, progressSec);
  const barProgress = currentBar
    ? (progressSec - currentBar.start) / currentBar.duration
    : 0;

  // Find current section
  const currentSection = findCurrentItem(analysis.sections, progressSec);

  // Find current segment
  const currentSegment = findCurrentItem(analysis.segments, progressSec);

  // Find current tatum (smallest rhythmic unit) for sub-beat timing
  const currentTatum = findCurrentItem(analysis.tatums || [], progressSec);

  // ENHANCED: Interpolated loudness with better curve
  const interpolatedLoudness = getEnhancedLoudness(currentSegment, beatProgress);

  // ENHANCED: Dominant pitch from segment
  const dominantPitch = getDominantPitch(currentSegment);

  // ENHANCED: Timbre energy (brightness/texture)
  const timbreEnergy = getTimbreEnergy(currentSegment);

  // ENHANCED: Anticipation - increases before next beat
  const anticipation = getAnticipation(analysis.beats, progressSec, beatProgress);

  return {
    currentBeat,
    currentBar,
    currentSection,
    currentSegment,
    currentTatum,
    beatProgress,
    barProgress,
    isOnBeat,
    timeSinceLastBeat,
    interpolatedLoudness,
    beatIntensity,
    dominantPitch,
    timbreEnergy,
    anticipation,
  };
}

/**
 * Find the current item (beat, bar, section, segment) based on time
 */
function findCurrentItem<T extends { start: number; duration: number }>(
  items: T[],
  timeSec: number
): T | null {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (timeSec >= item.start && timeSec < item.start + item.duration) {
      return item;
    }
  }
  return items[items.length - 1] || null;
}

/**
 * Get the next beat after current time
 */
export function getNextBeat(
  progressMs: number,
  analysis: AudioAnalysis | null
): Beat | null {
  if (!analysis) return null;

  const progressSec = progressMs / 1000;
  for (const beat of analysis.beats) {
    if (beat.start > progressSec) {
      return beat;
    }
  }
  return null;
}

/**
 * Calculate interpolated values for smooth animations
 */
export function getInterpolatedLoudness(
  syncData: SyncedAudioData
): number {
  if (!syncData.currentSegment) return 0;

  const segment = syncData.currentSegment;
  const segmentProgress = syncData.beatProgress; // Reuse for simplicity

  // Interpolate between start loudness and max loudness
  if (segmentProgress < segment.loudness_max_time) {
    const t = segmentProgress / segment.loudness_max_time;
    return lerp(segment.loudness_start, segment.loudness_max, t);
  } else {
    // After max, assume it stays at max
    return segment.loudness_max;
  }
}

/**
 * ENHANCED: Better loudness interpolation with exponential curve
 */
function getEnhancedLoudness(segment: Segment | null, progress: number): number {
  if (!segment) return 0.5;

  // Normalize loudness from dB (-60 to 0) to (0 to 1)
  const normalizeLoudness = (db: number) => Math.max(0, Math.min(1, (db + 60) / 60));

  const startLoudness = normalizeLoudness(segment.loudness_start);
  const maxLoudness = normalizeLoudness(segment.loudness_max);
  const maxTime = segment.loudness_max_time / segment.duration;

  if (progress < maxTime) {
    // Attack phase - exponential rise to max
    const t = progress / maxTime;
    const curve = Math.pow(t, 0.7); // Exponential curve
    return lerp(startLoudness, maxLoudness, curve);
  } else {
    // Decay phase - exponential decay from max
    const t = (progress - maxTime) / (1 - maxTime);
    const curve = Math.pow(1 - t, 1.5); // Exponential decay
    return lerp(maxLoudness, startLoudness * 0.7, 1 - curve);
  }
}

/**
 * ENHANCED: Get timbre energy (brightness/texture)
 */
function getTimbreEnergy(segment: Segment | null): number {
  if (!segment || !segment.timbre) return 0.5;

  // Timbre[0] is typically brightness/energy
  // Normalize to 0-1 range (timbre values are typically -100 to 100)
  const brightness = segment.timbre[0] || 0;
  return Math.max(0, Math.min(1, (brightness + 100) / 200));
}

/**
 * ENHANCED: Calculate anticipation before next beat
 */
function getAnticipation(beats: Beat[], progressSec: number, beatProgress: number): number {
  // Anticipation builds in last 20% of beat
  if (beatProgress > 0.8) {
    // Exponential rise
    const t = (beatProgress - 0.8) / 0.2;
    return Math.pow(t, 2); // 0 to 1, exponential
  }
  return 0;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Get dominant pitch from segment
 */
export function getDominantPitch(segment: Segment | null): number {
  if (!segment || !segment.pitches) return 0;

  let maxPitch = 0;
  let maxValue = 0;

  segment.pitches.forEach((value, index) => {
    if (value > maxValue) {
      maxValue = value;
      maxPitch = index;
    }
  });

  return maxPitch / 12; // Normalize to 0-1
}

