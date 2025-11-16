"use client";

import { useHueLights } from "@/hooks/useHueLights";
import { useState } from "react";
import styles from "./HueControls.module.css";

export default function HueControls() {
  const {
    isConnected,
    isConnecting,
    error,
    bridges,
    lights,
    config,
    discover,
    connect,
    disconnect,
    selectLights,
  } = useHueLights();
  
  const [manualIp, setManualIp] = useState("");

  const handleConnect = async (bridgeIp: string) => {
    await connect(bridgeIp);
  };

  const handleManualConnect = async () => {
    if (manualIp.trim()) {
      await connect(manualIp.trim());
    }
  };

  const handleToggleLight = (lightId: string) => {
    if (!config) return;
    const selected = config.selectedLights.includes(lightId)
      ? config.selectedLights.filter((id) => id !== lightId)
      : [...config.selectedLights, lightId];
    selectLights(selected);
  };

  if (isConnected && config) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <h3>💡 Hue Connected</h3>
          <button onClick={disconnect} className={styles.disconnectBtn}>
            Disconnect
          </button>
        </div>

        <div className={styles.info}>
          <p>Bridge: {config.bridgeIp}</p>
          <p>{config.selectedLights.length} / {Object.keys(lights).length} lights</p>
        </div>
        
        <div className={styles.colorGuide}>
          <p className={styles.guideTitle}>🎨 Colors:</p>
          <div className={styles.guideGrid}>
            <div className={styles.guideItem}>
              <span style={{color: "#ff3300"}}>🔴</span> Bass
            </div>
            <div className={styles.guideItem}>
              <span style={{color: "#66ff00"}}>🟢</span> Mid
            </div>
            <div className={styles.guideItem}>
              <span style={{color: "#0099ff"}}>🔵</span> Treble
            </div>
            <div className={styles.guideItem}>
              <span style={{color: "#cc00ff"}}>🟣</span> Voice
            </div>
          </div>
        </div>

        <div className={styles.lightSelector}>
          <div className={styles.selectorHeader}>
            <span>Lights:</span>
            <div>
              <button onClick={() => selectLights(Object.keys(lights))} className={styles.selectBtn}>
                All
              </button>
              <button onClick={() => selectLights([])} className={styles.selectBtn}>
                None
              </button>
            </div>
          </div>

          <div className={styles.lightList}>
            {Object.entries(lights).map(([id, light]) => (
              <label key={id} className={styles.lightItem}>
                <input
                  type="checkbox"
                  checked={config.selectedLights.includes(id)}
                  onChange={() => handleToggleLight(id)}
                />
                <span className={styles.lightName}>{light.name}</span>
                <span className={light.state.reachable ? styles.reachable : styles.unreachable}>
                  {light.state.reachable ? "●" : "○"}
                </span>
              </label>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>💡 Connect Hue</h3>
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {bridges.length === 0 ? (
        <div className={styles.setup}>
          <p>Control your lights with music!</p>
          <button
            onClick={discover}
            disabled={isConnecting}
            className={styles.discoverBtn}
          >
            {isConnecting ? "Discovering..." : "🔍 Discover"}
          </button>
          
          <div className={styles.divider}>
            <span>OR</span>
          </div>
          
          <div className={styles.manualConnect}>
            <p className={styles.manualLabel}>Enter bridge IP:</p>
            <div className={styles.manualInputGroup}>
              <input
                type="text"
                placeholder="192.168.1.x"
                value={manualIp}
                onChange={(e) => setManualIp(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleManualConnect()}
                className={styles.ipInput}
              />
              <button
                onClick={handleManualConnect}
                disabled={isConnecting || !manualIp.trim()}
                className={styles.connectBtn}
              >
                {isConnecting ? "Connecting..." : "Connect"}
              </button>
            </div>
            <p className={styles.hint}>
              💡 Find IP in Hue app: Settings → Bridges → Network
            </p>
            <p className={styles.hint}>
              ⚠️ Press the bridge button before connecting!
            </p>
          </div>
        </div>
      ) : (
        <div className={styles.bridgeList}>
          <p>Found {bridges.length} bridge(s):</p>
          {bridges.map((bridge) => (
            <div key={bridge.id} className={styles.bridgeItem}>
              <div>
                <strong>{bridge.id}</strong>
                <br />
                <code>{bridge.internalipaddress}</code>
              </div>
              <button
                onClick={() => handleConnect(bridge.internalipaddress)}
                disabled={isConnecting}
                className={styles.connectBtn}
              >
                {isConnecting ? "..." : "Connect"}
              </button>
            </div>
          ))}
          <p className={styles.hint}>
            ⚠️ Press the button on your bridge!
          </p>
        </div>
      )}
    </div>
  );
}

