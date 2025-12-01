/**
 * Spotify Web API wrapper utilities
 * Use these functions to make authenticated requests to the Spotify API
 */

export interface SpotifyApiOptions {
  accessToken: string;
  endpoint: string;
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: any;
}

/**
 * Make an authenticated request to the Spotify Web API
 * @param options - API request options
 * @returns Promise with the API response
 */
export async function spotifyApi<T = any>({
  accessToken,
  endpoint,
  method = "GET",
  body,
}: SpotifyApiOptions): Promise<T> {
  const url = endpoint.startsWith("https://")
    ? endpoint
    : `https://api.spotify.com/v1${endpoint}`;

  const options: RequestInit = {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  };

  if (body && method !== "GET") {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(url, options);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error("Spotify API Error Details:", {
      url,
      status: response.status,
      statusText: response.statusText,
      error,
      endpoint,
    });
    throw new Error(
      `Spotify API error: ${response.status} - ${
        error.error?.message || response.statusText
      }`
    );
  }

  // Some endpoints return 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

// Convenience functions for common Spotify API endpoints

export async function getCurrentUser(accessToken: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me",
  });
}

export async function getCurrentlyPlaying(accessToken: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/currently-playing",
  });
}

export async function getUserPlaylists(accessToken: string, limit = 20) {
  return spotifyApi({
    accessToken,
    endpoint: `/me/playlists?limit=${limit}`,
  });
}

export async function getRecentlyPlayed(accessToken: string, limit = 20) {
  return spotifyApi({
    accessToken,
    endpoint: `/me/player/recently-played?limit=${limit}`,
  });
}

export async function getTopTracks(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit = 20
) {
  return spotifyApi({
    accessToken,
    endpoint: `/me/top/tracks?time_range=${timeRange}&limit=${limit}`,
  });
}

export async function getTopArtists(
  accessToken: string,
  timeRange: "short_term" | "medium_term" | "long_term" = "medium_term",
  limit = 20
) {
  return spotifyApi({
    accessToken,
    endpoint: `/me/top/artists?time_range=${timeRange}&limit=${limit}`,
  });
}

export async function getUserSavedTracks(accessToken: string, limit = 20) {
  return spotifyApi({
    accessToken,
    endpoint: `/me/tracks?limit=${limit}`,
  });
}

export async function playTrack(accessToken: string, uri: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/play",
    method: "PUT",
    body: { uris: [uri] },
  });
}

export async function pausePlayback(accessToken: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/pause",
    method: "PUT",
  });
}

export async function nextTrack(accessToken: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/next",
    method: "POST",
  });
}

export async function previousTrack(accessToken: string) {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/previous",
    method: "POST",
  });
}

export async function search(
  accessToken: string,
  query: string,
  type: "track" | "artist" | "album" | "playlist" = "track",
  limit = 20
) {
  return spotifyApi({
    accessToken,
    endpoint: `/search?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`,
  });
}

export async function getAudioFeatures(accessToken: string, trackId: string) {
  return spotifyApi({
    accessToken,
    endpoint: `/audio-features/${trackId}`,
  });
}

export async function getAudioAnalysis(accessToken: string, trackId: string) {
  return spotifyApi({
    accessToken,
    endpoint: `/audio-analysis/${trackId}`,
  });
}

export interface QueueItem {
  id: string;
  name: string;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
  duration_ms: number;
  uri: string;
  videoIds?: string[]; // Prefetched YouTube video IDs
}

export interface SpotifyQueue {
  currently_playing: QueueItem | null;
  queue: QueueItem[];
}

export async function getUserQueue(accessToken: string): Promise<SpotifyQueue> {
  return spotifyApi({
    accessToken,
    endpoint: "/me/player/queue",
  });
}

