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
  globSize?: number;
  reactivity?: number;
}

export interface FFTControls {
  neonIntensity: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
  lineWidth: number;
}

export interface KaleidoscopeControls {
  mode: 'album' | 'video';
  rgbDistance: number;
  reactivity: number;
}

export interface OrbitalControls {
  intensity: number;
  numOrbits: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
  orbitDistance: number;
}

export interface WavyLinesControls {
  numLines: number;
  colorPalette: 'default' | 'neon' | 'sunset' | 'forest' | 'candy';
  particleCount: number;
}

export interface Spectrum3DControls {
  shape: 'circle' | 'row';
  neonIntensity: number;
  colorPalette: 'default' | 'vaporwave' | 'sunset' | 'fire' | 'neon';
}

export interface YouTubeControls {
  effect: 'none' | '3d-flip' | 'black-white' | 'glitch' | 'bloom';
}

interface ConfigDropdownProps {
  mode: VisualizationMode;
  font: LyricsFont;
  color: LyricsColor;
  shaderControls: ShaderControls;
  lavaLampControls: LavaLampControls;
  fftControls: FFTControls;
  kaleidoscopeControls: KaleidoscopeControls;
  orbitalControls: OrbitalControls;
  wavyLinesControls: WavyLinesControls;
  spectrum3DControls: Spectrum3DControls;
  youtubeControls: YouTubeControls;
  currentVisualization: string; // Current viz type to show relevant controls
  albumArt?: string; // For kaleidoscope thumbnails
  videoElement?: HTMLVideoElement | null; // For video thumbnail
  isCameraEnabled?: boolean; // To show/hide video option
  currentYouTubeUrl?: string | null; // Current YouTube video URL
  onModeChange: (mode: VisualizationMode) => void;
  onFontChange: (font: LyricsFont) => void;
  onColorChange: (color: LyricsColor) => void;
  onShaderControlsChange: (controls: ShaderControls) => void;
  onLavaLampControlsChange: (controls: LavaLampControls) => void;
  onFFTControlsChange: (controls: FFTControls) => void;
  onKaleidoscopeControlsChange: (controls: KaleidoscopeControls) => void;
  onOrbitalControlsChange: (controls: OrbitalControls) => void;
  onWavyLinesControlsChange: (controls: WavyLinesControls) => void;
  onSpectrum3DControlsChange: (controls: Spectrum3DControls) => void;
  onYouTubeControlsChange: (controls: YouTubeControls) => void;
}

