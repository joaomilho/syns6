/**
 * Philips Hue API Integration
 * Controls local Hue lights with music-reactive colors
 */

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

/**
 * Discover Hue bridges on the local network
 */
export async function discoverBridges(): Promise<HueBridge[]> {
  try {
    const response = await fetch("https://discovery.meethue.com/");
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
    const response = await fetch(`http://${bridgeIp}/api`, {
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
    const response = await fetch(`http://${bridgeIp}/api/${username}/lights`);
    
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
    const response = await fetch(
      `http://${bridgeIp}/api/${username}/lights/${lightId}/state`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      }
    );

    const data = await response.json();
    
    if (data[0]?.error) {
      throw new Error(data[0].error.description);
    }
  } catch (error) {
    console.error(`Error setting light ${lightId} state:`, error);
    // Don't throw - allow graceful degradation
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
 * Create DRAMATIC music-reactive light effect
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

