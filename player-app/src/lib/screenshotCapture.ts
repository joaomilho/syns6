/**
 * Client-side screenshot capture for custom visualizations
 */

/**
 * Captures a screenshot of the current visualization canvas
 * @param selector - CSS selector for the element to capture (default: body)
 * @param maxWidth - Maximum width for the thumbnail (default: 800)
 * @param quality - JPEG quality 0-1 (default: 0.8)
 * @returns Base64 data URL of the screenshot
 */
export async function captureVisualizationScreenshot(
  selector: string = 'body',
  maxWidth: number = 800,
  quality: number = 0.8
): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      console.log('📸 Looking for element:', selector);
      const element = document.querySelector(selector);
      if (!element) {
        reject(new Error(`Element not found: ${selector}`));
        return;
      }

      // Find all canvas elements
      const canvases = element.querySelectorAll('canvas');
      console.log('📸 Found', canvases.length, 'canvas elements');
      
      if (canvases.length === 0) {
        reject(new Error('No canvas element found in visualization'));
        return;
      }

      // Find the largest canvas (likely the main visualization)
      let webglCanvas: HTMLCanvasElement | null = null;
      let maxArea = 0;
      
      canvases.forEach((canvas) => {
        if (canvas instanceof HTMLCanvasElement) {
          const area = canvas.width * canvas.height;
          console.log('📸 Canvas:', canvas.width, 'x', canvas.height, '=', area, 'pixels');
          if (area > maxArea) {
            maxArea = area;
            webglCanvas = canvas;
          }
        }
      });

      if (!webglCanvas) {
        reject(new Error('No valid canvas element found'));
        return;
      }

      const canvas = webglCanvas as HTMLCanvasElement;

      console.log('📸 Using canvas:', canvas.width, 'x', canvas.height);

      // WebGL canvases are cleared between frames, so we need to capture
      // during an animation frame when the content is actually rendered
      requestAnimationFrame(() => {
        try {
          // Create a canvas to draw the screenshot
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Could not get canvas context'));
            return;
          }

          // Calculate dimensions
          const sourceWidth = canvas.width;
          const sourceHeight = canvas.height;
          const scale = Math.min(maxWidth / sourceWidth, 1); // Don't upscale
          
          canvas.width = sourceWidth * scale;
          canvas.height = sourceHeight * scale;

          console.log('📸 Output canvas:', canvas.width, 'x', canvas.height);

          // Draw the WebGL canvas onto our canvas (during animation frame!)
          ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height);
          
          // Convert to data URL (JPEG for smaller file size)
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          console.log('📸 Created data URL, length:', dataUrl.length);
          
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      });
    } catch (error) {
      console.error('📸 Capture error:', error);
      reject(error);
    }
  });
}

/**
 * Captures a screenshot and compresses it to a reasonable size
 * @param selector - CSS selector for the element to capture
 * @returns Base64 data URL of the compressed screenshot
 */
export async function captureAndCompressThumbnail(
  selector: string = 'body'
): Promise<string> {
  // Capture at lower quality for thumbnail
  return captureVisualizationScreenshot(selector, 600, 0.7);
}

/**
 * Wait for visualization to be ready before capturing
 * @param ms - Milliseconds to wait (default: 2000)
 */
export function waitForVisualization(ms: number = 2000): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

