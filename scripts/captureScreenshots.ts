import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// List of all visualizations to capture
const allVisualizations = [
  'fftspectrum',
  'lyricsonly',
  'particles',
  'psychedelic',
  'kaleidoscope',
  'waves',
  'animated',
  'spectrum3d',
  'camera',
  'youtube',
  'oscilloscope',
];

// Check if a specific visualization was requested via command line
// Usage: npm run screenshots [vizId] [--video]
const args = process.argv.slice(2);
const shouldGenerateVideo = args.includes('--video');
const requestedViz = args.find(arg => !arg.startsWith('--'));
const visualizations = requestedViz 
  ? (allVisualizations.includes(requestedViz) 
      ? [requestedViz] 
      : (() => {
          console.error(`❌ Unknown visualization: ${requestedViz}`);
          console.error(`   Available: ${allVisualizations.join(', ')}`);
          process.exit(1);
        })())
  : allVisualizations;

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'viz-thumbnails');
const TEMP_DIR = path.join(process.cwd(), '.temp-frames');
const WAIT_TIME = 1500; // Wait 1.5 seconds for animation to start
const VIEWPORT_WIDTH = 400; // Reduced from 800 - plenty for thumbnails
const VIEWPORT_HEIGHT = 300; // Reduced from 600 - maintains 4:3 ratio
const ANIMATION_FRAMES = 20; // Reduced from 27 for smaller file sizes
const ANIMATION_DURATION = 1.5; // 1.5 second animation (short & snappy)
const FPS = ANIMATION_FRAMES / ANIMATION_DURATION; // ~13 FPS
const FRAME_DELAY = 1000 / FPS; // ~75ms between frames

