'use client';

import React from 'react';
import styles from './Toggle.module.css';

export interface ToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

export default function Toggle({
  checked,
  onChange,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <div className={styles.container}>
      <label className={`${styles.switch} ${disabled ? styles.disabled : ''}`}>
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className={styles.input}
        />
        <span className={styles.slider}></span>
      </label>
      {label && (
        <span className={styles.label}>
          {label}
        </span>
      )}
    </div>
  );
}













