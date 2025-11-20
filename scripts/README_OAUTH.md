# Spotify OAuth Integration

All scripts now use **shared OAuth authentication** with automatic token caching and refresh!

## 🎯 What This Means

### Before:
- ❌ Client credentials (limited permissions)
- ❌ 403 errors on audio-features API
- ❌ Manual token management
- ❌ Duplicate auth code in each script

### After:
- ✅ User OAuth (full permissions)
- ✅ Access to audio-features API (instrumentalness detection!)
- ✅ Automatic token caching and refresh
- ✅ Shared auth module across all scripts
- ✅ Browser opens once, token cached for 1 hour

## 📁 Files

### New Shared Module
- `scripts/lib/spotifyAuth.ts` - Shared OAuth utilities
  - `loadEnv()` - Load environment variables
  - `getSpotifyAccessToken(scopes)` - Get token (cached/refreshed automatically)
  - `clearTokenCache()` - Force re-authentication

### Updated Scripts
- `scripts/generateSongsList.ts` - Uses shared OAuth
- `scripts/fetchLyrics.ts` - Uses shared OAuth + audio-features API
- `scripts/inspectTrack.ts` - Uses shared OAuth

### Cache File (auto-generated, gitignored)
- `.spotify-token-cache.json` - Cached token with expiry and refresh token

## 🚀 How It Works

### First Run (Any Script)
```bash
npm run fetch-lyrics
```

1. Opens browser → Spotify login
2. You click "Agree"
3. Token saved to `.spotify-token-cache.json`
4. Script continues

### Subsequent Runs
```bash
npm run fetch-lyrics    # Uses cached token (no browser!)
npm run generate-songs  # Uses same cached token!
npm run inspect ...     # Uses same cached token!
```

### Token Expires (~1 hour)
- Automatically refreshes using refresh token
- No browser popup needed
- Seamless!

### Token Refresh Fails
- Opens browser for new OAuth
- Saves new token
- Continues

## 🔐 Permissions

The scripts request these scopes:
- `user-library-read` - Read your saved tracks
- `playlist-read-private` - Read your private playlists
- `playlist-read-collaborative` - Read collaborative playlists

These are **read-only** permissions. Scripts cannot modify your library.

## 🎵 New Feature: Spotify Instrumentalness Detection

`fetchLyrics.ts` now uses Spotify's **audio-features API**:

```typescript
// Automatically detects instrumentals before fetching lyrics
const features = await fetch(`https://api.spotify.com/v1/audio-features/${spotifyId}`);
const instrumentalness = features.instrumentalness; // 0-1 score

if (instrumentalness > 0.5) {
  // Skip lyrics fetch, mark as instrumental
}
```

### Example Output:
```
[42/1000] Processing: "Orion" by Metallica
   🔍 Instrumental detection: 95% - Spotify API (94.8%)
   🎵 Marked as instrumental, skipping lyrics fetch
   💾 Saved without lyrics
```

## 📊 Comparison: Title-Based vs Spotify API

### Title/Artist Detection (Fallback)
```
✅ Fast (no API call)
✅ Works offline
❌ Only catches obvious cases
❌ Misses subtle instrumentals
```

### Spotify API Detection (Primary)
```
✅ Accurate (ML-based audio analysis)
✅ Catches subtle instrumentals
✅ Confidence score
❌ Requires OAuth
❌ One API call per song
```

### Hybrid Approach (Current Implementation)
```
1. Check title for keywords → 100% confidence
2. Check artist against known list → 90% confidence  
3. Call Spotify audio-features → ML confidence
4. If none match → fetch lyrics
```

## 🛠️ Development

### Force New Authentication
```typescript
import { clearTokenCache } from './lib/spotifyAuth';
clearTokenCache();
```

Or manually delete:
```bash
rm .spotify-token-cache.json
```

### Add More Scopes
```typescript
const token = await getSpotifyAccessToken([
  'user-library-read',
  'user-top-read',        // Add new scope
  'user-read-recently-played',
]);
```

### Check Token Status
```bash
cat .spotify-token-cache.json
```

Output:
```json
{
  "accessToken": "BQD...",
  "refreshToken": "AQD...",
  "expiresAt": 1700000000000
}
```

## 🔒 Security

- ✅ Token cache is in `.gitignore` (never committed)
- ✅ Redirect URI is localhost (secure)
- ✅ State parameter prevents CSRF attacks
- ✅ Refresh tokens stored locally only
- ✅ Read-only permissions

## ⚡ Performance

### Token Caching Benefits
- First run: ~5 seconds (browser auth)
- Subsequent runs: ~0ms (cached)
- After expiry: ~1 second (refresh)

### Per-Song Impact
With Spotify API calls:
- +100-200ms per song (audio-features check)
- But saves 3-5 seconds on instrumentals (skips lyrics fetch!)
- Net positive for libraries with instrumentals

## 🎓 Usage Examples

### Run Lyrics Fetch (First Time)
```bash
npm run fetch-lyrics
```
- Browser opens
- Click "Agree"
- Script continues
- Token cached

### Run Again Later
```bash
npm run fetch-lyrics  # No browser! Uses cache
```

### Generate Songs List
```bash
npm run generate-songs  # Also uses cached token!
```

### Inspect a Track
```bash
npx tsx scripts/inspectTrack.ts 2o14OKUrq8iVD4JKJpUudB
# Uses cached token, shows full Spotify data
```

## 🐛 Troubleshooting

### "Could not refresh token"
```bash
rm .spotify-token-cache.json
npm run fetch-lyrics  # Will re-authenticate
```

### "Port 8888 already in use"
Another app is using port 8888. Kill it or change PORT in `spotifyAuth.ts`:
```typescript
const PORT = 8889;  // Change this
```

### "INVALID_CLIENT"
Make sure redirect URI in Spotify Dashboard is:
```
http://127.0.0.1:8888/callback
```

## 📈 Future Enhancements

Possible improvements:
- [ ] Batch audio-features requests (up to 100 tracks at once)
- [ ] Add more scopes for other features
- [ ] Token cache per-script (different scopes)
- [ ] Automatic scope validation

## 🎉 Summary

One OAuth flow, all scripts, automatic caching, better instrumental detection!

**Before:** 403 errors, no instrumental detection  
**After:** Full Spotify API access, ML-based detection, seamless experience! 🚀

