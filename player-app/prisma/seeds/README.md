# Database Seeds

## YouTube Videos Seed

This seed file allows you to manually populate YouTube videos for your tracks.

### How to Use:

1. **Get your existing lyrics from database:**
   ```sql
   SELECT spotifyId, title, artist FROM lyrics LIMIT 100;
   ```

2. **Find YouTube videos manually:**
   - Search YouTube for each song
   - Copy the video ID from the URL (e.g., `L1vrPpM4eyM` from `https://www.youtube.com/watch?v=L1vrPpM4eyM`)

3. **Add to seed file:**
   Edit `youtube_videos.ts` and add entries like:
   ```typescript
   {
     spotifyId: '3n3Ppam7vgaVa1iaRUc9Lp',
     title: 'Mr. Brightside',
     artist: 'The Killers',
     youtubeId: 'gGdGFtwCNBE',
     source: 'manual',
   },
   ```

4. **Run the seed:**
   ```bash
   npx tsx prisma/seeds/youtube_videos.ts
   ```

### Default Video

When no video is found (API quota exceeded, no match, etc.), the app will use:
- Video ID: `L1vrPpM4eyM`
- URL: https://www.youtube.com/watch?v=L1vrPpM4eyM

You can change this default in `src/app/api/youtube/search/route.ts`.

