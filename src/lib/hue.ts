/**
 * Philips Hue API Integration
 * Controls local Hue lights with music-reactive colors
 */

// Detect if running in Tauri and get the fetch function
const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

// Tauri fetch wrapper - dynamically imports Tauri HTTP plugin when needed
async function tauriFetch(url: string, options?: RequestInit): Promise<Response> {
  if (isTauri) {
    try {
      // Use string variable to bypass TypeScript module resolution at build time
      const moduleName = '@tauri-apps/plugin-http';
      const tauriHttp = await import(/* webpackIgnore: true */ moduleName);
      return tauriHttp.fetch(url, options as any);
    } catch (e) {
      console.warn('Tauri HTTP plugin not available, falling back to native fetch', e);
      return fetch(url, options);
    }
  }
  return fetch(url, options);
}

export interface HueBridge {
  id: string;
  internalipaddress: string;
}

export interface HueLight {
  name: string;
  state: {
    on: boolean;
    bri: number; // 0-254
    hue: number; // 0-65535
    sat: number; // 0-254
    reachable: boolean;
  };
  type: string;
  modelid: string;
}

export interface HueLightState {
  on?: boolean;
  bri?: number; // Brightness 0-254
  hue?: number; // Hue 0-65535
  sat?: number; // Saturation 0-254
  transitiontime?: number; // In 100ms units (10 = 1 second)
  alert?: "none" | "select" | "lselect";
}

export type FrequencyRange = "bass" | "mid" | "treble" | "sub-bass" | "presence";
export type LightColor = "red" | "orange" | "yellow" | "green" | "cyan" | "blue" | "purple" | "pink" | "white";
export type LightMode = "bass" | "voice" | "drums";

export interface LightConfig {
  mode: LightMode;
  color?: LightColor; // Optional, used for legacy configs
  frequency?: FrequencyRange; // Optional, used for legacy configs
}

// Color to hue mapping (0-360)
const COLOR_TO_HUE: Record<LightColor, number> = {
  red: 0,
  orange: 30,
  yellow: 60,
  green: 120,
  cyan: 180,
  blue: 240,
  purple: 280,
  pink: 320,
  white: 0, // White uses saturation 0
};

/**
 * Discover Hue bridges on the local network
 */
export async function discoverBridges(): Promise<HueBridge[]> {
  try {
    const response = await fetch("/api/hue/discover");
    if (!response.ok) {
      throw new Error("Failed to discover bridges");
    }
    return await response.json();
  } catch (error) {
    console.error("Error discovering Hue bridges:", error);
    throw error;
  }
}

/**
 * Create a new user on the Hue bridge (requires physical button press)
 */
export async function createUser(
  bridgeIp: string,
  appName: string = "syns-karaoke"
): Promise<string> {
  try {
    const response = await tauriFetch(`http://${bridgeIp}/api`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        devicetype: `${appName}#${Date.now()}`,
      }),
    });

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error.description);
    }

    if (data[0]?.success) {
      return data[0].success.username;
    }

    throw new Error("Unexpected response from bridge");
  } catch (error) {
    console.error("Error creating Hue user:", error);
    throw error;
  }
}

/**
 * Get all lights from the bridge
 */
export async function getLights(
  bridgeIp: string,
  username: string
): Promise<Record<string, HueLight>> {
  try {
    const response = await tauriFetch(`http://${bridgeIp}/api/${username}/lights`);
    
    if (!response.ok) {
      throw new Error("Failed to get lights");
    }

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error.description);
    }

    return data;
  } catch (error) {
    console.error("Error getting lights:", error);
    throw error;
  }
}

/**
 * Set the state of a specific light
 */
