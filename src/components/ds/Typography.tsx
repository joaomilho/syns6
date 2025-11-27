'use client';

import React from 'react';
import styles from './Typography.module.css';

export interface H1Props extends React.HTMLAttributes<HTMLHeadingElement> {
  children: React.ReactNode;
}

export function H1({ children, className, ...props }: H1Props) {
  return (
    <h1 className={`${styles.h1} ${className || ''}`} {...props}>
      {children}
    </h1>
  );
}

