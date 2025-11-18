import { NextRequest, NextResponse } from "next/server";

/**
 * API Route to fetch synced lyrics from multiple sources
 * Proxies requests to avoid CORS issues
 */

interface LyricLine {
  time: number;
  text: string;
}

function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const lrcLines = lrcContent.split("\n");

  for (const line of lrcLines) {
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

async function fetchFromLRCLIB(
  trackName: string,
  artistName: string,
  duration: number
): Promise<LyricLine[] | null> {
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      duration: Math.round(duration / 1000).toString(),
    });

    const url = `https://lrclib.net/api/get?${params.toString()}`;
    console.log(`   → Fetching: ${url}`);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000), // 3 second timeout per API
    });

    console.log(`   → LRCLIB response: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      console.log("   ✗ LRCLIB: No synced lyrics found");
      return null;
    }

    const data = await response.json();

    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      console.log(`   ✓ LRCLIB: Found ${lines.length} synced lyrics lines`);
      return lines;
    }

    console.log("   ✗ LRCLIB: Response had no syncedLyrics field");
    return null;
  } catch (error: any) {
    console.error(`   ✗ LRCLIB error: ${error.message}`);
    return null;
  }
}

async function fetchFromNetease(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  try {
    // Search for the song first
    const searchUrl = `https://music.xianqiao.wang/neteasecloud/search?limit=1&type=1&keywords=${encodeURIComponent(
      `${trackName} ${artistName}`
    )}`;
    console.log(`   → NetEase searching: ${searchUrl}`);

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(3000), // 3 second timeout per API
    });

    console.log(`   → NetEase search response: ${searchResponse.status}`);

    if (!searchResponse.ok) {
      console.log("   ✗ NetEase: Search failed");
      return null;
    }

    const searchData = await searchResponse.json();
    const songId = searchData?.result?.songs?.[0]?.id;

    if (!songId) {
      console.log("   ✗ NetEase: Song not found in search results");
      return null;
    }

    console.log(`   → NetEase found song ID: ${songId}`);

    // Fetch lyrics using song ID
    const lyricsUrl = `https://music.xianqiao.wang/neteasecloud/lyric?id=${songId}`;
    console.log(`   → Fetching lyrics: ${lyricsUrl}`);
    
    const lyricsResponse = await fetch(lyricsUrl, {
      signal: AbortSignal.timeout(3000), // 3 second timeout per API
    });

    console.log(`   → NetEase lyrics response: ${lyricsResponse.status}`);

    if (!lyricsResponse.ok) {
      console.log("   ✗ NetEase: Lyrics fetch failed");
      return null;
    }

    const lyricsData = await lyricsResponse.json();
    const lrcContent = lyricsData?.lrc?.lyric;

    if (lrcContent) {
      const lines = parseLRC(lrcContent);
      if (lines.length > 0) {
        console.log(`   ✓ NetEase: Found ${lines.length} synced lyrics lines`);
        return lines;
      }
    }

    console.log("   ✗ NetEase: No lyrics content in response");
    return null;
  } catch (error: any) {
    console.error(`   ✗ NetEase error: ${error.message}`);
    return null;
  }
}

async function fetchFromLRCLIBSearch(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  try {
    // LRCLIB also has a search endpoint
    const params = new URLSearchParams({
      q: `${trackName} ${artistName}`,
    });

    const url = `https://lrclib.net/api/search?${params.toString()}`;
    console.log(`   → LRCLIB Search: ${url}`);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(3000), // 3 second timeout per API
    });

    console.log(`   → LRCLIB Search response: ${response.status}`);

    if (!response.ok) {
      console.log("   ✗ LRCLIB Search: No results");
      return null;
    }

    const results = await response.json();
    console.log(`   → LRCLIB Search found ${results?.length || 0} results`);
    
    // Check ALL results, not just the first one - some results may have null syncedLyrics
    if (Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result?.syncedLyrics) {
          const lines = parseLRC(result.syncedLyrics);
          if (lines.length > 0) {
            console.log(`   ✓ LRCLIB Search: Found ${lines.length} synced lyrics lines (result #${i + 1})`);
            return lines;
          }
        }
      }
    }

    console.log("   ✗ LRCLIB Search: No synced lyrics in any results");
    return null;
  } catch (error: any) {
    console.error(`   ✗ LRCLIB Search error: ${error.message}`);
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trackName = searchParams.get("track");
  const artistName = searchParams.get("artist");
  const durationStr = searchParams.get("duration");

  console.log("🎵 [API] Lyrics request received:", {
    track: trackName,
    artist: artistName,
    duration: durationStr,
  });

  if (!trackName || !artistName || !durationStr) {
    console.error("❌ [API] Missing parameters");
    return NextResponse.json(
      { error: "Missing required parameters: track, artist, duration" },
      { status: 400 }
    );
  }

  const duration = parseInt(durationStr);

  console.log(`🔍 [API] Searching lyrics for: "${trackName}" by "${artistName}" (${Math.round(duration / 1000)}s)`);
  console.log("📡 [API] Starting parallel search across all sources...");

  // Run all API calls in parallel and return the first successful result
  const results = await Promise.allSettled([
    fetchFromLRCLIB(trackName, artistName, duration).then((lines) => ({
      lines,
      source: "LRCLIB",
    })),
    fetchFromLRCLIBSearch(trackName, artistName).then((lines) => ({
      lines,
      source: "LRCLIB Search",
    })),
    fetchFromNetease(trackName, artistName).then((lines) => ({
      lines,
      source: "NetEase",
    })),
  ]);

  // Find the first successful result with lyrics
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.lines && result.value.lines.length > 0) {
      console.log(`✅ [API] ${result.value.source} success: ${result.value.lines.length} lines`);
      return NextResponse.json({
        lines: result.value.lines,
        source: result.value.source,
      });
    }
  }

  // Log which sources failed
  results.forEach((result, index) => {
    const sources = ["LRCLIB", "LRCLIB Search", "NetEase"];
    if (result.status === "rejected") {
      console.log(`   ✗ ${sources[index]} failed: ${result.reason}`);
    } else if (!result.value.lines || result.value.lines.length === 0) {
      console.log(`   ✗ ${sources[index]}: No lyrics found`);
    }
  });

  console.log("❌ [API] All sources exhausted - no lyrics found");
  return NextResponse.json(
    { error: "No synced lyrics found", lines: null },
    { status: 404 }
  );
}

