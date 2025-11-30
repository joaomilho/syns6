"use client";

import { useState, useRef, useEffect } from "react";
import { Settings, Play, Shuffle, Wand2, Star } from "lucide-react";
import styles from "./ConfigDropdown.module.css";

// Re-export types from the original components
export type VisualizationMode = "STATIC" | "RANDOM" | "BEST_FOR_SONG" | "MY_FAVORITES";
export type LyricsFont = "Poppins" | "Inter" | "Montserrat";
export type LyricsColor = "#ff0" | "#0f6" | "#fff" | "#f06" | "#06f";

interface ModeOption {
  id: VisualizationMode;
  name: string;
  description: string;
  icon: React.ReactNode;
  available: boolean;
}

interface FontOption {
  id: LyricsFont;
  name: string;
  path: string;
}

interface ColorOption {
  id: LyricsColor;
  name: string;
  hex: string;
}

const modes: ModeOption[] = [
  {
    id: "STATIC",
    name: "Static",
    description: "Visualization never changes",
    icon: <Play size={20} />,
    available: true,
  },
  {
    id: "RANDOM",
    name: "Random",
    description: "New visualization for each song",
    icon: <Shuffle size={20} />,
    available: true,
  },
  {
    id: "BEST_FOR_SONG",
    name: "AI",
    description: "AI picks visualization for each song",
    icon: <Wand2 size={20} />,
    available: false,
  },
  {
    id: "MY_FAVORITES",
    name: "Faves",
    description: "Rotate through your favorite visualizations",
    icon: <Star size={20} fill="currentColor" />,
    available: false,
  },
];

const fonts: FontOption[] = [
  {
    id: "Poppins",
    name: "Poppins",
    path: "/fonts/Poppins/Poppins-Bold.ttf",
  },
  {
    id: "Inter",
    name: "Inter",
    path: "/fonts/Inter/static/Inter_24pt-Bold.ttf",
  },
  {
    id: "Montserrat",
    name: "Montserrat",
    path: "/fonts/Montserrat/static/Montserrat-Bold.ttf",
  },
];

const colors: ColorOption[] = [
  {
    id: "#ff0",
    name: "Yellow",
    hex: "#ffff00",
  },
  {
    id: "#0f6",
    name: "Green",
    hex: "#00ff66",
  },
  {
    id: "#fff",
    name: "White",
    hex: "#ffffff",
  },
  {
    id: "#f06",
    name: "Pink",
    hex: "#ff0066",
  },
  {
    id: "#06f",
    name: "Blue",
    hex: "#0066ff",
  },
];

export interface ShaderControls {
  rgbSplit: number;
  distortion: number;
  colorShift: number;
}

interface ConfigDropdownProps {
  mode: VisualizationMode;
  font: LyricsFont;
  color: LyricsColor;
  shaderControls: ShaderControls;
  currentVisualization: string; // Current viz type to show relevant controls
  onModeChange: (mode: VisualizationMode) => void;
  onFontChange: (font: LyricsFont) => void;
  onColorChange: (color: LyricsColor) => void;
  onShaderControlsChange: (controls: ShaderControls) => void;
}

export default function ConfigDropdown({
  mode,
  font,
  color,
  shaderControls,
  currentVisualization,
  onModeChange,
  onFontChange,
  onColorChange,
  onShaderControlsChange,
}: ConfigDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

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

  const handleModeSelect = (modeId: VisualizationMode) => {
    const modeOption = modes.find((m) => m.id === modeId);
    if (modeOption?.available) {
      onModeChange(modeId);
    }
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Configuration"
      >
        <Settings size={20} className={styles.icon} />
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {/* Mode Selection */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Visualization Mode</div>
            <div className={styles.modeList}>
              {modes.map((modeOption) => {
                const isSelected = modeOption.id === mode;
                return (
                  <button
                    key={modeOption.id}
                    className={`${styles.modeOption} ${
                      isSelected ? styles.active : ""
                    } ${!modeOption.available ? styles.disabled : ""}`}
                    onClick={() => handleModeSelect(modeOption.id)}
                    disabled={!modeOption.available}
                  >
                    {!modeOption.available && (
                      <div className={styles.comingSoonBadge}>Coming Soon</div>
                    )}
                    <div className={styles.modeIcon}>{modeOption.icon}</div>
                    <div className={styles.modeTitle}>{modeOption.name}</div>
                  </button>
                );
              })}
            </div>
            {/* Selected mode description below icons */}
            {modes.find((m) => m.id === mode) && (
              <div className={styles.modeDescription}>
                {modes.find((m) => m.id === mode)?.description}
              </div>
            )}
          </div>

          {/* Divider */}
          <div className={styles.divider} />

          {/* Font Selection */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Lyrics</div>
            <div className={styles.optionList}>
              {fonts.map((fontOption) => (
                <button
                  key={fontOption.id}
                  className={`${styles.option} ${
                    fontOption.id === font ? styles.active : ""
                  }`}
                  onClick={() => {
                    onFontChange(fontOption.id);
                  }}
                >
                  <span className={styles.optionName}>{fontOption.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className={styles.section}>
            <div className={styles.colorList}>
              {colors.map((colorOption) => (
                <button
                  key={colorOption.id}
                  className={`${styles.colorOption} ${
                    colorOption.id === color ? styles.active : ""
                  }`}
                  onClick={() => {
                    onColorChange(colorOption.id);
                  }}
                  title={colorOption.name}
                >
                  <div
                    className={styles.colorSwatch}
                    style={{ backgroundColor: colorOption.hex }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Visualization Config - only show for visualizations with config */}
          {currentVisualization === "camera" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Camera Effects</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    RGB Split
                    <span className={styles.sliderValue}>{shaderControls.rgbSplit.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.05"
                    step="0.001"
                    value={shaderControls.rgbSplit}
                    onChange={(e) =>
                      onShaderControlsChange({
                        ...shaderControls,
                        rgbSplit: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Distortion
                    <span className={styles.sliderValue}>{shaderControls.distortion.toFixed(3)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.1"
                    step="0.001"
                    value={shaderControls.distortion}
                    onChange={(e) =>
                      onShaderControlsChange({
                        ...shaderControls,
                        distortion: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Color Shift
                    <span className={styles.sliderValue}>{shaderControls.colorShift.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={shaderControls.colorShift}
                    onChange={(e) =>
                      onShaderControlsChange({
                        ...shaderControls,
                        colorShift: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  // Reset shader controls
                  onShaderControlsChange({
                    rgbSplit: 0.01,
                    distortion: 0.02,
                    colorShift: 0.5,
                  });
                }}
              >
                Reset Effects
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function getFontPath(font: LyricsFont): string {
  const fontOption = fonts.find((f) => f.id === font);
  return fontOption?.path || fonts[0].path;
}

