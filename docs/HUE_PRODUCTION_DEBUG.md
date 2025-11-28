# Hue Production Issues - Debugging Guide

## Issue 1: Mixed Content (HTTPS → HTTP)

### The Problem
- Your production site is HTTPS
- Hue bridge uses HTTP (local network, no SSL)
- Browsers block HTTP requests from HTTPS pages (security)

### Why It's Inconsistent
- **Localhost exception**: Some browsers allow HTTP to `localhost` or `192.168.x.x`
- **Browser settings**: Different users have different security settings
- **Browser version**: Newer browsers are stricter

### Solutions

#### Option 1: Use in Development Only
```
Production: No Hue support (HTTPS can't call HTTP)
Development: Full Hue support (HTTP site can call HTTP bridge)
```

#### Option 2: Mixed Content Warning
Add detection in the UI:

```typescript
// In useHueLights.ts - connect function
const connect = async (bridgeIp: string) => {
  // Check if we're on HTTPS
  if (window.location.protocol === 'https:') {
    setError('⚠️ Hue requires HTTP. Use http://localhost:3000 for Hue features.');
    return;
  }
  
  // Continue with connection...
};
```

#### Option 3: Proxy Through Your Server (Advanced)
```
Browser (HTTPS) → Your Server (HTTPS) → Hue Bridge (HTTP)
                  ↑
                  Acts as proxy
```

### Recommended: Development Only
Add to your UI:
```typescript
{process.env.NODE_ENV === 'development' && <HueControls />}
```

Or show a warning:
```typescript
{window.location.protocol === 'https:' && (
  <div className="warning">
    ⚠️ Hue lights require HTTP. Use http://localhost:3000 for full features.
  </div>
)}
```

---

## Issue 2: Burst Then Stops

### What's Happening

The worker logs will now show exactly what's wrong. Check console for:

#### Scenario A: Worker Not Active
```
💡 Worker: Hue activated
⏭️ Worker: Skipping audio update - not active  ← PROBLEM
```
**Fix**: `isActive` is being set to false somehow. Check the `setActive` calls.

#### Scenario B: No Lights Selected
```
💡 Worker: Updated selected lights (3)
⏭️ Worker: Skipping audio update - no lights selected  ← PROBLEM
```
**Fix**: `selectedLights` is being cleared. Check the `updateConfig` calls.

#### Scenario C: Missing Light Configs
```
⚠️ Worker: No config for light 1
⚠️ Worker: No config for light 2
```
**Fix**: `lightConfigs` not being sent. Check the `updateAudio` call.

#### Scenario D: All Brightness Same
```
(No logs - this is normal)
```
**Fix**: Audio data might be static. Check `micData` is updating.

#### Scenario E: Network Errors
```
❌ Worker: Light 1 failed (1/3) TypeError: Failed to fetch
❌ Mixed content error? HTTPS page cannot call HTTP Hue bridge
```
**Fix**: Mixed content issue (see Issue 1).

#### Scenario F: Worker Crashed
```
💥 Worker: Unhandled error in light 1 queue: [error message]
```
**Fix**: Check the error message, likely a bug in worker code.

---

## Debugging Steps

### 1. Check Worker Console

Open DevTools → Click "Sources" tab → Look for "hue.worker.ts" in threads:

```
Main
├─ (your page)
└─ Workers
   └─ hue.worker.ts  ← Look here for logs
```

### 2. Enable Verbose Logging

Add this to worker temporarily:

```typescript
// At top of UPDATE_AUDIO case
console.log('📊 Worker receiving audio:', {
  isActive,
  selectedLights: Array.from(selectedLights),
  numConfigs: Object.keys(lightConfigs).length,
  bass: message.audioData.bass,
});
```

### 3. Check Main Thread

Add logging before sending to worker:

```typescript
// In useHueLights.ts
console.log('📤 Sending to worker:', {
  isActive,
  selectedLights: config.selectedLights,
  bass: audioData.bass,
});

updateAudio(...);
```

### 4. Verify Worker Lifecycle

```typescript
// In useHueWorker.ts
useEffect(() => {
  console.log('🏗️ Creating Hue worker');
  const worker = new Worker(...);
  
  worker.onerror = (error) => {
    console.error('💥 Worker crashed:', error);
  };
  
  return () => {
    console.log('🗑️ Terminating Hue worker');
    worker.terminate();
  };
}, []);
```

---

## Common Fixes

### Fix 1: Ensure Config Sent on Activation

```typescript
// In useHueLights.ts
const setActiveWithLog = useCallback(async (active: boolean) => {
  setIsActive(active);
  setWorkerActive(active);  // ← Make sure this is called
  
  if (active && config) {
    // Re-send config to ensure worker has it
    updateConfig(config.selectedLights);
  }
}, [config, setWorkerActive, updateConfig]);
```

### Fix 2: Send Light Configs with Audio

Make sure `lightConfigs` is always sent:

```typescript
// In useHueLights.ts - reactToMusic
updateAudio(
  { ...audioData },
  config.lightConfigs  // ← Ensure this is passed
);
```

### Fix 3: Handle Mixed Content Gracefully

```typescript
// In setLightState (worker)
catch (error: any) {
  if (error.message === 'MIXED_CONTENT_ERROR') {
    // Send special message to main thread
    self.postMessage({
      type: 'MIXED_CONTENT_ERROR',
      message: 'Cannot call HTTP Hue bridge from HTTPS page'
    });
    // Stop trying
    return;
  }
}
```

---

## Production Deployment Checklist

- [ ] Is site using HTTPS? (Hue won't work)
- [ ] Worker initialization successful? (Check console)
- [ ] Config sent to worker? (Check logs: "Updated selected lights")
- [ ] Worker activated? (Check logs: "Hue activated")
- [ ] Audio data flowing? (Check logs: "receiving audio")
- [ ] Light configs present? (Check logs: "No config" warnings)
- [ ] Network accessible? (Check Hue bridge IP reachable)

---

## Emergency: Disable in Production

If Hue is causing issues in production:

```typescript
// In player/page.tsx
const hue = useHueLights();

// Disable in production
useEffect(() => {
  if (process.env.NODE_ENV === 'production') {
    return; // Skip all Hue logic
  }
  
  // ... rest of Hue code
}, []);
```

Or hide the UI:

```typescript
{process.env.NODE_ENV === 'development' && (
  <HueDropdown hue={hue} />
)}
```

