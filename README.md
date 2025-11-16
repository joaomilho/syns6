# Spotify Authentication Next.js App

A Next.js TypeScript application with complete Spotify OAuth authentication, requesting all available Spotify permissions.

## Features

- **Next.js 16.0.3** with App Router
- **TypeScript** for type safety
- **NextAuth.js** for authentication
- **All Spotify Scopes** - Requests all available Spotify API permissions
- Modern UI with dark mode support

## Spotify Scopes Included

This app requests all available Spotify authorization scopes:

### Images
- `ugc-image-upload` - Upload images to Spotify

### Listening History
- `user-read-recently-played` - Read recently played tracks
- `user-top-read` - Read top artists and tracks
- `user-read-playback-position` - Read playback position

### Spotify Connect
- `user-read-playback-state` - Read playback state
- `user-modify-playback-state` - Control playback
- `user-read-currently-playing` - Read currently playing track

### Playback
- `app-remote-control` - Remote control playback
- `streaming` - Stream audio content

### Playlists
- `playlist-modify-public` - Modify public playlists
- `playlist-modify-private` - Modify private playlists
- `playlist-read-private` - Read private playlists
- `playlist-read-collaborative` - Read collaborative playlists

### Follow
- `user-follow-modify` - Follow/unfollow artists and users
- `user-follow-read` - Read following state

### Library
- `user-library-modify` - Modify library
- `user-library-read` - Read library

### Users
- `user-read-email` - Read email address
- `user-read-private` - Read private user data

### Open Access & Management
- `user-soa-link` - Link Spotify Open Access
- `user-soa-unlink` - Unlink Spotify Open Access
- `user-manage-partner` - Manage partner integrations
- `user-manage-private-session` - Manage private sessions

## Setup Instructions

### 1. Create a Spotify App

1. Go to [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Log in with your Spotify account
3. Click "Create App"
4. Fill in the app details:
   - **App Name**: Choose any name
   - **App Description**: Your app description
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/spotify`
   - Accept the terms and click "Create"
5. In your app settings, note down:
   - **Client ID**
   - **Client Secret** (click "View client secret")

### 2. Configure Environment Variables

1. Copy the example environment file:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your credentials:
   ```bash
   SPOTIFY_CLIENT_ID=your_spotify_client_id_here
   SPOTIFY_CLIENT_SECRET=your_spotify_client_secret_here
   NEXTAUTH_URL=http://localhost:3000
   NEXTAUTH_SECRET=your_generated_secret_here
   ```

3. Generate a secure `NEXTAUTH_SECRET`:
   ```bash
   openssl rand -base64 32
   ```

### 3. Install Dependencies & Run

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...nextauth]/
│   │           └── route.ts          # NextAuth API routes
│   ├── layout.tsx                     # Root layout with AuthProvider
│   ├── page.tsx                       # Main page with auth UI
│   ├── page.module.css                # Styling
│   └── globals.css                    # Global styles
├── auth.ts                            # NextAuth configuration
├── components/
│   └── AuthProvider.tsx               # Session provider wrapper
└── types/
    └── next-auth.d.ts                 # TypeScript definitions
```

## Using the Access Token

Once authenticated, you can access the Spotify access token from the session:

```typescript
import { useSession } from "next-auth/react";

export default function MyComponent() {
  const { data: session } = useSession();
  
  if (session?.accessToken) {
    // Use the access token to call Spotify API
    const response = await fetch('https://api.spotify.com/v1/me', {
      headers: {
        'Authorization': `Bearer ${session.accessToken}`
      }
    });
  }
}
```

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Tech Stack

- **Framework**: Next.js 16.0.3
- **Language**: TypeScript
- **Authentication**: NextAuth.js (Auth.js)
- **Styling**: CSS Modules
- **Package Manager**: npm

## Troubleshooting

### "Invalid redirect URI" error
- Make sure you've added `http://localhost:3000/api/auth/callback/spotify` to your Spotify app's redirect URIs
- The redirect URI must match exactly (including http/https)

### "Invalid client" error
- Double-check your Client ID and Client Secret in `.env.local`
- Make sure there are no extra spaces in the environment variables

### Session not persisting
- Verify `NEXTAUTH_SECRET` is set in `.env.local`
- Clear browser cookies and try again

## License

MIT
