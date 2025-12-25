/**
 * Hue Lights Worker
 * Handles all Hue API calls off the main thread for better performance
 * Now also handles light state calculation from audio data
 */

import { lightConfigToState } from '@/lib/hue';

interface HueLightState {
  on?: boolean;
  bri?: number;
  hue?: number;
  sat?: number;
  transitiontime?: number;
}

interface UpdateLightMessage {
  type: 'UPDATE_LIGHT';
  bridgeIp: string;
  username: string;
  lightId: string;
  state: HueLightState;
}

interface InitMessage {
  type: 'INIT';
  bridgeIp: string;
  username: string;
}

interface UpdateConfigMessage {
  type: 'UPDATE_CONFIG';
  selectedLights: string[];
  smoothness: number;
}

interface SetActiveMessage {
  type: 'SET_ACTIVE';
  isActive: boolean;
}

interface UpdateAudioMessage {
  type: 'UPDATE_AUDIO';
  audioData: {
    bass: number;
    mid: number;
    treble: number;
    subBass: number;
    presence: number;
    voiceStrength?: number;
    instruments?: {
      drumComponents: {
        snare: number;
        hihat: number;
        cymbal: number;
      };
    };
  };
  lightConfigs: Record<string, { mode: 'bass' | 'voice' | 'drums' }>;
}

type WorkerMessage = UpdateLightMessage | InitMessage | UpdateConfigMessage | SetActiveMessage | UpdateAudioMessage;

// Per-light queues (same pattern as main thread, but in worker)
// Track which lights are currently updating
const lightUpdating = new Map<string, boolean>();
// Store the NEXT state to send (only the latest, replaces previous pending)
const pendingStates = new Map<string, HueLightState | null>();
const lightFailures = new Map<string, number>();
const lastBrightness = new Map<string, number>();

const MAX_FAILURES = 3;

// Config
let bridgeIp = '';
let username = '';
let selectedLights: Set<string> = new Set();
let isActive = false;
let lightConfigs: Record<string, { mode: 'bass' | 'voice' | 'drums' }> = {};
let colorCapableLights: Set<string> = new Set(); // Track which lights support color
let smoothness = 6; // Brightness buckets (2-128)

/**
 * Set the state of a specific light
 * 
 * Hue API returns an array of results, one per property set:
 * [
 *   { success: { "/lights/1/state/bri": 128 } },
 *   { error: { type: 6, description: "parameter, hue, not available" } }
 * ]
 * 
 * Type 6 errors mean the light doesn't support that property (e.g., white-only bulbs)
 */
