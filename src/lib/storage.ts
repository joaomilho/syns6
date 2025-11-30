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

