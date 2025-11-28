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

### Capture All Visualizations

Run the screenshot capture script:

```bash
npm run capture-screenshots
```

### Capture a Single Visualization

To capture only one visualization (faster for testing):

```bash
npm run capture-screenshots oscilloscope
```

Available visualization IDs:
- `fftspectrum`, `particles`, `fractal`, `psychedelic`, `waves`, `animated`, `spectrum3d`, `wavespectrum`, `camera`, `youtube`, `debug`, `oscilloscope`

This will:
1. Check if dev server is running
2. Open each visualization at `/screenshots/[vizId]`
3. Wait for DOM to load + 1.5 seconds for animation to start
4. **Capture 1 static thumbnail** and convert to optimized WebP
5. **Capture 20 frames** over 1.5 seconds (~13 FPS)
6. **Create animated WebP** from frames using ffmpeg
7. Save to `/public/viz-thumbnails/`:
   - `[vizId].png` - Static PNG (fallback)
   - `[vizId]-static.webp` - Optimized static thumbnail (used in dropdown)
   - `[vizId].webp` - Animated preview (for future use)
   - `[vizId].webm` - Video preview (plays on hover)

## Output

Optimized thumbnails and animated previews are saved to:
```
/public/viz-thumbnails/
  ├── fftspectrum.png           ← PNG fallback
  ├── fftspectrum-static.webp   ← Optimized static (used in dropdown)
  ├── fftspectrum.webm          ← Video animation (hover)
  ├── fftspectrum.webp          ← Animated WebP (future use)
  ├── particles-static.webp
  ├── particles.webm
  └── ... (etc)
```

**How they're used:**
- `-static.webp` - Shown by default in dropdown (small, fast loading)
- `.webm` - Fades in on hover (video animation)
- `.png` - Fallback for compatibility
- `.webp` (animated) - Currently unused, for future features

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
const VIEWPORT_WIDTH = 400;        // Thumbnail width (optimized for dropdown)
const VIEWPORT_HEIGHT = 300;       // Thumbnail height (4:3 ratio)
const ANIMATION_FRAMES = 20;       // Total frames to capture
const ANIMATION_DURATION = 1.5;    // Animation length (seconds)
const FPS = 13;                    // Frames per second (~13)
const WAIT_TIME = 1500;            // Wait before capture (ms)
```

**Optimization Settings:**
- 400x300 resolution @ 1x scale = perfect for dropdown thumbnails
- Static images saved as WebP (80% quality) for ~50-80% file size reduction
- Animated WebP uses `-q:v 60` for smaller files (~100-500KB instead of 1-16MB)
- WebM videos use `-crf 35 -b:v 200k` for reasonable file sizes

**Tips:**
- Lower resolution = faster loading in dropdown
- WebP static images are 3-5x smaller than PNG
- Fewer frames = smaller animated files
- Adjust quality in ffmpeg command: `-q:v 60` (lower number = better quality, larger file)

## Mock Data

The `/screenshots/[vizId]` page uses:
- **Animated microphone data** - simulates realistic audio input with sine waves
- **Empty lyrics** - passes empty lyric object to prevent "no lyrics found" messages
- **No authentication required** - standalone page for easy screenshot capture

This ensures consistent, beautiful screenshots without needing Spotify/microphone access.

