/**
 * Lyrics fetching service
 * Uses multiple sources to get synchronized lyrics
 */

export interface LyricLine {
  time: number; // milliseconds
  text: string;
}

export interface SyncedLyrics {
  lines: LyricLine[];
  artist: string;
  title: string;
}

/**
 * Parse LRC format lyrics (time-synced)
 * Format: [mm:ss.xx]lyric text
 */
export function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const lrcLines = lrcContent.split('\n');

  for (const line of lrcLines) {
    // Match [mm:ss.xx] or [mm:ss]
    const match = line.match(/\[(\d+):(\d+)(?:\.(\d+))?\](.*)/);
    if (match) {
      const minutes = parseInt(match[1]);
      const seconds = parseInt(match[2]);
      const centiseconds = match[3] ? parseInt(match[3]) : 0;
      const text = match[4].trim();

      const timeMs = (minutes * 60 + seconds) * 1000 + centiseconds * 10;
      
      if (text) {
        lines.push({ time: timeMs, text });
      }
    }
  }

  return lines.sort((a, b) => a.time - b.time);
}

/**
 * Fetch synced lyrics from LRCLIB (free, open-source)
 */
export async function fetchSyncedLyrics(
  trackName: string,
  artistName: string,
  duration: number
): Promise<SyncedLyrics | null> {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      duration: Math.round(duration / 1000).toString(),
    });

    const response = await fetch(
      `https://lrclib.net/api/get?${params.toString()}`
    );

    if (!response.ok) {
      console.log('LRCLIB: No synced lyrics found');
      return null;
    }

    const data = await response.json();

    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      return {
        lines,
        artist: artistName,
        title: trackName,
      };
    }

    return null;
  } catch (error) {
    console.error('Error fetching synced lyrics:', error);
    return null;
  }
}

/**
 * Fetch plain lyrics as fallback (from lyrics.ovh)
 */
export async function fetchPlainLyrics(
  trackName: string,
  artistName: string
): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.lyrics.ovh/v1/${encodeURIComponent(artistName)}/${encodeURIComponent(trackName)}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.lyrics || null;
  } catch (error) {
    console.error('Error fetching plain lyrics:', error);
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

