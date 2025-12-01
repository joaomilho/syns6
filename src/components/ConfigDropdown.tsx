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

export interface LavaLampControls {
  resolution: number;
  blobCount: number;
}

export interface FFTControls {
  neonIntensity: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
  lineWidth: number;
}

interface ConfigDropdownProps {
  mode: VisualizationMode;
  font: LyricsFont;
  color: LyricsColor;
  shaderControls: ShaderControls;
  lavaLampControls: LavaLampControls;
  fftControls: FFTControls;
  currentVisualization: string; // Current viz type to show relevant controls
  onModeChange: (mode: VisualizationMode) => void;
  onFontChange: (font: LyricsFont) => void;
  onColorChange: (color: LyricsColor) => void;
  onShaderControlsChange: (controls: ShaderControls) => void;
  onLavaLampControlsChange: (controls: LavaLampControls) => void;
  onFFTControlsChange: (controls: FFTControls) => void;
}

export default function ConfigDropdown({
  mode,
  font,
  color,
  shaderControls,
  lavaLampControls,
  fftControls,
  currentVisualization,
  onModeChange,
  onFontChange,
  onColorChange,
  onShaderControlsChange,
  onLavaLampControlsChange,
  onFFTControlsChange,
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

          {/* LavaLamp Config */}
          {currentVisualization === "lavalamp" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Lava Lamp</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Resolution
                    <span className={styles.sliderValue}>{lavaLampControls.resolution}</span>
                  </label>
                  <input
                    type="range"
                    min="16"
                    max="64"
                    step="8"
                    value={lavaLampControls.resolution}
                    onChange={(e) =>
                      onLavaLampControlsChange({
                        ...lavaLampControls,
                        resolution: parseInt(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Number of Blobs
                    <span className={styles.sliderValue}>{lavaLampControls.blobCount}</span>
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    step="1"
                    value={lavaLampControls.blobCount}
                    onChange={(e) =>
                      onLavaLampControlsChange({
                        ...lavaLampControls,
                        blobCount: parseInt(e.target.value),
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
                  onLavaLampControlsChange({
                    resolution: 32,
                    blobCount: 5,
                  });
                }}
              >
                Reset Settings
              </button>
            </>
          )}

          {/* FFT Config */}
          {currentVisualization === "fftspectrum" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>FFT Spectrum</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Neon Intensity
                    <span className={styles.sliderValue}>{fftControls.neonIntensity.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="4"
                    step="1"
                    value={[0, 0.4, 1.6, 3.2, 6.4].indexOf(fftControls.neonIntensity)}
                    onChange={(e) => {
                      const intensities = [0, 0.4, 1.6, 3.2, 6.4];
                      onFFTControlsChange({
                        ...fftControls,
                        neonIntensity: intensities[parseInt(e.target.value)],
                      });
                    }}
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Line Width
                    <span className={styles.sliderValue}>{Math.round(fftControls.lineWidth * 100)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={[0.01, 0.02, 0.04, 0.08, 0.16, 0.32].indexOf(fftControls.lineWidth)}
                    onChange={(e) => {
                      const widths = [0.01, 0.02, 0.04, 0.08, 0.16, 0.32];
                      onFFTControlsChange({
                        ...fftControls,
                        lineWidth: widths[parseInt(e.target.value)],
                      });
                    }}
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Color Palette
                  </label>
                  <div className={styles.colorList}>
                    <button
                      className={`${styles.colorOption} ${
                        fftControls.colorPalette === 'default' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onFFTControlsChange({
                          ...fftControls,
                          colorPalette: 'default',
                        })
                      }
                      title="Default"
                    >
                      <div
                        className={styles.colorSwatch}
                        style={{ background: 'linear-gradient(to right, rgb(255, 26, 77), rgb(255, 128, 0), rgb(51, 255, 204), rgb(77, 77, 255))' }}
                      />
                    </button>
                    <button
                      className={`${styles.colorOption} ${
                        fftControls.colorPalette === 'vaporwave' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onFFTControlsChange({
                          ...fftControls,
                          colorPalette: 'vaporwave',
                        })
                      }
                      title="Vaporwave"
                    >
                      <div
                        className={styles.colorSwatch}
                        style={{ background: 'linear-gradient(to right, rgb(255, 113, 206), rgb(186, 85, 211), rgb(64, 224, 208), rgb(138, 43, 226))' }}
                      />
                    </button>
                    <button
                      className={`${styles.colorOption} ${
                        fftControls.colorPalette === 'sunset' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onFFTControlsChange({
                          ...fftControls,
                          colorPalette: 'sunset',
                        })
                      }
                      title="Sunset"
                    >
                      <div
                        className={styles.colorSwatch}
                        style={{ background: 'linear-gradient(to right, rgb(255, 77, 0), rgb(255, 128, 179), rgb(204, 77, 255), rgb(153, 51, 255))' }}
                      />
                    </button>
                    <button
                      className={`${styles.colorOption} ${
                        fftControls.colorPalette === 'fire' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onFFTControlsChange({
                          ...fftControls,
                          colorPalette: 'fire',
                        })
                      }
                      title="Fire"
                    >
                      <div
                        className={styles.colorSwatch}
                        style={{ background: 'linear-gradient(to right, rgb(255, 255, 153), rgb(255, 165, 0), rgb(255, 69, 0), rgb(139, 0, 0))' }}
                      />
                    </button>
                    <button
                      className={`${styles.colorOption} ${
                        fftControls.colorPalette === 'neon' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onFFTControlsChange({
                          ...fftControls,
                          colorPalette: 'neon',
                        })
                      }
                      title="Neon"
                    >
                      <div
                        className={styles.colorSwatch}
                        style={{ background: 'linear-gradient(to right, rgb(255, 26, 204), rgb(204, 51, 255), rgb(51, 204, 255), rgb(26, 255, 255))' }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  onFFTControlsChange({
                    neonIntensity: 1.6,
                    colorPalette: 'default',
                    lineWidth: 0.04,
                  });
                }}
              >
                Reset Settings
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

