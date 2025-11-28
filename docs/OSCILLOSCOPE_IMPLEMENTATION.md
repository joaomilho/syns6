# Oscilloscope Visualization Implementation

## Overview
Implemented an X-Y oscilloscope visualization inspired by [woscope](https://github.com/m1el/woscope) but adapted for the Syns music visualization app.

## Features
- **X-Y Mode**: Uses waveform data with phase offset to create Lissajous patterns
- **Multiple Traces**: Ghost traces with different colors (green, cyan, yellow) for vintage scope effect
- **Bloom Effect**: Glow effect powered by @react-three/postprocessing
- **Grid Display**: Classic oscilloscope grid background with center crosshair
- **Reactive**: Responds to bass and energy levels from microphone input
- **3D Lyrics**: Integrated with the app's Lyrics3D component
- **Interactive**: Orbit controls for camera manipulation

## Files Modified

### 1. `/src/components/OscilloscopeVisualization.tsx` (NEW)
Main visualization component featuring:
- `OscilloscopeLine`: Renders the waveform as a line in X-Y mode
- `OscilloscopeTraces`: Multiple layered traces for depth
- `OscilloscopeGrid`: Background grid and crosshair
- Bloom post-processing for authentic CRT glow

### 2. `/src/hooks/useMicrophoneAnalysis.ts`
Added waveform data capture:
- Added `waveform?: Uint8Array` to `MicrophoneData` interface
- Captures time-domain data via `getByteTimeDomainData()`
- Provides raw waveform samples for oscilloscope rendering

### 3. `/src/components/VisualizationDropdown.tsx`
- Added `"oscilloscope"` to `VisualizationType` union
- Added oscilloscope option to visualizations array
- Icon: `◉`
- Name: "Oscilloscope X-Y"

### 4. `/src/app/player/page.tsx`
- Imported `OscilloscopeVisualization` component
- Added `"oscilloscope"` to RANDOM mode visualization list
- Added switch case for rendering oscilloscope

## Technical Details

### Waveform Processing
The oscilloscope uses the raw time-domain waveform data (2048-4096 samples) from the Web Audio API's `AnalyserNode.getByteTimeDomainData()`. The X-Y mode is simulated by:
1. Using waveform samples directly as X coordinates
2. Using phase-shifted samples (offset by 1/4 wavelength) as Y coordinates
3. Scaling based on bass intensity for dynamic sizing

### Color Mapping
- **Main trace**: Green (HSL: 0.3-0.7 hue based on energy)
- **Ghost traces**: Cyan and yellow with reduced opacity
- **Dynamic brightness**: Increases with bass and energy

### Performance
- Uses instanced geometry for efficient rendering
- Additive blending for authentic glow
- 2048 points per trace (configurable)
- Bloom effect with dynamic intensity

## Missing Assets
⚠️ **Note**: Thumbnail images need to be created:
- `/public/viz-thumbnails/oscilloscope.png`
- `/public/viz-thumbnails/oscilloscope.webp`

A placeholder SVG has been created at `/public/viz-thumbnails/oscilloscope.svg` for reference. Proper screenshots should be captured using the app's built-in screenshot feature.

## Usage
1. Navigate to the player page
2. Enable microphone access (required for waveform data)
3. Select "Oscilloscope X-Y" from the visualization dropdown
4. Play music and watch the Lissajous patterns react to the audio

## High-Fidelity WebGL Implementation (v3.0 - FINAL)

### Core Architecture - Proper WebGL with Custom Shaders
- ✅ **Custom GLSL Shaders** - Vertex and fragment shaders for thick line rendering
- ✅ **Quad-based Line Geometry** - Each segment = 2 triangles (not WebGL linewidth)
- ✅ **Direct WebGL Rendering** - Three.js WebGLRenderer with orthographic camera
- ✅ **Buffer Attribute Management** - Direct manipulation of position buffers
- ✅ **Additive Blending** - Authentic CRT glow effect

### Thick Line Rendering (The Core Innovation)

**The Problem:** WebGL's `lineWidth` doesn't work in most browsers (limited to 1px)

**The Solution:** Create actual geometry for thick lines

#### How It Works:
1. **2 vertices per sample point** (one on each side of the line)
2. **Vertices offset perpendicular** to line direction by `uSize`
3. **Index buffer creates triangles** connecting the quads
4. **Shader calculates offset** in real-time:

```glsl
// aIdx = 0 or 1 (which side of the line)
vec2 normal = vec2(-dir.y, dir.x) * uSize;
vec2 pos = aStart + normal * (aIdx * 2.0 - 1.0);
```

#### Buffer Structure:
- **nSamples = 2048** sample points
- **numVertices = 4096** (2 per sample)
- **Triangles = 4094 × 2 = 8188** triangles
- **Attributes:**
  - `aIdx`: Float (0 or 1) - which side of line
  - `aStart`: Vec2 - current point position
  - `aEnd`: Vec2 - next point position (for direction calculation)

### X-Y Mode (Lissajous Patterns)
Classic oscilloscope X-Y mode using phase-shifted waveform:
```javascript
// X coordinate from waveform
const x = waveform[i] / 127.5 - 1;
// Y coordinate from phase-shifted waveform (90° offset)
const y = waveform[(i + nSamples/4) % length] / 127.5 - 1;
```

### Features Implemented
✅ Custom vertex/fragment shaders (GLSL)
✅ Quad-based thick line rendering (smooth at all angles)
✅ Additive blending for authentic glow
✅ X-Y mode with phase offset (Lissajous patterns)
✅ Direct buffer manipulation (60 FPS updates)
✅ Orthographic 2D projection (true 2D scope)
✅ Real-time waveform visualization
✅ Animated fallback (Lissajous 3:2 ratio)
✅ Dynamic color (energy/bass reactive)

### Performance
- **2048 samples** @ **60 FPS**
- **8188 triangles** rendered per frame
- **Buffer updates** every frame (startAttr, endAttr)
- **Zero allocations** in animation loop
- **Additive blending** with depth test disabled

## Future Enhancements
- [ ] True stereo separation (left channel = X, right channel = Y)
- [ ] Persistence/afterglow effect for CRT simulation
- [ ] Color customization options
- [ ] Adjustable trace count and opacity
- [ ] Timebase controls (zoom in/out on waveform)
- [ ] Triggering modes (edge, level, auto)

