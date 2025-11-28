# Quick Start Guide

## What's Been Set Up

Your Next.js project is now fully configured with Spotify OAuth authentication and all available Spotify permissions.

## File Overview

### Core Authentication Files
- `src/auth.ts` - NextAuth configuration with all Spotify scopes
- `src/app/api/auth/[...nextauth]/route.ts` - Authentication API routes
- `src/components/AuthProvider.tsx` - Session provider wrapper
- `src/types/next-auth.d.ts` - TypeScript type definitions

### Application Files
- `src/app/page.tsx` - Main page with authentication UI
- `src/app/layout.tsx` - Root layout with AuthProvider
- `src/lib/spotify.ts` - Spotify API utility functions

### Documentation
- `README.md` - Complete setup instructions
- `SPOTIFY_API_EXAMPLES.md` - Code examples and API usage
- `.env.local.example` - Environment variables template

## Next Steps

### 1. Set Up Spotify App (Required)

1. Go to https://developer.spotify.com/dashboard
2. Create a new app
3. Add redirect URI: `http://localhost:3000/api/auth/callback/spotify`
4. Copy Client ID and Client Secret

### 2. Configure Environment Variables (Required)

```bash
# Copy the example file
cp .env.local.example .env.local

# Edit .env.local and add your credentials
```

You need to set:
- `SPOTIFY_CLIENT_ID` - From Spotify Dashboard
- `SPOTIFY_CLIENT_SECRET` - From Spotify Dashboard
- `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
- `NEXTAUTH_URL` - Keep as `http://localhost:3000`

### 3. Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

### 4. Test Authentication

1. Click "Sign in with Spotify"
2. Authorize the app (you'll see all permissions)
3. You'll be redirected back with a valid session
4. Your access token will be available in the session

## Using Spotify API

Once authenticated, you can use the utility functions:

```typescript
import { useSession } from "next-auth/react";
import { getCurrentUser, getTopTracks } from "@/lib/spotify";

function MyComponent() {
  const { data: session } = useSession();
  
  if (session?.accessToken) {
    // Use any Spotify API function
    const user = await getCurrentUser(session.accessToken);
  }
}
```

## Available Spotify Permissions

Your app requests ALL Spotify scopes including:
- ✅ Read/write playlists
- ✅ Control playback
- ✅ Access listening history
- ✅ Manage library
- ✅ Follow/unfollow
- ✅ Streaming
- ✅ And 20+ more scopes

See `src/auth.ts` for the complete list.

## Tech Stack

- **Next.js 16.0.3** (latest)
- **React 19.2.0** (latest)
- **TypeScript 5.x** (latest)
- **NextAuth.js 4.24.13** (latest stable)
- **Node.js 20+** recommended

## Resources

- [Spotify Web API Docs](https://developer.spotify.com/documentation/web-api)
- [NextAuth.js Docs](https://next-auth.js.org/)
- [Next.js Docs](https://nextjs.org/docs)

## Troubleshooting

**"Invalid redirect URI"**
- Add `http://localhost:3000/api/auth/callback/spotify` to Spotify app settings

**"Invalid client"**
- Check your `.env.local` file
- Verify Client ID and Secret are correct

**Session not working**
- Make sure `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again

## Support

For issues or questions:
1. Check the README.md for detailed setup
2. Review SPOTIFY_API_EXAMPLES.md for code examples
3. Consult the Spotify API documentation

Happy coding! 🎵

