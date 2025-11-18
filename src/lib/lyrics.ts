/**
 * Lyrics client-side utilities
 * Fetching is now done via backend API route
 */

export interface LyricLine {
  time: number; // milliseconds
  text: string;
}

/**
 * Fetch synced lyrics from backend API
 * Backend tries multiple sources: LRCLIB → NetEase → LRCLIB Search
 */
export async function fetchSyncedLyrics(
  trackName: string,
  artistName: string,
  duration: number
): Promise<LyricLine[] | null> {
  try {
    console.log(`🔍 Fetching lyrics for: ${trackName} by ${artistName}`);

    const params = new URLSearchParams({
      track: trackName,
      artist: artistName,
      duration: duration.toString(),
    });

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
        console.log(`✅ Lyrics found from ${data.source}: ${data.lines.length} lines`);
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

