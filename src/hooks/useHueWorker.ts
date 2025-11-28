/**
 * Hook to manage Hue Worker
 * Offloads all Hue HTTP requests to a Web Worker
 */

import { useEffect, useRef, useCallback } from 'react';
import { HueLightState } from '@/lib/hue';

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
  updateConfig: (selectedLights: string[]) => void;
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

  useEffect(() => {
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
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'INIT',
        bridgeIp,
        username,
      });
    }
  }, []);

  const updateLight = useCallback((lightId: string, state: HueLightState) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_LIGHT',
        lightId,
        state,
      });
    }
  }, []);

  const updateAudio = useCallback((audioData: AudioData, lightConfigs: Record<string, { mode: string }>) => {
    if (workerRef.current) {
      workerRef.current.postMessage({
        type: 'UPDATE_AUDIO',
        audioData,
        lightConfigs,
      });
    }
  }, []);

  const terminateWorker = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const updateConfig = useCallback((selectedLights: string[]) => {
    if (!workerRef.current) {
      return;
    }

    workerRef.current.postMessage({
      type: 'UPDATE_CONFIG',
      selectedLights,
    });
  }, []);

  const setActive = useCallback((isActive: boolean) => {
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

