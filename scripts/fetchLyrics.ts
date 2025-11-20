/**
 * Script to fetch and save lyrics to files
 * 
 * Usage:
 *   npm run fetch-lyrics
 * 
 * What this does:
 * 1. Reads songs from top1000songs.json
 * 2. Checks Spotify API if song is instrumental
 * 3. For each song, fetches lyrics using the same API logic as /api/lyrics
 * 4. Saves to ./lyrics-backup/*.json files
 * 5. Logs failed songs to ./failed-songs.json for retry
 * 
 * Note: This ONLY saves to files. Import to DB later.
 */

import * as fs from 'fs';
import * as path from 'path';
import { loadEnv } from './lib/spotifyAuth';

loadEnv();

// ============================================================================
// INSTRUMENTAL DETECTION CASCADE
// ============================================================================

// Check MusicBrainz for instrumental tags
async function checkMusicBrainz(isrc: string, title: string, artist: string): Promise<InstrumentalCheckResult> {
  try {
    // Search by ISRC first (most accurate)
    let url = `https://musicbrainz.org/ws/2/recording?query=isrc:${isrc}&fmt=json`;
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'SynsLyricsFetcher/1.0 (https://github.com/yourusername/syns)',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { isInstrumental: false, confidence: 0 };
    }

    const data = await response.json();
    const recordings = data.recordings || [];

    if (recordings.length === 0) {
      // Fallback: search by title and artist
      const query = `recording:"${title}" AND artist:"${artist}"`;
      url = `https://musicbrainz.org/ws/2/recording?query=${encodeURIComponent(query)}&fmt=json&limit=1`;
      
      const fallbackResponse = await fetch(url, {
        headers: {
          'User-Agent': 'SynsLyricsFetcher/1.0',
        },
        signal: AbortSignal.timeout(5000),
      });

      if (fallbackResponse.ok) {
        const fallbackData = await fallbackResponse.json();
        recordings.push(...(fallbackData.recordings || []));
      }
    }

    // Check tags for instrumental indicators
    for (const recording of recordings) {
      const tags = recording.tags || [];
      
      for (const tag of tags) {
        const tagName = tag.name.toLowerCase();
        if (tagName === 'instrumental' || tagName === 'no vocals') {
          return {
            isInstrumental: true,
            confidence: 0.95,
            reason: `MusicBrainz tag: "${tag.name}"`,
          };
        }
      }

      // Check if it's a work type that's typically instrumental
      if (recording.disambiguation) {
        const desc = recording.disambiguation.toLowerCase();
        if (desc.includes('instrumental')) {
          return {
            isInstrumental: true,
            confidence: 0.9,
            reason: 'MusicBrainz description',
          };
        }
      }
    }

    return { isInstrumental: false, confidence: 0 };
  } catch (error) {
    return { isInstrumental: false, confidence: 0 };
  }
}

// Check Last.fm for instrumental tags
async function checkLastFm(title: string, artist: string): Promise<InstrumentalCheckResult> {
  const apiKey = process.env.LASTFM_API_KEY;
  
  if (!apiKey) {
    return { isInstrumental: false, confidence: 0 };
  }

  try {
    const params = new URLSearchParams({
      method: 'track.getInfo',
      api_key: apiKey,
      artist: artist,
      track: title,
      format: 'json',
    });

    const response = await fetch(`https://ws.audioscrobbler.com/2.0/?${params.toString()}`, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return { isInstrumental: false, confidence: 0 };
    }

    const data = await response.json();
    const tags = data.track?.toptags?.tag || [];

    for (const tag of tags) {
      const tagName = (tag.name || '').toLowerCase();
      if (tagName === 'instrumental' || tagName === 'no vocals') {
        return {
          isInstrumental: true,
          confidence: 0.85,
          reason: `Last.fm tag: "${tag.name}"`,
        };
      }
    }

    return { isInstrumental: false, confidence: 0 };
  } catch (error) {
    return { isInstrumental: false, confidence: 0 };
  }
}

