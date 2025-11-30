"use client";

import { ReactNode } from "react";
import styles from "./IconButton.module.css";

export interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
  title?: string;
  className?: string;
  variant?: "default" | "playing" | "paused" | "stopped";
}

export default function IconButton({
  children,
  onClick,
  active = false,
  disabled = false,
  title,
  className = "",
  variant = "default",
}: IconButtonProps) {
  const variantClass = variant !== "default" ? styles[variant] : "";
  
  return (
    <button
      className={`${styles.iconButton} ${active ? styles.active : ""} ${variantClass} ${className}`}
      onClick={onClick}
      disabled={disabled}
      title={title}
    >
      {children}
    </button>
  );
}

