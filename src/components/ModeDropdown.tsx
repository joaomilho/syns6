"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./ModeDropdown.module.css";

export type VisualizationMode = "STATIC" | "RANDOM" | "BEST_FOR_SONG" | "MY_FAVORITES";

interface ModeOption {
  id: VisualizationMode;
  name: string;
  description: string;
  icon: string;
  available: boolean;
}

const modes: ModeOption[] = [
  {
    id: "STATIC",
    name: "Static",
    description: "Visualization never changes",
    icon: "▣",
    available: true,
  },
  {
    id: "RANDOM",
    name: "Random",
    description: "New visualization for each song",
    icon: "◈",
    available: true,
  },
  {
    id: "BEST_FOR_SONG",
    name: "Best for Song",
    description: "AI picks visualization for each song",
    icon: "◎",
    available: false,
  },
  {
    id: "MY_FAVORITES",
    name: "My Favorites",
    description: "Rotate through your favorite visualizations",
    icon: "★",
    available: false,
  },
];

interface ModeDropdownProps {
  value: VisualizationMode;
  onChange: (value: VisualizationMode) => void;
}

export default function ModeDropdown({ value, onChange }: ModeDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentMode = modes.find((m) => m.id === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const handleSelect = (modeId: VisualizationMode) => {
    const mode = modes.find((m) => m.id === modeId);
    if (mode?.available) {
      onChange(modeId);
      setIsOpen(false);
    }
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Select Mode"
      >
        <span className={styles.icon}>{currentMode?.icon}</span>
        <span className={styles.label}>{currentMode?.name}</span>
        <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Visualization Mode</div>
          <div className={styles.modeList}>
            {modes.map((mode) => (
              <button
                key={mode.id}
                className={`${styles.modeOption} ${
                  mode.id === value ? styles.active : ""
                } ${!mode.available ? styles.disabled : ""}`}
                onClick={() => handleSelect(mode.id)}
                disabled={!mode.available}
              >
                <div className={styles.modeIcon}>{mode.icon}</div>
                <div className={styles.modeInfo}>
                  <div className={styles.modeName}>
                    {mode.name}
                    {!mode.available && (
                      <span className={styles.comingSoon}>Coming Soon</span>
                    )}
                  </div>
                  <div className={styles.modeDescription}>
                    {mode.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

