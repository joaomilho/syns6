"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./VisualizationDropdown.module.css";
import { CustomVisualization } from "@/lib/customVisualizations";

export type VisualizationType =
  | "particles"
  | "fractal"
  | "psychedelic"
  | "youtube"
  | "waves"
  | "blackmetal"
  | "animated"
  | "spectrum3d"
  | "wavespectrum"
  | "fftspectrum"
  | "camera"
  | "debug"
  | string; // Allow custom IDs

interface VisualizationOption {
  id: VisualizationType;
  name: string;
  icon: string;
  thumbnail: string; // SVG or emoji representation
}

const visualizations: VisualizationOption[] = [
  {
    id: "fftspectrum",
    name: "FFT Spectrum Grid",
    icon: "▥",
    thumbnail: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  {
    id: "particles",
    name: "Particles & Rings",
    icon: "◯",
    thumbnail: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  },
  {
    id: "fractal",
    name: "Fractal Tree",
    icon: "❋",
    thumbnail: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  },
  {
    id: "psychedelic",
    name: "Psychedelic",
    icon: "✧",
    thumbnail: "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  },
  {
    id: "waves",
    name: "Wavy Lines",
    icon: "≋",
    thumbnail: "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
  },
  {
    id: "animated",
    name: "Morphing Blobs",
    icon: "◉",
    thumbnail: "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)",
  },
  {
    id: "spectrum3d",
    name: "3D Spectrum",
    icon: "▦",
    thumbnail: "linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)",
  },
  {
    id: "wavespectrum",
    name: "Wave Spectrum",
    icon: "▬",
    thumbnail: "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)",
  },
  {
    id: "camera",
    name: "Camera Effects",
    icon: "⊡",
    thumbnail: "linear-gradient(135deg, #ff6e7f 0%, #bfe9ff 100%)",
  },
  {
    id: "youtube",
    name: "YouTube Videos",
    icon: "▶",
    thumbnail: "linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)",
  },
  {
    id: "debug",
    name: "Debug View",
    icon: "▤",
    thumbnail: "linear-gradient(135deg, #434343 0%, #000000 100%)",
  },
];

interface VisualizationDropdownProps {
  value: VisualizationType;
  onChange: (value: VisualizationType) => void;
  customVisualizations?: CustomVisualization[];
  onCreateNew: () => void;
}

export default function VisualizationDropdown({
  value,
  onChange,
  customVisualizations = [],
  onCreateNew,
}: VisualizationDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentViz = visualizations.find((v) => v.id === value);
  const currentCustom = customVisualizations.find((v) => v.id === value);

  // Debug: Log when custom visualizations change
  useEffect(() => {
    console.log('🎨 Dropdown received custom visualizations:', customVisualizations.length);
  }, [customVisualizations]);

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

  const handleSelect = (vizId: VisualizationType) => {
    onChange(vizId);
    setIsOpen(false);
  };

  const handleCreateOwn = () => {
    setIsOpen(false);
    onCreateNew();
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Select Visualization"
      >
        <span className={styles.icon}>
          {currentCustom?.icon || currentViz?.icon || "◯"}
        </span>
        <span className={styles.label}>
          {currentCustom?.name || currentViz?.name || "Custom"}
        </span>
        <span className={styles.arrow}>{isOpen ? "▲" : "▼"}</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          <div className={styles.menuHeader}>Select Visualization</div>
          
          {/* Built-in Visualizations */}
          <div className={styles.visualizationGrid}>
            {visualizations.map((viz) => (
              <button
                key={viz.id}
                className={`${styles.vizOption} ${
                  viz.id === value ? styles.active : ""
                }`}
                onClick={() => handleSelect(viz.id)}
              >
                <div
                  className={styles.thumbnail}
                  style={{ background: viz.thumbnail }}
                >
                  <span className={styles.thumbnailIcon}>{viz.icon}</span>
                </div>
                <span className={styles.vizName}>{viz.name}</span>
              </button>
            ))}
          </div>

          {/* Custom Visualizations */}
          {customVisualizations.length > 0 && (
            <>
              <div className={styles.menuHeader} style={{ marginTop: "16px" }}>
                Your Creations
              </div>
              <div className={styles.visualizationGrid}>
                {customVisualizations.map((viz) => (
                  <button
                    key={viz.id}
                    className={`${styles.vizOption} ${
                      viz.id === value ? styles.active : ""
                    } ${styles.customViz}`}
                    onClick={() => handleSelect(viz.id as VisualizationType)}
                  >
                    <div
                      className={styles.thumbnail}
                      style={{
                        background:
                          viz.thumbnail ||
                          "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                      }}
                    >
                      <span className={styles.thumbnailIcon}>
                        {viz.icon || "✨"}
                      </span>
                    </div>
                    <span className={styles.vizName}>{viz.name}</span>
                  </button>
                ))}
              </div>
            </>
          )}

          <button className={styles.createButton} onClick={handleCreateOwn}>
            <span className={styles.createIcon}>+</span>
            <span>CREATE YOUR OWN VISUALIZATION</span>
          </button>
        </div>
      )}
    </div>
  );
}

