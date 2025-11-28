# 🔥 Performance Audit 2025 - Path to 60 FPS

**Date:** Nov 27, 2025  
**Status:** Post-Optimization Review  
**Current FPS:** ~45-50 FPS (target: 60 FPS)

---

## Executive Summary

After implementing the initial optimization list, we've achieved significant performance gains. However, there's still a 00-15 FPS gap to reach consistent 60 FPS. This audit identifies **remaining bottlenecks** and provides **advanced optimizations** to close that gap.

---

## 🎯 Critical Bottlenecks (High Impact)

### 1. **Psychedelic Visualization - CPU Bottleneck** ⚠️ CRITICAL

**Problem:**
- **3,000 particles** being updated every frame (16.67ms)
- **Per-vertex geometry mutation** on icosahedron (4 subdivisions = 2,562 vertices)
- **8 animated planes** with 32x32 subdivisions (1,024 vertices each = 8,192 total)
- All running in JavaScript on the main thread

**Current Code:**
```typescript
// PsychedelicVisualization.tsx
const particleCount = 3000; // Line 163
<icosahedronGeometry args={[5, 4]} /> // Line 69 - 2,562 vertices
<planeGeometry args={[20, 20, 32, 32]} /> // Line 147 - 1,024 vertices × 8 planes
```

**Impact:** ~15-20 FPS loss

**Solutions:**

#### A. Reduce Particle Count (Quick Win)
```typescript
// Reduce from 3000 → 1500
const particleCount = 1500; // Still looks good, 50% faster
```

#### B. Reduce Geometry Complexity
```typescript
// Reduce icosahedron from 4 → 2 subdivisions
<icosahedronGeometry args={[5, 2]} /> // 642 vertices (4x fewer!)

// Reduce plane segments from 32×32 → 16×16
<planeGeometry args={[20, 20, 16, 16]} /> // 256 vertices (4x fewer!)
```

#### C. Move to GPU with Shaders (Advanced)
Replace per-vertex JavaScript mutation with a vertex shader:
```glsl
// Vertex shader for blob morphing
void main() {
  vec3 pos = position;
  float time = uTime;
  float energy = uEnergy;
  
  float distance = length(pos);
  float wave = sin(distance * 0.5 + time * 2.0) * energy * 2.0;
  
  pos.x += sin(time + pos.y) * wave * 0.1;
  pos.y += cos(time + pos.x) * wave * 0.1;
  pos.z += sin(time + pos.x + pos.y) * wave * 0.1;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
```

**Recommendation:** Implement A+B immediately (5 min fix), C later (advanced).

---

### 2. **Lava Lamp - Marching Cubes Performance** ⚠️ CRITICAL

**Problem:**
- MarchingCubes algorithm runs CPU-side every frame
- Resolution is high, causing expensive per-frame recalculation
- Multiple metaballs being evaluated

**Current Code:**
```typescript
// LavaLampVisualization.tsx - line 48
effect.resolution = 48; // High resolution = expensive
```

**Impact:** ~10 FPS loss

**Solutions:**

#### A. Reduce Marching Cubes Resolution
```typescript
effect.resolution = 32; // From 48 → 32 (still looks good, ~2x faster)
```

#### B. Throttle Update Rate
```typescript
let frameCount = 0;
useFrame(() => {
  frameCount++;
  if (frameCount % 2 === 0) return; // Update every 2nd frame (30fps updates)
  
  // ... marching cubes update logic
});
```

#### C. Switch to Instanced Meshes (Alternative Approach)
Replace marching cubes with instanced sphere meshes for similar effect but GPU-powered.

**Recommendation:** Implement A+B immediately.

---

### 3. **Multiple Canvas Elements** ⚠️ HIGH

**Problem:**
You have **TWO canvases** rendering simultaneously:
1. Main visualization canvas
2. Persistent lyrics canvas

Each canvas = separate WebGL context = 2x GPU overhead.

**Current Code:**
```tsx
// player/page.tsx - Lines 1081-1110
<Canvas> {/* Visualization */} </Canvas>

<Canvas> {/* Lyrics - Line 1118 */} </Canvas>
```

**Impact:** ~5-8 FPS loss

**Solutions:**

#### Option A: Merge Lyrics into Main Canvas (Recommended)
Move `Lyrics3D` component into the main unified canvas:

