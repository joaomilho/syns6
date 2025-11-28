"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  discoverBridges,
  createUser,
  getLights,
  setLightState,
  setMultipleLights,
  lightConfigToState,
  HueBridge,
  HueLight,
  HueLightState,
  LightConfig,
} from "@/lib/hue";
import { useHueWorker } from "@/hooks/useHueWorker";

export interface HueConfig {
  bridgeIp: string;
  username: string;
  selectedLights: string[];
  lightConfigs: Record<string, LightConfig>; // lightId -> config
}

export interface HueConnection {
  isConnected: boolean;
  isConnecting: boolean;
  isActive: boolean;
  error: string | null;
  bridges: HueBridge[];
  lights: Record<string, HueLight>;
  config: HueConfig | null;
  mode: HueMode;
  debugData: { bass: number; brightness: number } | null;
  
  discover: () => Promise<void>;
  connect: (bridgeIp: string) => Promise<void>;
  disconnect: () => void;
  selectLights: (lightIds: string[]) => void;
  setLightConfig: (lightId: string, config: LightConfig) => void;
  updateLights: (state: HueLightState) => Promise<void>;
  reactToMusic: (micData: {
    energy: number;
    bass: number;
    mid: number;
    treble: number;
    subBass: number;
    presence: number;
    voiceStrength?: number;
    frequencyData?: Uint8Array;
    instruments?: {
      drums: number;
      drumComponents: {
        kick: number;
        snare: number;
        hihat: number;
        cymbal: number;
        toms: number;
      };
      bass: number;
      guitar: number;
      piano: number;
      brass: number;
      strings: number;
    };
  }, force?: boolean) => void;
  setActive: (active: boolean) => void;
  setMode: (mode: HueMode) => void;
}

export type HueMode = "full" | "voice-only" | "no-voice";

const HUE_CONFIG_KEY = "syns_hue_config";

