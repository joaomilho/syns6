import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * API Route to fetch synced lyrics from multiple sources
 * Strategy:
 * 1. Check PostgreSQL DB first
 * 2. If not found, fetch from remote APIs (LRCLIB, NetEase)
 * 3. Save to DB before returning
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
  const startTime = Date.now();
  try {
    const params = new URLSearchParams({
      track_name: trackName,
      artist_name: artistName,
      duration: Math.round(duration / 1000).toString(),
    });

    const url = `https://lrclib.net/api/get?${params.toString()}`;
    console.log(`   → LRCLIB: Fetching with params:`, {
      track_name: trackName,
      artist_name: artistName,
      duration: Math.round(duration / 1000),
    });

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15 second timeout per API
    });

    const elapsed = Date.now() - startTime;
    console.log(`   → LRCLIB response: ${response.status} ${response.statusText} (${elapsed}ms)`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      console.log(`   ✗ LRCLIB: Failed - ${response.status}: ${errorText.substring(0, 200)}`);
      return null;
    }

    const data = await response.json();
    console.log(`   → LRCLIB data structure:`, {
      hasSyncedLyrics: !!data.syncedLyrics,
      hasPlainLyrics: !!data.plainLyrics,
      instrumental: data.instrumental,
      keys: Object.keys(data),
    });

    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      console.log(`   ✓ LRCLIB: Found ${lines.length} synced lyrics lines (${elapsed}ms)`);
      return lines;
    }

    if (data.instrumental) {
      console.log("   ℹ LRCLIB: Track marked as instrumental");
    } else {
      console.log("   ✗ LRCLIB: Response had no syncedLyrics field (but has plainLyrics:", !!data.plainLyrics, ")");
    }
    return null;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`   ✗ LRCLIB error (${elapsed}ms): ${error.name} - ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n')[0]}`);
    }
    return null;
  }
}

async function fetchFromNetease(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  const startTime = Date.now();
  try {
    // Search for the song first
    const keywords = `${trackName} ${artistName}`;
    const searchUrl = `https://music.xianqiao.wang/neteasecloud/search?limit=5&type=1&keywords=${encodeURIComponent(keywords)}`;
    console.log(`   → NetEase searching for: "${keywords}"`);

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(15000), // 15 second timeout per API
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const searchElapsed = Date.now() - startTime;
    console.log(`   → NetEase search response: ${searchResponse.status} (${searchElapsed}ms)`);

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text().catch(() => 'Could not read error');
      console.log(`   ✗ NetEase: Search failed - ${searchResponse.status}: ${errorText.substring(0, 200)}`);
      return null;
    }

    // Check content type before parsing JSON
    const contentType = searchResponse.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.log(`   ✗ NetEase: Invalid response type: ${contentType}`);
      const text = await searchResponse.text();
      console.log(`   ✗ NetEase response preview: ${text.substring(0, 200)}`);
      return null;
    }

    const searchData = await searchResponse.json();
    console.log(`   → NetEase search results:`, {
      foundSongs: searchData?.result?.songs?.length || 0,
      hasResult: !!searchData?.result,
    });

    const songId = searchData?.result?.songs?.[0]?.id;

    if (!songId) {
      console.log(`   ✗ NetEase: No song ID found. Structure:`, {
        hasResult: !!searchData?.result,
        hasSongs: !!searchData?.result?.songs,
        songCount: searchData?.result?.songs?.length || 0,
      });
      return null;
    }

    const songInfo = searchData.result.songs[0];
    console.log(`   → NetEase found song: "${songInfo.name}" by ${songInfo.artists?.[0]?.name} (ID: ${songId})`);

    // Fetch lyrics using song ID
    const lyricsUrl = `https://music.xianqiao.wang/neteasecloud/lyric?id=${songId}`;
    console.log(`   → NetEase fetching lyrics for ID ${songId}`);
    
    const lyricsResponse = await fetch(lyricsUrl, {
      signal: AbortSignal.timeout(15000), // 15 second timeout per API
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const lyricsElapsed = Date.now() - startTime;
    console.log(`   → NetEase lyrics response: ${lyricsResponse.status} (${lyricsElapsed}ms)`);

    if (!lyricsResponse.ok) {
      const errorText = await lyricsResponse.text().catch(() => 'Could not read error');
      console.log(`   ✗ NetEase: Lyrics fetch failed - ${lyricsResponse.status}: ${errorText.substring(0, 200)}`);
      return null;
    }

    // Check content type before parsing JSON
    const lyricsContentType = lyricsResponse.headers.get('content-type');
    if (!lyricsContentType || !lyricsContentType.includes('application/json')) {
      console.log(`   ✗ NetEase: Invalid lyrics response type: ${lyricsContentType}`);
      const text = await lyricsResponse.text();
      console.log(`   ✗ NetEase lyrics response preview: ${text.substring(0, 200)}`);
      return null;
    }

    const lyricsData = await lyricsResponse.json();
    console.log(`   → NetEase lyrics data structure:`, {
      hasLrc: !!lyricsData?.lrc,
      hasLyric: !!lyricsData?.lrc?.lyric,
      hasTlyric: !!lyricsData?.tlyric,
      keys: Object.keys(lyricsData || {}),
    });

    const lrcContent = lyricsData?.lrc?.lyric;

    if (lrcContent) {
      const lines = parseLRC(lrcContent);
      if (lines.length > 0) {
        const totalElapsed = Date.now() - startTime;
        console.log(`   ✓ NetEase: Found ${lines.length} synced lyrics lines (${totalElapsed}ms total)`);
        return lines;
      } else {
        console.log(`   ✗ NetEase: LRC content exists but parsed to 0 lines. Raw length: ${lrcContent.length}`);
        console.log(`   → First 200 chars: ${lrcContent.substring(0, 200)}`);
      }
    }

    console.log("   ✗ NetEase: No lyrics content in response");
    return null;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`   ✗ NetEase error (${elapsed}ms): ${error.name} - ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n')[0]}`);
    }
    return null;
  }
}

