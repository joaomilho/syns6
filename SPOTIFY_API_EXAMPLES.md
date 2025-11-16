# Spotify API Usage Examples

This file contains examples of how to use the Spotify API utilities in your Next.js app.

## Basic Usage

```typescript
"use client";

import { useSession } from "next-auth/react";
import { getCurrentUser, getTopTracks } from "@/lib/spotify";
import { useEffect, useState } from "react";

export default function SpotifyExample() {
  const { data: session } = useSession();
  const [userData, setUserData] = useState(null);
  const [topTracks, setTopTracks] = useState([]);

  useEffect(() => {
    if (session?.accessToken) {
      // Get current user data
      getCurrentUser(session.accessToken).then(setUserData);
      
      // Get top tracks
      getTopTracks(session.accessToken).then(setTopTracks);
    }
  }, [session]);

  if (!session) {
    return <div>Please sign in</div>;
  }

  return (
    <div>
      <h1>Welcome {userData?.display_name}</h1>
      <h2>Your Top Tracks</h2>
      <ul>
        {topTracks.items?.map((track) => (
          <li key={track.id}>{track.name} - {track.artists[0].name}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Server-Side Usage

```typescript
import { getSession } from "@/lib/session";
import { getCurrentlyPlaying } from "@/lib/spotify";

export default async function ServerComponent() {
  const session = await getSession();
  
  if (!session?.accessToken) {
    return <div>Not authenticated</div>;
  }

  const nowPlaying = await getCurrentlyPlaying(session.accessToken);

  return (
    <div>
      <h2>Now Playing</h2>
      {nowPlaying?.item && (
        <div>
          <p>{nowPlaying.item.name}</p>
          <p>{nowPlaying.item.artists[0].name}</p>
        </div>
      )}
    </div>
  );
}
```

## API Route Example

```typescript
// app/api/spotify/playlists/route.ts
import { getSession } from "@/lib/session";
import { getUserPlaylists } from "@/lib/spotify";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getSession();

  if (!session?.accessToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const playlists = await getUserPlaylists(session.accessToken);
    return NextResponse.json(playlists);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch playlists" },
      { status: 500 }
    );
  }
}
```

## Custom API Request

```typescript
import { spotifyApi } from "@/lib/spotify";

// Create a custom request
async function getAudioFeatures(accessToken: string, trackId: string) {
  return spotifyApi({
    accessToken,
    endpoint: `/audio-features/${trackId}`,
  });
}

// Use it
const features = await getAudioFeatures(session.accessToken, "trackId");
```

## Playback Control

```typescript
import { playTrack, pausePlayback, nextTrack } from "@/lib/spotify";

// Play a specific track
await playTrack(session.accessToken, "spotify:track:TRACK_ID");

// Pause playback
await pausePlayback(session.accessToken);

// Skip to next track
await nextTrack(session.accessToken);
```

## Search

```typescript
import { search } from "@/lib/spotify";

// Search for tracks
const results = await search(session.accessToken, "artist:Radiohead", "track");

// Search for artists
const artists = await search(session.accessToken, "Beatles", "artist");
```

## Available Utility Functions

- `getCurrentUser(accessToken)` - Get current user profile
- `getCurrentlyPlaying(accessToken)` - Get currently playing track
- `getUserPlaylists(accessToken, limit?)` - Get user's playlists
- `getRecentlyPlayed(accessToken, limit?)` - Get recently played tracks
- `getTopTracks(accessToken, timeRange?, limit?)` - Get top tracks
- `getTopArtists(accessToken, timeRange?, limit?)` - Get top artists
- `getUserSavedTracks(accessToken, limit?)` - Get saved tracks
- `playTrack(accessToken, uri)` - Play a specific track
- `pausePlayback(accessToken)` - Pause playback
- `nextTrack(accessToken)` - Skip to next track
- `previousTrack(accessToken)` - Go to previous track
- `search(accessToken, query, type?, limit?)` - Search Spotify

## Error Handling

```typescript
try {
  const data = await getCurrentUser(session.accessToken);
  console.log(data);
} catch (error) {
  console.error("Spotify API error:", error);
  // Handle error appropriately
}
```

## More Information

For complete Spotify Web API documentation, visit:
https://developer.spotify.com/documentation/web-api