export async function setLightState(
  bridgeIp: string,
  username: string,
  lightId: string,
  state: HueLightState
): Promise<void> {
  try {
    const response = await tauriFetch(
      `http://${bridgeIp}/api/${username}/lights/${lightId}/state`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }
    );

    const data = await response.json();
    
    // Hue returns array of success/error objects
    if (!Array.isArray(data)) {
      throw new Error('Invalid Hue API response');
    }
    
    // Count successes and errors
    const successCount = data.filter((item: any) => item.success).length;
    const errorCount = data.filter((item: any) => item.error).length;
    
    // Only throw if ALL properties failed (no successes)
    if (errorCount > 0 && successCount === 0) {
      const firstError = data.find((item: any) => item.error)?.error;
      console.error(`❌ Light ${lightId} - ALL FAILED:`, firstError?.description || 'Unknown error');
      throw new Error(firstError?.description || 'All properties failed');
    }
    
    // Partial failure is OK - log but don't throw
    if (errorCount > 0) {
      console.warn(`⚠️ Light ${lightId}: ${successCount} success, ${errorCount} errors (partial failure OK)`);
    }
  } catch (error) {
    // Re-throw to let the circuit breaker handle it
    throw error;
  }
}

/**
 * Set the state of multiple lights at once
 */
export async function setMultipleLights(
  bridgeIp: string,
  username: string,
  lightIds: string[],
  state: HueLightState
): Promise<void> {
  await Promise.all(
    lightIds.map((id) => setLightState(bridgeIp, username, id, state))
  );
}

/**
 * Convert HSV to Hue API format
 * @param hue 0-360
 * @param saturation 0-100
 * @param brightness 0-100
 */
export function hsvToHue(
  hue: number,
  saturation: number,
  brightness: number
): HueLightState {
  return {
    hue: Math.round((hue / 360) * 65535),
    sat: Math.round((saturation / 100) * 254),
    bri: Math.round((brightness / 100) * 254),
  };
}

/**
 * Create light state for a specific light based on its mode
 */
export function lightConfigToState(
  config: LightConfig,
  audioData: {
    bass: number; // 0-1
    mid: number; // 0-1
    treble: number; // 0-1
    subBass: number; // 0-1
    presence: number; // 0-1
    voice?: number; // 0-1, optional for voice detection
    drums?: {
      snare: number; // 0-1
      hihat: number; // 0-1
      cymbal: number; // 0-1
    };
  },
  smoothness: number = 6 // Brightness buckets
): HueLightState {
  // Handle different modes
  if (config.mode === "bass") {
    return createBassLightState(audioData.bass, smoothness);
  } else if (config.mode === "voice") {
    return createVoiceLightState(audioData.voice || 0, smoothness);
  } else if (config.mode === "drums") {
    return createDrumsLightState(audioData, smoothness);
  }
  
  // Fallback to bass mode if mode is not recognized
  return createBassLightState(audioData.bass, smoothness);
}

/**
 * Create bass-reactive light state (red → purple → blue)
 */
function createBassLightState(intensity: number, smoothness: number): HueLightState {

  // Apply exponential curve for more dramatic response
  // This makes quiet sounds dimmer and loud sounds much brighter
  const dramaticIntensity = Math.pow(intensity, 0.5); // More aggressive curve for drama
  
  // SUPER DRAMATIC MODE:
  // 0-50%: Very dim red (1-20% brightness)
  // 50-70%: Bright red (20-100% brightness)
  // 70-100%: Transition to white/blue (full brightness)
  
  let brightness: number;
  let hue: number;
  let sat: number;
  
  if (intensity < 0.5) {
    // Low intensity: very dim red
    brightness = 1 + (intensity / 0.5) * 19; // 1-20% brightness
    hue = 0; // Red
    sat = 254; // Full saturation
  } else if (intensity < 0.7) {
    // Medium-high intensity: bright red
    brightness = 20 + ((intensity - 0.5) / 0.2) * 80; // 20-100% brightness
    hue = 0; // Red
    sat = 254; // Full saturation
  } else {
    // Extreme intensity: red → purple → blue (smooth transition)
    const extremeAmount = (intensity - 0.7) / 0.3; // 0-1
    brightness = 100; // Full brightness
    // Go backwards on color wheel: red (0/65535) → purple → blue (46920)
    hue = Math.round(65535 - extremeAmount * 18615); // Smooth transition through purple
    sat = 254; // Keep full saturation - pure colors only, no white
  }

  // Convert to Hue scale (0-254)
  const rawBri = (brightness / 100) * 254;
  
  // Quantize based on smoothness setting (2-128 buckets)
  const bucketSize = Math.floor(254 / smoothness);
  const quantizedBri = Math.round(rawBri / bucketSize) * bucketSize;
  
  // Clamp to valid range and ensure integer
  const finalBri = Math.round(Math.max(1, Math.min(254, quantizedBri)));

  // Send only necessary properties (no 'on' or 'transitiontime')
  return {
    bri: finalBri,
    hue: hue,
    sat: sat,
  };
}

