# Complete Setup Instructions

## 🎯 Quick Start (TL;DR)

```bash
# 1. Install dependencies
npm install
npm install prisma @prisma/client tsx

# 2. Setup database
npm run db:generate
npm run db:push

# 3. Generate top songs list (requires Spotify API keys in .env)
npm run generate-songs

# 4. Fetch lyrics for all songs
npm run fetch-lyrics
```

## 📋 Detailed Setup

### 1. Prerequisites

- **Node.js 18+** installed
- **PostgreSQL 14+** installed and running
- **Spotify Developer Account** (for generating song list)

#### Install PostgreSQL

**macOS:**
```bash
brew install postgresql@16
brew services start postgresql@16
```

**Docker (any OS):**
```bash
docker run --name syns-postgres \
  -e POSTGRES_PASSWORD=yourpassword \
  -p 5432:5432 \
  -d postgres:16
```

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Install Project Dependencies

```bash
cd /path/to/syns
npm install

# Install additional dependencies for database and scripts
npm install prisma @prisma/client tsx
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
# Copy from example
cp .env.example .env
```

Edit `.env` with your values:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/syns?schema=public"

# Spotify API - Get from https://developer.spotify.com/dashboard
SPOTIFY_CLIENT_ID="your_spotify_client_id"
SPOTIFY_CLIENT_SECRET="your_spotify_client_secret"

# NextAuth (generate a random string)
NEXTAUTH_SECRET="run: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
```

#### Get Spotify API Credentials

1. Go to https://developer.spotify.com/dashboard
2. Log in with your Spotify account
3. Click "Create an App"
4. Fill in app name and description
5. Copy the **Client ID** and **Client Secret**
6. Add to `.env`

### 4. Create PostgreSQL Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql, create the database
CREATE DATABASE syns;

# Create a user (optional, or use your existing user)
CREATE USER syns_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE syns TO syns_user;

# Exit
\q
```

### 5. Initialize Prisma & Database Schema

```bash
# Generate Prisma Client (creates TypeScript types)
npm run db:generate

# Push schema to database (creates tables)
npm run db:push

# Optional: Open Prisma Studio to view your database
npm run db:studio
```

This creates the following tables:
- `lyrics` - Cached song lyrics with synced timestamps
- `users` - User profiles and Spotify tokens
- `user_preferences` - User settings for visualizations and Hue lights
- `play_history` - Track listening history
- `hue_lights` - Hue light configurations

### 6. Generate Top 1000 Songs List

```bash
npm run generate-songs
```

This will:
- Connect to Spotify API
- Fetch songs from 17 popular playlists
- Generate `scripts/top1000songs.json` with ~1000 unique songs

**Expected output:**
```
🎵 Generating top songs list from Spotify...
🔑 Getting Spotify access token...
✅ Access token obtained
📋 [1/17] Fetching playlist 37i9dQZEVXbMDoHDwVN2tF...
...
✅ Successfully generated song list!
📊 Total songs: 1000
```

### 7. Fetch and Cache Lyrics

```bash
npm run fetch-lyrics
```

This will:
- Read all songs from `scripts/top1000songs.json`
- For each song, fetch synced lyrics from multiple APIs
- Save to PostgreSQL database
- Save backup files to `lyrics-backup/` directory
- Log failed songs to `failed-songs.json`

**Expected time:** ~8-10 minutes for 1000 songs

**Expected output:**
```
🎵 Starting lyrics fetch script...
📋 Loaded 1000 songs from list

[1/1000] Processing: "Mr. Brightside" by The Killers
   ✅ Success! Found 67 lines from LRCLIB
   💾 Saved to DB and lyrics-backup/3n3Ppam7vgaVa1iaRUc9Lp.json
...
📊 SUMMARY
Total songs:     1000
✅ Success:      847 (84.7%)
❌ Failed:       153 (15.3%)
```

### 8. Verify Setup

Check database contents:

```bash
# Open Prisma Studio
npm run db:studio
```

This opens a GUI at `http://localhost:5555` where you can browse your data.

Or use psql:

```bash
psql syns

# Count cached lyrics
SELECT COUNT(*) FROM lyrics;

# View sample lyrics
SELECT title, artist, source FROM lyrics LIMIT 10;
```

### 9. Run the Application

```bash
npm run dev
```

Open http://localhost:3000

## 🔧 Useful Commands

### Database Commands

```bash
# Generate Prisma Client
npm run db:generate

# Push schema changes to database
npm run db:push

# Create a migration
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Reset database (⚠️ deletes all data)
npx prisma migrate reset
```

### Scripts Commands

```bash
# Generate songs list from Spotify
npm run generate-songs

# Fetch and cache lyrics
npm run fetch-lyrics
```

### Development Commands

