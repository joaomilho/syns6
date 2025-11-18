import { useState, useRef, useCallback, useEffect } from "react";

export function useCamera() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const enable = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
      });

      streamRef.current = stream;

      // Create video element
      const video = document.createElement("video");
      video.autoplay = true;
      video.playsInline = true;
      video.muted = true;
      video.srcObject = stream;

      // Wait for video to be ready
      await new Promise<void>((resolve) => {
        video.onloadedmetadata = () => {
          video.play().then(() => {
            console.log("📷 Camera video ready");
            resolve();
          });
        };
      });

      setVideoElement(video);
      setIsEnabled(true);
      setError(null);
      console.log("📷 Camera enabled");
    } catch (err: any) {
      console.error("Camera error:", err);
      setError(err.message || "Failed to access camera");
      setIsEnabled(false);
    }
  }, []);

  const disable = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    setVideoElement((prevVideo) => {
      if (prevVideo) {
        prevVideo.srcObject = null;
        prevVideo.pause();
      }
      return null;
    });

    setIsEnabled(false);
    console.log("📷 Camera disabled");
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  return {
    isEnabled,
    error,
    enable,
    disable,
    videoElement,
  };
}