/**
 * Create voice-reactive light state (blue, dramatic)
 */
function createVoiceLightState(intensity: number, smoothness: number): HueLightState {
  // Apply exponential curve for more dramatic response
  const dramaticIntensity = Math.pow(intensity, 0.5);
  
  // VOICE MODE: Blue light that responds to voice intensity
  // 0-40%: Very dim blue (barely visible)
  // 40-70%: Bright blue (clear voice)
  // 70-100%: Intense cyan-blue (loud voice)
  
  let brightness: number;
  let hue: number;
  let sat: number;
  
  if (intensity < 0.4) {
    // Low intensity: very dim blue
    brightness = 1 + (intensity / 0.4) * 29; // 1-30% brightness
    hue = 46920; // Blue
    sat = 254; // Full saturation
  } else if (intensity < 0.7) {
    // Medium intensity: bright blue
    brightness = 30 + ((intensity - 0.4) / 0.3) * 60; // 30-90% brightness
    hue = 46920; // Blue
    sat = 254; // Full saturation
  } else {
    // High intensity: intense cyan-blue
    const extremeAmount = (intensity - 0.7) / 0.3; // 0-1
    brightness = 90 + extremeAmount * 10; // 90-100% brightness
    hue = Math.round(46920 - extremeAmount * 10000); // Blue to cyan
    sat = 254; // Full saturation
  }

  // Convert to Hue scale (0-254)
  const rawBri = (brightness / 100) * 254;
  
  // Quantize based on smoothness setting (2-128 buckets)
  const bucketSize = Math.floor(254 / smoothness);
  const quantizedBri = Math.round(rawBri / bucketSize) * bucketSize;
  
  // Clamp to valid range and ensure integer
  const finalBri = Math.round(Math.max(1, Math.min(254, quantizedBri)));

  // Send only necessary properties (lights assumed already on, transitiontime=0 is default)
  return {
    bri: finalBri,
    hue: hue,
    sat: sat,
  };
}

/**
 * Create drums-reactive light state (yellow → orange, dramatic)
 * Focuses on well-detected percussion: hi-hat, cymbal, and snare
 */