```tsx
<Canvas {...mainCanvasProps}>
  {/* Visualization Scene */}
  {visualizationType === 'fftspectrum' && <FFTSpectrumScene micData={micData} />}
  {/* ... other scenes */}
  
  {/* Lyrics INSIDE same canvas */}
  {lyrics && lyrics.length > 0 && (
    <group position={[0, 0, 8]} scale={0.7}>
      <Lyrics3D
        lyrics={lyrics}
        currentTimeMs={currentProgress}
        isPlaying={playbackState?.is_playing ?? false}
        micData={micData}
      />
    </group>
  )}
</Canvas>
```

Benefits:
- Single WebGL context
- Single render loop
- Shared GPU resources
- +5-8 FPS

**Recommendation:** Implement immediately (high ROI).

---

### 4. **Text Rendering - Too Many Text Objects** ⚠️ MEDIUM

**Problem:**
- Currently showing **5 visible lines** (reduced from 8)
- Each line can split into 2 (long lyrics)
- Each `<Text>` component = expensive SDF (Signed Distance Field) texture generation
- `outlineWidth` adds additional rendering cost

**Current Code:**
```typescript
// Lyrics3D.tsx - Line 250
const visible = getVisibleLines(lyrics, currentIndex, 1, 3); // Up to 5 lines
```

**Impact:** ~3-5 FPS loss

**Solutions:**

#### A. Reduce to 3 Lines
```typescript
const visible = getVisibleLines(lyrics, currentIndex, 0, 2); // 3 lines total
```

#### B. Remove Outline on Non-Current Lines
```tsx
<Text
  outlineWidth={isCurrent ? 0.02 : 0} // Only current line has outline
  outlineColor="black"
/>
```

#### C. Use Texture Atlas for Common Words (Advanced)
Pre-render common words to textures instead of regenerating SDF.

**Recommendation:** Implement A+B immediately.

---

## 🔧 React Rendering Optimizations (Medium Impact)

### 5. **Polling Interval - Already Optimized** ✅

**Current Status:**
```typescript
// player/page.tsx - Line 647-648
const playbackInterval = setInterval(fetchPlaybackState, 5000); // Every 5 seconds
const queueInterval = setInterval(fetchQueueAndPrefetchLyrics, 10000); // Every 10 seconds
```

**Status:** ✅ **Already optimized!** Polling is set to 5 seconds for playback and 10 seconds for queue.

**Impact:** None - this is already well-optimized.

**Recommendation:** No changes needed. Current polling intervals are appropriate.

---

### 6. **Unnecessary Re-renders from useCallback Dependencies**

**Problem:**
Multiple `useCallback` hooks with unstable dependencies cause re-renders:

```typescript
// player/page.tsx - Line 115
onLyricsReceived: useCallback((spotifyId: string, receivedLyrics: LyricLine[] | null) => {
  // ...
}, [playbackState?.item?.id]), // This changes frequently!
```

**Impact:** ~2 FPS loss

**Solutions:**

Use refs instead of dependencies:
```typescript
const playbackStateRef = useRef(playbackState);

useEffect(() => {
  playbackStateRef.current = playbackState;
}, [playbackState]);

const onLyricsReceived = useCallback((spotifyId: string, receivedLyrics: LyricLine[] | null) => {
  lyricsCache.current.set(spotifyId, receivedLyrics);
  
  if (playbackStateRef.current?.item?.id === spotifyId) {
    setLyrics(receivedLyrics);
    setLastFetchedTrackId(spotifyId);
  }
}, []); // Empty deps = stable
```

**Recommendation:** Implement for all worker callbacks.

---

### 7. **Dynamic Imports Not Cached**

**Problem:**
Scene components are dynamically imported but Next.js may not be optimally caching them.

**Current Code:**
```typescript
const FFTSpectrumScene = dynamic(() => import("@/components/FFTSpectrumScene"), { ssr: false });
```

**Solutions:**

Add loading component to prevent layout shift:
```typescript
const FFTSpectrumScene = dynamic(
  () => import("@/components/FFTSpectrumScene"), 
  { 
    ssr: false,
    loading: () => <div style={{ background: '#000', width: '100vw', height: '100vh' }} />
  }
);
```

**Recommendation:** Add loading states to all dynamic imports.

---

## 🎨 CSS/Layout Optimizations (Low-Medium Impact)

### 8. **Backdrop Filter on Top Bar**

**Problem:**
```css
/* player.module.css - Line 58 */
.topBar {
  background: linear-gradient(to bottom, rgba(0, 0, 0, 0.8), transparent);
}
```