export default function ConfigDropdown({
  mode,
  font,
  color,
  shaderControls,
  lavaLampControls,
  fftControls,
  kaleidoscopeControls,
  orbitalControls,
  wavyLinesControls,
  spectrum3DControls,
  youtubeControls,
  currentVisualization,
  albumArt,
  videoElement,
  isCameraEnabled,
  currentYouTubeUrl,
  onModeChange,
  onFontChange,
  onColorChange,
  onShaderControlsChange,
  onLavaLampControlsChange,
  onFFTControlsChange,
  onKaleidoscopeControlsChange,
  onOrbitalControlsChange,
  onWavyLinesControlsChange,
  onSpectrum3DControlsChange,
  onYouTubeControlsChange,
}: ConfigDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const videoCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [videoThumbnail, setVideoThumbnail] = useState<string | null>(null);
  
  // Update video thumbnail periodically when camera is enabled
  useEffect(() => {
    if (!isCameraEnabled || !videoElement || videoElement.readyState < videoElement.HAVE_CURRENT_DATA) {
      setVideoThumbnail(null);
      return;
    }
    
    const updateThumbnail = () => {
      if (!videoCanvasRef.current) {
        videoCanvasRef.current = document.createElement('canvas');
        videoCanvasRef.current.width = 80;
        videoCanvasRef.current.height = 80;
      }
      
      const canvas = videoCanvasRef.current;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        setVideoThumbnail(canvas.toDataURL());
      }
    };
    
    // Update thumbnail every 200ms
    updateThumbnail();
    const interval = setInterval(updateThumbnail, 200);
    return () => clearInterval(interval);
  }, [isCameraEnabled, videoElement]);

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
          {currentVisualization === "animated" && (
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
                    min="0"
                    max="5"
                    step="1"
                    value={[6, 12, 18, 24, 36, 62].indexOf(lavaLampControls.blobCount)}
                    onChange={(e) => {
                      const counts = [6, 12, 18, 24, 36, 62];
                      onLavaLampControlsChange({
                        ...lavaLampControls,
                        blobCount: counts[parseInt(e.target.value)],
                      });
                    }}
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Glob Size
                    <span className={styles.sliderValue}>{(lavaLampControls.globSize ?? 0.8).toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="15"
                    step="1"
                    value={[0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6].indexOf(lavaLampControls.globSize ?? 0.8)}
                    onChange={(e) => {
                      const sizes = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.1, 1.2, 1.3, 1.4, 1.5, 1.6];
                      onLavaLampControlsChange({
                        ...lavaLampControls,
                        globSize: sizes[parseInt(e.target.value)],
                      });
                    }}
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Reactivity
                    <span className={styles.sliderValue}>{(lavaLampControls.reactivity ?? 1.0).toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.2"
                    max="2"
                    step="0.2"
                    value={lavaLampControls.reactivity ?? 1.0}
                    onChange={(e) =>
                      onLavaLampControlsChange({
                        ...lavaLampControls,
                        reactivity: parseFloat(e.target.value),
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
                    blobCount: 18,
                    globSize: 0.8,
                    reactivity: 1.0,
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
                    max="3"
                    step="1"
                    value={[0, 0.4, 1.6, 3.2].indexOf(fftControls.neonIntensity)}
                    onChange={(e) => {
                      const intensities = [0, 0.4, 1.6, 3.2];
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
                    max="4"
                    step="1"
                    value={[0.01, 0.02, 0.04, 0.08, 0.16].indexOf(fftControls.lineWidth)}
                    onChange={(e) => {
                      const widths = [0.01, 0.02, 0.04, 0.08, 0.16];
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

          {/* Kaleidoscope Config */}
          {currentVisualization === "kaleidoscope" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Kaleidoscope</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Mode
                  </label>
                  <div className={styles.colorList}>
                    <button
                      className={`${styles.modeOption} ${
                        kaleidoscopeControls.mode === 'album' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onKaleidoscopeControlsChange({
                          ...kaleidoscopeControls,
                          mode: 'album',
                        })
                      }
                      title="Album Cover"
                    >
                      <div className={styles.colorSwatch}>
                        {albumArt ? (
                          <img src={albumArt} alt="Album" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#333', borderRadius: '7px' }} />
                        )}
                      </div>
                    </button>
                    <button
                      className={`${styles.modeOption} ${
                        kaleidoscopeControls.mode === 'video' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onKaleidoscopeControlsChange({
                          ...kaleidoscopeControls,
                          mode: 'video',
                        })
                      }
                      title="Video"
                      disabled={!isCameraEnabled}
                      style={{ opacity: !isCameraEnabled ? 0.5 : 1, cursor: !isCameraEnabled ? 'not-allowed' : 'pointer' }}
                    >
                      <div className={styles.colorSwatch}>
                        {isCameraEnabled && videoThumbnail ? (
                          <img src={videoThumbnail} alt="Video" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '7px' }} />
                        ) : (
                          <div style={{ width: '100%', height: '100%', background: '#222', borderRadius: '7px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px' }}>📹</div>
                        )}
                      </div>
                    </button>
                  </div>
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    RGB Distance
                    <span className={styles.sliderValue}>{kaleidoscopeControls.rgbDistance.toFixed(2)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="0.3"
                    step="0.01"
                    value={kaleidoscopeControls.rgbDistance}
                    onChange={(e) =>
                      onKaleidoscopeControlsChange({
                        ...kaleidoscopeControls,
                        rgbDistance: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Reactivity
                    <span className={styles.sliderValue}>{kaleidoscopeControls.reactivity.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="3"
                    step="0.1"
                    value={kaleidoscopeControls.reactivity}
                    onChange={(e) =>
                      onKaleidoscopeControlsChange({
                        ...kaleidoscopeControls,
                        reactivity: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>
              </div>

              {!isCameraEnabled && kaleidoscopeControls.mode === 'video' && (
                <div style={{ 
                  padding: '8px 12px', 
                  background: 'rgba(255, 165, 0, 0.1)', 
                  border: '1px solid rgba(255, 165, 0, 0.3)', 
                  borderRadius: '8px', 
                  fontSize: '11px', 
                  color: 'rgba(255, 165, 0, 0.9)',
                  marginTop: '12px'
                }}>
                  ⚠️ Enable camera to use video mode
                </div>
              )}

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  onKaleidoscopeControlsChange({
                    mode: 'album',
                    rgbDistance: 0.1,
                    reactivity: 1.0,
                  });
                }}
              >
                Reset Settings
              </button>
            </>
          )}

          {/* Orbital (Particles & Rings) Config */}
          {currentVisualization === "particles" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Particles & Rings</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Shake Intensity
                    <span className={styles.sliderValue}>{orbitalControls.intensity.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={orbitalControls.intensity}
                    onChange={(e) =>
                      onOrbitalControlsChange({
                        ...orbitalControls,
                        intensity: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Number of Orbits
                    <span className={styles.sliderValue}>{orbitalControls.numOrbits}</span>
                  </label>
                  <input
                    type="range"
                    min="4"
                    max="24"
                    step="2"
                    value={orbitalControls.numOrbits}
                    onChange={(e) =>
                      onOrbitalControlsChange({
                        ...orbitalControls,
                        numOrbits: parseInt(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Orbit Distance
                    <span className={styles.sliderValue}>{orbitalControls.orbitDistance.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={orbitalControls.orbitDistance}
                    onChange={(e) =>
                      onOrbitalControlsChange({
                        ...orbitalControls,
                        orbitDistance: parseFloat(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Color Palette
                  </label>
                  <div className={styles.colorList}>
                    {[
                      { id: 'default' as const, gradient: 'linear-gradient(90deg, #6666ff, #ff00ff, #ff6666, #ffff66)' },
                      { id: 'vaporwave' as const, gradient: 'linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff)' },
                      { id: 'sunset' as const, gradient: 'linear-gradient(90deg, #ff6b6b, #ee5a6f, #f9ca24, #f0932b)' },
                      { id: 'fire' as const, gradient: 'linear-gradient(90deg, #ff0000, #ff4500, #ffa500, #ffff00)' },
                      { id: 'neon' as const, gradient: 'linear-gradient(90deg, #00ff00, #00ffff, #ff00ff, #ffff00)' },
                    ].map((palette) => (
                      <button
                        key={palette.id}
                        className={`${styles.colorOption} ${
                          orbitalControls.colorPalette === palette.id ? styles.active : ""
                        }`}
                        onClick={() =>
                          onOrbitalControlsChange({
                            ...orbitalControls,
                            colorPalette: palette.id,
                          })
                        }
                        title={palette.id}
                      >
                        <div className={styles.colorSwatch} style={{ background: palette.gradient }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  onOrbitalControlsChange({
                    intensity: 2.0,
                    numOrbits: 16,
                    colorPalette: 'default',
                    orbitDistance: 1.5,
                  });
                }}
              >
                Reset Settings
              </button>
            </>
          )}

          {/* Wavy Lines Config */}
          {currentVisualization === "waves" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>Wavy Lines</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Lines per Instrument
                    <span className={styles.sliderValue}>{wavyLinesControls.numLines}</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    step="5"
                    value={wavyLinesControls.numLines}
                    onChange={(e) =>
                      onWavyLinesControlsChange({
                        ...wavyLinesControls,
                        numLines: parseInt(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Particle Count
                    <span className={styles.sliderValue}>{wavyLinesControls.particleCount}</span>
                  </label>
                  <input
                    type="range"
                    min="100"
                    max="1000"
                    step="50"
                    value={wavyLinesControls.particleCount}
                    onChange={(e) =>
                      onWavyLinesControlsChange({
                        ...wavyLinesControls,
                        particleCount: parseInt(e.target.value),
                      })
                    }
                    className={styles.slider}
                  />
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Color Palette
                  </label>
                  <div className={styles.colorList}>
                    {[
                      { id: 'default' as const, colors: ['#6666ff', '#ff0000', '#5959dd', '#ffaa00'], label: 'Original' },
                      { id: 'neon' as const, colors: ['#6666ff', '#ff00ff', '#00ffff', '#ffff00'], label: 'Neon' },
                      { id: 'sunset' as const, colors: ['#6666ff', '#ff9955', '#ffe44d', '#ff6655'], label: 'Sunset' },
                      { id: 'forest' as const, colors: ['#6666ff', '#4dcc4d', '#66ff99', '#66ffaa'], label: 'Forest' },
                      { id: 'candy' as const, colors: ['#6666ff', '#ff71ce', '#00eeff', '#ffcc44'], label: 'Candy' },
                    ].map((palette) => (
                      <button
                        key={palette.id}
                        className={`${styles.colorOption} ${
                          wavyLinesControls.colorPalette === palette.id ? styles.active : ""
                        }`}
                        onClick={() =>
                          onWavyLinesControlsChange({
                            ...wavyLinesControls,
                            colorPalette: palette.id,
                          })
                        }
                        title={palette.label}
                      >
                        <div className={styles.colorSwatch} style={{ 
                          background: `linear-gradient(90deg, ${palette.colors.join(', ')})` 
                        }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  onWavyLinesControlsChange({
                    numLines: 60,
                    colorPalette: 'default',
                    particleCount: 500,
                  });
                }}
              >
                Reset Settings
              </button>
            </>
          )}

          {/* 3D Spectrum Config */}
          {currentVisualization === "spectrum3d" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>3D Spectrum</div>
                
                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Shape
                  </label>
                  <div className={styles.optionList}>
                    <button
                      className={`${styles.option} ${
                        spectrum3DControls.shape === 'circle' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onSpectrum3DControlsChange({
                          ...spectrum3DControls,
                          shape: 'circle',
                        })
                      }
                    >
                      <span className={styles.optionName}>Circle</span>
                    </button>
                    <button
                      className={`${styles.option} ${
                        spectrum3DControls.shape === 'row' ? styles.active : ""
                      }`}
                      onClick={() =>
                        onSpectrum3DControlsChange({
                          ...spectrum3DControls,
                          shape: 'row',
                        })
                      }
                    >
                      <span className={styles.optionName}>Row</span>
                    </button>
                  </div>
                </div>

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Neon Intensity
                    <span className={styles.sliderValue}>{spectrum3DControls.neonIntensity.toFixed(1)}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    step="1"
                    value={[0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0].indexOf(spectrum3DControls.neonIntensity)}
                    onChange={(e) => {
                      const intensities = [0, 0.2, 0.4, 0.6, 0.8, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0];
                      onSpectrum3DControlsChange({
                        ...spectrum3DControls,
                        neonIntensity: intensities[parseInt(e.target.value)],
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
                    {[
                      { id: 'default' as const, gradient: 'linear-gradient(90deg, #ff3333, #ff9933, #00ff88, #5588ff)' },
                      { id: 'vaporwave' as const, gradient: 'linear-gradient(90deg, #ff71ce, #01cdfe, #05ffa1, #b967ff)' },
                      { id: 'sunset' as const, gradient: 'linear-gradient(90deg, #ff6b6b, #ee5a6f, #f9ca24, #f0932b)' },
                      { id: 'fire' as const, gradient: 'linear-gradient(90deg, #ff0000, #ff4500, #ffa500, #ffff00)' },
                      { id: 'neon' as const, gradient: 'linear-gradient(90deg, #00ff00, #00ffff, #ff00ff, #ffff00)' },
                    ].map((palette) => (
                      <button
                        key={palette.id}
                        className={`${styles.colorOption} ${
                          spectrum3DControls.colorPalette === palette.id ? styles.active : ""
                        }`}
                        onClick={() =>
                          onSpectrum3DControlsChange({
                            ...spectrum3DControls,
                            colorPalette: palette.id,
                          })
                        }
                        title={palette.id}
                      >
                        <div className={styles.colorSwatch} style={{ background: palette.gradient }} />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                onClick={() => {
                  onSpectrum3DControlsChange({
                    shape: 'circle',
                    neonIntensity: 1.0,
                    colorPalette: 'default',
                  });
                }}
              >
                Reset Settings
              </button>
            </>
          )}

          {/* YouTube Config */}
          {currentVisualization === "youtube" && (
            <>
              {/* Divider */}
              <div className={styles.divider} />

              <div className={styles.section}>
                <div className={styles.sectionTitle}>YouTube</div>
                
                {/* Current URL */}
                {currentYouTubeUrl && (
                  <div className={styles.sliderControl}>
                    <label className={styles.sliderLabel}>
                      Current Video
                    </label>
                    <a 
                      href={currentYouTubeUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      style={{
                        color: '#00ff88',
                        fontSize: '13px',
                        textDecoration: 'none',
                        wordBreak: 'break-all',
                        display: 'block',
                        padding: '8px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
                        marginTop: '4px',
                      }}
                    >
                      {currentYouTubeUrl}
                    </a>
                  </div>
                )}

                <div className={styles.sliderControl}>
                  <label className={styles.sliderLabel}>
                    Visual Effect
                  </label>
                  <div className={styles.optionList}>
                    {[
                      { id: 'none', name: 'None' },
                      { id: '3d-flip', name: '3D Flip' },
                      { id: 'black-white', name: 'Black & White' },
                      { id: 'glitch', name: 'Glitch' },
                      { id: 'bloom', name: 'Bloom' },
                    ].map((effect) => (
                      <button
                        key={effect.id}
                        className={`${styles.option} ${
                          youtubeControls.effect === effect.id ? styles.active : ""
                        }`}
                        onClick={() =>
                          onYouTubeControlsChange({
                            ...youtubeControls,
                            effect: effect.id as any,
                          })
                        }
                      >
                        <span className={styles.optionName}>{effect.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reset Button */}
              <button
                className={styles.resetButton}
                        onClick={() => {
                          onYouTubeControlsChange({
                            effect: 'none',
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

