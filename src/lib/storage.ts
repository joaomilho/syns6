/**
 * Storage utility using localforage (IndexedDB with localStorage fallback)
 * Better than localStorage: async, more storage, structured data
 */

import localforage from 'localforage';

// Configure localforage
localforage.config({
  name: 'syns',
  storeName: 'preferences',
  description: 'Syns app preferences and settings'
});

// Keys
const KEYS = {
  VISUALIZATION_TYPE: 'visualizationType',
  VISUALIZATION_MODE: 'visualizationMode',
  MICROPHONE_ENABLED: 'microphoneEnabled',
  CAMERA_ENABLED: 'cameraEnabled',
  SHADER_CONTROLS: 'shaderControls',
  LAVALAMP_CONTROLS: 'lavaLampControls',
  FFT_CONTROLS: 'fftControls',
  KALEIDOSCOPE_CONTROLS: 'kaleidoscopeControls',
  ORBITAL_CONTROLS: 'orbitalControls',
  WAVY_LINES_CONTROLS: 'wavyLinesControls',
  SPECTRUM3D_CONTROLS: 'spectrum3DControls',
  YOUTUBE_CONTROLS: 'youtubeControls',
  BLACKHOLE_CONTROLS: 'blackHoleControls',
  HUE_CONTROLS_VISIBLE: 'hueControlsVisible',
  LYRICS_FONT: 'lyricsFont',
  LYRICS_COLOR: 'lyricsColor',
} as const;

// Visualization type
export async function saveVisualizationType(type: string): Promise<void> {
  await localforage.setItem(KEYS.VISUALIZATION_TYPE, type);
}

export async function getVisualizationType(): Promise<string | null> {
  return await localforage.getItem<string>(KEYS.VISUALIZATION_TYPE);
}

// Visualization mode
export async function saveVisualizationMode(mode: string): Promise<void> {
  await localforage.setItem(KEYS.VISUALIZATION_MODE, mode);
}

export async function getVisualizationMode(): Promise<string | null> {
  return await localforage.getItem<string>(KEYS.VISUALIZATION_MODE);
}

// Microphone preference
export async function saveMicrophoneEnabled(enabled: boolean): Promise<void> {
  await localforage.setItem(KEYS.MICROPHONE_ENABLED, enabled);
}

export async function getMicrophoneEnabled(): Promise<boolean | null> {
  return await localforage.getItem<boolean>(KEYS.MICROPHONE_ENABLED);
}

// Camera preference
export async function saveCameraEnabled(enabled: boolean): Promise<void> {
  await localforage.setItem(KEYS.CAMERA_ENABLED, enabled);
}

export async function getCameraEnabled(): Promise<boolean | null> {
  return await localforage.getItem<boolean>(KEYS.CAMERA_ENABLED);
}

// Shader controls
export async function saveShaderControls(controls: { rgbSplit: number; distortion: number; colorShift: number }): Promise<void> {
  await localforage.setItem(KEYS.SHADER_CONTROLS, controls);
}

export async function getShaderControls(): Promise<{ rgbSplit: number; distortion: number; colorShift: number } | null> {
  return await localforage.getItem<{ rgbSplit: number; distortion: number; colorShift: number }>(KEYS.SHADER_CONTROLS);
}

// Lava Lamp controls
export async function saveLavaLampControls(controls: { resolution: number; blobCount: number; globSize?: number; reactivity?: number }): Promise<void> {
  await localforage.setItem(KEYS.LAVALAMP_CONTROLS, controls);
}

export async function getLavaLampControls(): Promise<{ resolution: number; blobCount: number; globSize?: number; reactivity?: number } | null> {
  return await localforage.getItem<{ resolution: number; blobCount: number; globSize?: number; reactivity?: number }>(KEYS.LAVALAMP_CONTROLS);
}

// FFT controls
export async function saveFFTControls(controls: { neonIntensity: number; colorPalette: string; lineWidth: number }): Promise<void> {
  await localforage.setItem(KEYS.FFT_CONTROLS, controls);
}

export async function getFFTControls(): Promise<{ neonIntensity: number; colorPalette: string; lineWidth: number } | null> {
  return await localforage.getItem<{ neonIntensity: number; colorPalette: string; lineWidth: number }>(KEYS.FFT_CONTROLS);
}

// Kaleidoscope controls
export async function saveKaleidoscopeControls(controls: { mode: string; rgbDistance: number; reactivity: number }): Promise<void> {
  await localforage.setItem(KEYS.KALEIDOSCOPE_CONTROLS, controls);
}

export async function getKaleidoscopeControls(): Promise<{ mode: string; rgbDistance: number; reactivity: number } | null> {
  return await localforage.getItem<{ mode: string; rgbDistance: number; reactivity: number }>(KEYS.KALEIDOSCOPE_CONTROLS);
}

