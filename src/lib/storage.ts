/**
 * Storage utility using localforage (IndexedDB with localStorage fallback)
 * Better than localStorage: async, more storage, structured data
 */

import localforage from 'localforage';

// Flag to track if IndexedDB is available
let useLocalStorageFallback = false;
let isConfigured = false;

// Configure localforage only on client side
function ensureConfigured() {
  if (isConfigured || typeof window === 'undefined') return;
  
  try {
    localforage.config({
      name: 'syns',
      storeName: 'preferences',
      description: 'Syns app preferences and settings',
      // Try IndexedDB first, then WebSQL, then localStorage
      driver: [
        localforage.INDEXEDDB,
        localforage.WEBSQL,
        localforage.LOCALSTORAGE
      ]
    });
    isConfigured = true;
    
    // Initialize and detect available drivers
    localforage.ready().catch(() => {
      console.warn('[Storage] No persistent storage available, using localStorage fallback');
      useLocalStorageFallback = true;
    });
  } catch (error) {
    console.warn('[Storage] Failed to configure localforage:', error);
    useLocalStorageFallback = true;
    isConfigured = true;
  }
}

// Safe storage wrapper that falls back to localStorage on IndexedDB errors
async function safeGet<T>(key: string): Promise<T | null> {
  if (useLocalStorageFallback) {
    try {
      const item = localStorage.getItem(`syns_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
  
  try {
    return await localforage.getItem<T>(key);
  } catch (error) {
    console.warn('[Storage] IndexedDB failed, falling back to localStorage:', error);
    useLocalStorageFallback = true;
    try {
      const item = localStorage.getItem(`syns_${key}`);
      return item ? JSON.parse(item) : null;
    } catch {
      return null;
    }
  }
}

async function safeSet<T>(key: string, value: T): Promise<void> {
  if (useLocalStorageFallback) {
    try {
      localStorage.setItem(`syns_${key}`, JSON.stringify(value));
    } catch {
      // Silently fail - storage not available
    }
    return;
  }
  
  try {
    await localforage.setItem(key, value);
  } catch (error) {
    console.warn('[Storage] IndexedDB failed, falling back to localStorage:', error);
    useLocalStorageFallback = true;
    try {
      localStorage.setItem(`syns_${key}`, JSON.stringify(value));
    } catch {
      // Silently fail - storage not available
    }
  }
}

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
  await safeSet(KEYS.VISUALIZATION_TYPE, type);
}

export async function getVisualizationType(): Promise<string | null> {
  return await safeGet<string>(KEYS.VISUALIZATION_TYPE);
}

// Visualization mode
export async function saveVisualizationMode(mode: string): Promise<void> {
  await safeSet(KEYS.VISUALIZATION_MODE, mode);
}

export async function getVisualizationMode(): Promise<string | null> {
  return await safeGet<string>(KEYS.VISUALIZATION_MODE);
}

// Microphone preference
export async function saveMicrophoneEnabled(enabled: boolean): Promise<void> {
  await safeSet(KEYS.MICROPHONE_ENABLED, enabled);
}

export async function getMicrophoneEnabled(): Promise<boolean | null> {
  return await safeGet<boolean>(KEYS.MICROPHONE_ENABLED);
}

// Camera preference
export async function saveCameraEnabled(enabled: boolean): Promise<void> {
  await safeSet(KEYS.CAMERA_ENABLED, enabled);
}

export async function getCameraEnabled(): Promise<boolean | null> {
  return await safeGet<boolean>(KEYS.CAMERA_ENABLED);
}

// Shader controls
export async function saveShaderControls(controls: { rgbSplit: number; distortion: number; colorShift: number }): Promise<void> {
  await safeSet(KEYS.SHADER_CONTROLS, controls);
}

export async function getShaderControls(): Promise<{ rgbSplit: number; distortion: number; colorShift: number } | null> {
  return await safeGet<{ rgbSplit: number; distortion: number; colorShift: number }>(KEYS.SHADER_CONTROLS);
}

// Lava Lamp controls
export async function saveLavaLampControls(controls: { resolution: number; blobCount: number; globSize?: number; reactivity?: number }): Promise<void> {
  await safeSet(KEYS.LAVALAMP_CONTROLS, controls);
}

export async function getLavaLampControls(): Promise<{ resolution: number; blobCount: number; globSize?: number; reactivity?: number } | null> {
  return await safeGet<{ resolution: number; blobCount: number; globSize?: number; reactivity?: number }>(KEYS.LAVALAMP_CONTROLS);
}

// FFT controls
export async function saveFFTControls(controls: { neonIntensity: number; colorPalette: string; lineWidth: number }): Promise<void> {
  await safeSet(KEYS.FFT_CONTROLS, controls);
}

export async function getFFTControls(): Promise<{ neonIntensity: number; colorPalette: string; lineWidth: number } | null> {
  return await safeGet<{ neonIntensity: number; colorPalette: string; lineWidth: number }>(KEYS.FFT_CONTROLS);
}

// Kaleidoscope controls
export async function saveKaleidoscopeControls(controls: { mode: string; rgbDistance: number; reactivity: number }): Promise<void> {
  await safeSet(KEYS.KALEIDOSCOPE_CONTROLS, controls);
}

export async function getKaleidoscopeControls(): Promise<{ mode: string; rgbDistance: number; reactivity: number } | null> {
  return await safeGet<{ mode: string; rgbDistance: number; reactivity: number }>(KEYS.KALEIDOSCOPE_CONTROLS);
}

// Orbital controls
export async function saveOrbitalControls(controls: { intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number }): Promise<void> {
  await safeSet(KEYS.ORBITAL_CONTROLS, controls);
}

export async function getOrbitalControls(): Promise<{ intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number } | null> {
  return await safeGet<{ intensity: number; numOrbits: number; colorPalette: string; orbitDistance: number }>(KEYS.ORBITAL_CONTROLS);
}

// Wavy Lines controls
export async function saveWavyLinesControls(controls: { numLines: number; colorPalette: string; particleCount: number }): Promise<void> {
  await safeSet(KEYS.WAVY_LINES_CONTROLS, controls);
}

export async function getWavyLinesControls(): Promise<{ numLines: number; colorPalette: string; particleCount: number } | null> {
  return await safeGet<{ numLines: number; colorPalette: string; particleCount: number }>(KEYS.WAVY_LINES_CONTROLS);
}

// Spectrum3D controls
export async function saveSpectrum3DControls(controls: { shape: string; neonIntensity: number; colorPalette: string }): Promise<void> {
  await safeSet(KEYS.SPECTRUM3D_CONTROLS, controls);
}

export async function getSpectrum3DControls(): Promise<{ shape: string; neonIntensity: number; colorPalette: string } | null> {
  return await safeGet<{ shape: string; neonIntensity: number; colorPalette: string }>(KEYS.SPECTRUM3D_CONTROLS);
}

// YouTube controls
export async function saveYouTubeControls(controls: { effect: string }): Promise<void> {
  await safeSet(KEYS.YOUTUBE_CONTROLS, controls);
}

export async function getYouTubeControls(): Promise<{ effect: string } | null> {
  return await safeGet<{ effect: string }>(KEYS.YOUTUBE_CONTROLS);
}

// Black Hole controls
export async function saveBlackHoleControls(controls: { intensity: number; psychedelia: number; lensingStrength: number; diskSize: number }): Promise<void> {
  await safeSet(KEYS.BLACKHOLE_CONTROLS, controls);
}

export async function getBlackHoleControls(): Promise<{ intensity: number; psychedelia: number; lensingStrength: number; diskSize: number } | null> {
  return await safeGet<{ intensity: number; psychedelia: number; lensingStrength: number; diskSize: number }>(KEYS.BLACKHOLE_CONTROLS);
}

// Hue controls visibility
export async function saveHueControlsVisible(visible: boolean): Promise<void> {
  await safeSet(KEYS.HUE_CONTROLS_VISIBLE, visible);
}

export async function getHueControlsVisible(): Promise<boolean | null> {
  return await safeGet<boolean>(KEYS.HUE_CONTROLS_VISIBLE);
}

// Lyrics font
export async function saveLyricsFont(font: string): Promise<void> {
  await safeSet(KEYS.LYRICS_FONT, font);
}

export async function getLyricsFont(): Promise<string | null> {
  return await safeGet<string>(KEYS.LYRICS_FONT);
}

// Lyrics color
export async function saveLyricsColor(color: string): Promise<void> {
  await safeSet(KEYS.LYRICS_COLOR, color);
}

export async function getLyricsColor(): Promise<string | null> {
  return await safeGet<string>(KEYS.LYRICS_COLOR);
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
  await safeSet(`youtube_${spotifyId}`, data);
  console.log(`[Storage] ✅ Saved working video for ${spotifyId}:`, workingVideoId);
}

export async function getWorkingVideo(spotifyId: string): Promise<WorkingVideo | null> {
  return await safeGet<WorkingVideo>(`youtube_${spotifyId}`);
}

// Clear old working videos (older than 7 days)
export async function clearOldWorkingVideos(): Promise<void> {
  try {
    if (useLocalStorageFallback) {
      // For localStorage fallback, iterate through all keys
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('syns_youtube_')) {
          try {
            const item = localStorage.getItem(key);
            if (item) {
              const video = JSON.parse(item) as WorkingVideo;
              const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
              if (video.testedAt < sevenDaysAgo) {
                keysToRemove.push(key);
              }
            }
          } catch {}
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }
    
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
  } catch (error) {
    console.warn('[Storage] Error clearing old videos:', error);
  }
}

// Clear all preferences
export async function clearAllPreferences(): Promise<void> {
  try {
    if (useLocalStorageFallback) {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key?.startsWith('syns_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      return;
    }
    await localforage.clear();
  } catch (error) {
    console.warn('[Storage] Error clearing preferences:', error);
  }
}

