/**
 * Lyrics client-side utilities
 * 3-tier caching strategy:
 * 1. Frontend IndexedDB (checked here)
 * 2. Backend PostgreSQL DB (checked by API)
 * 3. Remote APIs (LRCLIB, NetEase - fetched by API if not in DB)
 */

export interface LyricLine {
  time: number; // milliseconds
  text: string;
}

/**
 * Fetch synced lyrics with 3-tier caching
 * Order: IndexedDB → Backend (PostgreSQL → Remote APIs)
 * Also saves to IndexedDB after successful backend fetch
 */
export async function fetchSyncedLyrics(
  trackName: string,
  artistName: string,
  duration: number,
  spotifyId?: string
): Promise<LyricLine[] | null> {
  try {
    console.log(`🔍 Fetching lyrics for: ${trackName} by ${artistName}`);

    // 1. Check IndexedDB first (fastest, offline-capable)
    const { getLyrics, saveLyrics } = await import('./lyricsStorage');
    
    if (spotifyId) {
      const cached = await getLyrics(spotifyId, trackName, artistName);
      if (cached) {
        console.log(`✅ Lyrics from local DB (${cached.source}): ${cached.lyrics.length} lines`);
        return cached.lyrics.map(line => ({ time: line.timeMs, text: line.text }));
      }
    }

    console.log("📡 Not in local DB, checking backend...");

    // 2. Fetch from backend (checks PostgreSQL DB → Remote APIs)
    const params = new URLSearchParams({
      track: trackName,
      artist: artistName,
      duration: duration.toString(),
    });

    if (spotifyId) {
      params.append('spotifyId', spotifyId);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout

    try {
      const response = await fetch(`/api/lyrics?${params.toString()}`, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          console.log("❌ No synced lyrics found from any source");
          return null;
        }
        console.error(`API error: ${response.status} ${response.statusText}`);
        return null;
      }

      const data = await response.json();
      
      if (data.lines && data.lines.length > 0) {
        console.log(`✅ Lyrics from backend (${data.source}): ${data.lines.length} lines`);
        
        // 3. Save to local IndexedDB for next time
        if (spotifyId) {
          const lyricsForStorage = data.lines.map((line: LyricLine) => ({
            timeMs: line.time,
            text: line.text,
          }));
          await saveLyrics(spotifyId, trackName, artistName, lyricsForStorage, data.source);
        }

        return data.lines;
      }

      return null;
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.error("⏱️ Lyrics request timed out after 20 seconds");
      } else {
        console.error("Network error fetching lyrics:", fetchError.message);
      }
      return null;
    }
  } catch (error) {
    console.error("Error fetching synced lyrics:", error);
    return null;
  }
}

/**
 * Find current lyric line based on playback position
 */
export function getCurrentLyricIndex(
  lines: LyricLine[],
  currentTimeMs: number
): number {
  if (!lines.length) return -1;

  // Start transition 0.6 seconds early for smoother animation
  const adjustedTime = currentTimeMs + 600;

  // Find the last line that has started
  for (let i = lines.length - 1; i >= 0; i--) {
    if (adjustedTime >= lines[i].time) {
      return i;
    }
  }

  return -1;
}

/**
 * Get upcoming lines for display
 */
export function getVisibleLines(
  lines: LyricLine[],
  currentIndex: number,
  beforeCount: number = 2,
  afterCount: number = 3
): { line: LyricLine; index: number; isCurrent: boolean; isAdjacent: boolean }[] {
  if (!lines.length) return [];

  // Special case: if currentIndex is -1 (before first lyric), show first lines
  if (currentIndex < 0) {
    const end = Math.min(lines.length, afterCount + 1);
    return lines.slice(0, end).map((line, i) => ({
      line,
      index: i,
      isCurrent: false,
      isAdjacent: i === 0,
    }));
  }

  const start = Math.max(0, currentIndex - beforeCount);
  const end = Math.min(lines.length, currentIndex + afterCount + 1);

  return lines.slice(start, end).map((line, i) => ({
    line,
    index: start + i,
    isCurrent: start + i === currentIndex,
    isAdjacent: Math.abs(start + i - currentIndex) === 1,
  }));
}

