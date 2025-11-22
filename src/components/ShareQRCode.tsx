"use client";

import { useEffect, useState } from "react";
import QRCode from "react-qr-code";
import styles from "./ShareQRCode.module.css";

interface ShareQRCodeProps {
  peerId: string;
  connectedViewers: number;
}

export default function ShareQRCode({ peerId, connectedViewers }: ShareQRCodeProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Simple: just use current origin (works for deployed app)
    const url = `${window.location.origin}/share?host=${peerId}`;
    setShareUrl(url);
  }, [peerId]);

  if (!shareUrl) return null;

  return (
    <div className={styles.container}>
      {/* Compact Badge */}
      <div 
        className={styles.badge}
        onClick={() => setIsExpanded(!isExpanded)}
        title="Click to show QR code"
      >
        <span className={styles.icon}>📱</span>
        <span className={styles.count}>{connectedViewers}</span>
      </div>

      {/* Expanded QR Code */}
      {isExpanded && (
        <div className={styles.expandedPanel}>
          <div className={styles.header}>
            <h3>Share Screen</h3>
            <button 
              className={styles.closeButton}
              onClick={() => setIsExpanded(false)}
            >
              ✕
            </button>
          </div>

          <div className={styles.qrContainer}>
            <QRCode 
              value={shareUrl}
              size={200}
              bgColor="#000000"
              fgColor="#ffffff"
              level="M"
            />
          </div>

          <div className={styles.info}>
            <p className={styles.instruction}>
              Scan to view this screen on another device
            </p>
            <div className={styles.urlContainer}>
              <input 
                type="text" 
                value={shareUrl}
                readOnly
                className={styles.urlInput}
                onClick={(e) => e.currentTarget.select()}
              />
              <button 
                className={styles.copyButton}
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  alert("Link copied! 📋");
                }}
              >
                📋
              </button>
            </div>
            <div className={styles.viewers}>
              <span className={styles.viewersIcon}>👀</span>
              <span className={styles.viewersText}>
                {connectedViewers} {connectedViewers === 1 ? "viewer" : "viewers"} connected
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

