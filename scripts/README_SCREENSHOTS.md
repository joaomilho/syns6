# Visualization Screenshot & Animation Generator

This script automatically generates **static thumbnails AND animated previews** for all visualizations using Playwright + ffmpeg.

## Prerequisites

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers (one-time setup):
```bash
npx playwright install chromium
```

3. Install ffmpeg (for animated WebP creation):
```bash
brew install ffmpeg
```

4. Make sure your development server is running:
```bash
npm run dev
```

## Usage

Run the screenshot capture script:

```bash
npm run capture-screenshots
```

This will:
1. Check if dev server is running
2. Open each visualization at `/screenshots/[vizId]`
3. Wait for DOM to load + 1.5 seconds for animation to start
4. **Capture 1 static PNG** thumbnail
5. **Capture 27 frames** over 1.5 seconds (~18 FPS - smooth & compact!)
6. **Create animated WebP** from frames using ffmpeg
7. Save to `/public/viz-thumbnails/`:
   - `[vizId].png` - Static thumbnail (shown by default)
   - `[vizId].webp` - Animated preview (plays on hover)

## Output

Static thumbnails and animated previews are saved to:
```
/public/viz-thumbnails/
  ├── fftspectrum.png    ← Static thumbnail
  ├── fftspectrum.webp   ← Animated (3s loop)
  ├── particles.png
  ├── particles.webp
  ├── fractal.png
  ├── fractal.webp
  └── ... (etc)
```

**How they're used:**
- `.png` - Shown by default in the dropdown
- `.webp` - Fades in on hover (animated loop)

The `VisualizationDropdown.tsx` component automatically handles the hover effect.

## Custom URL

To capture screenshots from a different server (e.g., staging, production):

```bash
BASE_URL=https://your-domain.com npm run capture-screenshots
```

## Tech Stack

### Playwright
- ✅ Better Mac Silicon (M1/M2/M3) support than Puppeteer
- ✅ Faster and more reliable browser automation
- ✅ Modern API with great TypeScript support

### ffmpeg for Animated WebP
- ✅ Creates **looping animated WebP** files
- ✅ Much smaller than GIF (~50-100KB for 3s)
- ✅ Better quality than GIF
- ✅ Auto-loops in browser (no JS needed)
- ✅ 95%+ browser support

## Customization

Edit `/scripts/captureScreenshots.ts` to adjust:

```typescript
const VIEWPORT_WIDTH = 800;        // Thumbnail width
const VIEWPORT_HEIGHT = 600;       // Thumbnail height
const ANIMATION_FRAMES = 27;       // Total frames to capture
const ANIMATION_DURATION = 1.5;    // Animation length (seconds)
const FPS = 18;                    // Frames per second (~18)
const WAIT_TIME = 1500;            // Wait before capture (ms)
```

**Tips:**
- 27 frames over 1.5s = smooth & compact animations
- Shorter duration = snappier feel (1.5s is perfect for preview)
- Fewer frames = smaller file sizes (~30-60KB)
- Adjust quality in ffmpeg command: `-q:v 75` (lower = better quality, larger file)

## Mock Data

The `/screenshots/[vizId]` page uses:
- **Animated microphone data** - simulates realistic audio input with sine waves
- **Empty lyrics** - passes empty lyric object to prevent "no lyrics found" messages
- **No authentication required** - standalone page for easy screenshot capture

This ensures consistent, beautiful screenshots without needing Spotify/microphone access.