// Title/artist-based instrumental detection (final fallback)
function checkIfInstrumentalByName(title: string, artist: string): InstrumentalCheckResult {
  const titleLower = title.toLowerCase();
  const artistLower = artist.toLowerCase();
  
  // Definitive keywords in title
  const strongKeywords = ['instrumental', 'karaoke', 'backing track', 'no vocals', 'inst.', '(inst)'];
  for (const keyword of strongKeywords) {
    if (titleLower.includes(keyword)) {
      return { isInstrumental: true, confidence: 1.0, reason: `Title contains "${keyword}"` };
    }
  }
  
  // Likely instrumental indicators
  const likelyKeywords = [
    'piano version', 'orchestral version', 'acoustic version',
    'guitar version', 'soundtrack', 'theme from', 'main title'
  ];
  for (const keyword of likelyKeywords) {
    if (titleLower.includes(keyword)) {
      return { isInstrumental: true, confidence: 0.8, reason: `Title contains "${keyword}"` };
    }
  }
  
  // Classical/soundtrack/jazz artists (very likely instrumental)
  const instrumentalArtists = [
    // Classical composers
    'hans zimmer', 'john williams', 'ludwig van beethoven', 'mozart',
    'bach', 'chopin', 'debussy', 'tchaikovsky',
    // Guitar virtuosos
    'joe satriani', 'steve vai', 'yngwie malmsteen', 'buckethead',
    'eric johnson', 'guthrie govan',
    // Post-rock/ambient
    'explosions in the sky', 'god is an astronaut', 'mogwai',
    'sigur rós', 'this will destroy you',
    // Jazz instrumentalists
    'tigran hamasyan', 'snarky puppy', 'chick corea',
    'herbie hancock', 'miles davis', 'john coltrane',
    'weather report', 'pat metheny',
    // Soundtrack/epic
    'two steps from hell', 'audiomachine', 'thomas bergersen',
    // Electronic/ambient
    'carbon based lifeforms', 'solar fields', 'tycho'
  ];
  for (const artistName of instrumentalArtists) {
    if (artistLower.includes(artistName)) {
      return { isInstrumental: true, confidence: 0.9, reason: `Artist: ${artistName}` };
    }
  }
  
  return { isInstrumental: false, confidence: 0 };
}

// Main instrumental check cascade
async function checkIfInstrumental(song: Song): Promise<InstrumentalCheckResult> {
  // 1. Check title/artist first (fastest, catches obvious cases)
  const nameCheck = checkIfInstrumentalByName(song.title, song.artist);
  if (nameCheck.isInstrumental) {
    return nameCheck;
  }

  // 2. Check MusicBrainz (if we have ISRC)
  if (song.isrc) {
    const mbCheck = await checkMusicBrainz(song.isrc, song.title, song.artist);
    if (mbCheck.isInstrumental) {
      return mbCheck;
    }
  }

  // 3. Check Last.fm (if API key is available)
  const lfmCheck = await checkLastFm(song.title, song.artist);
  if (lfmCheck.isInstrumental) {
    return lfmCheck;
  }

  // 4. Return the best confidence we got (even if not instrumental)
  return nameCheck.confidence > 0 ? nameCheck : { isInstrumental: false, confidence: 0 };
}

interface LyricLine {
  time: number;
  text: string;
}

interface Song {
  spotifyId: string;
  title: string;
  artist: string;
  duration: number;
  album?: string;
  isInstrumental?: boolean;
  instrumentalConfidence?: number;
  isrc?: string; // For MusicBrainz lookup
}

interface FetchResult {
  song: Song;
  success: boolean;
  error?: string;
  source?: string;
  lyricsCount?: number;
}

interface InstrumentalCheckResult {
  isInstrumental: boolean;
  confidence: number;
  reason?: string;
}

// ============================================================================
// LYRICS FETCHING LOGIC (same as /api/lyrics/route.ts)
// ============================================================================

