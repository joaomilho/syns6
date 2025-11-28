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
const lightQueues = new Map<string, Promise<void>>();
const lightFailures = new Map<string, number>();
const lastBrightness = new Map<string, number>();

const MAX_FAILURES = 3;

// Config
let bridgeIp = '';
let username = '';
let selectedLights: Set<string> = new Set();
let isActive = false;
let lightConfigs: Record<string, { mode: 'bass' | 'voice' | 'drums' }> = {};

/**
 * Set the state of a specific light
 */
async function setLightState(
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
      console.error(`❌ Light ${lightId} error:`, data[0].error);
      throw new Error(data[0].error.description);
    }
  } catch (error) {
    throw error;
  }
}

/**
 * Queue an update for a specific light
 */
function queueLightUpdate(lightId: string, state: HueLightState): void {
  const previousPromise = lightQueues.get(lightId) || Promise.resolve();
  
  const newPromise = previousPromise.then(async () => {
    // Check if still active and selected BEFORE executing
    if (!isActive) {
      return; // Skip - deactivated
    }
    
    if (!selectedLights.has(lightId)) {
      return; // Skip - deselected
    }
    
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
    } catch (e) {
      // Failure
      const failures = (lightFailures.get(lightId) || 0) + 1;
      lightFailures.set(lightId, failures);
      
      // Only log on first failure or max failures
      if (failures === 1 || failures >= MAX_FAILURES) {
        console.log(`💡 Worker: Light ${lightId} failed (${failures}/${MAX_FAILURES})`);
      }
      
      // Send failure message back to main thread
      self.postMessage({
        type: 'UPDATE_FAILURE',
        lightId,
        failures,
      });
    }
  });
  
  lightQueues.set(lightId, newPromise);
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
      console.log('💡 Hue Worker initialized');
      break;
      
    case 'UPDATE_CONFIG':
      // Update which lights are selected
      if (message.selectedLights) {
        const newSelectedLights = new Set(message.selectedLights);
        
        // Clear queues for lights that were deselected
        for (const lightId of lightQueues.keys()) {
          if (!newSelectedLights.has(lightId)) {
            lightQueues.delete(lightId);
            console.log(`💡 Worker: Cleared queue for deselected light ${lightId}`);
          }
        }
        
        selectedLights = newSelectedLights;
        console.log(`💡 Worker: Updated selected lights (${selectedLights.size})`);
      }
      break;
      
    case 'UPDATE_AUDIO':
      // Skip if not active
      if (!isActive) {
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
      
      for (const lightId of selectedLights) {
        const lightConfig = lightConfigs[lightId];
        if (!lightConfig) continue;
        
        // Calculate state for this light
        const lightState = lightConfigToState(lightConfig, audioData);
        const newBrightness = lightState.bri || 0;
        
        // Skip if brightness hasn't changed
        const prevBri = lastBrightness.get(lightId);
        if (prevBri === newBrightness) {
          continue;
        }
        
        // Queue the update
        queueLightUpdate(lightId, lightState);
      }
      break;
      
    case 'SET_ACTIVE':
      // Update active state
      const wasActive = isActive;
      isActive = message.isActive ?? false;
      console.log(`💡 Worker: Hue ${isActive ? 'activated' : 'deactivated'}`);
      
      // Clear ALL queues when deactivated (stops in-progress updates)
      if (!isActive && wasActive) {
        const numQueues = lightQueues.size;
        lightQueues.clear();
        console.log(`💡 Worker: Cleared ${numQueues} light queues`);
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

