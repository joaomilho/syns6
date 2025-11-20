# NextAuth with Prisma Setup

Your app now uses Prisma adapter for NextAuth, saving users and sessions to PostgreSQL!

## ✅ What Changed

### 1. Database Schema Updated
Added NextAuth required tables:
- `accounts` - OAuth provider accounts (Spotify tokens)
- `sessions` - User sessions
- `users` - User profiles
- `verification_tokens` - Email verification (if needed)

### 2. Auth Configuration
- `src/auth.ts` now uses `PrismaAdapter`
- Sessions stored in database (not JWT)
- Spotify tokens saved to `accounts` table
- User profile saved to `users` table

### 3. Dependencies Added
- `@next-auth/prisma-adapter`
- `@prisma/client`
- `prisma` (dev dependency)

## 🚀 Setup Steps

### 1. Install Dependencies
```bash
npm install
```

### 2. Update Database
```bash
npx prisma generate
npx prisma db push
```

Or create a migration:
```bash
npx prisma migrate dev --name add_nextauth_tables
```

### 3. Run Your App
```bash
npm run dev
```

### 4. Sign In
Visit http://localhost:3000 and sign in with Spotify.

Your user will be saved to the database!

## 📊 Database Structure

### `users` Table
```sql
id            String (CUID)
name          String
email         String (unique)
emailVerified DateTime
image         String (avatar URL)
createdAt     DateTime
updatedAt     DateTime
```

### `accounts` Table (Spotify OAuth)
```sql
id                String (CUID)
userId            String → users.id
type              "oauth"
provider          "spotify"
providerAccountId String (Spotify user ID)
refresh_token     Text (Spotify refresh token)
access_token      Text (Spotify access token)
expires_at        Int (Unix timestamp)
token_type        "Bearer"
scope             String (all requested scopes)
```

### `sessions` Table
```sql
id           String (CUID)
sessionToken String (unique)
userId       String → users.id
expires      DateTime
```

## 🔍 How To Use

### Get Current User in Server Components
```typescript
import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import prisma from "@/lib/prisma";

export default async function Page() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    return <div>Not signed in</div>;
  }
  
  // Get full user from database
  const user = await prisma.user.findUnique({
    where: { email: session.user.email! },
    include: {
      accounts: true,
      preferences: true,
    },
  });
  
  return <div>Hello {user?.name}!</div>;
}
```

### Get Spotify Access Token
```typescript
import prisma from "@/lib/prisma";

async function getSpotifyToken(userId: string) {
  const account = await prisma.account.findFirst({
    where: {
      userId,
      provider: "spotify",
    },
  });
  
  if (!account) {
    throw new Error("No Spotify account found");
  }
  
  // Check if token expired
  if (account.expires_at && account.expires_at * 1000 < Date.now()) {
    // Refresh token logic here
    // (NextAuth handles this automatically in callbacks)
  }
  
  return account.access_token;
}
```

### Create User Preferences on First Login
```typescript
// In your auth callbacks or after login
async function createDefaultPreferences(userId: string) {
  await prisma.userPreferences.upsert({
    where: { userId },
    update: {},
    create: {
      userId,
      preferredVisualization: "spectrum",
      visualizationIntensity: 1.0,
      hueMaxIntensity: 0.7,
      enableHueLights: false,
    },
  });
}
```

### Track Play History
```typescript
async function trackPlayback(userId: string, track: any) {
  await prisma.playHistory.create({
    data: {
      userId,
      trackId: track.id,
      trackName: track.name,
      artistName: track.artists.map((a: any) => a.name).join(', '),
      albumName: track.album.name,
      duration: track.duration_ms,
      visualizationType: "spectrum", // or from user preferences
    },
  });
}
```

## 🔄 Token Refresh

NextAuth automatically refreshes Spotify tokens using the callback in `auth.ts`:

```typescript
async jwt({ token, account, trigger }) {
  // Initial sign in - save tokens
  if (account) {
    token.accessToken = account.access_token;
    token.refreshToken = account.refresh_token;
    token.expiresAt = account.expires_at;
    return token;
  }

  // Token still valid
  if (Date.now() < (token.expiresAt as number) * 1000) {
    return token;
  }

  // Token expired - refresh it
  // ... refresh logic ...
}
```

The refreshed token is automatically saved to the database.

## 🎵 Connecting Lyrics to Users

Now you can associate lyrics with users:

```typescript
// Save which user fetched lyrics
await prisma.lyrics.update({
  where: { spotifyId: track.id },
  data: {
    lastAccessedBy: userId,
    accessCount: { increment: 1 },
  },
});
```

Or create a new relation:

```prisma
// In schema.prisma
model Lyrics {
  // ... existing fields ...
  
  accessedBy   User[]   @relation("LyricsAccess")
}
```

## 🔐 Security

### Environment Variables
Make sure these are set:
```env
SPOTIFY_CLIENT_ID="your_client_id"
SPOTIFY_CLIENT_SECRET="your_client_secret"
NEXTAUTH_SECRET="generate_with: openssl rand -base64 32"
NEXTAUTH_URL="http://localhost:3000"
DATABASE_URL="postgresql://..."
```

### Production Considerations
1. Use strong `NEXTAUTH_SECRET`
2. Set `NEXTAUTH_URL` to your production domain
3. Enable HTTPS in production
4. Set up database backups
5. Consider adding rate limiting

## 📈 Migrating Existing Data

If you already have lyrics in the database but no users, you can:

1. Create a "system" user for orphaned lyrics
2. Associate all existing lyrics with this user
3. Or leave `userId` as nullable and add later

```typescript
// Create system user
const systemUser = await prisma.user.create({
  data: {
    email: "system@syns.app",
    name: "System",
  },
});

// Optional: Update existing lyrics
await prisma.lyrics.updateMany({
  data: {
    userId: systemUser.id,
  },
});
```

## 🧪 Testing

### Check Database Tables
```bash
npx prisma studio
```

Opens GUI at http://localhost:5555 to browse your data.

### Verify User Creation
1. Sign in via Spotify
2. Check `users` table - should have your profile
3. Check `accounts` table - should have Spotify tokens
4. Check `sessions` table - should have active session

### Test Token Refresh
Wait for token to expire (~1 hour) and use the app. Check logs for "Token expired, refreshing..." message.

## 🎉 Benefits

**Before:**
- ❌ No user persistence
- ❌ Tokens only in memory/cookies
- ❌ Can't track who did what
- ❌ Lose session on browser close

**After:**
- ✅ Users saved to database
- ✅ Tokens persisted and auto-refreshed
- ✅ Can track user activity
- ✅ Sessions persist across devices
- ✅ Can implement user preferences
- ✅ Ready for multi-user deployment

Your app is now production-ready! 🚀

