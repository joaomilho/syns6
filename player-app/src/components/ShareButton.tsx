"use client";

import { ScreenShare } from "lucide-react";
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
        <ScreenShare size={16} className={styles.icon} />
        <span className={styles.label}>Share</span>
      </button>
    </div>
  );
}

