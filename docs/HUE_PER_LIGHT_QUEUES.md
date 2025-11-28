# Hue Lights: Per-Light Queue Implementation

## The Solution

Each light has its own sequential processing queue, but all lights run in parallel.

## How It Works

### Visual Representation

```
Time →

Light 1: [Update A] → [Update B] → [Update C] → [Update D]
Light 2: [Update A] → [Update B] → [Update C] → [Update D]
Light 3: [Update A] → [Update B] → [Update C] → [Update D]

All lights update in PARALLEL
Each light processes its own updates SEQUENTIALLY
```

### The Code

```typescript
// Per-light queues: each light has its own sequential processing queue
const lightQueues = useRef<Map<string, Promise<void>>>(new Map());

// For each light update:
const previousPromise = lightQueues.current.get(lightId) || Promise.resolve();

const newPromise = previousPromise.then(async () => {
  // Update this specific light
  await setLightState(bridgeIp, username, lightId, lightState);
});

lightQueues.current.set(lightId, newPromise);
```

## Why This Works

### ✅ No Throttling Issues
- Each light processes its own updates sequentially (no conflicts)
- Updates to Light 1 don't block updates to Light 2
- Bridge doesn't get overwhelmed by concurrent requests to the same light

### ✅ Fast Response
- All lights update in parallel (maximum concurrency)
- No global lock blocking all lights
- Update frequency: 20Hz (every 50ms)

### ✅ Maintains Order
- Each light's updates happen in order
- Light 1: brightness 50 → 75 → 100 (sequential)
- Light 2: brightness 30 → 60 → 90 (sequential, in parallel with Light 1)

## Performance

### Example: 5 Lights, All Different Modes

**Old Approach (Sequential for ALL lights):**
```
Light 1 update (100ms) → Light 2 update (100ms) → ... → Light 5 update (100ms)
Total time: 500ms
Update frequency: 2Hz (once every 500ms)
```

**New Approach (Parallel with per-light queues):**
```
Light 1: update (100ms) ──┐
Light 2: update (100ms) ──┤
Light 3: update (100ms) ──┼─→ All complete in 100ms
Light 4: update (100ms) ──┤
Light 5: update (100ms) ──┘

Total time: 100ms (slowest light)
Update frequency: 20Hz (every 50ms, limited by throttle)
```

## API Call Pattern

### Example Timeline (3 lights, 50ms updates)

```
T=0ms:   Trigger update
         └─ Light 1: Start API call
         └─ Light 2: Start API call
         └─ Light 3: Start API call

T=50ms:  Trigger update
         └─ Light 1: Queue behind previous call
         └─ Light 2: Queue behind previous call
         └─ Light 3: Queue behind previous call

T=100ms: First API calls complete
         └─ Light 1: Start queued call
         └─ Light 2: Start queued call
         └─ Light 3: Start queued call

T=150ms: Trigger update
         └─ Light 1: Queue behind current call
         └─ Light 2: Queue behind current call
         └─ Light 3: Queue behind current call
```

## Why Not Groups?

Groups API (`/groups/{id}/action`) was slow because:
- Creating groups adds overhead
- Group updates aren't faster than individual parallel updates
- Groups add complexity without performance benefit

## Benefits of This Approach

1. **Simple**: No group management, just individual light calls
2. **Fast**: All lights update in parallel
3. **Reliable**: Each light has ordered, sequential updates
4. **Responsive**: 20Hz update frequency maintained
5. **Scalable**: Works with 1 light or 100 lights

## Code Changes

### Added
- `lightQueues` ref to track per-light promise chains
- Promise chaining for each light's updates

### Removed
- All group creation/deletion logic
- Batch update functions
- Group API calls

### Result
- Cleaner code
- Better performance
- More predictable behavior

