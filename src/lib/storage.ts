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
export async function saveLavaLampControls(controls: { resolution: number; blobCount: number }): Promise<void> {
  await localforage.setItem(KEYS.LAVALAMP_CONTROLS, controls);
}

export async function getLavaLampControls(): Promise<{ resolution: number; blobCount: number } | null> {
  return await localforage.getItem<{ resolution: number; blobCount: number }>(KEYS.LAVALAMP_CONTROLS);
}

// FFT controls
export async function saveFFTControls(controls: { neonIntensity: number; colorPalette: string; lineWidth: number }): Promise<void> {
  await localforage.setItem(KEYS.FFT_CONTROLS, controls);
}

export async function getFFTControls(): Promise<{ neonIntensity: number; colorPalette: string; lineWidth: number } | null> {
  return await localforage.getItem<{ neonIntensity: number; colorPalette: string; lineWidth: number }>(KEYS.FFT_CONTROLS);
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

// Clear all preferences
export async function clearAllPreferences(): Promise<void> {
  await localforage.clear();
}

