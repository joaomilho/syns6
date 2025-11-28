"use client";

import { useState, useRef, useEffect } from "react";
import { HueConnection } from "@/hooks/useHueLights";
import { Toggle } from "@/components/ds";
import styles from "./HueDropdown.module.css";

interface HueDropdownProps {
  hue: HueConnection;
}

export default function HueDropdown({ hue }: HueDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [manualIp, setManualIp] = useState("");

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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

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
    // Don't allow selecting unreachable lights
    const light = lights[lightId];
    if (!light?.state.reachable) return;
    
    const selected = config.selectedLights.includes(lightId)
      ? config.selectedLights.filter((id) => id !== lightId)
      : [...config.selectedLights, lightId];
    selectLights(selected);
  };

  return (
    <div className={styles.dropdown} ref={dropdownRef}>
      <button
        className={`${styles.dropdownButton} ${isActive ? styles.active : ""}`}
        onClick={() => setIsOpen(!isOpen)}
        title={isConnected ? (isActive ? "Hue Active" : "Hue Connected") : "Connect Hue Lights"}
      >
        <span className={styles.icon}>◐</span>
      </button>

      {isOpen && (
        <div className={styles.dropdownMenu}>
          {isConnected && config ? (
            // Connected view
              <>
                <div className={styles.header}>
                  <button onClick={disconnect} className={styles.disconnectBtn}>
                    Disconnect
                  </button>
 
                  <Toggle
                    checked={isActive}
                    onChange={setActive}
                    label={isActive ? "Active" : "Inactive"}
                  />
                </div>

              <div className={styles.info}>
                <div>{config.bridgeIp}</div>

              </div>

              

              <div className={styles.lightSelector}>
                <div className={styles.selectorHeader}>
                  
                  <div className={styles.selectButtons}>
                    <button 
                      onClick={() => {
                        // Select only reachable lights
                        const reachableLights = Object.entries(lights)
                          .filter(([, light]) => light.state.reachable)
                          .map(([id]) => id);
                        selectLights(reachableLights);
                      }} 
                      className={styles.selectBtn}
                    >
                      All
                    </button>
                    <button onClick={() => selectLights([])} className={styles.selectBtn}>
                      None
                    </button>
                  </div>
                </div>

                <div className={styles.lightList}>
                  {Object.entries(lights)
                    .sort(([, a], [, b]) => {
                      // Sort by reachable first (reachable = available)
                      if (a.state.reachable && !b.state.reachable) return -1;
                      if (!a.state.reachable && b.state.reachable) return 1;
                      // Then sort by name
                      return a.name.localeCompare(b.name);
                    })
                    .map(([id, light]) => {
                    const isSelected = config.selectedLights.includes(id);
                    const isReachable = light.state.reachable;
                    return (
                      <div 
                        key={id} 
                        className={`${styles.lightItem} ${isSelected ? styles.selected : ''} ${!isReachable ? styles.disabled : ''}`}
                        onClick={() => handleToggleLight(id)}
                        style={{ cursor: isReachable ? 'pointer' : 'not-allowed' }}
                      >
                        <span className={light.state.reachable ? styles.reachable : styles.unreachable}>
                          {light.state.reachable ? "●" : "○"}
                        </span>
                        <span className={styles.lightName}>{light.name}</span>
                        {isSelected && (
                          <select
                            className={styles.modeSelect}
                            value={config.lightConfigs[id]?.mode || "bass"}
                            onChange={(e) => {
                              e.stopPropagation();
                              hue.setLightConfig(id, { mode: e.target.value as "bass" | "voice" | "drums" });
                            }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="bass">🔴 BASS</option>
                            <option value="voice">🔵 VOICE</option>
                            <option value="drums">🟡 DRUMS</option>
                          </select>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            // Not connected view
            <>
              <div className={styles.header}>
                <span className={styles.title}>💡 Connect Hue</span>
              </div>

              {error && <div className={styles.error}>{error}</div>}

              {bridges.length === 0 ? (
                <div className={styles.setup}>
                  <p className={styles.setupText}>Control your lights with music!</p>
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
                        {isConnecting ? "..." : "Connect"}
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
            </>
          )}
        </div>
      )}
    </div>
  );
}