export function useHueLights(): HueConnection {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridges, setBridges] = useState<HueBridge[]>([]);
  const [lights, setLights] = useState<Record<string, HueLight>>({});
  const [config, setConfig] = useState<HueConfig | null>(null);
  const [mode, setMode] = useState<HueMode>("full");
  const [debugData, setDebugData] = useState<{ bass: number; brightness: number } | null>(null);
  
  const lastUpdateTime = useRef<number>(0);
  const updateThrottleMs = 1000/60; // 60 updates/second
  const responsiveLights = useRef<Set<string>>(new Set()); // Track which lights respond
  const lightFailures = useRef<Map<string, number>>(new Map()); // Track failures per light
  const lastLogTime = useRef<number>(0);
  const MAX_FAILURES = 3; // After 3 failures, stop trying this light
  const FAILURE_RESET_MS = 10000; // Reset failures after 10 seconds
  const isUpdating = useRef<boolean>(false); // Lock to prevent concurrent updates
  const lastBrightness = useRef<Map<string, number>>(new Map()); // Track last brightness per light
  
  // Hue Worker: handles all HTTP requests in separate thread
  const { updateAudio, initWorker, updateConfig, setActive: setWorkerActive, terminateWorker, setCallbacks } = useHueWorker();

  // Setup worker callbacks to handle success/failure
  useEffect(() => {
    setCallbacks({
      onSuccess: (lightId, brightness) => {
        lightFailures.current.set(lightId, 0);
        responsiveLights.current.add(lightId);
      },
      onFailure: (lightId, failures) => {
        lightFailures.current.set(lightId, failures);
        if (failures >= MAX_FAILURES) {
          responsiveLights.current.delete(lightId);
        }
      },
    });
  }, [setCallbacks]);

  // Initialize worker when config is available
  useEffect(() => {
    if (config && isConnected) {
      console.log('💡 Initializing Hue worker');
      initWorker(config.bridgeIp, config.username);
      // Send initial config
      updateConfig(config.selectedLights);
    }
  }, [config, isConnected, initWorker, updateConfig]);

  // Update worker when selected lights change
  useEffect(() => {
    if (config && isConnected) {
      updateConfig(config.selectedLights);
    }
  }, [config?.selectedLights, isConnected, updateConfig]);

  // Update worker when active state changes
  useEffect(() => {
    if (isConnected) {
      setWorkerActive(isActive);
    }
  }, [isActive, isConnected, setWorkerActive]);

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(HUE_CONFIG_KEY);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved) as any;
        
        // Migrate old configs that don't have lightConfigs or have old format
        if (!savedConfig.lightConfigs) {
          const lightConfigs: Record<string, LightConfig> = {};
          savedConfig.selectedLights?.forEach((lightId: string) => {
            lightConfigs[lightId] = { mode: "bass" };
          });
          savedConfig.lightConfigs = lightConfigs;
        } else {
          // Migrate old lightConfigs format to new mode-based format
          Object.keys(savedConfig.lightConfigs).forEach((lightId: string) => {
            const oldConfig = savedConfig.lightConfigs[lightId];
            if (!oldConfig.mode) {
              // Old format had color/frequency, convert to mode
              savedConfig.lightConfigs[lightId] = { mode: "bass" };
            }
          });
        }
        
        setConfig(savedConfig as HueConfig);
        reconnect(savedConfig as HueConfig);
      } catch (e) {
        console.error("Failed to parse saved Hue config:", e);
        localStorage.removeItem(HUE_CONFIG_KEY);
      }
    }
  }, []);

  // Save config
  useEffect(() => {
    if (config) {
      localStorage.setItem(HUE_CONFIG_KEY, JSON.stringify(config));
    }
  }, [config]);

  const reconnect = async (savedConfig: HueConfig) => {
    try {
      const fetchedLights = await getLights(
        savedConfig.bridgeIp,
        savedConfig.username
      );
      setLights(fetchedLights);
      setIsConnected(true);
      setError(null);
    } catch (e) {
      console.error("Failed to reconnect to Hue bridge:", e);
      setError("Failed to reconnect. Please connect again.");
    }
  };

  const discover = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      const discovered = await discoverBridges();
      setBridges(discovered);
      
      if (discovered.length === 0) {
        setError("No bridges found. Try manual IP entry below.");
      }
    } catch (e: any) {
      setError(`Discovery failed. Use manual IP entry below.`);
      console.error("Hue discovery error:", e);
    } finally {
      setIsConnecting(false);
    }
  };

  const connect = async (bridgeIp: string) => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const username = await createUser(bridgeIp);
      const fetchedLights = await getLights(bridgeIp, username);
      
      // Initialize all lights with bass mode by default
      const lightConfigs: Record<string, LightConfig> = {};
      Object.keys(fetchedLights).forEach((lightId) => {
        lightConfigs[lightId] = { mode: "bass" };
      });
      
      const newConfig: HueConfig = {
        bridgeIp,
        username,
        selectedLights: Object.keys(fetchedLights),
        lightConfigs,
      };
      
      // Set initial colors for all lights (red, full saturation)
      const initialColorState = {
        hue: Math.round((0 / 360) * 65535), // Red = 0 degrees
        sat: 254, // Full saturation
        on: true,
      };
      
      await Promise.all(
        Object.keys(fetchedLights).map((lightId) =>
          setLightState(bridgeIp, username, lightId, initialColorState)
        )
      );
      
      setConfig(newConfig);
      setLights(fetchedLights);
      setIsConnected(true);
      setError(null);
    } catch (e: any) {
      if (e.message?.includes("link button not pressed")) {
        setError("Press the button on your Hue bridge and try again!");
      } else {
        setError(`Failed to connect: ${e.message}`);
      }
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = () => {
    // Terminate worker
    terminateWorker();
    
    setIsConnected(false);
    setConfig(null);
    setLights({});
    setBridges([]);
    localStorage.removeItem(HUE_CONFIG_KEY);
  };

  const selectLights = (lightIds: string[]) => {
    if (config) {
      setConfig({ ...config, selectedLights: lightIds });
    }
  };

  const setLightConfig = (lightId: string, lightConfig: LightConfig) => {
    if (config) {
      setConfig({
        ...config,
        lightConfigs: {
          ...config.lightConfigs,
          [lightId]: lightConfig,
        },
      });
    }
  };

  const updateLights = async (state: HueLightState) => {
    if (!config || !isConnected || config.selectedLights.length === 0) {
      return;
    }

    try {
      await setMultipleLights(
        config.bridgeIp,
        config.username,
        config.selectedLights,
        state
      );
    } catch (e) {
      console.error("Failed to update lights:", e);
    }
  };

  const reactToMusic = useCallback(
    async (micData: {
      energy: number;
      bass: number;
      mid: number;
      treble: number;
      subBass: number;
      presence: number;
      voiceStrength?: number;
      frequencyData?: Uint8Array;
      instruments?: {
        drums: number;
        drumComponents: {
          kick: number;
          snare: number;
          hihat: number;
          cymbal: number;
          toms: number;
        };
        bass: number;
        guitar: number;
        piano: number;
        brass: number;
        strings: number;
      };
    }, force: boolean = false) => {
      // Only react if explicitly active
      if (!config || !isConnected || !isActive || config.selectedLights.length === 0) {
        return;
      }

      // Check if already updating - skip if so
      if (isUpdating.current) {
        return;
      }

      const now = Date.now();
      // Skip throttle check if forced (for pause/resume)
      if (!force && now - lastUpdateTime.current < updateThrottleMs) {
        return;
      }
      
      // Set lock
      isUpdating.current = true;
      lastUpdateTime.current = now;

      // Calculate bass intensity the same way as FFT visualization (first 12 bins)
      let calculatedBass = micData.bass;
      if (micData.frequencyData) {
        let bassSum = 0;
        const bassBins = Math.min(12, micData.frequencyData.length);
        for (let i = 0; i < bassBins; i++) {
          bassSum += micData.frequencyData[i];
        }
        calculatedBass = bassSum / (bassBins * 255);
      }

      // Update each light individually based on its configuration
      
      // Debug: log instruments data
      console.log('🎸 micData.instruments:', micData.instruments);
      
      const audioData = {
        bass: calculatedBass,
        mid: micData.mid,
        treble: micData.treble,
        subBass: micData.subBass,
        presence: micData.presence,
        voice: micData.voiceStrength || 0, // Voice detection for voice-reactive lights
        drums: {
          snare: micData.instruments?.drumComponents?.snare || 0,
          hihat: micData.instruments?.drumComponents?.hihat || 0,
          cymbal: micData.instruments?.drumComponents?.cymbal || 0,
        },
      };
      

      // Reset failure counts periodically
      if (now - lastLogTime.current > FAILURE_RESET_MS) {
        lightFailures.current.clear();
        lastLogTime.current = now;
      }

      // Filter out lights that have failed too many times
      const lightsToUpdate = config.selectedLights.filter((lightId) => {
        const failures = lightFailures.current.get(lightId) || 0;
        return failures < MAX_FAILURES;
      });

      // If no lights to update, log once and return
      if (lightsToUpdate.length === 0) {
        if (now - lastLogTime.current > 5000) {
          console.log(`💡 All lights failed, will retry in ${Math.round(FAILURE_RESET_MS / 1000)}s`);
          lastLogTime.current = now;
        }
        isUpdating.current = false; // Release lock before returning
        return;
      }

      // Send audio data to worker once - worker calculates states for all lights
      // This is much more efficient than sending per-light updates
      updateAudio(
        {
          bass: audioData.bass,
          mid: audioData.mid,
          treble: audioData.treble,
          subBass: audioData.subBass,
          presence: audioData.presence,
          voiceStrength: audioData.voice,
          instruments: micData.instruments ? {
            drumComponents: {
              snare: micData.instruments.drumComponents.snare,
              hihat: micData.instruments.drumComponents.hihat,
              cymbal: micData.instruments.drumComponents.cymbal,
            },
          } : undefined,
        },
        config.lightConfigs
      );
      
      // Update debug data
      if (lightsToUpdate.length > 0) {
        // Calculate first light's state for debug display
        const firstLightId = lightsToUpdate[0];
        const firstLightConfig = config.lightConfigs[firstLightId];
        if (firstLightConfig) {
          const firstLightState = lightConfigToState(firstLightConfig, audioData);
          setDebugData({
            bass: audioData.bass,
            brightness: firstLightState.bri || 0,
          });
        }
      }

      // Log responsive lights and audio data periodically
      if (now - lastLogTime.current > 5000) {
        const responsiveNames = Array.from(responsiveLights.current).map(
          (id) => lights[id]?.name || id
        );
        console.log(`💡 Responsive lights (${responsiveNames.length}):`, responsiveNames.join(', '));
        console.log(`💡 Audio levels - Bass: ${(audioData.bass || 0).toFixed(2)}, SubBass: ${(audioData.subBass || 0).toFixed(2)}, Mid: ${(audioData.mid || 0).toFixed(2)}, Treble: ${(audioData.treble || 0).toFixed(2)}`);
        lastLogTime.current = now;
      }

      // Release lock
      isUpdating.current = false;
    },
    [config, isConnected, isActive, updateThrottleMs, lights]
  );

  const setActiveWithLog = useCallback(async (active: boolean) => {
    setIsActive(active);
    
    // When activating, initialize all lights with proper color and brightness
    if (active && config && isConnected) {
      try {
        const initialState = {
          hue: Math.round((0 / 360) * 65535), // Red = 0 degrees
          sat: 254, // Full saturation
          bri: 1, // Start very dim
          on: true,
        };
        
        await Promise.all(
          config.selectedLights.map((lightId) =>
            setLightState(config.bridgeIp, config.username, lightId, initialState)
          )
        );
        
        // Clear the last brightness cache so first update will go through
        lastBrightness.current.clear();
      } catch (e) {
        console.error("Failed to initialize lights:", e);
      }
    }
  }, [config, isConnected]);

  return {
    isConnected,
    isConnecting,
    isActive,
    error,
    bridges,
    lights,
    config,
    mode,
    debugData,
    discover,
    connect,
    disconnect,
    selectLights,
    setLightConfig,
    updateLights,
    reactToMusic,
    setActive: setActiveWithLog,
    setMode,
  };
}

