import { NextRequest, NextResponse } from "next/server";

// Cache album art URLs in memory to avoid repeated fetches
const albumArtCache = new Map<string, string | null>();

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get("trackId");

  if (!trackId) {
    return NextResponse.json({ error: "Missing trackId" }, { status: 400 });
  }

  // Check cache first
  if (albumArtCache.has(trackId)) {
    const cached = albumArtCache.get(trackId);
    if (cached) {
      return NextResponse.json({ url: cached });
    } else {
      return NextResponse.json({ url: null }, { status: 404 });
    }
  }

  try {
    const response = await fetch(
      `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`,
      { next: { revalidate: 86400 } } // Cache for 24 hours
    );

    if (!response.ok) {
      albumArtCache.set(trackId, null);
      return NextResponse.json({ url: null }, { status: 404 });
    }

    const data = await response.json();
    const url = data.thumbnail_url || null;
    
    // Cache the result
    albumArtCache.set(trackId, url);

    return NextResponse.json({ url });
  } catch {
    albumArtCache.set(trackId, null);
    return NextResponse.json({ url: null }, { status: 500 });
  }
}

