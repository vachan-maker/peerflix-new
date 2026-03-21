# Quick Reference: Real-Time P2P Stats

## Code Examples & Usage

### 1. Formatting Utilities

```typescript
import { formatSpeed, formatBytes, aggregateGlobalStats } from '@/lib/statsTracker';

// Format upload/download speeds
const upload = formatSpeed(125000);     // "122 KB/s"
const download = formatSpeed(5000000);  // "4.77 MB/s"

// Format total data transferred
const total = formatBytes(150000000);   // "143.05 MB"

// Aggregate stats from multiple peers
const peers = [
  { uploadSpeed: 100000, downloadSpeed: 50000, uploaded: 1000000, downloaded: 500000 },
  { uploadSpeed: 200000, downloadSpeed: 75000, uploaded: 2000000, downloaded: 750000 },
];

const global = aggregateGlobalStats(peers);
// Result:
// {
//   totalUploadSpeed: 300000,
//   totalDownloadSpeed: 125000,
//   totalUploaded: 3000000,
//   totalDownloaded: 1250000,
//   activePeers: 2
// }
```

---

### 2. Using GlobalStatsPanel

```tsx
import { GlobalStatsPanel } from '@/components/video/GlobalStatsPanel';

// Compact variant (video overlay)
<GlobalStatsPanel
  totalUploadSpeed={500000}      // bytes/sec
  totalDownloadSpeed={250000}    // bytes/sec
  activePeers={5}
  variant="compact"
/>

// Expanded variant (detailed view)
<GlobalStatsPanel
  totalUploadSpeed={500000}
  totalDownloadSpeed={250000}
  totalUploaded={150000000}      // optional: total bytes uploaded
  totalDownloaded={75000000}     // optional: total bytes downloaded
  activePeers={5}
  variant="expanded"
/>
```

---

### 3. P2PNetworkGraph with Stats

```tsx
import { P2PNetworkGraph } from '@/components/video/P2PNetworkGraph';

const peers = [
  {
    address: '192.168.1.100',
    uploadSpeed: 125000,        // bytes/sec
    downloadSpeed: 50000,       // bytes/sec
    uploaded: 1000000,          // total bytes
    downloaded: 500000,         // total bytes
  },
  // ... more peers
];

<P2PNetworkGraph
  peers={peers}
  totalPeers={peers.length}
  isPlaying={true}              // affects animation speed
  className="h-[300px]"
/>
```

---

### 4. WebSocket Message Format

Your backend sends messages like this via `/ws/viewers`:

```json
{
  "type": "stats",
  "uploadSpeed": 500000,
  "totalUploaded": 150000000,
  "totalPeers": 5,
  "torrents": [
    {
      "name": "video.mp4",
      "connectedPeers": [
        {
          "address": "192.168.1.100",
          "port": 6881,
          "uploadSpeed": 125000,
          "downloadSpeed": 50000,
          "uploaded": 1000000,
          "downloaded": 500000
        }
      ]
    }
  ]
}
```

The `useViewerTracking` hook automatically parses this and provides:

```typescript
const viewerStats = useViewerTracking(videoId);
// Returns:
// {
//   peers: Array<{ address, uploadSpeed, downloadSpeed }>,
//   totalPeers: number,
//   uploadSpeed: number,
//   totalUploaded: number,
//   isConnected: boolean
// }
```

---

### 5. Custom Stats Display

If you want to add custom stats to the graph or panel:

```typescript
// In your component
import { getSpeedColor, getActivityLevel } from '@/lib/statsTracker';

const peer = {
  uploadSpeed: 150000,
  downloadSpeed: 75000
};

// Get color for styling
const color = getSpeedColor(peer.uploadSpeed);
// Returns: '#34d399' (green for fast), '#60a5fa' (blue), etc.

// Get activity level
const activity = getActivityLevel(peer.uploadSpeed, peer.downloadSpeed);
// Returns: 'high' | 'medium' | 'low' | 'idle'

// Use in JSX
<div className={`text-${color}`}>
  {formatSpeed(peer.uploadSpeed)}
</div>
```

