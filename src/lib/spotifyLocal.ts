/**
 * Local Spotify integration via Tauri osascript
 * Replaces Spotify Web API with direct communication to Spotify.app
 */

import { invoke } from "@tauri-apps/api/core";

/** State returned from Tauri's get_spotify_state command */
interface TauriSpotifyState {
  is_running: boolean;
  is_playing: boolean;
  track_name: string | null;
  artist_name: string | null;
  album_name: string | null;
  duration_ms: number | null;
  position_ms: number | null;
  track_id: string | null;
  fetch_time_ms: number;
}

/** Fast position-only state from Tauri */
interface TauriSpotifyPosition {
  is_running: boolean;
  is_playing: boolean;
  position_ms: number | null;
  fetch_time_ms: number;
}

/** Track interface matching the existing player page structure */
export interface LocalTrack {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
}

/** Playback state matching the existing player page structure */
export interface LocalPlaybackState {
  item: LocalTrack | null;
  is_playing: boolean;
  progress_ms: number;
  fetch_time_ms?: number;  // How long full osascript took (for debugging)
}

/** Fast position update result */
export interface LocalPositionUpdate {
  is_running: boolean;
  is_playing: boolean;
  progress_ms: number;
  fetch_time_ms: number;
}

/** Check if running inside Tauri - cached result */
let _isTauriCached: boolean | null = null;

export function isTauriEnvironment(): boolean {
  if (_isTauriCached !== null) {
    return _isTauriCached;
  }
  
  if (typeof window === "undefined") {
    return false;
  }
  
  // Check for Tauri globals
  const hasTauri = "__TAURI__" in window || "__TAURI_INTERNALS__" in window;
  
  // Only cache if we found Tauri (might not be ready yet on first check)
  if (hasTauri) {
    _isTauriCached = true;
  }
  
  return hasTauri;
}

/** Reset the Tauri cache (useful for testing) */
export function resetTauriCache(): void {
  _isTauriCached = null;
}

// Cache album art URLs to avoid repeated fetches (including failed ones)
const albumArtCache = new Map<string, string | null>();
const pendingFetches = new Map<string, Promise<string | null>>();

/**
 * Get album art URL from our API endpoint (avoids CORS issues)
 */
async function getAlbumArtUrl(trackId: string): Promise<string | null> {
  // Return cached result
  if (albumArtCache.has(trackId)) {
    return albumArtCache.get(trackId) || null;
  }
  
  // Return pending fetch if one exists
  if (pendingFetches.has(trackId)) {
    return pendingFetches.get(trackId)!;
  }
  
  // Start new fetch
  const fetchPromise = (async () => {
    try {
      const response = await fetch(`/api/album-art?trackId=${trackId}`);
      if (!response.ok) {
        albumArtCache.set(trackId, null);
        return null;
      }
      const data = await response.json();
      const url = data.url || null;
      albumArtCache.set(trackId, url);
      return url;
    } catch {
      albumArtCache.set(trackId, null);
      return null;
    } finally {
      pendingFetches.delete(trackId);
    }
  })();
  
  pendingFetches.set(trackId, fetchPromise);
  return fetchPromise;
}

/**
 * Get the currently playing track from local Spotify app
 * Returns data in the same shape as the Spotify Web API for compatibility
 */
export async function getLocallyPlaying(): Promise<LocalPlaybackState | null> {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    const state = await invoke<TauriSpotifyState>("get_spotify_state");

    if (!state.is_running || !state.track_name || !state.track_id) {
      return null;
    }

    // Get album art from cache, or start background fetch
    const cachedArt = albumArtCache.get(state.track_id);
    const albumArtUrl = cachedArt || "";
    
    // Start fetching if not cached (getAlbumArtUrl handles deduplication)
    if (!albumArtCache.has(state.track_id)) {
      getAlbumArtUrl(state.track_id);
    }

    const result: LocalPlaybackState = {
      item: {
        id: state.track_id,
        name: state.track_name,
        artists: [{ name: state.artist_name || "Unknown Artist" }],
        album: {
          name: state.album_name || "Unknown Album",
          images: albumArtUrl ? [{ url: albumArtUrl }] : [],
        },
        duration_ms: state.duration_ms || 0,
      },
      is_playing: state.is_playing,
      progress_ms: state.position_ms || 0,
      fetch_time_ms: state.fetch_time_ms,
    };
    return result;
  } catch (error) {
    return null;
  }
}

/**
 * Get just the current position (fast - for frequent polling)
 * Use this for progress bar updates, use getLocallyPlaying for full track info
 */
export async function getLocalPosition(): Promise<LocalPositionUpdate | null> {
  if (!isTauriEnvironment()) {
    return null;
  }

  try {
    const state = await invoke<TauriSpotifyPosition>("get_spotify_position");
    
    if (!state.is_running) {
      return null;
    }

    return {
      is_running: state.is_running,
      is_playing: state.is_playing,
      progress_ms: state.position_ms || 0,
      fetch_time_ms: state.fetch_time_ms,
    };
  } catch {
    return null;
  }
}

/** Play/resume playback */
export async function localPlay(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("spotify_play");
}

/** Pause playback */
export async function localPause(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("spotify_pause");
}

/** Toggle play/pause */
export async function localPlayPause(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("spotify_play_pause");
}

/** Skip to next track */
export async function localNext(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("spotify_next");
}

/** Go to previous track */
export async function localPrevious(): Promise<void> {
  if (!isTauriEnvironment()) return;
  await invoke("spotify_previous");
}



