# AI-Powered Visualization Creator

## Overview
You can now create custom 3D visualizations directly in the player using AI! Simply describe what you want, and the AI will generate Three.js code that reacts to your music.

## Features

### 1. **Inline Creation Experience**
- No navigation away from the player
- Blank 3D grid world to preview your creation
- Real-time code generation and preview
- Instant testing with live audio data

### 2. **AI Code Generation**
- Powered by Vercel AI SDK (OpenAI GPT-4)
- Generates Three.js code based on natural language prompts
- Automatically makes visualizations audio-reactive
- Understands bass, vocals, drums, and more

### 3. **Frontend Storage**
- Custom visualizations saved in IndexedDB
- No backend required
- Includes code, prompt, name, and metadata
- Persistent across sessions

### 4. **Dynamic Execution**
- Safely executes user-generated code
- Real-time preview while creating
- Full access to Three.js library
- Audio data integration

## Setup Required

### 🆓 FREE Options Available!

See `SETUP_FREE_AI.md` for complete instructions on:
- **Google Gemini** (FREE - 1.5k generations/day)
- **Groq** (FREE - 14k generations/day, super fast)

### Quick Setup (Google Gemini - FREE)

```bash
# 1. Install
npm install ai @ai-sdk/google

# 2. Get FREE key from: https://aistudio.google.com/app/apikey

# 3. Add to .env.local
GOOGLE_GENERATIVE_AI_API_KEY=your-key-here

# 4. In src/app/api/generate-visualization/route.ts, uncomment OPTION 3:
import { generateText } from 'ai';
import { google } from '@ai-sdk/google';

const { text } = await generateText({
  model: google('gemini-2.5-flash'), // Fast and stable
  system: SYSTEM_PROMPT,
  prompt: prompt,
  temperature: 0.7,
  maxTokens: 2000,
});

# 5. Remove the TEMPORARY mock code
```

### Alternative: OpenAI (Paid)

```bash
npm install ai @ai-sdk/openai
# Add OPENAI_API_KEY to .env.local
# Uncomment OPTION 1 in the API route
```

## How to Use

### 1. **Open the Creator**
- Click "CREATE YOUR OWN VISUALIZATION" in the visualization dropdown
- The player stays open with a blank 3D grid

### 2. **Describe Your Vision**
Type a natural language prompt like:
- "Create 5 spinning cubes that pulse with the bass and change color with the vocals"
- "Make a spiral of glowing spheres that expand with bass and rotate faster with treble"
- "Create floating geometric shapes that dance to the music and emit particles"

### 3. **Generate & Preview**
- Click "Generate Visualization"
- AI generates Three.js code
- See it live with your music!

### 4. **Save & Use**
- Give it a name
- It's saved locally (IndexedDB)
- Appears in your dropdown menu
- Use it anytime!

## Audio Data Available

Your visualizations have access to:

```javascript
micData.bass          // 0-1: Low frequencies, great for pulsing/scaling
micData.mid           // 0-1: Mid frequencies, good for colors/rotation
micData.treble        // 0-1: High frequencies, perfect for quick movements
micData.subBass       // 0-1: Very low frequencies, massive effects
micData.presence      // 0-1: Voice/vocal detection
micData.voiceStrength // 0-1: How strong the vocals are
micData.drums         // 0-1: Drum/percussion detection
micData.energy        // 0-1: Overall audio energy
micData.frequencyData // Array of frequency bins
```

## Code Structure

The AI generates code that executes in an animation loop. You have access to:

```javascript
scene     // THREE.Scene - add your objects here
camera    // THREE.PerspectiveCamera
renderer  // THREE.WebGLRenderer
micData   // Audio data object (see above)
time      // Elapsed time in seconds
THREE     // The Three.js library
```

### Example Generated Code