function createDrumsLightState(audioData: {
  drums?: {
    snare: number;
    hihat: number;
    cymbal: number;
  };
}, smoothness: number): HueLightState {
  // Calculate drums intensity from well-detected elements only
  const snare = audioData.drums?.snare || 0;
  const hihat = audioData.drums?.hihat || 0;
  const cymbal = audioData.drums?.cymbal || 0;
  
  // Weight hi-hat and cymbal more heavily (they're detected very well)
  // Snare is good but less consistent
  const intensity = (hihat * 2.0 + cymbal * 2.0 + snare * 1.0) / 5.0;
  
  // Apply exponential curve for more dramatic response
  const dramaticIntensity = Math.pow(intensity, 0.5);
  
  // DRUMS MODE: Yellow to orange light
  // 0-40%: Very dim yellow (barely visible)
  // 40-70%: Bright yellow (clear hits)
  // 70-100%: Intense orange (heavy percussion)
  
  let brightness: number;
  let hue: number;
  let sat: number;
  
  if (intensity < 0.4) {
    // Low intensity: very dim yellow
    brightness = 1 + (intensity / 0.4) * 29; // 1-30% brightness
    hue = 10920; // Yellow (60° = 10920 in Hue scale)
    sat = 254; // Full saturation
  } else if (intensity < 0.7) {
    // Medium intensity: bright yellow
    brightness = 30 + ((intensity - 0.4) / 0.3) * 60; // 30-90% brightness
    hue = 10920; // Yellow
    sat = 254; // Full saturation
  } else {
    // High intensity: intense orange
    const extremeAmount = (intensity - 0.7) / 0.3; // 0-1
    brightness = 90 + extremeAmount * 10; // 90-100% brightness
    hue = Math.round(10920 - extremeAmount * 5460); // Yellow (60°) to orange (30°)
    sat = 254; // Full saturation
  }

  // Convert to Hue scale (0-254)
  const rawBri = (brightness / 100) * 254;
  
  // Quantize based on smoothness setting (2-128 buckets)
  const bucketSize = Math.floor(254 / smoothness);
  const quantizedBri = Math.round(rawBri / bucketSize) * bucketSize;
  
  // Clamp to valid range and ensure integer
  const finalBri = Math.round(Math.max(1, Math.min(254, quantizedBri)));

  // Send only necessary properties (lights assumed already on, transitiontime=0 is default)
  return {
    bri: finalBri,
    hue: hue,
    sat: sat,
  };
}

/**
 * Create DRAMATIC music-reactive light effect (DEPRECATED - use lightConfigToState instead)
 */
export function musicToLightState(
  energy: number, // 0-1
  bass: number, // 0-1
  mid: number, // 0-1
  treble: number, // 0-1
  isOnBeat: boolean = false,
  voiceStrength: number = 0, // 0-1 for human voice
): HueLightState {
  // DRAMATIC BRIGHTNESS: 10-100% range
  const baseBrightness = 10 + energy * 90;
  const voiceBoost = voiceStrength * 30;
  const brightness = Math.min(100, baseBrightness + voiceBoost);
  
  let hue = 0;
  let saturation = 100; // Always max saturation
  
  // Calculate frequency dominance with EMPHASIS
  const totalFreq = bass + mid + treble + 0.01;
  const bassRatio = (bass * bass) / totalFreq; // Squared for emphasis
  const midRatio = (mid * mid) / totalFreq;
  const trebleRatio = (treble * treble) / totalFreq;
  
  // VOICE: Vivid Purple/Magenta (270-330°)
  if (voiceStrength > 0.2) {
    hue = 270 + voiceStrength * 60;
    saturation = 100;
  }
  // BASS: Deep Red/Orange (0-60°)
  else if (bassRatio > 0.3) {
    hue = bassRatio * 60;
    saturation = 100;
  }
  // TREBLE: Electric Blue/Cyan (180-270°)
  else if (trebleRatio > 0.25) {
    hue = 180 + trebleRatio * 90;
    saturation = 100;
  }
  // MID: Vibrant Green/Yellow (60-120°)
  else if (midRatio > 0.25) {
    hue = 60 + midRatio * 120;
    saturation = 100;
  }
  // BALANCED: Rapid rainbow cycling
  else {
    const time = Date.now() / 100;
    hue = (time * 60 + energy * 360) % 360;
    saturation = 95 + energy * 5;
  }
  
  // BEAT: Pure white flash
  if (isOnBeat) {
    saturation = 0;
  }
  
  // INSTANT transitions for drama
  let transitiontime = 0;
  if (energy < 0.1 && !isOnBeat) {
    transitiontime = 2; // Only quiet moments get smooth
  }

  return {
    ...hsvToHue(hue, saturation, brightness),
    transitiontime,
    on: true,
    alert: isOnBeat ? "select" : "none",
  };
}