async function setLightState(
  lightId: string,
  state: HueLightState
): Promise<void> {
  try {
    // Filter state based on light capabilities
    const filteredState = { ...state };
    
    // If light is known to not support color, remove hue/sat
    if (!colorCapableLights.has(lightId) && colorCapableLights.size > 0) {
      delete filteredState.hue;
      delete filteredState.sat;
    }
    
    
    const response = await fetch(
      `http://${bridgeIp}/api/${username}/lights/${lightId}/state`,
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(filteredState),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    
    
    // Hue returns array of success/error objects
    if (!Array.isArray(data)) {
      throw new Error('Invalid Hue API response');
    }
    
    // Check for "parameter not available" errors (Type 6)
    const colorErrors = data.filter((item: any) => 
      item.error?.type === 6 && 
      (item.error?.address?.includes('/hue') || item.error?.address?.includes('/sat'))
    );
    
    if (colorErrors.length > 0) {
      // Light doesn't support color - remember this
      colorCapableLights.delete(lightId);
    } else if (state.hue !== undefined || state.sat !== undefined) {
      // Light accepted color properties - it's color capable
      colorCapableLights.add(lightId);
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
    
    // Ignore Type 6 errors (not available) - they're handled above
    const realErrors = data.filter((item: any) => 
      item.error && item.error.type !== 6
    );
    
    // Log only if there are real errors (ignore Type 6 - not available)
    if (realErrors.length > 0) {
      const errorDetails = realErrors.map((e: any) => {
        const address = e.error?.address || 'unknown';
        const property = address.split('/').pop();
        return `${property} (Type ${e.error?.type})`;
      }).join(', ');
      console.warn(`⚠️ Light ${lightId}: ${successCount} success, ${realErrors.length} errors - ${errorDetails}`);
    }
    
  } catch (error: any) {
    // Detect mixed content errors
    if (error.message?.includes('Failed to fetch') || error.name === 'TypeError') {
      console.error('❌ Mixed content error? HTTPS page cannot call HTTP Hue bridge');
      throw new Error('MIXED_CONTENT_ERROR');
    }
    throw error;
  }
}

/**
 * Update light state - only sends the LATEST state, discards intermediate states
 * This prevents lag between audio and lights
 */
function queueLightUpdate(lightId: string, state: HueLightState): void {
  // Check if still active and selected
  if (!isActive || !selectedLights.has(lightId)) {
    return;
  }
  
  // If this light is currently updating, store this as the next state to send
  if (lightUpdating.get(lightId)) {
    pendingStates.set(lightId, state);
    return;
  }
  
  // Start updating this light
  lightUpdating.set(lightId, true);
  sendLightUpdate(lightId, state);
}

/**
 * Actually send the light update and handle any pending states
 */
async function sendLightUpdate(lightId: string, state: HueLightState): Promise<void> {
  try {
    await setLightState(lightId, state);
    
    // Success
    lightFailures.set(lightId, 0);
    lastBrightness.set(lightId, state.bri || 0);
    
    // Send success message back to main thread
    self.postMessage({
      type: 'UPDATE_SUCCESS',
      lightId,
      brightness: state.bri,
    });
  } catch (e: any) {
    // Failure
    const failures = (lightFailures.get(lightId) || 0) + 1;
    lightFailures.set(lightId, failures);
    
    // Send failure message back to main thread
    self.postMessage({
      type: 'UPDATE_FAILURE',
      lightId,
      failures,
      error: e.message || 'Unknown error',
    });
  }
  
  // Check if there's a pending state to send
  const nextState = pendingStates.get(lightId);
  if (nextState && isActive && selectedLights.has(lightId)) {
    // Clear pending and send the latest state
    pendingStates.set(lightId, null);
    await sendLightUpdate(lightId, nextState);
  } else {
    // Done updating this light
    lightUpdating.set(lightId, false);
    pendingStates.set(lightId, null);
  }
}

/**
 * Handle messages from main thread
 */
self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const message = event.data;
  
  switch (message.type) {
    case 'INIT':
      bridgeIp = message.bridgeIp || '';
      username = message.username || '';
      break;
      
    case 'UPDATE_CONFIG':
      // Update which lights are selected
      if (message.selectedLights) {
        const newSelectedLights = new Set(message.selectedLights);
        
        // Clear pending states for lights that were deselected
        for (const lightId of pendingStates.keys()) {
          if (!newSelectedLights.has(lightId)) {
            pendingStates.delete(lightId);
            lightUpdating.delete(lightId);
          }
        }
        
        selectedLights = newSelectedLights;
      }
      
      // Update smoothness
      if (message.smoothness !== undefined) {
        smoothness = message.smoothness;
      }
      break;
      
    case 'UPDATE_AUDIO':
      // Skip if not active
      if (!isActive) {
        return;
      }
      
      if (selectedLights.size === 0) {
        return;
      }
      
      // Update light configs
      lightConfigs = message.lightConfigs || {};
      
      // Calculate and apply states for all selected lights
      const audioData = {
        bass: message.audioData.bass,
        mid: message.audioData.mid,
        treble: message.audioData.treble,
        subBass: message.audioData.subBass,
        presence: message.audioData.presence,
        voice: message.audioData.voiceStrength || 0,
        drums: {
          snare: message.audioData.instruments?.drumComponents?.snare || 0,
          hihat: message.audioData.instruments?.drumComponents?.hihat || 0,
          cymbal: message.audioData.instruments?.drumComponents?.cymbal || 0,
        },
      };
      
      let updatesQueued = 0;
      
      for (const lightId of selectedLights) {
        const lightConfig = lightConfigs[lightId];
        if (!lightConfig) {
          continue;
        }
        
        // Calculate state for this light with smoothness setting
        const lightState = lightConfigToState(lightConfig, audioData, smoothness);
        const newBrightness = lightState.bri || 0;
        
        
        // Skip if brightness hasn't changed
        const prevBri = lastBrightness.get(lightId);
        if (prevBri === newBrightness) {
          continue;
        }
        
        // Queue the update
        queueLightUpdate(lightId, lightState);
        updatesQueued++;
      }
      
      if (updatesQueued === 0) {
        // This is normal - brightness didn't change
      }
      break;
      
    case 'SET_ACTIVE':
      // Update active state
      const wasActive = isActive;
      isActive = message.isActive ?? false;
      
      // Clear ALL pending states when deactivated
      if (!isActive && wasActive) {
        pendingStates.clear();
        lightUpdating.clear();
      }
      break;
      
    case 'UPDATE_LIGHT':
      // Skip if not active
      if (!isActive) {
        return;
      }
      
      // Skip if light not selected
      if (!selectedLights.has(message.lightId || '')) {
        return;
      }
      
      // Skip if brightness hasn't changed (optimization)
      const prevBri = lastBrightness.get(message.lightId || '');
      if (prevBri === message.state?.bri) {
        return;
      }
      
      // Queue the update
      if (message.lightId && message.state) {
        queueLightUpdate(message.lightId, message.state);
      }
      break;
  }
};

export {};