```javascript
// IMPORTANT: Initialize objects ONCE using a flag
if (!scene.userData.shapesInitialized) {
  scene.userData.shapes = [];
  for (let i = 0; i < 5; i++) {
    const geometry = new THREE.SphereGeometry(0.5, 32, 32);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color().setHSL(i / 5, 1, 0.5),
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.x = (i - 2) * 2;
    scene.userData.shapes.push(sphere);
    scene.add(sphere);
  }
  scene.userData.shapesInitialized = true; // Mark as initialized
}

// Animate objects every frame
scene.userData.shapes.forEach((sphere, i) => {
  sphere.position.y = Math.sin(time * 2) * micData.bass * 3;
  sphere.scale.setScalar(1 + micData.mid * 0.5);
  sphere.rotation.x = time;
  
  const hue = (time * 0.1 + i / 5) % 1;
  sphere.material.color.setHSL(hue, 1, 0.5);
});
```

### Critical Pattern: Initialization Flag

**Always use an initialization flag to prevent recreating objects every frame:**

✅ **CORRECT:**
```javascript
if (!scene.userData.myVizInitialized) {
  // Create objects once
  scene.userData.myObjects = [...];
  scene.userData.myVizInitialized = true;
}
// Animate objects
scene.userData.myObjects.forEach(obj => { ... });
```

❌ **WRONG:**
```javascript
// This recreates objects EVERY FRAME!
if (!scene.userData.myObjects) {
  scene.userData.myObjects = [...];
}
```

❌ **WRONG:**
```javascript
// Don't dispose/remove objects - cleanup is handled for you
while (scene.children.length > 0) {
  scene.remove(scene.children[0]);
}
```

## Files Created

### Components
- `/src/components/BlankGridVisualization.tsx` - Empty 3D world for creating
- `/src/components/CustomVisualization.tsx` - Executes custom code
- `/src/components/VisualizationCreator.tsx` - Creator UI panel
- `/src/components/VisualizationCreator.module.css` - Creator styles

### Storage & API
- `/src/lib/customVisualizations.ts` - IndexedDB storage for custom viz
- `/src/app/api/generate-visualization/route.ts` - AI generation endpoint

### Updated Files
- `/src/components/VisualizationDropdown.tsx` - Shows custom visualizations
- `/src/components/VisualizationDropdown.module.css` - Styles for custom viz
- `/src/app/player/page.tsx` - Integrated creator mode

## AI Prompt Engineering

The system prompt instructs the AI to:
- Generate ONLY the animation loop code (no imports/setup)
- Use scene.userData to store persistent objects
- Make visualizations react to audio data
- Use time for smooth animations
- Clean up resources properly

## Example Prompts to Try

1. **"Create a ring of cubes that pulse with bass and spin with vocals"**
   - Simple geometric shapes
   - Multiple audio reactions

2. **"Make a spiral galaxy of particles that expands with energy"**
   - Particle systems
   - Complex patterns

3. **"Create floating pyramids that change color with treble and bounce with drums"**
   - Multiple geometries
   - Specific audio triggers

4. **"Build a wave of spheres that flow across the screen with the music"**
   - Movement patterns
   - Flow animations

## Current Status

✅ **Working Now:**
- Blank grid visualization
- Creator UI panel
- Manual code input
- Code execution
- Save to IndexedDB
- Load saved visualizations
- Add to dropdown menu
- Mock AI responses

⏳ **Requires Setup:**
- Install Vercel AI SDK
- Add OpenAI API key
- Uncomment AI code
- Real AI generation

## Future Enhancements

- [ ] Code editor with syntax highlighting
- [ ] Share visualizations via URL/export
- [ ] Community marketplace
- [ ] Advanced audio analysis options
- [ ] Template library
- [ ] Multi-model support (Claude, Gemini, etc.)
- [ ] Edit existing custom visualizations
- [ ] Delete custom visualizations
- [ ] Thumbnail generation for custom viz

## Troubleshooting

### "Failed to generate visualization" or 401 Error
- Check OpenAI API key is set
- Verify Vercel AI SDK is installed
- Check API route is uncommented
- Ensure you're logged in (NextAuth session required)
- Check console for errors

### Visualization doesn't respond to audio
- Make sure microphone is enabled (⦿ button)
- Check micData is being passed correctly
- Verify audio permissions in browser

### Code execution errors
- Check browser console for details
- Ensure code uses scene.userData for persistence
- Verify Three.js syntax is correct

## Security Note

Custom code is executed using `new Function()` with try-catch wrapping. While this provides isolation, be cautious with code from untrusted sources. Only run visualizations you create or trust.

