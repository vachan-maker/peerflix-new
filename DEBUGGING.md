# Debugging Guide: Blank White Page

## Quick Fixes

### Option 1: Check Browser Console

1. Open your browser to `http://localhost:5000`
2. Press `F12` or right-click → "Inspect"
3. Go to Console tab
4. Look for RED error messages

**Common errors to look for:**
- `Cannot read property 'X' of undefined`
- `X is not a function`
- Module import errors

**Please share the error message** and I can fix it immediately.

---

### Option 2: Temporary Disable Stats (Test if stats are causing issue)

Edit `/client/src/pages/WatchNew.tsx` and comment out the GlobalStatsPanel imports:

```typescript
// Line 34: Comment out this line
// import { GlobalStatsPanel } from '@/components/video/GlobalStatsPanel';

// Line 36: Comment out this line
// import { aggregateGlobalStats } from '@/lib/statsTracker';
```

Then comment out the GlobalStats calculation (around line 151):
```typescript
// const globalStats = aggregateGlobalStats(realtimePeers || []);
```

And comment out both GlobalStatsPanel usages:
```typescript
// Lines 389-400: Comment out compact panel
// Lines 529-537: Comment out expanded panel
```

Save and refresh. Does the page work now?

---

### Option 3: Check if Vite HMR is working

In terminal where Vite is running, look for:
- `✓ page reload`
- `✓ updated`

If you see errors instead, restart Vite:
```bash
# Stop current Vite (Ctrl+C)
npm run dev:client
```

---

### Option 4: Hard Refresh

Sometimes browser cache causes issues:
- Chrome/Edge: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- Firefox: `Ctrl+F5` or `Cmd+Shift+R`

---

### Option 5: Check Network Tab

1. Open DevTools → Network tab
2. Refresh page
3. Look for failed requests (RED)
4. Check if JavaScript bundles are loading

---

## Verify Installation

Run these commands to ensure everything is set up:

```bash
cd /home/vachan/mainProject/2/PeerFlix/P2PFrontend

# Check TypeScript compilation
npm run check

# Should output: "tsc" with no errors
```

---

## Test Individual Components

Create a test file to verify components work:

`/client/src/pages/TestStats.tsx`:
```typescript
import { GlobalStatsPanel } from '@/components/video/GlobalStatsPanel';

export default function TestStats() {
  return (
    <div className="p-8 bg-black min-h-screen">
      <h1 className="text-white mb-4">Stats Test</h1>
      <GlobalStatsPanel
        totalUploadSpeed={125000}
        totalDownloadSpeed={50000}
        activePeers={3}
        variant="compact"
      />
      <br />
      <GlobalStatsPanel
        totalUploadSpeed={125000}
        totalDownloadSpeed={50000}
        totalUploaded={1000000}
        totalDownloaded={500000}
        activePeers={3}
        variant="expanded"
      />
    </div>
  );
}
```

Then add route in `/client/src/App.tsx`:
```typescript
import TestStats from '@/pages/TestStats';

// Add route:
<Route path="/test-stats" component={TestStats} />
```

Navigate to `http://localhost:5000/test-stats`

If this page is ALSO blank → Component has an error
If this page WORKS → Integration issue in WatchNew.tsx

---

## Most Likely Issues

### 1. Import Path Error
Check if paths are correct:
```typescript
import { formatSpeed } from '@/lib/statsTracker';  // ✓ Correct
import { formatSpeed } from 'lib/statsTracker';     // ✗ Wrong
```

### 2. Missing Video Data
The page might load but hide panels if:
- `video.magnetURI` is undefined
- No peers connected
- WebSocket not connected

This would make panels invisible but page should still show.

### 3. React Error in ErrorBoundary
Check `/client/src/components/ErrorBoundary.tsx` - does it show errors?

---

## Expected Behavior

When working correctly:
1. Page loads with video player
2. If P2P video → compact stats show in top-right
3. When peers connect → expanded stats appear below video
4. Graph shows peer nodes with speeds

When NO peers:
- Page still loads
- No stats panels visible
- Graph shows only "You" node

---

## Quick Rollback

If you want to completely remove the stats feature:

```bash
cd /home/vachan/mainProject/2/PeerFlix/P2PFrontend

# Remove new files
rm client/src/lib/statsTracker.ts
rm client/src/components/video/GlobalStatsPanel.tsx

# Revert P2PNetworkGraph (restore from git)
git checkout client/src/components/video/P2PNetworkGraph.tsx

# Revert WatchNew (restore from git)
git checkout client/src/pages/WatchNew.tsx
```

Then refresh browser.

---

## Next Steps

**Please provide**:
1. Error message from browser console (if any)
2. Screenshot of what you see
3. Does homepage (http://localhost:5000) work?
4. Does `/test-stats` page work (after creating it)?

This will help me pinpoint the exact issue!