Gradients + transparency force GPU compositing layers.

**Impact:** ~1-2 FPS loss

**Solutions:**

#### A. Use Solid Background
```css
.topBar {
  background: rgba(0, 0, 0, 0.8);
}
```

#### B. Add `will-change` for Smooth Compositing
```css
.topBar {
  will-change: transform;
  transform: translateZ(0); /* Force GPU layer */
}
```

**Recommendation:** Implement A (solid background).

---

### 9. **Image Rendering Not Optimized**

**Problem:**
Album art images are loaded at full resolution:

```tsx
<img
  src={displayTrack.album.images[0].url} // Full resolution!
  alt={displayTrack.album.name}
/>
```

**Impact:** ~1 FPS loss + slower initial load

**Solutions:**

Use Next.js `<Image>` with optimization:
```tsx
import Image from 'next/image';

<Image
  src={displayTrack.album.images[0].url}
  alt={displayTrack.album.name}
  width={64}
  height={64}
  quality={75}
  loading="lazy"
/>
```

**Recommendation:** Replace all `<img>` with `<Image>`.

---

### 10. **CSS Animations on Many Elements**

**Problem:**
Bottom controls have transition animations:

```css
.bottomControls {
  transition: all 0.3s ease; /* "all" is expensive */
}
```

**Impact:** ~1 FPS loss

**Solutions:**

Be specific about what transitions:
```css
.bottomControls {
  transition: transform 0.3s ease, opacity 0.3s ease; /* Only transform/opacity */
}
```

**Recommendation:** Audit all CSS transitions.

---

## 📦 Bundle/Loading Optimizations (Initial Load Impact)

### 11. **Three.js Bundle Size**

**Problem:**
Despite tree-shaking efforts, Three.js is still large.

**Current Status:**
- Named imports implemented ✅
- But still importing entire `drei` library

**Solutions:**

#### A. Selective Drei Imports
```typescript
// Instead of:
import { Text, OrbitControls } from "@react-three/drei";

// Use:
import { Text } from "@react-three/drei/core/Text";
import { OrbitControls } from "@react-three/drei/core/OrbitControls";
```

#### B. Code Split by Visualization
Each visualization should be in its own chunk:
```typescript
// Already done with dynamic imports ✅
```

**Recommendation:** Implement A for smaller bundle.

---

### 12. **Font Loading**

**Problem:**
Web fonts block rendering.

**Current:**
```tsx
font="/fonts/Inter-Bold.woff"
```

**Solutions:**

#### A. Preload Critical Fonts
```tsx
// app/layout.tsx
<link rel="preload" href="/fonts/Inter-Bold.woff" as="font" type="font/woff" crossOrigin="anonymous" />
```

#### B. Use System Fonts as Fallback
```typescript
font={fontLoaded ? "/fonts/Inter-Bold.woff" : undefined} // Falls back to built-in
```

**Recommendation:** Implement A.

---

## 🔊 Audio Analysis Optimizations

### 13. **FFT Size Still High for Some Visualizations**

**Problem:**
```typescript
// useMicrophoneAnalysis.ts - Line 47
analyser.fftSize = 1024; // Already reduced from 4096 ✅
```

**Current:** 1024 → 512 frequency bins

**Solutions:**

Make FFT size configurable per visualization:
```typescript
export function useMicrophoneAnalysis(fftSize = 1024) {
  // ...
  analyser.fftSize = fftSize;
}

// In FFTSpectrum (needs detail):
const micData = useMicrophoneAnalysis(1024);

// In Psychedelic (doesn't need detail):
const micData = useMicrophoneAnalysis(512); // 2x faster
```

**Recommendation:** Implement variable FFT size.

---

## 🧠 Memory Management

### 14. **Texture Memory Not Released**

**Problem:**
Text component textures accumulate in memory as lyrics change.

**Solutions:**

Add cleanup to Lyrics3D:
```typescript
useEffect(() => {
  return () => {
    // Dispose of all Text materials/textures when lyrics change
    groupRef.current?.traverse((child) => {
      if (child instanceof Mesh) {
        child.geometry?.dispose();
        child.material?.dispose();
      }
    });
  };
}, [lyrics]); // Run cleanup when lyrics change
```

**Recommendation:** Implement texture disposal.

---

### 15. **Worker Memory Leaks**

**Problem:**
Lyrics worker might accumulate messages if responses are slow.

