# Screen Sharing Feature (Polling-Based)

## Overview
This implementation allows viewers to see the main user's screen in real-time on any device, using a simple polling-based backend system. No WebRTC or P2P dependencies required!

## 🚀 How It Works

### Simple Architecture
1. **Host creates a session** → Backend generates a 6-digit code
2. **Host broadcasts state** → Updates sent to backend every 500ms (via lyrics worker)
3. **Viewers join session** → Enter the 6-digit code
4. **Viewers poll for state** → Poll backend every 500ms for updates (via lyrics worker)
5. **Viewers fetch lyrics** → Each viewer downloads lyrics independently

### Key Benefits
- ✅ **No WebRTC complexity** - Simple HTTP polling
- ✅ **No PeerJS dependency** - Pure backend approach
- ✅ **Worker-based** - All sharing logic runs in the Spotify/Lyrics worker
- ✅ **Independent lyrics** - Viewers download their own lyrics
- ✅ **Scalable** - Backend handles all coordination

## How to Use

### Host (Main Screen)
1. Open the player at `/player`
2. Click the **Share** button
3. A 6-digit code appears (e.g., `123456`)
4. Share this code with viewers

### Viewers
1. Go to `/share`
2. Enter the 6-digit code
3. Enable microphone when prompted
4. Enjoy synchronized playback!

## Technical Details

### Backend API Routes

#### `POST /api/share/create`
Creates a new shared session with a unique 6-digit code.

**Response:**
```json
{
  "code": "123456",
  "sessionId": "abc123"
}
```

#### `POST /api/share/join`
Registers a viewer in a shared session.

**Request:**
```json
{
  "code": "123456"
}
```

**Response:**
```json
{
  "sessionId": "abc123",
  "code": "123456",
  "connectedClients": 1
}
```

#### `POST /api/share/update`
Updates the shared session state (host only).

**Request:**
```json
{
  "code": "123456",
  "trackId": "spotify:track:...",
  "trackName": "Song Name",
  "artistName": "Artist Name",
  "albumArt": "https://...",
  "duration": 180000,
  "progress": 45000,
  "isPlaying": true,
  "queue": [...],
  "lyrics": [...],
  "visualizationType": "spectrum",
  "visualizationMode": "normal"
}
```

#### `GET /api/share/poll?code=123456`
Polls for the current shared session state.

**Response:**
```json
{
  "trackId": "spotify:track:...",
  "trackName": "Song Name",
  "artistName": "Artist Name",
  "albumArt": "https://...",
  "duration": 180000,
  "progress": 45000,
  "isPlaying": true,
  "queue": [...],
  "lyrics": [...],
  "visualizationType": "spectrum",
  "visualizationMode": "normal",
  "connectedClients": 3,
  "lastUpdate": "2025-11-29T12:34:56Z"
}
```

#### `POST /api/share/disconnect`
Unregisters a viewer from a shared session.

**Request:**
```json
{
  "code": "123456"
}
```

### Database Schema

```prisma
model SharedSession {
  id              String   @id @default(cuid())
  code            String   @unique // 6-digit code
  hostUserId      String?  // Optional - for authenticated users
  
  // Current playback state
  trackId         String?
  trackName       String?
  artistName      String?
  albumArt        String?
  duration        Int?     // in ms
  progress        Int?     // in ms
  isPlaying       Boolean  @default(false)
  
  // Next songs in queue (stored as JSON)
  queue           String?  @db.Text
  
  // Lyrics for current song (stored as JSON)
  lyrics          String?  @db.Text
  
  // Visualization settings
  visualizationType String?
  visualizationMode String?
  
  // Session metadata
  connectedClients Int     @default(0)
  lastUpdate       DateTime @default(now())
  createdAt        DateTime @default(now())
  expiresAt        DateTime // Auto-expire after 24 hours
}
```

### Worker Integration

All sharing logic is integrated into the **lyrics worker** (`src/workers/lyrics.worker.ts`):

**Host Messages:**
- `START_SHARING` - Creates a shared session
- `STOP_SHARING` - Ends the shared session
- `UPDATE_SHARE_STATE` - Updates playback state

**Viewer Messages:**
- `JOIN_SHARING` - Joins a session by code
- `LEAVE_SHARING` - Leaves the session
- Auto-polls for state updates every 500ms

**Worker Responses:**
- `SHARING_STARTED` - Session created with code
- `SHARING_STOPPED` - Session ended
- `CONNECTED_CLIENTS_UPDATE` - Viewer count update
- `VIEWING_STARTED` - Successfully joined session
- `VIEWING_STOPPED` - Left session
- `SHARED_STATE_UPDATE` - New state received
- `SHARING_ERROR` / `VIEWING_ERROR` - Error occurred

### Hook Usage

#### Host Side (`useShareManager`)
```typescript
const shareManager = useShareManager();

// Start sharing
shareManager.startHosting();

// Broadcast state (throttled to 2Hz internally)
shareManager.broadcastState({
  playbackState: {
    trackId: "...",
    trackName: "...",
    // ... other fields
  },
  queue: [...],
  lyrics: [...],
  currentTimeMs: 45000
});

// Monitor viewers
console.log(shareManager.connectedViewers); // e.g., 3
console.log(shareManager.shareCode);        // e.g., "123456"

// Stop sharing
shareManager.stopHosting();
```

#### Viewer Side (`useShareManager`)
```typescript
const shareManager = useShareManager();

// Connect to host
shareManager.connectToHost("123456");

// Access received state
const state = shareManager.viewerState;
if (state?.playbackState) {
  console.log("Now playing:", state.playbackState.trackName);
}

// Monitor connection
console.log(shareManager.isViewer);         // true/false
console.log(shareManager.connectionError);  // null or error message

// Disconnect
shareManager.disconnectFromHost();
```

## Features

✅ **6-digit code system** - Easy to share, no long URLs  
✅ **Backend-based** - No WebRTC, no PeerJS, no P2P complexity  
✅ **Worker-powered** - All logic runs off the main thread  
✅ **Independent lyrics** - Each viewer fetches their own  
✅ **Queue sync** - Shows next 2 songs  
✅ **Auto-reconnect** - Viewers auto-join on page reload  
✅ **Live viewer count** - Host sees connected viewers  
✅ **QR code sharing** - Quick mobile access  
✅ **Session expiry** - Sessions auto-expire after 24 hours  
✅ **Throttled updates** - 2Hz polling (500ms intervals)  

## Performance

### Network Usage (per viewer)
- **Polling:** ~2 requests/second
- **Payload:** ~500 bytes per request
- **Bandwidth:** ~1 KB/s per viewer (very light!)

### Server Load
- Simple PostgreSQL queries
- Minimal CPU usage
- Scales horizontally with more backend instances

## Troubleshooting

### "Session not found"
- Code might be incorrect
- Session may have expired (24 hours)
- Host may have stopped sharing

### "Connection failed"
- Check backend is running
- Verify database is accessible
- Check network connectivity

### No state updates
- Host might not be broadcasting
- Check viewer is still polling
- Verify backend updates are working

## Migration from WebRTC

The old PeerJS-based implementation has been completely removed:
- ❌ Removed PeerJS dependency
- ❌ Removed WebRTC P2P connections
- ❌ Removed privacy policy mentions of PeerJS
- ✅ New polling-based architecture
- ✅ All logic in workers
- ✅ Simple backend API
