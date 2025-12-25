'use client';

import React from 'react';
import styles from './Button.module.css';

export type ButtonSize = 'small' | 'medium' | 'cta';
export type ButtonColor = 'green' | 'red' | 'white' | 'blue';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSize;
  color?: ButtonColor;
  children: React.ReactNode;
}

export default function Button({
  size = 'medium',
  color = 'green',
  className,
  children,
  ...props
}: ButtonProps) {
  const sizeClass = styles[`size-${size}`];
  const colorClass = styles[`color-${color}`];

  return (
    <button
      className={`${styles.button} ${sizeClass} ${colorClass} ${className || ''}`}
      {...props}
    >
      {children}
    </button>
  );
}

