"use client";

import { useState, useEffect, useCallback } from "react";
import { isTauriEnvironment } from "@/lib/spotifyLocal";

// Dynamically import Tauri API to avoid SSR issues
async function getTauriInvoke() {
  if (typeof window === "undefined") return null;
  try {
    const { invoke } = await import("@tauri-apps/api/core");
    return invoke;
  } catch {
    return null;
  }
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isTauri, setIsTauri] = useState(false);

  // Check if running in Tauri
  useEffect(() => {
    setIsTauri(isTauriEnvironment());
  }, []);

  // Track fullscreen state changes
  useEffect(() => {
    if (isTauri) {
      // Poll Tauri fullscreen state (no event listener available)
      const checkFullscreen = async () => {
        const invoke = await getTauriInvoke();
        if (invoke) {
          try {
            const fs = await invoke<boolean>("is_fullscreen");
            setIsFullscreen(fs);
          } catch {
            // Ignore errors
          }
        }
      };
      checkFullscreen();
      const interval = setInterval(checkFullscreen, 1000);
      return () => clearInterval(interval);
    } else {
      // Browser fullscreen tracking
      const handleFullscreenChange = () => {
        setIsFullscreen(!!document.fullscreenElement);
      };
      document.addEventListener("fullscreenchange", handleFullscreenChange);
      return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }
  }, [isTauri]);

  // Toggle fullscreen mode
  const toggleFullscreen = useCallback(async () => {
    if (isTauri) {
      const invoke = await getTauriInvoke();
      if (invoke) {
        try {
          const newState = await invoke<boolean>("toggle_fullscreen");
          setIsFullscreen(newState);
        } catch {
          // Ignore errors
        }
      }
    } else {
      // Browser fallback
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    }
  }, [isTauri]);

  return { isFullscreen, toggleFullscreen };
}