```bash
# Run dev server
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Run linter
npm run lint
```

## 📁 Project Structure After Setup

```
syns/
├── .env                        # Your environment variables (DO NOT COMMIT)
├── prisma/
│   └── schema.prisma          # Database schema
├── scripts/
│   ├── generateSongsList.ts   # Spotify song list generator
│   ├── fetchLyrics.ts        # Lyrics fetcher script
│   ├── top1000songs.json     # Generated song list
│   └── README.md             # Scripts documentation
├── lyrics-backup/             # Lyrics backup files (created by script)
│   ├── {spotifyId}.json
│   └── ...
├── failed-songs.json          # Failed lyrics (created if any fail)
└── src/
    ├── lib/
    │   ├── prisma.ts          # Prisma client singleton
    │   └── ...
    └── ...
```

## 🚨 Troubleshooting

### "Can't reach database server"

**Problem:** PostgreSQL not running

**Solution:**
```bash
# macOS
brew services start postgresql@16

# Docker
docker start syns-postgres

# Linux
sudo systemctl start postgresql
```

### "Database does not exist"

**Problem:** Database not created

**Solution:**
```bash
psql postgres -c "CREATE DATABASE syns;"
```

### "SPOTIFY_CLIENT_ID must be set"

**Problem:** Missing Spotify credentials in `.env`

**Solution:**
1. Go to https://developer.spotify.com/dashboard
2. Create an app and get credentials
3. Add to `.env` file

### "No such file: top1000songs.json"

**Problem:** Song list not generated

**Solution:**
```bash
npm run generate-songs
```

### Prisma Client Not Found

**Problem:** Prisma client not generated

**Solution:**
```bash
npm run db:generate
```

### Many Songs Failing

**Problem:** Rate limiting or network issues

**Solution:**
- The script automatically skips already-cached songs, so just run it again
- Songs in `failed-songs.json` can be retried later
- Some songs legitimately don't have lyrics available

### Port 3000 Already in Use

**Problem:** Another app using port 3000

**Solution:**
```bash
# Kill the process
lsof -ti:3000 | xargs kill

# Or run on different port
PORT=3001 npm run dev
```

## 🎵 Using the Lyrics System

### In Your Application Code

```typescript
import prisma from '@/lib/prisma';

// Get cached lyrics
const lyrics = await prisma.lyrics.findUnique({
  where: { spotifyId: 'track_id_here' },
});

if (lyrics) {
  console.log(`Found ${lyrics.lyrics.length} synced lyrics lines`);
  // lyrics.lyrics is: [{time: 1000, text: "First line"}, ...]
}

// Update access stats
await prisma.lyrics.update({
  where: { spotifyId: 'track_id_here' },
  data: {
    accessCount: { increment: 1 },
    lastAccessed: new Date(),
  },
});

// Search for lyrics
const results = await prisma.lyrics.findMany({
  where: {
    OR: [
      { title: { contains: 'search term', mode: 'insensitive' } },
      { artist: { contains: 'search term', mode: 'insensitive' } },
    ],
  },
  take: 10,
});
```

### Fallback to API if Not Cached

```typescript
import prisma from '@/lib/prisma';
import { fetchSyncedLyrics } from '@/lib/lyrics';

async function getLyrics(spotifyId: string, trackName: string, artistName: string, duration: number) {
  // Check cache first
  let lyrics = await prisma.lyrics.findUnique({
    where: { spotifyId },
  });

  if (lyrics) {
    // Update access stats
    await prisma.lyrics.update({
      where: { spotifyId },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
    return lyrics.lyrics;
  }

  // Not cached - fetch from API
  const lyricsLines = await fetchSyncedLyrics(trackName, artistName, duration);
  
  if (lyricsLines) {
    // Cache for future use
    await prisma.lyrics.create({
      data: {
        spotifyId,
        title: trackName,
        artist: artistName,
        duration,
        lyrics: lyricsLines as any,
        plainLyrics: lyricsLines.map(l => l.text).join('\n'),
        source: 'API',
      },
    });
  }

  return lyricsLines;
}
```

## 📚 Additional Resources

- **Prisma Documentation:** https://www.prisma.io/docs
- **Next.js Documentation:** https://nextjs.org/docs
- **Spotify API Documentation:** https://developer.spotify.com/documentation/web-api
- **PostgreSQL Documentation:** https://www.postgresql.org/docs/

## 🎉 You're All Set!

You now have:
- ✅ PostgreSQL database with proper schema
- ✅ ~1000 popular songs with cached lyrics
- ✅ Backup files for portability
- ✅ Scripts to fetch more lyrics as needed
- ✅ Full TypeScript typing for your database

Your app can now access lyrics instantly from the database instead of making API calls every time!