async function captureScreenshots() {
  // Show what we're capturing
  if (requestedViz) {
    console.log(`📸 Capturing single visualization: ${requestedViz}`);
  } else {
    console.log(`📸 Capturing all ${allVisualizations.length} visualizations`);
  }
  
  if (shouldGenerateVideo) {
    console.log(`🎥 Video mode enabled - will generate .webm videos`);
  }
  
  // Check if dev server is running
  console.log('🔍 Checking if dev server is running...');
  try {
    const response = await fetch(BASE_URL);
    if (!response.ok) {
      throw new Error(`Server returned ${response.status}`);
    }
    console.log('✅ Dev server is running at', BASE_URL);
  } catch (error) {
    console.error('❌ Dev server is not running!');
    console.error('   Please start it with: npm run dev');
    console.error('   Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }

  // Create output directory if it doesn't exist
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    console.log(`📁 Created directory: ${OUTPUT_DIR}`);
  }

  // Create temp directory for frames
  if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
  }

  console.log('🚀 Starting Playwright (Chromium)...');
  const browser = await chromium.launch({
    headless: false,
    args: [
      '--use-fake-ui-for-media-stream', // Auto-accept camera/mic permissions
    ],
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      },
      deviceScaleFactor: 1,
      permissions: ['camera'],
    });

    const page = await context.newPage();

    for (const vizId of visualizations) {
      console.log(`\n🎬 Capturing ${vizId}...`);
      
      // Skip YouTube - use manually created thumbnails (YouTube blocks bots)
      if (vizId === 'youtube') {
        console.log('  ⏭️  Skipping YouTube (use manually created thumbnails)');
        console.log('     Place your files at:');
        console.log('     - public/viz-thumbnails/youtube-static.webp');
        console.log('     - public/viz-thumbnails/youtube.webp');
        continue;
      }
      
      const url = `${BASE_URL}/screenshots/${vizId}`;
      
      try {
        // Navigate to the visualization page
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Wait for animation to start
        await page.waitForTimeout(WAIT_TIME);

        // For camera, wait for feed to initialize (permission auto-granted)
        if (vizId === 'camera') {
          console.log('  📷 Waiting for camera feed to initialize...');
          await page.waitForTimeout(4000); // Wait for camera feed to stabilize
        }

        // Create temp directory for this viz
        const vizFrameDir = path.join(TEMP_DIR, vizId);
        if (!fs.existsSync(vizFrameDir)) {
          fs.mkdirSync(vizFrameDir, { recursive: true });
        }

        // Capture static thumbnail (first frame) as WebP for better compression
        console.log(`  📸 Capturing static thumbnail...`);
        const staticPath = path.join(OUTPUT_DIR, `${vizId}.png`);
        const staticWebPPath = path.join(OUTPUT_DIR, `${vizId}-static.webp`);
        
        // Save as PNG (for compatibility)
        await page.screenshot({
          path: staticPath,
          type: 'png',
        });
        
        // Also save as WebP (much smaller, we'll use this in the dropdown)
        await page.screenshot({
          path: staticWebPPath,
          type: 'png',
        });
        
        // Optimize PNG to WebP using ffmpeg
        try {
          await execAsync(`ffmpeg -y -i "${staticPath}" -c:v libwebp -quality 80 "${staticWebPPath}"`);
          console.log(`  ✅ Created optimized static WebP`);
        } catch (error) {
          console.error(`  ⚠️  Failed to create static WebP:`, error instanceof Error ? error.message : error);
        }

        // Capture frames for animation
        console.log(`  🎞️  Capturing ${ANIMATION_FRAMES} frames...`);
        const framePaths: string[] = [];
        
        for (let i = 0; i < ANIMATION_FRAMES; i++) {
          const framePath = path.join(vizFrameDir, `frame-${String(i).padStart(3, '0')}.png`);
          await page.screenshot({
            path: framePath,
            type: 'png',
          });
          framePaths.push(framePath);
          
          // Wait between frames
          await page.waitForTimeout(FRAME_DELAY);
          
          // Show progress
          if ((i + 1) % 10 === 0) {
            console.log(`  ⏳ Progress: ${i + 1}/${ANIMATION_FRAMES} frames`);
          }
        }

        // Generate video if --video flag is present
        if (shouldGenerateVideo) {
          console.log(`  🎥 Creating WebM video with ffmpeg...`);
          const videoPath = path.join(OUTPUT_DIR, `${vizId}.webm`);
          
          try {
            // Check if ffmpeg is installed
            await execAsync('ffmpeg -version').catch(() => {
              throw new Error('ffmpeg not found. Install it with: brew install ffmpeg');
            });

            // Create WebM video with VP9 codec for scroll-based scrubbing
            // -pix_fmt yuv420p ensures compatibility
            // -crf 35 is quality (increased from 30 for smaller files, range 0-63)
            // -b:v 200k sets max bitrate for smaller files
            const videoCmd = `ffmpeg -y -framerate ${FPS} -i "${vizFrameDir}/frame-%03d.png" -vf scale=${VIEWPORT_WIDTH}:${VIEWPORT_HEIGHT} -c:v libvpx-vp9 -pix_fmt yuv420p -crf 35 -b:v 200k -an "${videoPath}"`;
            
            await execAsync(videoCmd);
            console.log(`  ✅ Created WebM video`);
          } catch (error) {
            console.error(`  ⚠️  Failed to create video:`, error instanceof Error ? error.message : error);
          }
        }
        
        // Create animated WebP using ffmpeg (always, unless --video-only)
        if (!args.includes('--video-only')) {
          console.log(`  🎨 Creating animated WebP with ffmpeg...`);
          const animatedPath = path.join(OUTPUT_DIR, `${vizId}.webp`);
          
          try {
            // Check if ffmpeg is installed
            await execAsync('ffmpeg -version').catch(() => {
              throw new Error('ffmpeg not found. Install it with: brew install ffmpeg');
            });

            // Create animated WebP with aggressive compression for smaller file sizes
            // -q:v 60 = lower quality (was 75), smaller files
            // -preset picture = optimize for photographic content
            // -vf scale=400:300 = ensure correct dimensions
            const ffmpegCmd = `ffmpeg -y -framerate ${FPS} -i "${vizFrameDir}/frame-%03d.png" -vf scale=${VIEWPORT_WIDTH}:${VIEWPORT_HEIGHT} -c:v libwebp -lossless 0 -compression_level 6 -q:v 60 -preset picture -loop 0 -an -vsync 0 "${animatedPath}"`;
            
            await execAsync(ffmpegCmd);
            console.log(`  ✅ Created animated WebP`);
          } catch (error) {
            console.error(`  ⚠️  Failed to create animated WebP (falling back to static):`, error instanceof Error ? error.message : error);
          }
        }

        // Clean up temp frames
        try {
          for (const framePath of framePaths) {
            await fs.promises.unlink(framePath);
          }
          await fs.promises.rmdir(vizFrameDir);
        } catch (error) {
          // Ignore cleanup errors
        }

        const outputs = [`${vizId}.png`];
        if (shouldGenerateVideo) outputs.push(`${vizId}.webm`);
        if (!args.includes('--video-only')) outputs.push(`${vizId}.webp`);
        console.log(`  ✅ Saved: ${outputs.join(' & ')}`);
      } catch (error) {
        console.error(`  ❌ Failed to capture ${vizId}:`, error);
      }
    }

    if (requestedViz) {
      console.log(`\n🎉 Screenshot captured for ${requestedViz}!`);
    } else {
      console.log('\n🎉 All screenshots captured successfully!');
    }
    console.log(`📂 Output directory: ${OUTPUT_DIR}`);
    
    // Clean up temp directory
    try {
      if (fs.existsSync(TEMP_DIR)) {
        await fs.promises.rmdir(TEMP_DIR, { recursive: true });
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  } catch (error) {
    console.error('❌ Error during screenshot capture:', error);
    throw error;
  } finally {
    await browser.close();
    console.log('🔚 Browser closed.');
  }
}

// Run the script
captureScreenshots().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

