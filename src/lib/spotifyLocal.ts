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
}

/** Check if running inside Tauri */
export function isTauriEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

/**
 * Get album art URL from Spotify track ID
 * Uses the Spotify oEmbed endpoint which doesn't require authentication
 */
async function getAlbumArtUrl(trackId: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.thumbnail_url || null;
  } catch {
    return null;
  }
}

// Cache album art URLs to avoid repeated fetches
const albumArtCache = new Map<string, string>();

/**
 * Get the currently playing track from local Spotify app
 * Returns data in the same shape as the Spotify Web API for compatibility
 */
export async function getLocallyPlaying(): Promise<LocalPlaybackState | null> {
  if (!isTauriEnvironment()) {
    console.warn("getLocallyPlaying called outside Tauri environment");
    return null;
  }

  try {
    const state = await invoke<TauriSpotifyState>("get_spotify_state");

    if (!state.is_running || !state.track_name || !state.track_id) {
      return null;
    }

    // Get album art (from cache or fetch)
    let albumArtUrl = albumArtCache.get(state.track_id);
    if (!albumArtUrl) {
      albumArtUrl = (await getAlbumArtUrl(state.track_id)) || "";
      if (albumArtUrl) {
        albumArtCache.set(state.track_id, albumArtUrl);
      }
    }

    return {
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
    };
  } catch (error) {
    console.error("Failed to get Spotify state:", error);
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



