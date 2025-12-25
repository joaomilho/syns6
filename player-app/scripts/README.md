# Scripts Documentation

## Overview

This directory contains scripts for managing the lyrics database.

## Scripts

### 1. Generate Songs List (`generateSongsList.ts`)

Fetches a list of popular songs from Spotify to create `top1000songs.json`.

**Requirements:**
- `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.env`

**Usage:**
```bash
npm run generate-songs
```

**What it does:**
- Fetches songs from 17 popular Spotify playlists
- Removes duplicates
- Sorts by popularity
- Saves top 1000 to `scripts/top1000songs.json`

### 2. Fetch Lyrics (`fetchLyrics.ts`)

Fetches and caches lyrics for all songs in `top1000songs.json`.

**Requirements:**
- PostgreSQL database running
- Prisma client generated (`npm run db:generate`)
- `top1000songs.json` exists

**Usage:**
```bash
npm run fetch-lyrics
```

**What it does:**
- Reads songs from `top1000songs.json`
- For each song:
  - Checks if lyrics already cached in DB
  - If not, fetches from lyrics APIs (LRCLIB, NetEase)
  - Saves to PostgreSQL `lyrics` table
  - Saves backup to `lyrics-backup/{spotifyId}.json`
- Logs failed songs to `failed-songs.json`

**Features:**
- ✅ Automatic rate limiting (500ms between requests)
- ✅ Skips already cached songs
- ✅ Parallel API calls (tries all sources simultaneously)
- ✅ Progress tracking with detailed logs
- ✅ Comprehensive error handling
- ✅ File backup for portability

## Complete Setup Workflow

### Step 1: Install Dependencies

```bash
npm install
npm install prisma @prisma/client
npm install -D tsx
```

### Step 2: Set Up Database

```bash
# Create PostgreSQL database
psql postgres -c "CREATE DATABASE syns;"

# Add DATABASE_URL to .env
echo 'DATABASE_URL="postgresql://username:password@localhost:5432/syns"' >> .env

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push
```

### Step 3: Configure Spotify API

Add to `.env`:
```env
SPOTIFY_CLIENT_ID="your_client_id_here"
SPOTIFY_CLIENT_SECRET="your_client_secret_here"
```

Get credentials from: https://developer.spotify.com/dashboard

### Step 4: Generate Songs List

```bash
npm run generate-songs
```

This creates `scripts/top1000songs.json` with ~1000 popular songs.

### Step 5: Fetch Lyrics

```bash
npm run fetch-lyrics
```

This will:
- Fetch lyrics for all songs in the list
- Save to both database and `lyrics-backup/` folder
- Create `failed-songs.json` with songs that failed

**Expected time:** ~8-10 minutes for 1000 songs (with 500ms rate limit)

### Step 6: Retry Failed Songs (Optional)

If some songs failed, you can manually retry them by editing `failed-songs.json` to keep only the ones you want to retry, then rename it to `top1000songs.json` and run the fetch script again.

Or create a minimal retry list:
```bash
# Backup original list
mv scripts/top1000songs.json scripts/top1000songs-backup.json

# Use failed list as new source
cp failed-songs.json scripts/top1000songs.json

# Retry
npm run fetch-lyrics

# Restore original
mv scripts/top1000songs-backup.json scripts/top1000songs.json
```

## Customization

### Using Your Own Song List

Instead of generating from Spotify, you can manually create `scripts/top1000songs.json`:

```json
[
  {
    "spotifyId": "3n3Ppam7vgaVa1iaRUc9Lp",
    "title": "Mr. Brightside",
    "artist": "The Killers",
    "duration": 222973,
    "album": "Hot Fuss"
  }
]
```

Required fields: `spotifyId`, `title`, `artist`, `duration`  
Optional fields: `album`

### Adjusting Rate Limits

Edit `scripts/fetchLyrics.ts` line ~247:
```typescript
await new Promise(resolve => setTimeout(resolve, 500)); // 500ms delay
```

Reduce for faster fetching (risk of rate limiting) or increase for more conservative approach.

## Database Schema

The `lyrics` table stores:
- `spotifyId` - Unique Spotify track ID
- `title` - Song title
- `artist` - Artist name(s)
- `album` - Album name (optional)
- `duration` - Track duration in milliseconds
- `lyrics` - JSON array of synced lyrics: `[{time: 123000, text: "Some lyrics"}]`
- `plainLyrics` - Plain text version (all lines concatenated)
- `source` - API that provided lyrics (LRCLIB, NetEase, etc)
- `fetchedAt` - When lyrics were first fetched
- `accessCount` - Number of times accessed (for analytics)
- `lastAccessed` - Last access timestamp

## File Structure

```
scripts/
├── README.md                    # This file
├── generateSongsList.ts         # Generate song list from Spotify
├── fetchLyrics.ts              # Fetch and cache lyrics
└── top1000songs.json           # Generated song list

lyrics-backup/                   # Created by fetchLyrics.ts
├── {spotifyId}.json            # One file per song
└── ...

failed-songs.json               # Created by fetchLyrics.ts if failures occur
```

## Troubleshooting

### "No such file or directory: top1000songs.json"

Run `npm run generate-songs` first to create the song list.

### "SPOTIFY_CLIENT_ID must be set"

Add Spotify credentials to `.env` file.

### "Can't reach database server"

Make sure PostgreSQL is running:
```bash
brew services start postgresql@16
# or
docker start syns-postgres
```

### Rate Limiting / 429 Errors

The script includes automatic delays. If you still get rate limited:
1. Increase the delay in `fetchLyrics.ts`
2. Run the script multiple times (it skips cached songs)

### Many Failed Songs

Some songs legitimately don't have synced lyrics available. Check `failed-songs.json` to see the error messages. Common reasons:
- Song too obscure / not in lyrics databases
- Different artist name format (try manually editing the song list)
- Instrumental tracks
- Network timeout (retry these)

## API Usage & Attribution

This script uses:
- **LRCLIB** (https://lrclib.net/) - Community-contributed synced lyrics
- **NetEase Cloud Music API** (via proxy) - Chinese music service with extensive lyrics database

Please use responsibly and respect rate limits.

