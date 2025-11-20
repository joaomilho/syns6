"use client";

import Link from "next/link";
import styles from "./create-visualization.module.css";

export default function CreateVisualizationPage() {
  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.icon}>◨</div>
        <h1 className={styles.title}>Create Your Own Visualization</h1>
        <p className={styles.description}>
          This feature is coming soon! You'll be able to create custom
          visualizations using our powerful visual editor.
        </p>
        <div className={styles.features}>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>◐</span>
            <span className={styles.featureText}>Visual Effects Editor</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>♫</span>
            <span className={styles.featureText}>Audio Reactive Controls</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>◫</span>
            <span className={styles.featureText}>Save & Share Presets</span>
          </div>
          <div className={styles.feature}>
            <span className={styles.featureIcon}>◭</span>
            <span className={styles.featureText}>Custom Color Palettes</span>
          </div>
        </div>
        <Link href="/player" className={styles.backButton}>
          ← Back to Player
        </Link>
      </div>
    </div>
  );
}