// Orbital controls
export async function saveOrbitalControls(controls: { intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number }): Promise<void> {
  await localforage.setItem(KEYS.ORBITAL_CONTROLS, controls);
}

export async function getOrbitalControls(): Promise<{ intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number } | null> {
  return await localforage.getItem<{ intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number }>(KEYS.ORBITAL_CONTROLS);
}

// Wavy Lines controls
export async function saveWavyLinesControls(controls: { numLines: number; colorPalette: string; particleCount: number }): Promise<void> {
  await localforage.setItem(KEYS.WAVY_LINES_CONTROLS, controls);
}

export async function getWavyLinesControls(): Promise<{ numLines: number; colorPalette: string; particleCount: number } | null> {
  return await localforage.getItem<{ numLines: number; colorPalette: string; particleCount: number }>(KEYS.WAVY_LINES_CONTROLS);
}

// Spectrum3D controls
export async function saveSpectrum3DControls(controls: { shape: string; neonIntensity: number; colorPalette: string }): Promise<void> {
  await localforage.setItem(KEYS.SPECTRUM3D_CONTROLS, controls);
}

export async function getSpectrum3DControls(): Promise<{ shape: string; neonIntensity: number; colorPalette: string } | null> {
  return await localforage.getItem<{ shape: string; neonIntensity: number; colorPalette: string }>(KEYS.SPECTRUM3D_CONTROLS);
}

// YouTube controls
export async function saveYouTubeControls(controls: { effect: string }): Promise<void> {
  await localforage.setItem(KEYS.YOUTUBE_CONTROLS, controls);
}

export async function getYouTubeControls(): Promise<{ effect: string } | null> {
  return await localforage.getItem<{ effect: string }>(KEYS.YOUTUBE_CONTROLS);
}

// Black Hole controls
export async function saveBlackHoleControls(controls: { intensity: number; psychedelia: number; lensingStrength: number; diskSize: number }): Promise<void> {
  await localforage.setItem(KEYS.BLACKHOLE_CONTROLS, controls);
}

export async function getBlackHoleControls(): Promise<{ intensity: number; psychedelia: number; lensingStrength: number; diskSize: number } | null> {
  return await localforage.getItem<{ intensity: number; psychedelia: number; lensingStrength: number; diskSize: number }>(KEYS.BLACKHOLE_CONTROLS);
}

// Hue controls visibility
export async function saveHueControlsVisible(visible: boolean): Promise<void> {
  await localforage.setItem(KEYS.HUE_CONTROLS_VISIBLE, visible);
}

export async function getHueControlsVisible(): Promise<boolean | null> {
  return await localforage.getItem<boolean>(KEYS.HUE_CONTROLS_VISIBLE);
}

// Lyrics font
export async function saveLyricsFont(font: string): Promise<void> {
  await localforage.setItem(KEYS.LYRICS_FONT, font);
}

export async function getLyricsFont(): Promise<string | null> {
  return await localforage.getItem<string>(KEYS.LYRICS_FONT);
}

// Lyrics color
export async function saveLyricsColor(color: string): Promise<void> {
  await localforage.setItem(KEYS.LYRICS_COLOR, color);
}

export async function getLyricsColor(): Promise<string | null> {
  return await localforage.getItem<string>(KEYS.LYRICS_COLOR);
}

// YouTube working videos
interface WorkingVideo {
  spotifyId: string;
  workingVideoId: string;
  testedAt: number;
  allVideoIds: string[];
}

export async function saveWorkingVideo(
  spotifyId: string,
  workingVideoId: string,
  allVideoIds: string[]
): Promise<void> {
  const data: WorkingVideo = {
    spotifyId,
    workingVideoId,
    testedAt: Date.now(),
    allVideoIds,
  };
  await localforage.setItem(`youtube_${spotifyId}`, data);
  console.log(`[Storage] ✅ Saved working video for ${spotifyId}:`, workingVideoId);
}

export async function getWorkingVideo(spotifyId: string): Promise<WorkingVideo | null> {
  return await localforage.getItem<WorkingVideo>(`youtube_${spotifyId}`);
}

// Clear old working videos (older than 7 days)
export async function clearOldWorkingVideos(): Promise<void> {
  const keys = await localforage.keys();
  const youtubeKeys = keys.filter(k => k.startsWith('youtube_'));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  
  for (const key of youtubeKeys) {
    const video = await localforage.getItem<WorkingVideo>(key);
    if (video && video.testedAt < sevenDaysAgo) {
      await localforage.removeItem(key);
      console.log(`[Storage] 🗑️ Cleared old video cache:`, key);
    }
  }
}

// Clear all preferences
export async function clearAllPreferences(): Promise<void> {
  await localforage.clear();
}

