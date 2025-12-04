"use client";

import { Logo } from "@/components/ds";
import Link from "next/link";
import { Apple, Smartphone, Monitor, ChevronDown } from "lucide-react";
import { useState } from "react";
import styles from "./app.module.css";

// Version history - newest first
const macOSVersions = [
  { version: "0.1.0", arch: "x64", filename: "syns6_0.1.0_x64.dmg", date: "2024-12-04", current: true },
];

export default function AppDownloadPage() {
  const [showOlderVersions, setShowOlderVersions] = useState(false);
  const currentVersion = macOSVersions.find(v => v.current) || macOSVersions[0];
  const olderVersions = macOSVersions.filter(v => !v.current);

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <Link href="/" className={styles.logoLink}>
          <Logo />
        </Link>
        
        <h1 className={styles.title}>Get syns6</h1>
        <p className={styles.subtitle}>
          Experience music visualizations on your desktop
        </p>

        <div className={styles.platforms}>
          {/* macOS - Available */}
          <a 
            href={`/downloads/${currentVersion.filename}`}
            className={styles.platformCard}
            download
          >
            <div className={styles.platformIcon}>
              <Apple size={48} />
            </div>
            <div className={styles.platformInfo}>
              <h2 className={styles.platformName}>macOS</h2>
              <span className={styles.platformStatus}>v{currentVersion.version} • {currentVersion.arch}</span>
            </div>
            <div className={styles.downloadBadge}>
              Download
            </div>
          </a>
          
          {/* Older versions toggle */}
          {olderVersions.length > 0 && (
            <>
              <button 
                className={styles.olderVersionsToggle}
                onClick={() => setShowOlderVersions(!showOlderVersions)}
              >
                <span>Older versions</span>
                <ChevronDown 
                  size={16} 
                  className={`${styles.chevron} ${showOlderVersions ? styles.chevronOpen : ''}`} 
                />
              </button>
              
              {showOlderVersions && (
                <div className={styles.olderVersionsList}>
                  {olderVersions.map((v) => (
                    <a
                      key={v.filename}
                      href={`/downloads/${v.filename}`}
                      className={styles.olderVersionItem}
                      download
                    >
                      <span className={styles.versionNumber}>v{v.version}</span>
                      <span className={styles.versionArch}>{v.arch}</span>
                      <span className={styles.versionDate}>{v.date}</span>
                    </a>
                  ))}
                </div>
              )}
            </>
          )}

          {/* iOS - Coming Soon */}
          <div className={`${styles.platformCard} ${styles.disabled}`}>
            <div className={styles.platformIcon}>
              <Smartphone size={48} />
            </div>
            <div className={styles.platformInfo}>
              <h2 className={styles.platformName}>iOS</h2>
              <span className={styles.platformStatus}>iPhone & iPad</span>
            </div>
            <div className={styles.comingSoonBadge}>
              Coming Soon
            </div>
          </div>

          {/* Android - Coming Soon */}
          <div className={`${styles.platformCard} ${styles.disabled}`}>
            <div className={styles.platformIcon}>
              <Smartphone size={48} />
            </div>
            <div className={styles.platformInfo}>
              <h2 className={styles.platformName}>Android</h2>
              <span className={styles.platformStatus}>Phone & Tablet</span>
            </div>
            <div className={styles.comingSoonBadge}>
              Coming Soon
            </div>
          </div>

          {/* Windows - Coming Soon */}
          <div className={`${styles.platformCard} ${styles.disabled}`}>
            <div className={styles.platformIcon}>
              <Monitor size={48} />
            </div>
            <div className={styles.platformInfo}>
              <h2 className={styles.platformName}>Windows</h2>
              <span className={styles.platformStatus}>Desktop</span>
            </div>
            <div className={styles.comingSoonBadge}>
              Coming Soon
            </div>
          </div>
        </div>

        <p className={styles.note}>
          The desktop app includes exclusive features like Philips Hue integration.
        </p>
      </div>
    </div>
  );
}

