"use client";

import { useState, useRef, useEffect } from "react";
import styles from "./TypographyDropdown.module.css";

export type LyricsFont = "Poppins" | "Inter" | "Montserrat";
export type LyricsColor = "#ff0" | "#0f6" | "#fff" | "#f06" | "#06f";

interface TypographyOption {
  font: LyricsFont;
  color: LyricsColor;
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

interface TypographyDropdownProps {
  font: LyricsFont;
  color: LyricsColor;
  onFontChange: (font: LyricsFont) => void;
  onColorChange: (color: LyricsColor) => void;
}

export default function TypographyDropdown({
  font,
  color,
  onFontChange,
  onColorChange,
}: TypographyDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentFont = fonts.find((f) => f.id === font);
  const currentColor = colors.find((c) => c.id === color);

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

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={styles.dropdownButton}
        onClick={() => setIsOpen(!isOpen)}
        title="Typography Settings"
      >
        <span className={styles.icon}>𝐓</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {/* Font Selection */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Font</div>
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
                  {fontOption.id === font && (
                    <span className={styles.checkmark}>✓</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Color Selection */}
          <div className={styles.section}>
            <div className={styles.sectionTitle}>Color</div>
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
        </div>
      )}
    </div>
  );
}

export function getFontPath(font: LyricsFont): string {
  const fontOption = fonts.find((f) => f.id === font);
  return fontOption?.path || fonts[0].path;
}