function parseLRC(lrcContent: string): LyricLine[] {
  const lines: LyricLine[] = [];
  const lrcLines = lrcContent.split('\n');

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
    
    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();

    if (data.syncedLyrics) {
      const lines = parseLRC(data.syncedLyrics);
      return lines.length > 0 ? lines : null;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

async function fetchFromNetease(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  try {
    const searchUrl = `https://music.xianqiao.wang/neteasecloud/search?limit=1&type=1&keywords=${encodeURIComponent(
      `${trackName} ${artistName}`
    )}`;

    const searchResponse = await fetch(searchUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!searchResponse.ok) {
      return null;
    }

    const searchData = await searchResponse.json();
    const songId = searchData?.result?.songs?.[0]?.id;

    if (!songId) {
      return null;
    }

    const lyricsUrl = `https://music.xianqiao.wang/neteasecloud/lyric?id=${songId}`;
    const lyricsResponse = await fetch(lyricsUrl, {
      signal: AbortSignal.timeout(5000),
    });

    if (!lyricsResponse.ok) {
      return null;
    }

    const lyricsData = await lyricsResponse.json();
    const lrcContent = lyricsData?.lrc?.lyric;

    if (lrcContent) {
      const lines = parseLRC(lrcContent);
      return lines.length > 0 ? lines : null;
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

async function fetchFromLRCLIBSearch(
  trackName: string,
  artistName: string
): Promise<LyricLine[] | null> {
  try {
    const params = new URLSearchParams({
      q: `${trackName} ${artistName}`,
    });

    const url = `https://lrclib.net/api/search?${params.toString()}`;

    const response = await fetch(url, {
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      return null;
    }

    const results = await response.json();
    
    if (Array.isArray(results)) {
      for (let i = 0; i < results.length; i++) {
        const result = results[i];
        if (result?.syncedLyrics) {
          const lines = parseLRC(result.syncedLyrics);
          if (lines.length > 0) {
            return lines;
          }
        }
      }
    }

    return null;
  } catch (error: any) {
    return null;
  }
}

async function fetchLyrics(
  trackName: string,
  artistName: string,
  duration: number
): Promise<{ lines: LyricLine[]; source: string; instrumentalHint?: boolean } | null> {
  // Run all API calls in parallel
  const results = await Promise.allSettled([
    fetchFromLRCLIB(trackName, artistName, duration).then((lines) => ({
      lines,
      source: 'LRCLIB',
    })),
    fetchFromLRCLIBSearch(trackName, artistName).then((lines) => ({
      lines,
      source: 'LRCLIB Search',
    })),
    fetchFromNetease(trackName, artistName).then((lines) => ({
      lines,
      source: 'NetEase',
    })),
  ]);

  // Find the first successful result with lyrics
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.lines && result.value.lines.length > 0) {
      return {
        lines: result.value.lines,
        source: result.value.source,
      };
    }
  }

  // No lyrics found - check if APIs hinted at instrumental
  // Some APIs return empty with specific error messages
  for (const result of results) {
    if (result.status === 'fulfilled' && result.value.source === 'LRCLIB') {
      // LRCLIB returns null for instrumentals sometimes
      // This is a weak hint, don't rely on it alone
    }
  }

  return null;
}

// ============================================================================
// FILE SAVING
// ============================================================================

function saveLyricsToFile(song: Song, lyrics: LyricLine[] | null, source: string, isInstrumental?: boolean): void {
  const backupDir = path.join(process.cwd(), 'lyrics-backup');
  
  // Create directory if it doesn't exist
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const filename = `${song.spotifyId}.json`;
  const filepath = path.join(backupDir, filename);

  const data: any = {
    spotifyId: song.spotifyId,
    title: song.title,
    artist: song.artist,
    album: song.album,
    duration: song.duration,
    lyrics,
    source,
    isInstrumental: isInstrumental || false,
    fetchedAt: new Date().toISOString(),
  };

  if (song.instrumentalConfidence !== undefined) {
    data.instrumentalConfidence = song.instrumentalConfidence;
  }

  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('🎵 Starting lyrics fetch script (FILE ONLY MODE)...\n');

  // Read songs list
  const songsPath = path.join(process.cwd(), 'scripts', 'top1000songs.json');
  
  if (!fs.existsSync(songsPath)) {
    console.error(`❌ Error: ${songsPath} not found`);
    process.exit(1);
  }

  const songs: Song[] = JSON.parse(fs.readFileSync(songsPath, 'utf-8'));
  console.log(`📋 Loaded ${songs.length} songs from list\n`);

  // Create backup directory if it doesn't exist
  const backupDir = path.join(process.cwd(), 'lyrics-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const results: FetchResult[] = [];
  const failedSongs: Array<Song & { error: string }> = [];

  let successCount = 0;
  let failCount = 0;
  let skippedCount = 0;
  let instrumentalCount = 0;

  for (let i = 0; i < songs.length; i++) {
    const song = songs[i];
    const progress = `[${i + 1}/${songs.length}]`;

    console.log(`${progress} Processing: "${song.title}" by ${song.artist}`);

    try {
      // Check if file already exists
      const filepath = path.join(backupDir, `${song.spotifyId}.json`);
      if (fs.existsSync(filepath)) {
        console.log(`   ⏭️  File already exists, skipping\n`);
        skippedCount++;
        continue;
      }

      // Check if instrumental via cascade: Title → MusicBrainz → Last.fm
      const instrumentalCheck = await checkIfInstrumental(song);
      song.instrumentalConfidence = instrumentalCheck.confidence;

      // Log detection result
      if (instrumentalCheck.confidence > 0) {
        console.log(`   🔍 Instrumental detection: ${(instrumentalCheck.confidence * 100).toFixed(0)}% - ${instrumentalCheck.reason || 'N/A'}`);
      }

      if (instrumentalCheck.isInstrumental) {
        const reason = instrumentalCheck.reason || 'Unknown';
        console.log(`   🎵 Marked as instrumental, skipping lyrics fetch`);
        console.log(`   💾 Saved without lyrics to lyrics-backup/${song.spotifyId}.json\n`);
        
        // Save file marking it as instrumental
        saveLyricsToFile(song, null, `Instrumental-${reason}`, true);
        
        instrumentalCount++;
        successCount++;
        continue;
      }

      // Add delay to avoid rate limiting (500ms between requests)
      await new Promise(resolve => setTimeout(resolve, 500));

      // Fetch lyrics
      const result = await fetchLyrics(song.title, song.artist, song.duration);

      if (result && result.lines.length > 0) {
        // Save to file only
        saveLyricsToFile(song, result.lines, result.source);

        console.log(`   ✅ Success! Found ${result.lines.length} lines from ${result.source}`);
        console.log(`   💾 Saved to lyrics-backup/${song.spotifyId}.json\n`);

        successCount++;
        results.push({
          song,
          success: true,
          source: result.source,
          lyricsCount: result.lines.length,
        });
      } else {
        // No lyrics found
        console.log(`   ❌ No lyrics found from any source`);
        
        // Show instrumental detection for context
        if (instrumentalCheck.confidence > 0) {
          console.log(`   📊 Instrumental confidence: ${(instrumentalCheck.confidence * 100).toFixed(0)}% (threshold: 80% for auto-skip)`);
        } else {
          console.log(`   📊 Instrumental confidence: 0% (not detected as instrumental)`);
        }
        
        console.log(`   ℹ️  SpotifyID: ${song.spotifyId}`);
        console.log(`   ℹ️  Title: "${song.title}" by ${song.artist}\n`);
        
        failCount++;
        failedSongs.push({
          ...song,
          error: 'No lyrics found',
          instrumentalConfidence: instrumentalCheck.confidence,
        });
        results.push({
          song,
          success: false,
          error: 'No lyrics found',
        });
      }
    } catch (error: any) {
      console.error(`   ❌ Error: ${error.message}\n`);
      
      failCount++;
      failedSongs.push({
        ...song,
        error: error.message,
      });
      results.push({
        song,
        success: false,
        error: error.message,
      });
    }
  }

  // Save failed songs to file for retry
  if (failedSongs.length > 0) {
    const failedPath = path.join(process.cwd(), 'failed-songs.json');
    fs.writeFileSync(failedPath, JSON.stringify(failedSongs, null, 2), 'utf-8');
    console.log(`\n📝 Saved ${failedSongs.length} failed songs to failed-songs.json`);
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total songs:     ${songs.length}`);
  console.log(`✅ Success:      ${successCount} (${((successCount / songs.length) * 100).toFixed(1)}%)`);
  console.log(`   🎵 Instrumental: ${instrumentalCount}`);
  console.log(`   📝 With lyrics:  ${successCount - instrumentalCount}`);
  console.log(`⏭️  Skipped:      ${skippedCount} (file already exists)`);
  console.log(`❌ Failed:       ${failCount} (${((failCount / songs.length) * 100).toFixed(1)}%)`);
  console.log('='.repeat(60));

  if (failCount > 0) {
    console.log('\n💡 To retry failed songs:');
    console.log('   1. Copy failed-songs.json to scripts/top1000songs.json');
    console.log('   2. Run: npm run fetch-lyrics');
  }

  console.log('\n📦 All lyrics saved to: lyrics-backup/');
  console.log('💡 Import to database later with a separate script\n');
}

// Handle errors
main()
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });

