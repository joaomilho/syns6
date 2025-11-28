# Lyrics Caching Strategy

This document explains the 3-tier caching system for synced lyrics in the Syns app.

## 🎯 Strategy Overview

```
User Request
    ↓
┌─────────────────────────────────────┐
│ 1. Frontend IndexedDB (localforage)│ ← Fastest, offline-capable
│    - Searchable by Spotify ID       │
│    - Searchable by title+artist     │
└─────────────────────────────────────┘
    ↓ (if not found)
┌─────────────────────────────────────┐
│ 2. Backend PostgreSQL Database      │ ← Shared across users
│    - Persistent server storage      │
│    - Searchable by Spotify ID       │
│    - Searchable by title+artist     │
└─────────────────────────────────────┘
    ↓ (if not found)
┌─────────────────────────────────────┐
│ 3. Remote APIs (LRCLIB, NetEase)    │ ← Slowest, requires network
│    - Parallel fetching              │
│    - First successful result wins   │
└─────────────────────────────────────┘
    ↓
Save to both:
- Backend PostgreSQL DB
- Frontend IndexedDB
```

## 📁 Architecture

### Frontend (`/src/lib/lyricsStorage.ts`)
- **Storage**: IndexedDB via `localforage`
- **Keys**: 
  - Primary: Spotify ID
  - Secondary: Normalized `title::artist` (for cross-platform support)
- **Benefits**:
  - Instant retrieval (no network)
  - Works offline
  - Large storage capacity (50MB+)
  - Async but localStorage-like API

### Backend (`/src/app/api/lyrics/route.ts`)
- **Storage**: PostgreSQL via Prisma
- **Lookup Order**:
  1. Try Spotify ID (exact match)
  2. Try title+artist (case-insensitive)
  3. Fetch from remote APIs if not found
- **Auto-saves**: Saves to DB after successful remote fetch

### Remote APIs
- **LRCLIB**: Primary source (has timing data)
- **NetEase Cloud Music**: Backup source (Chinese songs)
- **Parallel fetching**: All sources queried simultaneously
- **First wins**: Returns first successful result

## 🔄 Fetch Flow

### On Track Change:
1. **Check memory cache** (current session only)
2. **Check IndexedDB** via `getLyrics(spotifyId, title, artist)`
   - Try by Spotify ID first
   - Fall back to title+artist (for cross-platform)
3. **Call backend API** if not in IndexedDB
4. **Backend checks PostgreSQL** DB
5. **Backend fetches from remote APIs** if not in DB
6. **Backend saves to PostgreSQL** before returning
7. **Frontend saves to IndexedDB** after receiving response

## 🎵 Cross-Platform Support

The dual-key system (Spotify ID + title+artist) enables:
- **YouTube Music**: Can query by title+artist
- **Apple Music**: Can query by title+artist
- **SoundCloud**: Can query by title+artist

Even if the platform uses different IDs, we can still retrieve cached lyrics by matching song metadata.

## 📊 Storage Locations

| Location | Technology | Capacity | Speed | Offline |
|----------|-----------|----------|-------|---------|
| Memory | JavaScript Map | ~MB | Instant | ❌ |
| IndexedDB | localforage | 50MB+ | ~1ms | ✅ |
| PostgreSQL | Prisma | Unlimited | ~50ms | ❌ |
| Remote APIs | HTTP | N/A | ~500ms+ | ❌ |

## 🛠️ Implementation Files

- `/src/lib/lyricsStorage.ts` - Frontend IndexedDB wrapper
- `/src/lib/lyrics.ts` - Lyrics fetching with IndexedDB check
- `/src/app/api/lyrics/route.ts` - Backend API with PostgreSQL
- `/src/lib/prisma.ts` - Prisma client singleton
- `/prisma/schema.prisma` - Database schema

## 🧪 Testing the Strategy

```javascript
// Check cache stats
import { getCacheStats } from '@/lib/lyricsStorage';
const stats = await getCacheStats();
console.log(`Cached: ${stats.totalCached} songs`);

// Manual cache check
import { getLyrics } from '@/lib/lyricsStorage';
const cached = await getLyrics('spotify:track:123', 'Song Title', 'Artist Name');

// Clear cache (if needed)
import { clearAllLyrics } from '@/lib/lyricsStorage';
await clearAllLyrics();
```

## 🚀 Benefits

1. **Speed**: Most requests served from IndexedDB (<5ms)
2. **Offline**: Works without network after first fetch
3. **Reliability**: Multiple fallbacks (IndexedDB → PostgreSQL → APIs)
4. **Cross-platform**: Title+artist search enables YouTube/Apple Music support
5. **Scalability**: PostgreSQL DB shared across all users
6. **Cost-effective**: Reduces API calls by ~99% after initial population

## 📈 Performance

Expected cache hit rates:
- **Session 1**: ~5% (memory cache only)
- **Session 2+**: ~95% (IndexedDB hits)
- **Backend DB hits**: ~90% (shared across users)
- **Remote API calls**: ~10% (new songs only)

