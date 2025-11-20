/**
 * Frontend lyrics storage using IndexedDB (via localforage)
 * Provides offline-first lyrics caching with search by Spotify ID or title+artist
 */

import localforage from 'localforage';

// Configure separate store for lyrics
const lyricsStore = localforage.createInstance({
  name: 'syns',
  storeName: 'lyrics',
  description: 'Cached synced lyrics data'
});

// Configure search index store (title+artist → spotify IDs)
const searchIndexStore = localforage.createInstance({
  name: 'syns',
  storeName: 'lyrics_search_index',
  description: 'Search index for lyrics by title and artist'
});

export interface CachedLyrics {
  spotifyId: string;
  title: string;
  artist: string;
  lyrics: LyricLine[];
  source: string; // 'lrclib', 'netease', etc.
  cachedAt: number; // timestamp
}

export interface LyricLine {
  timeMs: number;
  text: string;
}

/**
 * Normalize title+artist for consistent searching
 */
function normalizeSearchKey(title: string, artist: string): string {
  return `${title.toLowerCase().trim()}::${artist.toLowerCase().trim()}`;
}

/**
 * Save lyrics to local DB (by Spotify ID and title+artist)
 */
export async function saveLyrics(
  spotifyId: string,
  title: string,
  artist: string,
  lyrics: LyricLine[],
  source: string
): Promise<void> {
  const cached: CachedLyrics = {
    spotifyId,
    title,
    artist,
    lyrics,
    source,
    cachedAt: Date.now(),
  };

  // Save by Spotify ID (primary key)
  await lyricsStore.setItem(spotifyId, cached);

  // Save to search index (title+artist → Spotify ID)
  const searchKey = normalizeSearchKey(title, artist);
  await searchIndexStore.setItem(searchKey, spotifyId);

  console.log(`💾 Lyrics saved to local DB: ${title} - ${artist} (${source})`);
}

/**
 * Get lyrics by Spotify ID
 */
export async function getLyricsBySpotifyId(
  spotifyId: string
): Promise<CachedLyrics | null> {
  return await lyricsStore.getItem<CachedLyrics>(spotifyId);
}

/**
 * Get lyrics by title and artist (for cross-platform support)
 */
export async function getLyricsByTitleArtist(
  title: string,
  artist: string
): Promise<CachedLyrics | null> {
  const searchKey = normalizeSearchKey(title, artist);
  const spotifyId = await searchIndexStore.getItem<string>(searchKey);
  
  if (!spotifyId) {
    return null;
  }

  return await lyricsStore.getItem<CachedLyrics>(spotifyId);
}

/**
 * Get lyrics (tries Spotify ID first, then title+artist)
 */
export async function getLyrics(
  spotifyId: string,
  title: string,
  artist: string
): Promise<CachedLyrics | null> {
  // Try by Spotify ID first
  let cached = await getLyricsBySpotifyId(spotifyId);
  if (cached) {
    console.log(`✅ Lyrics found in local DB (by ID): ${title} - ${artist}`);
    return cached;
  }

  // Try by title+artist (for cross-platform)
  cached = await getLyricsByTitleArtist(title, artist);
  if (cached) {
    console.log(`✅ Lyrics found in local DB (by title+artist): ${title} - ${artist}`);
    return cached;
  }

  console.log(`❌ Lyrics not in local DB: ${title} - ${artist}`);
  return null;
}

/**
 * Delete lyrics from local DB
 */
export async function deleteLyrics(spotifyId: string): Promise<void> {
  const cached = await lyricsStore.getItem<CachedLyrics>(spotifyId);
  if (cached) {
    const searchKey = normalizeSearchKey(cached.title, cached.artist);
    await searchIndexStore.removeItem(searchKey);
  }
  await lyricsStore.removeItem(spotifyId);
}

/**
 * Clear all cached lyrics
 */
export async function clearAllLyrics(): Promise<void> {
  await lyricsStore.clear();
  await searchIndexStore.clear();
  console.log('🗑️ All cached lyrics cleared');
}

/**
 * Get cache statistics
 */
export async function getCacheStats(): Promise<{
  totalCached: number;
  oldestCache: number | null;
  newestCache: number | null;
}> {
  const keys = await lyricsStore.keys();
  const totalCached = keys.length;

  if (totalCached === 0) {
    return { totalCached: 0, oldestCache: null, newestCache: null };
  }

  let oldest = Infinity;
  let newest = 0;

  for (const key of keys) {
    const cached = await lyricsStore.getItem<CachedLyrics>(key);
    if (cached) {
      oldest = Math.min(oldest, cached.cachedAt);
      newest = Math.max(newest, cached.cachedAt);
    }
  }

  return {
    totalCached,
    oldestCache: oldest === Infinity ? null : oldest,
    newestCache: newest === 0 ? null : newest,
  };
}

