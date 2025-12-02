import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/**
 * YouTube Data API search endpoint
 * Searches for videos matching a query
 */

interface YouTubeSearchResult {
  videoId: string;
  title: string;
  channelTitle: string;
}

interface YouTubeSearchResponse {
  videoIds: string[]; // Array of video IDs to try
  primaryVideoId: string; // First/best match
  title: string;
  channelTitle: string;
  source: string;
}

// Default fallback video when YouTube API fails or no video found
const DEFAULT_VIDEO_ID = "L1vrPpM4eyM";

async function searchForEmbeddableVideos(query: string, apiKey: string, maxResults: number = 5): Promise<YouTubeSearchResult[]> {
  try {
    // Step 1: Search for videos with embeddable filter
    const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
    searchUrl.searchParams.set("part", "snippet");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "video");
    searchUrl.searchParams.set("maxResults", "10"); // Get more results to filter
    searchUrl.searchParams.set("videoCategoryId", "10"); // Music category
    searchUrl.searchParams.set("videoEmbeddable", "true"); // Only embeddable videos
    searchUrl.searchParams.set("videoSyndicated", "true"); // Only videos that can be played outside YouTube
    searchUrl.searchParams.set("key", apiKey);

    console.log(`[YouTube API] 🔍 Searching for: "${query}"`);

    const searchResponse = await fetch(searchUrl.toString());

    if (!searchResponse.ok) {
      const error = await searchResponse.json();
      console.error("[YouTube API] ❌ Search error:", error);
      return [];
    }

    const searchData = await searchResponse.json();

    if (!searchData.items || searchData.items.length === 0) {
      console.log(`⚠️ No results found for: "${query}"`);
      return [];
    }

    // Step 2: Get video details to verify embeddable status and check for restrictions
    const videoIds = searchData.items.map((item: any) => item.id.videoId).join(",");
    const videoUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
    videoUrl.searchParams.set("part", "snippet,status,contentDetails");
    videoUrl.searchParams.set("id", videoIds);
    videoUrl.searchParams.set("key", apiKey);

    const videoResponse = await fetch(videoUrl.toString());
    if (!videoResponse.ok) {
      // Fallback to all search results
      const results: YouTubeSearchResult[] = searchData.items.slice(0, maxResults).map((video: any) => ({
        videoId: video.id.videoId,
        title: video.snippet.title,
        channelTitle: video.snippet.channelTitle,
      }));
      console.log(`⚠️ Could not verify embeddable status, returning ${results.length} results`);
      return results;
    }

    const videoData = await videoResponse.json();

    console.log(`[YouTube API] 📊 Found ${videoData.items?.length || 0} videos to check embeddability`);

    // Log all videos and their embeddable status for debugging
    videoData.items?.forEach((item: any, index: number) => {
      console.log(`[YouTube API]   ${index + 1}. ${item.snippet.title} - Embeddable: ${item.status?.embeddable}, Public: ${item.status?.publicStatsViewable}`);
    });

    // Find ALL embeddable videos (up to maxResults)
    const embeddableVideos = videoData.items
      ?.filter((item: any) => item.status?.embeddable === true)
      .slice(0, maxResults)
      .map((item: any) => ({
        videoId: item.id,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
      })) || [];

    if (embeddableVideos.length > 0) {
      console.log(`[YouTube API] ✅ Found ${embeddableVideos.length} embeddable videos`);
      embeddableVideos.forEach((v: YouTubeSearchResult, i: number) => {
        console.log(`[YouTube API]   ${i + 1}. ${v.title} (${v.videoId})`);
      });
      return embeddableVideos;
    }

    // No embeddable videos found, return all results as fallback
    console.log(`[YouTube API] ❌ No embeddable videos found, returning all ${searchData.items.length} results to try`);
    return searchData.items.slice(0, maxResults).map((video: any) => ({
      videoId: video.id.videoId,
      title: video.snippet.title,
      channelTitle: video.snippet.channelTitle,
    }));
  } catch (error) {
    console.error("[YouTube API] ❌ Search error:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const spotifyId = searchParams.get("spotifyId");
  const title = searchParams.get("title");
  const artist = searchParams.get("artist");

  console.log("[YouTube API] 📥 Request received for:", query, { spotifyId, title, artist });

  if (!query) {
    console.error("[YouTube API] ❌ Missing query parameter");
    return NextResponse.json({ error: "Query parameter required" }, { status: 400 });
  }

  // 1. Check database first
  try {
    console.log("[YouTube API] 🗄️ Checking database...");
    console.log(`[YouTube API] Search params: spotifyId="${spotifyId}", title="${title}", artist="${artist}"`);
    
    let cachedVideo = null;
    
    // Try finding by Spotify ID first
    if (spotifyId) {
      console.log(`[YouTube API] Searching by spotifyId: ${spotifyId}`);
      cachedVideo = await prisma.youTubeVideo.findUnique({
        where: { spotifyId },
      });
      console.log(`[YouTube API] Found by spotifyId: ${cachedVideo ? 'YES' : 'NO'}`);
    }
    
    // Fallback to title + artist search
    if (!cachedVideo && title && artist) {
      console.log(`[YouTube API] Searching by title + artist: "${title}" / "${artist}"`);
      cachedVideo = await prisma.youTubeVideo.findFirst({
        where: {
          title: { equals: title, mode: 'insensitive' },
          artist: { equals: artist, mode: 'insensitive' },
        },
      });
      console.log(`[YouTube API] Found by title+artist: ${cachedVideo ? 'YES' : 'NO'}`);
    }
    
    if (cachedVideo) {
      console.log(`[YouTube API] ✅ Found in database: ${cachedVideo.youtubeId} (spotifyId: ${cachedVideo.spotifyId})`);
      
      // Check if we have a verified working video ID from frontend
      if (cachedVideo.workingYoutubeId) {
        console.log(`[YouTube API] 🎯 Using crowdsourced working video: ${cachedVideo.workingYoutubeId} (verified: ${cachedVideo.verifiedAt})`);
        
        return NextResponse.json({
          videoIds: [cachedVideo.workingYoutubeId],
          primaryVideoId: cachedVideo.workingYoutubeId,
          title: cachedVideo.title,
          channelTitle: cachedVideo.artist,
          source: 'crowdsourced',
        });
      }
      
      // Parse comma-separated video IDs back into array
      const ids = cachedVideo.youtubeId.split(',').map(id => id.trim()).filter(Boolean);
      console.log(`[YouTube API] 📋 Parsed ${ids.length} video ID(s) from database`);
      
      return NextResponse.json({
        videoIds: ids,
        primaryVideoId: ids[0],
        title: cachedVideo.title,
        channelTitle: cachedVideo.artist,
        source: 'database',
      });
    }
    
    console.log("[YouTube API] 📡 Not in database, fetching from YouTube API...");
  } catch (dbError) {
    console.error("[YouTube API] ⚠️ Database check failed:", dbError);
  }

  // 2. Check if API key is available
  const apiKey = process.env.YOUTUBE_API_KEY;
  console.log("[YouTube API] 🔑 API Key present:", !!apiKey);

  if (!apiKey) {
    console.error("[YouTube API] ❌ YOUTUBE_API_KEY not configured, using default video");
    return NextResponse.json({
      videoIds: [DEFAULT_VIDEO_ID],
      primaryVideoId: DEFAULT_VIDEO_ID,
      title: query,
      channelTitle: "Default",
      source: 'default',
    });
  }

  // 3. Try fetching from YouTube API - get multiple candidates
  let results = await searchForEmbeddableVideos(query, apiKey, 10);

  // If no embeddable video found, retry with "live" appended
  if (results.length === 0 && !query.toLowerCase().includes("live")) {
    console.log(`[YouTube API] 🔄 Retrying with "live" appended: "${query} live"`);
    results = await searchForEmbeddableVideos(`${query} live`, apiKey, 10);
  }

  // 4. Save to database if found and we have required fields
  if (results.length > 0) {
    const primaryResult = results[0];
    console.log(`[YouTube API] ✅ Got ${results.length} video candidates from API`);
    
    if (spotifyId && title && artist) {
      try {
        // Save all video IDs as comma-separated string
        const videoIdsString = results.map(r => r.videoId).join(',');
        console.log(`[YouTube API] 💾 Saving ${results.length} video IDs: ${videoIdsString}`);
        
        await prisma.youTubeVideo.upsert({
          where: { spotifyId: spotifyId },
          create: {
            spotifyId: spotifyId,
            title: title,
            artist: artist,
            youtubeId: videoIdsString, // Comma-separated list
          },
          update: {
            youtubeId: videoIdsString, // Comma-separated list
          },
        });
        console.log("[YouTube API] 💾 Saved to database");
      } catch (dbError) {
        console.error("[YouTube API] ⚠️ Failed to save to database:", dbError);
      }
    } else {
      console.log("[YouTube API] ⚠️ Cannot save to DB - missing spotifyId, title, or artist");
    }
    
    return NextResponse.json({ 
      videoIds: results.map(r => r.videoId),
      primaryVideoId: primaryResult.videoId,
      title: primaryResult.title,
      channelTitle: primaryResult.channelTitle,
      source: 'youtube' 
    });
  }

  // 5. No video found - return default
  console.log("[YouTube API] ⚠️ No video found, using default");
  return NextResponse.json({
    videoIds: [DEFAULT_VIDEO_ID],
    primaryVideoId: DEFAULT_VIDEO_ID,
    title: query,
    channelTitle: "Default",
    source: 'default',
  });
}

