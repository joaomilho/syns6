# 3D Music Visualization

## Overview

The Spotify player now includes a real-time 3D visualization that reacts to the audio characteristics of the currently playing song.

## How It Works

The visualization uses the **Spotify Audio Features API** to analyze the current track and drive the animation:

### Audio Features Used

1. **Energy (0-1)**: How intense and active the track is
   - Drives the pulsation intensity of the center sphere
   - Controls the scale and movement amplitude

2. **Tempo (BPM)**: Beats per minute
   - Controls rotation speed of particles
   - Higher tempo = faster rotation

3. **Valence (0-1)**: Musical positivity/happiness
   - Changes particle colors (blue for sad, yellow/orange for happy)
   - Drives wave motion amplitude
   - Affects overall brightness

4. **Danceability (0-1)**: How suitable for dancing
   - Controls center sphere rotation speed
   - More danceable = faster spinning

5. **Acousticness (0-1)**: Confidence the track is acoustic
   - Affects outer ring rotation speed
   - More acoustic = slower, calmer motion

## Visualization Components

### 1. Particle Field (2000 particles)
- Spherical cloud of particles
- Rotates based on tempo
- Pulsates with energy
- Wave motion driven by valence
- Color shifts from blue (sad) to yellow (happy)

### 2. Center Sphere (Wireframe Icosahedron)
- Pulsates with song energy
- Rotates based on danceability
- Color cycles through rainbow spectrum
- Emissive glow intensity matches energy

### 3. Wireframe Rings (3 Torus shapes)
- Three perpendicular rings in cyan, magenta, and yellow
- Rotate inversely to main scene
- Movement affected by acousticness
- Create depth and spatial reference

## Controls

- **Mouse Drag**: Rotate the camera around the scene
- **Scroll/Pinch**: Zoom in/out (15-50 units distance)
- **Auto-Rotate**: Enabled when music is playing

## Technical Stack

- **Three.js**: WebGL 3D graphics library
- **React Three Fiber**: React renderer for Three.js
- **@react-three/drei**: Useful helpers (OrbitControls)
- **Spotify Web API**: Audio features and analysis

## Performance

- Optimized for 60 FPS
- Uses instanced rendering for particles
- Additive blending for trippy glow effects
- Automatic LOD based on distance

## Future Enhancements

Possible additions:
- Real-time audio analysis (requires Web Audio API)
- More visualization presets
- User-customizable colors
- Beat detection and sync
- Full-screen mode
- Screenshot/recording capability

## Troubleshooting

**Visualization not moving:**
- Ensure music is playing in Spotify
- Check that playback state shows "Playing"

**Low FPS/laggy:**
- Try zooming out
- Close other tabs/applications
- Reduce particle count in code if needed

**No audio features:**
- Some tracks may not have audio features available
- Visualization will use default values (0.5 for most)

## Code Location

- Component: `/src/components/MusicVisualization.tsx`
- Integration: `/src/app/player/page.tsx`
- API Function: `/src/lib/spotify.ts` (`getAudioFeatures`)

Enjoy the trippy visuals! 🎵✨

