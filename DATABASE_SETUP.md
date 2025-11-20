# PostgreSQL Database Setup Guide

This project uses **Prisma** as the ORM for PostgreSQL database management.

## Why Prisma?

- ✅ Excellent TypeScript support with auto-generated types
- ✅ Intuitive schema definition and migration system
- ✅ Perfect integration with Next.js
- ✅ Built-in connection pooling
- ✅ Great developer experience

## Prerequisites

1. **Install PostgreSQL** (if not already installed):
   ```bash
   # macOS
   brew install postgresql@16
   brew services start postgresql@16
   
   # Or use Docker
   docker run --name syns-postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres:16
   ```

## Installation Steps

### 1. Install Dependencies

```bash
npm install prisma @prisma/client
npm install -D prisma
```

### 2. Create Database

```bash
# Connect to PostgreSQL
psql postgres

# In psql, create the database
CREATE DATABASE syns;
CREATE USER syns_user WITH PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE syns TO syns_user;
\q
```

### 3. Configure Environment Variables

Copy `.env.example` to `.env` and update the `DATABASE_URL`:

```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://syns_user:your_secure_password@localhost:5432/syns?schema=public"
```

### 4. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create the database tables
npx prisma db push

# Or use migrations (recommended for production)
npx prisma migrate dev --name init
```

### 5. Open Prisma Studio (Optional)

Prisma Studio is a GUI to view and edit data in your database:

```bash
npx prisma studio
```

This opens at `http://localhost:5555`

## Database Schema

The schema includes the following tables:

### `users`
- User profiles with Spotify integration
- Stores OAuth tokens for Spotify API access

### `user_preferences`
- Visualization settings (type, intensity)
- Hue light settings (max intensity, bridge IP)
- Audio preferences (sensitivity, bass boost)

### `cached_lyrics`
- Cached lyrics from various APIs
- Supports both plain text and synced lyrics
- Tracks access count for cache management

### `play_history`
- Track what users are listening to
- Enables analytics and predictive pre-loading of lyrics
- Records visualization preferences per track

### `hue_lights`
- Hue light configurations
- Light capabilities and status

## Usage Examples

### Query with Prisma Client

```typescript
import prisma from '@/lib/prisma';

// Create user
const user = await prisma.user.create({
  data: {
    email: 'user@example.com',
    name: 'Music Lover',
    spotifyId: 'spotify_user_id',
  },
});

// Cache lyrics
await prisma.cachedLyrics.create({
  data: {
    trackId: 'spotify_track_id',
    trackName: 'Song Name',
    artistName: 'Artist Name',
    lyrics: 'Full lyrics text...',
    syncedLyrics: { /* synced data */ },
    source: 'genius',
    userId: user.id,
  },
});

// Get cached lyrics
const lyrics = await prisma.cachedLyrics.findUnique({
  where: { trackId: 'spotify_track_id' },
});

// Update user preferences
await prisma.userPreferences.upsert({
  where: { userId: user.id },
  update: {
    hueMaxIntensity: 0.7,
    enableHueLights: true,
  },
  create: {
    userId: user.id,
    hueMaxIntensity: 0.7,
    enableHueLights: true,
  },
});

// Get play history
const recentTracks = await prisma.playHistory.findMany({
  where: { userId: user.id },
  orderBy: { playedAt: 'desc' },
  take: 10,
});
```

### API Route Example

```typescript
// app/api/lyrics/cache/route.ts
import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(request: NextRequest) {
  const trackId = request.nextUrl.searchParams.get('trackId');
  
  if (!trackId) {
    return NextResponse.json({ error: 'Track ID required' }, { status: 400 });
  }
  
  // Check cache first
  const cached = await prisma.cachedLyrics.findUnique({
    where: { trackId },
  });
  
  if (cached) {
    // Update access stats
    await prisma.cachedLyrics.update({
      where: { id: cached.id },
      data: {
        accessCount: { increment: 1 },
        lastAccessed: new Date(),
      },
    });
    
    return NextResponse.json(cached);
  }
  
  // Fetch from external API and cache...
  // ...
}
```

## Useful Commands

```bash
# Format Prisma schema
npx prisma format

# Validate schema
npx prisma validate

# View current database structure
npx prisma db pull

# Reset database (⚠️ deletes all data)
npx prisma migrate reset

# Seed database (create seed file first)
npx prisma db seed
```

## Production Considerations

1. **Connection Pooling**: Consider using Prisma Data Proxy or PgBouncer for serverless environments
2. **Migrations**: Always use `prisma migrate deploy` in production
3. **Backup**: Set up automated PostgreSQL backups
4. **Indexes**: The schema includes indexes on frequently queried fields
5. **Environment Variables**: Never commit `.env` file

## Alternative Options Considered

- **Drizzle ORM**: Lighter weight, also great for TypeScript
- **Kysely**: Type-safe SQL query builder
- **node-postgres (pg)**: Low-level PostgreSQL client

Prisma was chosen for its excellent DX, migrations, and Next.js integration.