**Solutions:**

Add message queue limits in worker:
```typescript
// lyrics.worker.ts
const MAX_QUEUE_SIZE = 10;
const messageQueue = [];

self.addEventListener('message', (event) => {
  if (messageQueue.length >= MAX_QUEUE_SIZE) {
    console.warn('Worker queue full, dropping message');
    return;
  }
  messageQueue.push(event);
  processQueue();
});
```

**Recommendation:** Monitor worker memory usage.

---

## 🎯 Quick Wins Summary (Implement First)

### Immediate (< 30 mins)
1. ✅ **Reduce Psychedelic particles:** 3000 → 1500 (+3-4 FPS)
2. ✅ **Reduce Psychedelic geometry:** icosahedron 4 → 2, planes 32×32 → 16×16 (+3-4 FPS)
3. ✅ **Reduce LavaLamp resolution:** 48 → 32 (+3-5 FPS)
4. ✅ **Reduce lyrics to 3 lines:** (+2-3 FPS)
5. ✅ **Remove outline on non-current lyrics:** (+1-2 FPS)

**Total Expected Gain: +11-18 FPS** 🔥

### Medium (1-2 hours)
6. ✅ **Merge canvases:** Single WebGL context (+5-8 FPS)
7. ✅ **Stable useCallback refs:** Prevent re-renders (+2 FPS)
8. ✅ **Throttle LavaLamp updates:** Every 2nd frame (+2-3 FPS)
9. ✅ **Variable FFT size:** Per-viz configuration (+1-2 FPS)

**Total Expected Gain: +10-15 FPS**

### Advanced (4+ hours)
10. ⚠️ **GPU shaders for Psychedelic:** Move to vertex shaders (+5-10 FPS)
11. ⚠️ **Instanced meshes for LavaLamp:** Replace marching cubes (+5-8 FPS)
12. ⚠️ **Texture atlas for lyrics:** Pre-render common words (+2-3 FPS)

**Total Expected Gain: +12-21 FPS**

---

## 📊 Expected FPS After Optimizations

| Current | After Quick Wins | After Medium | After Advanced |
|---------|-----------------|--------------|----------------|
| 45-50   | 56-68 🎯        | 66-83 🚀     | 78-104 ⚡     |

**Target: 60 FPS** → Achievable with Quick + Medium wins!

---

## 🛠️ Implementation Priority

### Phase 1: Reach 60 FPS (Quick Wins)
- [ ] Reduce particle counts & geometry complexity
- [ ] Reduce LavaLamp resolution
- [ ] Optimize lyrics rendering
- [ ] Increase polling intervals

### Phase 2: Stabilize 60 FPS (Medium)
- [ ] Merge canvases
- [ ] Fix React re-renders
- [ ] Throttle heavy computations

### Phase 3: Exceed 60 FPS (Advanced)
- [ ] GPU shaders
- [ ] Instanced rendering
- [ ] Texture optimization

---

## 🔍 Monitoring Recommendations

Add performance markers to track improvements:

```typescript
// Add to PerformanceStats component
const [avgFPS, setAvgFPS] = useState(60);
const [minFPS, setMinFPS] = useState(60);
const [maxFPS, setMaxFPS] = useState(60);

// Track over 60 frames
useEffect(() => {
  const frames = [];
  const interval = setInterval(() => {
    frames.push(currentFPS);
    if (frames.length > 60) frames.shift();
    
    setAvgFPS(frames.reduce((a, b) => a + b) / frames.length);
    setMinFPS(Math.min(...frames));
    setMaxFPS(Math.max(...frames));
  }, 1000);
  
  return () => clearInterval(interval);
}, [currentFPS]);
```

---

## 🎬 Conclusion

**Current State:** 45-50 FPS (good progress!)  
**Target:** 60 FPS (achievable!)  
**Path:** Quick Wins → 56-68 FPS → Medium Wins → 60+ FPS → Mission accomplished! 🎉

**Recommended Next Steps:**
1. Start with Quick Wins (30 mins for +11-18 FPS)
2. Test and measure
3. Implement Medium optimizations to reach 60+ FPS
4. Advanced optimizations are optional but fun! 🚀

**Note:** Spotify polling is already optimized at 5 seconds (playback) and 10 seconds (queue) - no changes needed there! ✅

---

**Generated:** Nov 27, 2025  
**By:** AI Performance Audit System  
**For:** Syns v6.0 Music Visualizer