async function fetchFromLRCLIBSearch(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  const startTime = Date.now();
  try {
    // LRCLIB also has a search endpoint
    const query = `${trackName} ${artistName}`;
    const params = new URLSearchParams({
      q: query,
    });

    const url = `https://lrclib.net/api/search?${params.toString()}`;
    console.log(`   → LRCLIB Search: Searching for "${query}"`);

    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000), // 15 second timeout per API
    });

    const elapsed = Date.now() - startTime;
    console.log(`   → LRCLIB Search response: ${response.status} (${elapsed}ms)`);

    if (!response.ok) {
      const errorText = await response.text().catch(() => 'Could not read error');
      console.log(`   ✗ LRCLIB Search: Failed - ${response.status}: ${errorText.substring(0, 200)}`);
      return null;
    }

    const results = await response.json();
    const resultCount = results?.length || 0;
    console.log(`   → LRCLIB Search found ${resultCount} result(s) (${elapsed}ms)`);
    
    if (resultCount > 0) {
      console.log(`   → First result:`, {
        trackName: results[0]?.trackName,
        artistName: results[0]?.artistName,
        hasSyncedLyrics: !!results[0]?.syncedLyrics,
        hasPlainLyrics: !!results[0]?.plainLyrics,
        instrumental: results[0]?.instrumental,
      });
    }
    
    // Check ALL results, not just the first one - some results may have null syncedLyrics
    if (Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        console.log(`   → Checking result #${i + 1}/${resultCount}:`, {
          track: result?.trackName,
          artist: result?.artistName,
          hasSynced: !!result?.syncedLyrics,
          instrumental: result?.instrumental,
        });
        
        if (result?.syncedLyrics) {
          const lines = parseLRC(result.syncedLyrics);
          if (lines.length > 0) {
            const totalElapsed = Date.now() - startTime;
            console.log(`   ✓ LRCLIB Search: Found ${lines.length} synced lyrics lines in result #${i + 1} (${totalElapsed}ms)`);
            return lines;
          }
        }
      }
    }

    console.log("   ✗ LRCLIB Search: No synced lyrics in any of the", resultCount, "results");
    return null;
  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error(`   ✗ LRCLIB Search error (${elapsed}ms): ${error.name} - ${error.message}`);
    if (error.stack) {
      console.error(`   Stack: ${error.stack.split('\n')[0]}`);
    }
    return null;
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const trackName = searchParams.get("track");
  const artistName = searchParams.get("artist");
  const durationStr = searchParams.get("duration");
  const spotifyId = searchParams.get("spotifyId"); // Get spotifyId from params

  console.log("\n🎵 ==================== LYRICS REQUEST ====================");
  console.log("🎵 [API] Lyrics request:", {
    track: trackName,
    artist: artistName,
    duration: durationStr,
    spotifyId: spotifyId || '(not provided)',
    timestamp: new Date().toISOString(),
  });

  if (!trackName || !artistName || !durationStr) {
    console.error("❌ [API] Missing parameters");
    return NextResponse.json(
      { error: "Missing required parameters: track, artist, duration" },
      { status: 400 }
    );
  }

  const duration = parseInt(durationStr);

  // 1. Check if we already know this song has no lyrics
  try {
    const notFoundEntry = await prisma.lyricsNotFound.findFirst({
      where: spotifyId ? 
        { spotifyId: spotifyId } : 
        {
          AND: [
            { title: trackName },
            { artist: artistName },
          ],
        },
    });

    if (notFoundEntry) {
      // Skip verbose logging - just return 404 silently
      return NextResponse.json(
        { error: "No synced lyrics found", lines: null },
        { status: 404 }
      );
    }
  } catch (err) {
    // Ignore errors, proceed to fetch
  }

  // 2. Check database for cached lyrics
  console.log("💾 [API] Checking database cache...");
  try {
    // Build query conditions (SQLite doesn't support case-insensitive mode)
    const whereConditions: any[] = [
      {
        AND: [
          { title: trackName },
          { artist: artistName },
        ],
      },
    ];
    
    // Only add spotifyId condition if it's provided
    if (spotifyId) {
      whereConditions.unshift({ spotifyId: spotifyId });
    }
    
    const cachedLyrics = await prisma.lyrics.findFirst({
      where: {
        OR: whereConditions,
      },
    });

    if (cachedLyrics && cachedLyrics.lyrics) {
      // Parse lyrics from JSON string
      const lyricsData = typeof cachedLyrics.lyrics === 'string' 
        ? JSON.parse(cachedLyrics.lyrics) 
        : cachedLyrics.lyrics;
      
      console.log(`✅ [API] Found cached lyrics from ${cachedLyrics.source} (${lyricsData.length} lines)`);
      console.log("=========================================================\n");
      return NextResponse.json({
        lines: lyricsData as LyricLine[],
        source: `DB (${cachedLyrics.source || 'cached'})`,
      });
    }
    console.log("ℹ️  [API] No cached lyrics found in database");
  } catch (dbError) {
    console.error("⚠️ [API] Database error:", dbError);
    // Ignore DB errors, proceed to remote fetch
  }

  // 3. Fetch from remote APIs in parallel
  console.log("🌐 [API] Fetching from remote APIs in parallel...");
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

  // Log all results for debugging
  console.log("\n📊 [API] All API results:");
  results.forEach((result, idx) => {
    if (result.status === "fulfilled") {
      console.log(`   ${idx + 1}. ${result.value.source}: ${result.value.lines ? `${result.value.lines.length} lines` : 'no lyrics'}`);
    } else {
      console.log(`   ${idx + 1}. Error: ${result.reason}`);
    }
  });

  // Find the first successful result with lyrics
  for (const result of results) {
    if (result.status === "fulfilled" && result.value.lines && result.value.lines.length > 0) {
      console.log(`\n✅ [API] SUCCESS! Using ${result.value.source}: ${result.value.lines.length} lines`);
      
      // 3. Save to database before returning
      try {
        console.log("💾 [API] Saving to database...");
        await prisma.lyrics.upsert({
          where: {
            spotifyId: spotifyId || `${trackName}-${artistName}`, // fallback if no Spotify ID
          },
          create: {
            spotifyId: spotifyId || `${trackName}-${artistName}`,
            title: trackName,
            artist: artistName,
            lyrics: JSON.stringify(result.value.lines), // Convert to JSON string
            source: result.value.source,
          },
          update: {
            lyrics: JSON.stringify(result.value.lines), // Convert to JSON string
            source: result.value.source,
          },
        });
        console.log("✅ [API] Saved to database");
      } catch (dbError) {
        console.error("⚠️ [API] Failed to save to database:", dbError);
        // Continue anyway - don't block the response
      }

      console.log("=========================================================\n");
      return NextResponse.json({
        lines: result.value.lines,
        source: result.value.source,
      });
    }
  }

  // No lyrics found - save to LyricsNotFound to avoid future lookups
  console.log("\n❌ [API] No lyrics found from any source");
  try {
    await prisma.lyricsNotFound.upsert({
      where: spotifyId ? 
        { spotifyId: spotifyId } : 
        { id: `${trackName}-${artistName}` }, // Fallback unique ID
      create: {
        spotifyId: spotifyId,
        title: trackName,
        artist: artistName,
      },
      update: {
        attemptedAt: new Date(),
      },
    });
  } catch (err) {
    console.error("⚠️ [API] Failed to save to not-found table:", err);
    // Ignore errors saving to not-found table
  }

  console.log("=========================================================\n");
  return NextResponse.json(
    { error: "No synced lyrics found", lines: null },
    { status: 500 } // 404 is cached
  );
}

