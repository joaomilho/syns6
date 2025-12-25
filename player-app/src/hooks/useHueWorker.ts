/**
 * Hook to manage Hue Worker
 * Offloads all Hue HTTP requests to a Web Worker
 * Falls back to main-thread fetch when in Tauri (workers can't use Tauri HTTP plugin)
 */

import { useEffect, useRef, useCallback } from 'react';
import { HueLightState, setLightState, lightConfigToState } from '@/lib/hue';

// Detect if running in Tauri
const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window);

interface AudioData {
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
}

interface HueWorkerHook {
  updateLight: (lightId: string, state: HueLightState) => void;
  updateAudio: (audioData: AudioData, lightConfigs: Record<string, { mode: string }>) => void;
  initWorker: (bridgeIp: string, username: string) => void;
  updateConfig: (selectedLights: string[], smoothness: number) => void;
  setActive: (isActive: boolean) => void;
  terminateWorker: () => void;
  setCallbacks: (callbacks: {
    onSuccess?: (lightId: string, brightness: number) => void;
    onFailure?: (lightId: string, failures: number) => void;
  }) => void;
}

export function useHueWorker(): HueWorkerHook {
  const workerRef = useRef<Worker | null>(null);
  const handlersRef = useRef<{
    onSuccess?: (lightId: string, brightness: number) => void;
    onFailure?: (lightId: string, failures: number) => void;
  }>({});
  
  // Tauri mode: store config for main-thread updates
  const tauriConfigRef = useRef<{
    bridgeIp: string;
    username: string;
    selectedLights: string[];
    smoothness: number;
    isActive: boolean;
    lastBrightness: Map<string, number>;
    lightUpdating: Map<string, boolean>;
  }>({
    bridgeIp: '',
    username: '',
    selectedLights: [],
    smoothness: 6,
    isActive: false,
    lastBrightness: new Map(),
    lightUpdating: new Map(),
  });

  useEffect(() => {
    // In Tauri mode, don't create worker - use main thread
    if (isTauri) {
      return;
    }
    
    // Create worker
    workerRef.current = new Worker(
      new URL('../workers/hue.worker.ts', import.meta.url),
      { type: 'module' }
    );

    // Handle messages from worker
    workerRef.current.onmessage = (event) => {
      const { type, lightId, brightness, failures } = event.data;
      
      if (type === 'UPDATE_SUCCESS' && handlersRef.current.onSuccess) {
        handlersRef.current.onSuccess(lightId, brightness);
      } else if (type === 'UPDATE_FAILURE' && handlersRef.current.onFailure) {
        handlersRef.current.onFailure(lightId, failures);
      }
    };

    // Cleanup
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
    };
  }, []);

  const initWorker = useCallback((bridgeIp: string, username: string) => {
    if (isTauri) {
      tauriConfigRef.current.bridgeIp = bridgeIp;
      tauriConfigRef.current.username = username;
      return;
    }
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'INIT',
        bridgeIp,
        username,
      });
    }
  }, []);

  const updateLight = useCallback((lightId: string, state: HueLightState) => {
    if (isTauri) {
      const config = tauriConfigRef.current;
      if (!config.isActive || !config.bridgeIp || !config.username) return;
      
      // Main thread fetch for Tauri
      setLightState(config.bridgeIp, config.username, lightId, state)
        .then(() => {
          config.lastBrightness.set(lightId, state.bri || 0);
          handlersRef.current.onSuccess?.(lightId, state.bri || 0);
        })
        .catch(() => {
          handlersRef.current.onFailure?.(lightId, 1);
        });
      return;
    }
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_LIGHT',
        lightId,
        state,
      });
    }
  }, []);

  const updateAudio = useCallback((audioData: AudioData, lightConfigs: Record<string, { mode: string }>) => {
    if (isTauri) {
      const config = tauriConfigRef.current;
      if (!config.isActive || !config.bridgeIp || !config.username) return;
      
      // Process each selected light on main thread
      for (const lightId of config.selectedLights) {
        const lightConfig = lightConfigs[lightId];
        if (!lightConfig) continue;
        
        // Skip if already updating this light
        if (config.lightUpdating.get(lightId)) continue;
        
        // Calculate state
        const state = lightConfigToState(
          lightConfig as { mode: 'bass' | 'voice' | 'drums' },
          {
            bass: audioData.bass,
            mid: audioData.mid,
            treble: audioData.treble,
            subBass: audioData.subBass,
            presence: audioData.presence,
            voice: audioData.voiceStrength,
            drums: audioData.instruments?.drumComponents,
          },
          config.smoothness
        );
        
        // Skip if brightness unchanged
        if (config.lastBrightness.get(lightId) === state.bri) continue;
        
        // Mark as updating
        config.lightUpdating.set(lightId, true);
        
        // Send update
        setLightState(config.bridgeIp, config.username, lightId, state)
          .then(() => {
            config.lastBrightness.set(lightId, state.bri || 0);
            handlersRef.current.onSuccess?.(lightId, state.bri || 0);
          })
          .catch(() => {
            handlersRef.current.onFailure?.(lightId, 1);
          })
          .finally(() => {
            config.lightUpdating.set(lightId, false);
          });
      }
      return;
    }
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_AUDIO',
        audioData,
        lightConfigs,
      });
    }
  }, []);

  const terminateWorker = useCallback(() => {
    if (isTauri) {
      // Reset Tauri config
      tauriConfigRef.current = {
        bridgeIp: '',
        username: '',
        selectedLights: [],
        smoothness: 6,
        isActive: false,
        lastBrightness: new Map(),
        lightUpdating: new Map(),
      };
      return;
    }
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const updateConfig = useCallback((selectedLights: string[], smoothness: number) => {
    if (isTauri) {
      tauriConfigRef.current.selectedLights = selectedLights;
      tauriConfigRef.current.smoothness = smoothness;
      return;
    }
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'UPDATE_CONFIG',
      selectedLights,
      smoothness,
    });
  }, []);

  const setActive = useCallback((isActive: boolean) => {
    if (isTauri) {
      tauriConfigRef.current.isActive = isActive;
      if (!isActive) {
        // Clear pending state when deactivated
        tauriConfigRef.current.lightUpdating.clear();
      }
      return;
    }
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'SET_ACTIVE',
      isActive,
    });
  }, []);

  const setCallbacks = useCallback((callbacks: {
    onSuccess?: (lightId: string, brightness: number) => void;
    onFailure?: (lightId: string, failures: number) => void;
  }) => {
    handlersRef.current = callbacks;
  }, []);

  return {
    updateLight,
    updateAudio,
    initWorker,
    updateConfig,
    setActive,
    terminateWorker,
    setCallbacks,
  };
}

