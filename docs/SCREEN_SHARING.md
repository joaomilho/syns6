# Screen Sharing Feature

## Overview
This implementation allows viewers to see the main user's screen in real-time on any device, using WebRTC for peer-to-peer connections.

## 🚀 Deployment Only

This feature is designed for **deployed/production use only**. 

### Why?
- Microphone access requires HTTPS (except on localhost)
- Setting up HTTPS for local network is complex
- PeerJS works best over internet with STUN/TURN servers

### How to Use:

1. **Deploy your app** (Vercel, Netlify, etc.)
2. **Open the player** at your deployed URL (e.g., `https://your-app.vercel.app/player`)
3. **Click the QR code badge** (📱 with viewer count)
4. **Share the QR code or link** with others
5. **Viewers scan/open** the link on their devices
6. **Viewers enable microphone** when prompted (they'll hear music through their speakers)

### Local Development:

For local dev, you can test on the same machine:
- Host: `http://localhost:3000/player`
- Viewer: `http://localhost:3000/share` (works because it's localhost)

## 🛠️ Development Mode

In development (`NODE_ENV=development`), the peer ID is **fixed to `syns-dev-1234`** for easier testing:
- No need to scan QR code every time you restart
- Just bookmark `/share` (no query params needed)
- The share page auto-connects to `syns-dev-1234` if no host is specified

In production, it uses a unique timestamp-based ID (`syns-{timestamp}`) for each session.

## How It Works

### 1. Main Screen (Host)
- **Location**: `/player` page
- **Auto-starts hosting** when page loads
- Shows a **QR code badge** (📱 with viewer count) in the top bar
- Click the badge to see the full QR code and share URL
- Broadcasts state at 30fps to all connected viewers

### 2. Viewer Screen
- **Location**: `/share?host={peerId}` page
- Scan QR code or open link to connect
- Receives real-time updates every ~33ms
- Shows exact same visualization, lyrics, and audio data as host
- Shows "Now Playing" info overlay

### 3. Connection Technology
- **WebRTC via PeerJS**: Works for both same-network AND internet connections
- PeerJS provides free cloud signaling server (no backend needed!)
- Reliable data channels for state synchronization
- Automatic reconnection on network changes

## What Gets Broadcasted

Only lightweight synchronization data (each viewer uses their own microphone):

```typescript
{
  // Current playing track
  playbackState: {
    trackId, trackName, artistName, albumArt,
    duration_ms, progress_ms, is_playing
  },
  
  // Next 2 songs in queue
  queue: [{
    id, name, artistName, albumArt, duration_ms
  }],
  
  // Synced lyrics
  lyrics: LyricLine[],
  
  // Current position (for lyrics sync)
  currentTimeMs: number,
  
  // Optional visualization settings
  visualizationType: string,
  visualizationMode: string
}
```

**Why no micData?** Each viewer uses their own microphone to listen to the music playing through the speakers. This is:
- ✅ **Much faster** (no network latency)
- ✅ **Much lighter** (~99% bandwidth reduction!)
- ✅ **Higher quality** (no audio compression artifacts)
- ✅ **Still synchronized** (all devices hear the same speakers)

## User Flow

1. **Host starts player** → Auto-generates 6-digit code (e.g., `123456`)
2. **Host clicks QR badge** → Shows QR code + big 6-digit code
3. **Viewer opens** → Goes to `syns6.com/share` 
4. **Viewer enters code** → Types 6 digits in input boxes
5. **WebRTC connects** → Peer-to-peer connection established (may take 5-10 seconds)
6. **State syncs** → Viewer sees song info + synced lyrics
7. **Viewer enables mic** → Hears music through speakers, visualizes locally
8. **Viewer count updates** → Host sees 👀 count increase

## Features

✅ **6-digit code system** (easy to share, no long URLs!)  
✅ **Ultra-lightweight** (0.5fps broadcast, <500 bytes/s bandwidth!)  
✅ **Local audio processing** (each viewer uses own microphone)  
✅ **Queue display** (shows next 2 songs on viewers)  
✅ **Synced lyrics** across all devices  
✅ **Auto-reconnect** on network changes  
✅ **Zero backend** required (uses PeerJS cloud)  
✅ **Works everywhere** (internet only)  
✅ **Live viewer count** on host  
✅ **QR code + manual code entry** for flexibility
✅ **Latency monitoring** (shows ms delay in console)  

## Technical Details

### Host (useShareManager - Host Mode)
```typescript
const shareManager = useShareManager();
shareManager.startHosting();          // Creates peer with 6-digit code
shareManager.broadcastState(state);   // Sends state (0.5fps, ~500 bytes/s)
shareManager.connectedViewers;        // Count of connected viewers
shareManager.peerId;                  // e.g., "syns-123456"
```

### Debugging
Check browser console for detailed logs:
- **Host**: `📡 [HOST] Broadcasted X updates to Y viewers`
- **Viewer**: `📊 [VIEWER] Updates: X, Latency: Yms`

### Connection Speed
- Initial WebRTC connection: **5-10 seconds** (normal for STUN/TURN negotiation)
- After connected: **Real-time sync** (lyrics update every 2 seconds)
- Audio visualization: **Instant** (local microphone, no network delay)
```

### Viewer (useShareManager - Viewer Mode)
```typescript
const shareManager = useShareManager();
shareManager.connectToHost(peerId);   // Connect to host
shareManager.viewerState;              // Received state from host

// Use local microphone (auto-enabled)
const { micData } = useMicrophoneAnalysis();
```

### Why WebRTC?
- **Low latency**: Peer-to-peer = faster than server relay
- **Scalable**: Each viewer connects directly (no server bottleneck)
- **Free**: PeerJS provides cloud signaling (no hosting costs)
- **Universal**: Works on same network AND across internet

### Smart IP Detection
When running on localhost, the system automatically:
- Detects all local IP addresses using WebRTC ICE candidates
- **Filters out virtual interfaces** (Docker, VirtualBox, VMware: 192.168.64.x, 172.17.x, etc.)
- **Prioritizes common home network ranges** (192.168.1.x > 192.168.0.x > other 192.168.x.x)
- Selects the best IP for your WiFi/Ethernet connection
- Shows a warning if the dev server needs `--hostname 0.0.0.0` configuration

## Development Notes

### Files Created
- `/src/hooks/useShareManager.ts` - WebRTC connection manager
- `/src/app/share/page.tsx` - Viewer page
- `/src/components/ShareQRCode.tsx` - QR code display component
- `/src/app/share/share.module.css` - Viewer page styles
- `/src/components/ShareQRCode.module.css` - QR code styles

### Files Modified
- `/src/app/player/page.tsx` - Added ShareManager integration and QR code

### Dependencies Added
- `peerjs` - WebRTC wrapper with cloud signaling
- `react-qr-code` - QR code generation

## Future Improvements
- [ ] Add viewer chat/reactions
- [ ] Show viewer list on host
- [ ] Allow host to kick viewers
- [ ] Add viewer permission controls
- [ ] Multiple host support (rooms)
- [ ] Persist peer ID across sessions

