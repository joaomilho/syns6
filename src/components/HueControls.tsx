"use client";

import { HueConnection } from "@/hooks/useHueLights";
import { useState } from "react";
import styles from "./HueControls.module.css";

interface HueControlsProps {
  hue: HueConnection;
}

export default function HueControls({ hue }: HueControlsProps) {
  const {
    isConnected,
    isConnecting,
    isActive,
    error,
    bridges,
    lights,
    config,
    discover,
    connect,
    disconnect,
    selectLights,
    setActive,
  } = hue;
  
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

        <div className={styles.activeToggle}>
          <button 
            onClick={() => setActive(!isActive)}
            className={`${styles.activeBtn} ${isActive ? styles.activeOn : styles.activeOff}`}
          >
            {isActive ? "🟢 Active" : "⚫ Inactive"}
          </button>
          <p className={styles.activeHelp}>
            {isActive ? "Lights are reacting to music" : "Click to activate lights"}
          </p>
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
              <div key={id} className={styles.lightItem}>
                <input
                  type="checkbox"
                  checked={config.selectedLights.includes(id)}
                  onChange={() => handleToggleLight(id)}
                />
                <span className={styles.lightName}>{light.name}</span>
                {config.selectedLights.includes(id) && (
                  <select
                    className={styles.modeSelect}
                    value={config.lightConfigs[id]?.mode || "bass"}
                    onChange={(e) => hue.setLightConfig(id, { mode: e.target.value as "bass" | "voice" })}
                  >
                    <option value="bass">🔴 BASS</option>
                    <option value="voice">🔵 VOICE</option>
                  </select>
                )}
                <span className={light.state.reachable ? styles.reachable : styles.unreachable}>
                  {light.state.reachable ? "●" : "○"}
                </span>
              </div>
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

