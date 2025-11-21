import { chromium } from 'playwright';
import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// List of all visualizations to capture
const visualizations = [
  'fftspectrum',
  'particles',
  'fractal',
  'psychedelic',
  'waves',
  'animated',
  'spectrum3d',
  'wavespectrum',
  'camera',
  'youtube',
  'debug',
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const OUTPUT_DIR = path.join(process.cwd(), 'public', 'viz-thumbnails');
const TEMP_DIR = path.join(process.cwd(), '.temp-frames');
const WAIT_TIME = 1500; // Wait 1.5 seconds for animation to start
const VIEWPORT_WIDTH = 800;
const VIEWPORT_HEIGHT = 600;
const ANIMATION_FRAMES = 27; // 27 frames for smooth, compact animation
const ANIMATION_DURATION = 1.5; // 1.5 second animation (short & snappy)
const FPS = ANIMATION_FRAMES / ANIMATION_DURATION; // ~18 FPS
const FRAME_DELAY = 1000 / FPS; // ~55ms between frames

async function captureScreenshots() {
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
    headless: false, // Set to false to see the browser
  });

  try {
    const context = await browser.newContext({
      viewport: {
        width: VIEWPORT_WIDTH,
        height: VIEWPORT_HEIGHT,
      },
      deviceScaleFactor: 2, // Retina display for better quality
    });

    const page = await context.newPage();

    for (const vizId of visualizations) {
      console.log(`\n🎬 Capturing ${vizId}...`);
      
      const url = `${BASE_URL}/screenshots/${vizId}`;
      
      try {
        // Navigate to the visualization page
        await page.goto(url, {
          waitUntil: 'domcontentloaded',
          timeout: 10000,
        });

        // Wait for animation to start
        await page.waitForTimeout(WAIT_TIME);

        // Create temp directory for this viz
        const vizFrameDir = path.join(TEMP_DIR, vizId);
        if (!fs.existsSync(vizFrameDir)) {
          fs.mkdirSync(vizFrameDir, { recursive: true });
        }

        // Capture static thumbnail (first frame)
        console.log(`  📸 Capturing static thumbnail...`);
        const staticPath = path.join(OUTPUT_DIR, `${vizId}.png`);
        await page.screenshot({
          path: staticPath,
          type: 'png',
        });

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

        // Create animated WebP using ffmpeg
        console.log(`  🎨 Creating animated WebP with ffmpeg...`);
        const animatedPath = path.join(OUTPUT_DIR, `${vizId}.webp`);
        
        try {
          // Check if ffmpeg is installed
          await execAsync('ffmpeg -version').catch(() => {
            throw new Error('ffmpeg not found. Install it with: brew install ffmpeg');
          });

          // Create animated WebP: ffmpeg -framerate 15 -i frame-%03d.png -c:v libwebp -loop 0 -quality 80 output.webp
          const ffmpegCmd = `ffmpeg -y -framerate ${FPS} -i "${vizFrameDir}/frame-%03d.png" -c:v libwebp -lossless 0 -compression_level 6 -q:v 75 -loop 0 -an -vsync 0 "${animatedPath}"`;
          
          await execAsync(ffmpegCmd);
          console.log(`  ✅ Created animated WebP`);
        } catch (error) {
          console.error(`  ⚠️  Failed to create animated WebP (falling back to static):`, error instanceof Error ? error.message : error);
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

        console.log(`  ✅ Saved: ${vizId}.png & ${vizId}.webp`);
      } catch (error) {
        console.error(`  ❌ Failed to capture ${vizId}:`, error);
      }
    }

    console.log('\n🎉 All screenshots captured successfully!');
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

