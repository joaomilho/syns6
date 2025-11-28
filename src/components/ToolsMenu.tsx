"use client";

import styles from "./ToolsMenu.module.css";

interface ToolsMenuProps {
  isPlaying: boolean | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  showMic?: boolean;
  showCamera?: boolean;
}

export default function ToolsMenu({
  isPlaying,
  isMicEnabled,
  isCameraEnabled,
  onMicToggle,
  onCameraToggle,
  showMic = true,
  showCamera = true,
}: ToolsMenuProps) {
  const getStatusClass = () => {
    if (isPlaying === null) return styles.stopped;
    if (isPlaying) return styles.playing;
    return styles.paused;
  };

  return (
    <div className={styles.toolsMenu}>
      {/* Play/Pause Status Indicator */}
      <div className={`${styles.statusIcon} ${getStatusClass()}`}>
        {isPlaying === null ? (
          <span title="No song playing">⏹︎</span>
        ) : isPlaying ? (
          <span title="Playing">▶︎</span>
        ) : (
          <span title="Paused">⏸︎</span>
        )}
      </div>

      {/* Microphone Toggle */}
      {showMic && (
        <button
          className={`${styles.toolButton} ${isMicEnabled ? styles.active : ""}`}
          onClick={onMicToggle}
          title={isMicEnabled ? "Disable Microphone" : "Enable Microphone"}
        >
          ⦿
        </button>
      )}

      {/* Camera Toggle */}
      {showCamera && (
        <button
          className={`${styles.toolButton} ${isCameraEnabled ? styles.active : ""}`}
          onClick={onCameraToggle}
          title={isCameraEnabled ? "Disable Camera" : "Enable Camera"}
        >
          ⊡
        </button>
      )}
    </div>
  );
}

