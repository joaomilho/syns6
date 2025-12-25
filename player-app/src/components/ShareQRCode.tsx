"use client";

import { useEffect, useState } from "react";
import { ScreenShare } from "lucide-react";
import QRCode from "react-qr-code";
import styles from "./ShareQRCode.module.css";

interface ShareQRCodeProps {
  peerId: string;
  connectedViewers: number;
  autoExpand?: boolean; // Auto-expand on first connect
  onDisconnect?: () => void; // Callback when host closes session
}

export default function ShareQRCode({ peerId, connectedViewers, autoExpand = false, onDisconnect }: ShareQRCodeProps) {
  const [shareUrl, setShareUrl] = useState<string>("");
  const [shareCode, setShareCode] = useState<string>("");
  const [shareBaseUrl, setShareBaseUrl] = useState<string>("");
  const [isExpanded, setIsExpanded] = useState(autoExpand);
  const [isClosing, setIsClosing] = useState(false);

  const handleDisconnect = async () => {
    if (!shareCode || isClosing) return;
    
    const confirmed = confirm("Close this sharing session? All viewers will be disconnected.");
    if (!confirmed) return;
    
    setIsClosing(true);
    
    try {
      const response = await fetch("/api/share/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: shareCode }),
      });
      
      if (response.ok) {
        console.log("✅ Session closed successfully");
        onDisconnect?.();
      } else {
        console.error("❌ Failed to close session");
        alert("Failed to close session. Please try again.");
      }
    } catch (error) {
      console.error("❌ Error closing session:", error);
      alert("Error closing session. Please try again.");
    } finally {
      setIsClosing(false);
    }
  };

  useEffect(() => {
    // peerId is now just the 6-digit code (e.g., "123456")
    setShareCode(peerId);
    
    // Full URL for QR code - use current origin (works for both local and production)
    const origin = window.location.origin;
    const url = `${origin}/share?host=${peerId}`;
    setShareUrl(url);
    setShareBaseUrl(`${origin}/share`);
    
    // Auto-expand if requested
    if (autoExpand) {
      setIsExpanded(true);
    }
  }, [peerId, autoExpand]);

  if (!shareUrl) return null;

  return (
    <div className={styles.container}>
      {/* Compact Badge */}
      <div 
        className={`${styles.badge} ${connectedViewers > 0 ? styles.active : ''}`}
        onClick={() => setIsExpanded(!isExpanded)}
        title={`Screen sharing: ${connectedViewers} ${connectedViewers === 1 ? 'viewer' : 'viewers'}`}
      >
        <ScreenShare size={16} className={styles.icon} />
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
              Visit <strong>{shareBaseUrl.replace(/^https?:\/\//, '')}</strong>
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

            {/* Disconnect Button */}
            <button
              className={styles.disconnectButton}
              onClick={handleDisconnect}
              disabled={isClosing}
              title="Close sharing session"
            >
              {isClosing ? "Closing..." : "End Sharing Session"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

