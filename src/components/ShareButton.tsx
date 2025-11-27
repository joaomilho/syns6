"use client";

import styles from "./ShareButton.module.css";

interface ShareButtonProps {
  onStartSharing: () => void;
}

export default function ShareButton({ onStartSharing }: ShareButtonProps) {
  return (
    <div className={styles.container}>
      <button 
        className={styles.shareButton}
        onClick={onStartSharing}
        title="Start sharing your screen"
      >
        <span className={styles.icon}>⧉</span>
        <span className={styles.label}>Share</span>
      </button>
    </div>
  );
}

