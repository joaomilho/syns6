# Custom Visualization Thumbnails

## Auto-Capture Feature

Custom AI-generated visualizations now **automatically capture their own screenshots** using browser APIs when saved!

## How It Works

### 1. **User Creates Visualization**
- Uses AI to generate a new visualization
- Clicks "Save" and enters a name

### 2. **Initial Save**
- Visualization is saved to IndexedDB without thumbnail
- Creator closes
- Visualization switches to the new viz (to render it)

### 3. **Auto Screenshot (3s delay)**
```typescript
// After 3 seconds, captures the rendered canvas
const thumbnail = await captureAndCompressThumbnail('body');
// Saves base64 JPEG (~30-60KB) to database
viz.thumbnail = thumbnail; // data:image/jpeg;base64,...
await saveCustomVisualization(viz);
```

### 4. **Display in Dropdown**
- Dropdown checks if thumbnail is a data URL
- If yes: Shows captured screenshot
- If no: Falls back to gradient placeholder

## Technical Details

### Screenshot Capture
- **Location**: `/src/lib/screenshotCapture.ts`
- **Method**: Captures WebGL canvas element directly
- **Format**: JPEG base64 data URL
- **Size**: Max 600px wide, 70% quality
- **File size**: ~30-60KB per thumbnail
- **Storage**: IndexedDB (localforage)

### Timing
- **Wait before capture**: 3 seconds after viz renders
- **Reason**: Allows WebGL/animations to initialize
- **Non-blocking**: Capture happens in background, doesn't block UI

### Canvas Capture Code
```typescript
// Finds the WebGL canvas
const webglCanvas = element.querySelector('canvas');

// Draws to a temporary canvas
ctx.drawImage(webglCanvas, 0, 0);

// Converts to compressed JPEG
const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
```

## Database Schema

```typescript
interface CustomVisualization {
  id: string;
  name: string;
  prompt: string;
  code: string; // DSL JSON
  compiledCode?: string; // Compiled JS
  createdAt: number;
  icon?: string;
  thumbnail?: string; // ← data:image/jpeg;base64,... OR gradient
}
```

## Dropdown Display Logic

```typescript
// Custom visualizations
<div style={{
  backgroundImage: thumbnail?.startsWith('data:image/')
    ? `url(${thumbnail})` // ← Real screenshot
    : undefined,
  background: thumbnail?.startsWith('data:image/')
    ? undefined
    : (thumbnail || "gradient..."), // ← Fallback gradient
  backgroundSize: 'cover',
  backgroundPosition: 'center',
}}>
```

## Benefits

✅ **Automatic** - No manual screenshot needed  
✅ **Real preview** - Shows actual visualization  
✅ **Client-side** - No server required  
✅ **Fast** - Captures in ~3 seconds  
✅ **Small** - ~30-60KB per thumbnail  
✅ **Offline** - All stored in IndexedDB  
✅ **Persistent** - Thumbnails saved with viz  

## Manual Screenshot Retake

### Retake Screenshot Button ✅ Implemented

When viewing a custom AI visualization, you'll see a **"📸 Retake Screenshot"** button next to the Recompile button. This allows you to:

- Update screenshots for old visualizations created before this feature
- Recapture if the auto-screenshot failed
- Get a better screenshot at a different moment in the animation

**How to use:**
1. Switch to the custom visualization you want to update
2. Wait for it to render nicely
3. Click "📸 Retake Screenshot"
4. Wait 2 seconds (automatic)
5. Screenshot captured and saved!

The button is located in the visualization info panel (bottom-left corner) alongside the Recompile button.

### Animated Thumbnails (Advanced)
Could capture multiple frames and create WebP animation:
- Capture 10-15 frames over 1 second
- Use ffmpeg.wasm to create WebP in browser
- Store as animated thumbnail
- More complex but gives motion preview

## Files Modified

- ✅ `/src/lib/screenshotCapture.ts` - Capture functions (NEW)
- ✅ `/src/lib/customVisualizations.ts` - Added `updateVisualizationThumbnail()`
- ✅ `/src/app/player/page.tsx` - Auto-capture on save
- ✅ `/src/components/VisualizationDropdown.tsx` - Display screenshots

## Testing

1. Create a new AI visualization
2. Save it with a name
3. Wait 3 seconds
4. Open dropdown
5. Should see actual screenshot of the viz!

## Troubleshooting

**Screenshot not showing?**
- Check browser console for errors
- Ensure canvas rendered before capture (3s delay)
- Verify IndexedDB is enabled in browser

**Screenshot is black/empty?**
- **WebGL context issue**: Canvas is cleared between frames
  - Solution: Now captures during `requestAnimationFrame` ✅
  - If still blank, Three.js canvas needs `preserveDrawingBuffer: true`
- Try increasing wait time (currently 3s)
- Check if canvas is actually visible
- Check browser console for "📸" logs to see what's happening

**File size too large?**
- Decrease quality (currently 0.7)
- Reduce max width (currently 600px)
- Switch to lower resolution

## Comparison

| Method | Built-in Vizs | Custom AI Vizs |
|--------|---------------|----------------|
| **Capture** | Puppeteer script | Browser canvas API |
| **Timing** | On-demand (npm run) | Auto on save |
| **Storage** | `/public/viz-thumbnails/` | IndexedDB |
| **Format** | PNG + WebP animation | JPEG base64 |
| **File size** | ~50KB (WebP) | ~30-60KB (JPEG) |
| **Animated** | ✅ Yes (on hover) | ❌ Not yet |

Perfect system for both built-in and custom visualizations! 🎉

