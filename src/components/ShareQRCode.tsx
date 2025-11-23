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
  const [shareCode, setShareCode] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    // Extract 6-digit code from peer ID (format: syns-123456)
    const code = peerId.replace('syns-', '');
    setShareCode(code);
    
    // Full URL for QR code
    const url = `${window.location.origin}/share?host=${peerId}`;
    setShareUrl(url);
  }, [peerId]);

  if (!shareUrl) return null;

  return (
    <div className={styles.container}>
      {/* Compact Badge */}
      <div 
        className={`${styles.badge} ${connectedViewers > 0 ? styles.active : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={`Screen sharing: ${connectedViewers} ${connectedViewers === 1 ? 'viewer' : 'viewers'}`}
      >
        <span className={styles.icon}>⧉</span>
        <span className={styles.shareCode}>{shareCode}</span>
        <span className={styles.viewerCount}>{connectedViewers}</span>
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

          <div className={styles.info}>
            <div 
              className={styles.codeDisplay}
              onClick={() => {
                navigator.clipboard.writeText(shareCode);
                alert("Code copied! 📋");
              }}
              title="Click to copy code"
            >
              <div className={styles.code}>{shareCode}</div>
            </div>
            
            {connectedViewers > 0 && (
              <div className={styles.viewers}>
                <span className={styles.viewersIcon}>👀</span>
                <span className={styles.viewersText}>
                  {connectedViewers} {connectedViewers === 1 ? "viewer" : "viewers"} connected
                </span>
              </div>
            )}
            
            <p className={styles.instruction}>
              Visit <strong>syns6.com/share</strong>
            </p>
            
            <div className={styles.qrContainer}>
              <QRCode 
                value={shareUrl}
                size={200}
                bgColor="#000000"
                fgColor="#ffffff"
                level="M"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

