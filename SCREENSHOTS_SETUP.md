# 🎬 Automated Visualization Thumbnails & Animations

## What Was Built

A fully automated system for capturing **static thumbnails + animated previews** of all visualizations, with **hover-to-play** effects in the dropdown. No authentication or Spotify/microphone access required!

### Files Created

1. **`/app/screenshots/[vizId]/page.tsx`**
   - Dynamic route that renders any visualization
   - Mock microphone data with realistic animations
   - Lorem ipsum lyrics for testing
   - No auth required - standalone pages

2. **`/scripts/captureScreenshots.ts`**
   - Playwright + ffmpeg script for automation
   - Loops through all 11 visualizations
   - Captures static PNG thumbnail (800x600 @ 2x)
   - Captures 45 frames over 3 seconds
   - Creates animated WebP with ffmpeg (15 FPS, infinite loop)
   - Saves to `/public/viz-thumbnails/`

3. **`/scripts/README_SCREENSHOTS.md`**
   - Documentation for the screenshot system

### Files Modified

- **`package.json`** - Added playwright dependency & `capture-screenshots` script
- **`VisualizationDropdown.tsx`** - Shows static PNG by default, animated WebP on hover
- **`VisualizationDropdown.module.css`** - CSS hover effects for animation playback

## How to Use

### 1. Install Dependencies (if needed)

```bash
npm install
```

### 2. Install Playwright Browsers (one-time setup)

```bash
npx playwright install chromium
```

### 3. Install ffmpeg (for animated WebP)

```bash
brew install ffmpeg
```

### 4. Start Dev Server

```bash
npm run dev
```

### 5. Capture Thumbnails & Animations

```bash
npm run capture-screenshots
```

This will:
- Open each visualization at `http://localhost:3000/screenshots/[vizId]`
- Capture 1 static PNG thumbnail
- Capture 27 frames over 1.5 seconds (~18 FPS - smooth & compact!)
- Create animated WebP from frames
- Save both to `/public/viz-thumbnails/`

Takes ~2-3 minutes to complete all 11 visualizations.

### 6. Done!

The dropdown now shows:
- 📸 **Static PNG by default** - fast loading
- 🎬 **Animated WebP on hover** - smooth 1.5s preview loop

## Preview Individual Visualizations

Visit any visualization directly in your browser:

- http://localhost:3000/screenshots/fftspectrum
- http://localhost:3000/screenshots/particles
- http://localhost:3000/screenshots/fractal
- http://localhost:3000/screenshots/psychedelic
- http://localhost:3000/screenshots/waves
- http://localhost:3000/screenshots/animated
- http://localhost:3000/screenshots/spectrum3d
- http://localhost:3000/screenshots/wavespectrum
- http://localhost:3000/screenshots/camera
- http://localhost:3000/screenshots/youtube
- http://localhost:3000/screenshots/debug

## Mock Data

### Animated Microphone Data
Generates realistic audio patterns using sine waves:
- Bass, mid, treble frequencies
- Drum components (kick, snare, hihat, etc.)
- Vocal analysis
- Frequency spectrum (512 bins)

### Empty Lyrics
Screenshots pass an **empty lyrics object** to prevent "no lyrics found" messages while keeping the view clean and focused on the visualization.

## Customization

Edit `/scripts/captureScreenshots.ts` to:
- Change screenshot dimensions (default: 800x600)
- Adjust wait time (default: 3000ms)
- Modify quality/format
- Capture from different URL (staging/production)

Example:
```bash
BASE_URL=https://your-app.vercel.app npm run capture-screenshots
```

## Benefits

✅ **No Auth Required** - Standalone pages, no Spotify login needed  
✅ **Animated Previews** - Smooth 1.5s looping animations on hover  
✅ **Small File Sizes** - WebP animations are ~50-100KB each  
✅ **Consistent Results** - Same mock data every time  
✅ **Fully Automated** - One command captures everything  
✅ **Easy Regeneration** - Update viz, re-run script  
✅ **Production Ready** - Can capture from any environment  
✅ **Better UX** - Users see exactly what they're selecting  

## Adding New Visualizations

1. Add visualization to `/app/screenshots/[vizId]/page.tsx` switch statement
2. Add visualization ID to `/scripts/captureScreenshots.ts` array
3. Add thumbnail path to `VisualizationDropdown.tsx`
4. Run `npm run capture-screenshots`

Done! 🎉

