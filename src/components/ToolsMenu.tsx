"use client";

import styles from "./ToolsMenu.module.css";

interface ToolsMenuProps {
  isPlaying: boolean | null;
  isMicEnabled: boolean;
  isCameraEnabled: boolean;
  onMicToggle: () => void;
  onCameraToggle: () => void;
  showHue?: boolean;
  isHueConnected?: boolean;
  onHueToggle?: () => void;
  isHueHighlighted?: boolean;
  showMic?: boolean;
  showCamera?: boolean;
}

export default function ToolsMenu({
  isPlaying,
  isMicEnabled,
  isCameraEnabled,
  onMicToggle,
  onCameraToggle,
  showHue = false,
  isHueConnected = false,
  onHueToggle,
  isHueHighlighted = false,
  showMic = true,
  showCamera = true,
}: ToolsMenuProps) {
  return (
    <div className={styles.toolsMenu}>
      {/* Play/Pause Status Indicator */}
      <div className={styles.statusIcon}>
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

      {/* Hue Lights Toggle (optional) */}
      {showHue && (
        <button
          className={`${styles.toolButton} ${
            isHueConnected ? styles.active : ""
          } ${isHueHighlighted ? styles.highlighted : ""}`}
          onClick={onHueToggle}
          title={isHueConnected ? "Hue Connected" : "Connect Hue Lights"}
        >
          ◐
        </button>
      )}
    </div>
  );
}