---

### 6. Advanced: Track Speed History

```typescript
import { SpeedTracker } from '@/lib/statsTracker';

// Create tracker with 5-second window
const uploadTracker = new SpeedTracker(5000);

// In your update loop (e.g., WebSocket message handler)
function handleStatsUpdate(uploadedBytes: number) {
  uploadTracker.addDataPoint(uploadedBytes);

  // Get average speed over last 5 seconds
  const avgSpeed = uploadTracker.getAverageSpeed();
  console.log(`Average: ${formatSpeed(avgSpeed)}`);
}

// Reset tracker
uploadTracker.reset();
```

---

### 7. Manage Peer Stats Over Time

```typescript
import { PeerStatsManager } from '@/lib/statsTracker';

const manager = new PeerStatsManager();

// Update peer stats
manager.updatePeer(
  'peer-1',                    // peerId
  '192.168.1.100',            // address
  125000,                     // uploadSpeed
  50000,                      // downloadSpeed
  1000000,                    // uploaded (optional)
  500000                      // downloaded (optional)
);

// Get all peers
const allPeers = manager.getAllPeers();

// Get specific peer
const peer = manager.getPeer('peer-1');

// Remove stale peers (no update in 30s)
manager.cleanStalePeers(30000);

// Clear all
manager.clear();
```

---

### 8. Integration in WatchNew.tsx

```typescript
import { aggregateGlobalStats } from '@/lib/statsTracker';
import { GlobalStatsPanel } from '@/components/video/GlobalStatsPanel';

export default function WatchNew() {
  // Get real-time peer data from WebSocket
  const viewerStats = useViewerTracking(videoId);

  // Calculate global stats
  const globalStats = aggregateGlobalStats(viewerStats.peers);

  return (
    <div>
      {/* Video player with compact stats overlay */}
      <div className="relative">
        <video {...props} />

        <div className="absolute top-4 right-4">
          <GlobalStatsPanel
            totalUploadSpeed={globalStats.totalUploadSpeed}
            totalDownloadSpeed={globalStats.totalDownloadSpeed}
            activePeers={viewerStats.totalPeers}
            variant="compact"
          />
        </div>
      </div>

      {/* Expanded stats below video */}
      <GlobalStatsPanel
        totalUploadSpeed={globalStats.totalUploadSpeed}
        totalDownloadSpeed={globalStats.totalDownloadSpeed}
        totalUploaded={viewerStats.totalUploaded}
        activePeers={viewerStats.totalPeers}
        variant="expanded"
      />

      {/* Peer graph */}
      <P2PNetworkGraph
        peers={viewerStats.peers}
        totalPeers={viewerStats.totalPeers}
        isPlaying={isPlaying}
      />
    </div>
  );
}
```

---

## Speed Thresholds & Colors

| Speed Range    | Color  | Hex Code | CSS Class     |
|---------------|--------|----------|---------------|
| 0 B/s         | Gray   | #6b7280  | text-gray-500 |
| < 10 KB/s     | Yellow | #fbbf24  | text-yellow-400 |
| 10-100 KB/s   | Blue   | #60a5fa  | text-blue-400 |
| > 100 KB/s    | Green  | #34d399  | text-green-400 |

---

## Activity Levels

```typescript
getActivityLevel(uploadSpeed, downloadSpeed)

Returns:
- 'idle'   → totalSpeed === 0
- 'low'    → totalSpeed < 10 KB/s
- 'medium' → totalSpeed < 100 KB/s
- 'high'   → totalSpeed >= 100 KB/s
```

---

## Canvas Rendering Details

The P2PNetworkGraph renders per-peer stats using canvas text:

```typescript
// Upload speed (green, above node)
ctx.font = 'bold 8px Inter';
ctx.fillStyle = '#34d399';  // green
ctx.fillText(`↑ ${formatSpeed(uploadSpeed)}`, x, y + radius + 12);

// Download speed (blue, below upload)
ctx.fillStyle = '#60a5fa';  // blue
ctx.fillText(`↓ ${formatSpeed(downloadSpeed)}`, x, y + radius + 22);

// Idle indicator (gray)
ctx.fillStyle = '#6b7280';
ctx.fillText('idle', x, y + radius + 12);
```

