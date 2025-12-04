"use client";

import { Play, Pause, Square, Mic, MicOff, Video, VideoOff, Maximize, Minimize } from "lucide-react";
import { IconButton } from "@/components/ds";

// Play/Pause Status Button
interface PlaybackStatusButtonProps {
  isPlaying: boolean | null;
}

export function PlaybackStatusButton({ isPlaying }: PlaybackStatusButtonProps) {
  const getVariant = () => {
    if (isPlaying === null) return "stopped";
    if (isPlaying) return "playing";
    return "paused";
  };

  const getIcon = () => {
    if (isPlaying === null) return <Square size={18} />;
    if (isPlaying) return <Play size={18} />;
    return <Pause size={18} />;
  };

  const getTitle = () => {
    if (isPlaying === null) return "No song playing";
    if (isPlaying) return "Playing";
    return "Paused";
  };

  return (
    <IconButton variant={getVariant()} title={getTitle()}>
      {getIcon()}
    </IconButton>
  );
}

// Microphone Toggle Button
interface MicrophoneButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

export function MicrophoneButton({ enabled, onToggle }: MicrophoneButtonProps) {
  return (
    <IconButton
      active={enabled}
      onClick={onToggle}
      title={enabled ? "Disable Microphone" : "Enable Microphone"}
    >
      {enabled ? <Mic size={18} /> : <MicOff size={18} />}
    </IconButton>
  );
}

// Camera Toggle Button
interface CameraButtonProps {
  enabled: boolean;
  onToggle: () => void;
}

export function CameraButton({ enabled, onToggle }: CameraButtonProps) {
  return (
    <IconButton
      active={enabled}
      onClick={onToggle}
      title={enabled ? "Disable Camera" : "Enable Camera"}
    >
      {enabled ? <Video size={18} /> : <VideoOff size={18} />}
    </IconButton>
  );
}

// Fullscreen Toggle Button
interface FullscreenButtonProps {
  isFullscreen: boolean;
  onToggle: () => void;
}

export function FullscreenButton({ isFullscreen, onToggle }: FullscreenButtonProps) {
  return (
    <IconButton
      active={isFullscreen}
      onClick={onToggle}
      title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
    >
      {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
    </IconButton>
  );
}

