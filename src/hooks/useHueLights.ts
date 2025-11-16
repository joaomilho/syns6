"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  discoverBridges,
  createUser,
  getLights,
  setMultipleLights,
  musicToLightState,
  HueBridge,
  HueLight,
  HueLightState,
} from "@/lib/hue";

export interface HueConfig {
  bridgeIp: string;
  username: string;
  selectedLights: string[];
}

export interface HueConnection {
  isConnected: boolean;
  isConnecting: boolean;
  error: string | null;
  bridges: HueBridge[];
  lights: Record<string, HueLight>;
  config: HueConfig | null;
  
  discover: () => Promise<void>;
  connect: (bridgeIp: string) => Promise<void>;
  disconnect: () => void;
  selectLights: (lightIds: string[]) => void;
  updateLights: (state: HueLightState) => Promise<void>;
  reactToMusic: (micData: {
    energy: number;
    bass: number;
    mid: number;
    treble: number;
    isLoud?: boolean;
    voiceStrength?: number;
  }) => void;
}

const HUE_CONFIG_KEY = "syns_hue_config";

export function useHueLights(): HueConnection {
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bridges, setBridges] = useState<HueBridge[]>([]);
  const [lights, setLights] = useState<Record<string, HueLight>>({});
  const [config, setConfig] = useState<HueConfig | null>(null);
  
  const lastUpdateTime = useRef<number>(0);
  const updateThrottleMs = 50; // 20 updates/second

  // Load saved config
  useEffect(() => {
    const saved = localStorage.getItem(HUE_CONFIG_KEY);
    if (saved) {
      try {
        const savedConfig = JSON.parse(saved) as HueConfig;
        setConfig(savedConfig);
        reconnect(savedConfig);
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
      
      const newConfig: HueConfig = {
        bridgeIp,
        username,
        selectedLights: Object.keys(fetchedLights),
      };
      
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
    (micData: {
      energy: number;
      bass: number;
      mid: number;
      treble: number;
      isLoud?: boolean;
      voiceStrength?: number;
    }) => {
      if (!config || !isConnected || config.selectedLights.length === 0) {
        return;
      }

      const now = Date.now();
      if (now - lastUpdateTime.current < updateThrottleMs) {
        return;
      }
      lastUpdateTime.current = now;

      const lightState = musicToLightState(
        micData.energy,
        micData.bass,
        micData.mid,
        micData.treble,
        micData.isLoud,
        micData.voiceStrength || 0
      );

      updateLights(lightState);
    },
    [config, isConnected, updateThrottleMs]
  );

  return {
    isConnected,
    isConnecting,
    error,
    bridges,
    lights,
    config,
    discover,
    connect,
    disconnect,
    selectLights,
    updateLights,
    reactToMusic,
  };
}