---

## Customization Examples

### Change Speed Thresholds

```typescript
// In statsTracker.ts
export function getSpeedColor(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '#6b7280';
  if (bytesPerSecond < 50 * 1024) return '#fbbf24';   // changed to 50 KB/s
  if (bytesPerSecond < 500 * 1024) return '#60a5fa';  // changed to 500 KB/s
  return '#34d399';
}
```

### Add Custom Stats to Panel

```tsx
// In GlobalStatsPanel.tsx
<div className="bg-black/30 rounded-xl p-3">
  <div className="flex items-center gap-2 mb-2">
    <Activity size={14} className="text-purple-400" />
    <span className="text-xs text-gray-400">Efficiency</span>
  </div>
  <p className="text-lg font-bold text-purple-400">
    {((totalUploadSpeed / totalDownloadSpeed) * 100).toFixed(0)}%
  </p>
</div>
```

### Show Total Data Transferred on Graph

```typescript
// In P2PNetworkGraph.tsx, after speed text
const totalTransferred = (node.uploaded || 0) + (node.downloaded || 0);
ctx.font = '7px Inter';
ctx.fillStyle = '#9ca3af';
ctx.fillText(formatBytes(totalTransferred), node.x, node.y + radius + 32);
```

---

## Debugging

### Enable Console Logging

```typescript
// In useViewerTracking.ts
ws.onmessage = (event) => {
  const message = JSON.parse(event.data);
  console.log('[Stats]', message);  // Add this line
  // ... rest of handler
};
```

### Check Stats Values

```typescript
// In WatchNew.tsx
useEffect(() => {
  console.table({
    'Total Upload': formatSpeed(globalStats.totalUploadSpeed),
    'Total Download': formatSpeed(globalStats.totalDownloadSpeed),
    'Active Peers': globalStats.activePeers,
    'Uploaded': formatBytes(globalStats.totalUploaded),
  });
}, [globalStats]);
```

### Verify Peer Data

```typescript
// In P2PNetworkGraph.tsx
useEffect(() => {
  console.log('Peers:', effectivePeers.map(p => ({
    address: p.address,
    up: formatSpeed(p.uploadSpeed || 0),
    down: formatSpeed(p.downloadSpeed || 0)
  })));
}, [effectivePeers]);
```

---

## Performance Tips

1. **Throttle Updates**: WebSocket already throttles to ~1-5 sec intervals
2. **Canvas Optimization**: Graph uses requestAnimationFrame for 60 FPS
3. **Cleanup**: PeerStatsManager auto-removes stale peers after 30s
4. **Conditional Rendering**: Expanded panel only renders when `totalPeers > 0`

---

## Common Patterns

### Show notification on high speed
```typescript
useEffect(() => {
  if (globalStats.totalUploadSpeed > 1000000) { // > 1 MB/s
    toast.success('High upload speed detected!');
  }
}, [globalStats.totalUploadSpeed]);
```

### Track best peer
```typescript
const bestPeer = viewerStats.peers.reduce((best, peer) =>
  (peer.uploadSpeed || 0) > (best.uploadSpeed || 0) ? peer : best
, viewerStats.peers[0]);
```

### Calculate upload/download ratio
```typescript
const ratio = globalStats.totalUploadSpeed /
              Math.max(globalStats.totalDownloadSpeed, 1);
const ratioText = ratio > 1 ? 'Sharing more!' : 'Downloading more';
```

---

## Summary

✅ Import utilities from `@/lib/statsTracker`
✅ Use `GlobalStatsPanel` for aggregate stats display
✅ Pass peer data with speeds to `P2PNetworkGraph`
✅ WebSocket provides real-time data via `useViewerTracking`
✅ Customize colors, thresholds, and layouts as needed

Everything is type-safe with TypeScript and integrates seamlessly with your existing React + WebSocket architecture!
