# 🧪 Manual Testing & Debugging Guide - Phase 1 Fixes

## How to Verify Each Fix Works

---

## ✅ **Fix 1: JWT Auth Headers Added**

### What to Test:
JWT token should be sent with upload, delete, and privacy update requests.

### How to Verify (Browser Console):

```javascript
// Step 1: Set a fake token in localStorage
localStorage.setItem('auth_token', 'test-token-12345');

// Step 2: Import the helper
import { getAuthHeaders, getAuthToken } from './lib/api.ts';

// Step 3: Check token is retrieved
console.log('Token:', getAuthToken());
// Expected output: test-token-12345

// Step 4: Check headers
console.log('Headers:', getAuthHeaders());
// Expected output: { 'Authorization': 'Bearer test-token-12345' }
```

### How to Verify (Network Tab):

1. Open DevTools → Network tab
2. Try uploading a video
3. Find the upload request
4. Click on it → Headers tab
5. **Expected:** See `Authorization: Bearer <token>`
6. **If missing:** Auth headers not working ❌

---

## ✅ **Fix 2: Error Boundary Component**

### What to Test:
App should not crash with white screen; should show error UI instead.

### How to Test (Intentionally Trigger Error):

**Temporarily add to `App.tsx`:**
```tsx
throw new Error("Testing ErrorBoundary!");

// Then render App - should see error UI instead of white screen ✅
```

### Expected Result:
- 🎨 Beautiful error page with red icon
- 📝 Error message displayed
- 🔴 Stack trace visible (development only)
- 🔘 "Try Again" button (soft reset)
- 🔘 "Reload Page" button (hard reset)
- ✅ App doesn't crash

### How to Verify (No Manual Crash):

1. Open DevTools → Console
2. Make a request that fails
3. Check if error boundary catches it
4. Should see error UI (not white screen)

---

## ✅ **Fix 3: useEffect Error Handling**

### What to Test:
useEffect should handle errors gracefully without memory leaks.

### How to Verify (WatchNew.tsx):

**Check cleanup is working:**
```javascript
// 1. Navigate to a video page (/watch/:id)
// 2. DevTools → Console - watch for logs

// 3. Quickly navigate away from video page
// 4. You should see in console (if you added the cleanup log):
//    ✅ "Cleanup called - no memory leak!"

// 5. Check memory - should not grow significantly
```

### Test Access Code Verification:

```javascript
// 1. Go to a private video
// 2. Try entering wrong access code
// 3. DevTools → Console should show:
//    ✅ "Error verifying access code: Error message"

// 4. Try entering correct code
// 5. Should work without crashes
```

### Expected Behavior:
- ✅ Errors logged to console (helpful for debugging)
- ✅ No memory leaks (mounted flag prevents setState after unmount)
- ✅ User sees helpful error messages
- ✅ App continues working

---

## ✅ **Fix 4: registerRoutes() Health Endpoint**

### What to Test:
Health endpoint should respond with server status.

### How to Verify (cURL or Browser):

**Option 1: Terminal**
```bash
curl http://localhost:5000/api/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-02-01T12:34:56.789Z",
  "uptime": 123.456
}
```

**Option 2: Browser**
1. Open browser
2. Navigate to: `http://localhost:5000/api/health`
3. Should see JSON response

**Option 3: Postman/Insomnia**
1. Create GET request to `http://localhost:5000/api/health`
2. Send
3. Should see 200 OK with JSON

### Verify Video Endpoints Not Implemented:

```bash
curl -X POST http://localhost:5000/api/videos/upload
```

**Expected Response (501):**
```json
{
  "error": "Video API endpoints not yet implemented",
  "hint": "Backend routes are being migrated to this server"
}
```

**Console Output:**
```
⚠️  Unimplemented endpoint: POST /api/videos/upload
```

---

## 🔍 Comprehensive Test Flow

### Test 1: Full Auth + Upload Flow

```javascript
// Step 1: Set JWT token
localStorage.setItem('auth_token', 'your-real-jwt-token');

// Step 2: Try uploading
// - Open upload modal
// - Select a video file
// - Click upload
// - Check Network tab → upload request
// - Verify Authorization header is there ✅

// Step 3: Expected Results:
// - ✅ Request includes Authorization header
// - ✅ Upload request sent with JWT
// - ✅ Server responds (either 201 success or 401 if token invalid)
```

### Test 2: Error Handling Flow

```javascript
// Step 1: Go to Watch page
// Step 2: Open DevTools Console
// Step 3: Trigger network error
//   - Can simulate with DevTools throttling/offline
// Step 4: Expected:
//   - ✅ Error logged to console
//   - ✅ User sees helpful message (not white screen)
//   - ✅ Error boundary caught it
```

### Test 3: Performance Check

```javascript
// Step 1: Open DevTools Performance tab
// Step 2: Record performance while:
//   - Uploading a video
//   - Changing privacy
//   - Deleting a video
// Step 3: Expected:
//   - ✅ No long tasks
//   - ✅ No memory leaks
//   - ✅ Smooth interactions
```

---

## 🐛 Debugging Commands

### Check JWT Token Storage:

```javascript
// In browser console:
localStorage.getItem('auth_token');
// Should show your token
```

### Check ErrorBoundary Status:

```javascript
// In browser console:
window.__React_DevTools_Global_Hook__.fiber;
// Should show React fiber with ErrorBoundary
```

### Check Server Health:

```bash
# Terminal
curl -v http://localhost:5000/api/health | jq .

# Response should show:
# - HTTP 200 OK ✅
# - JSON with status: "ok" ✅
# - Uptime value ✅
```

### Check API Auth Headers:

```javascript
// In browser console, at any page:
const token = localStorage.getItem('auth_token');
const headers = {
  'Authorization': `Bearer ${token}`
};
console.log('Auth Headers:', headers);

// Expected: { 'Authorization': 'Bearer <token>' }
```

---

## ✅ Quick Checklist

Run through these to verify everything works:

- [ ] Health endpoint responds: `curl http://localhost:5000/api/health`
- [ ] JWT token stored: `localStorage.getItem('auth_token')`
- [ ] Auth headers sent: Check Network tab on upload
- [ ] Error boundary works: Intentionally trigger error (see above)
- [ ] useEffect cleanup: Navigate away, check console
- [ ] No new console errors: DevTools Console clean
- [ ] App doesn't crash: Interact with all features
- [ ] Error messages helpful: Try invalid inputs

---

## 📱 Testing on Different Devices

### Desktop (Chrome/Firefox/Safari):
- ✅ All manual tests above work
- ✅ DevTools available for deep inspection

### Mobile (iOS/Android):
- Harder to debug (no DevTools)
- But you can:
  - Install React Native Debugger
  - Use remote debugging
  - Check console logs via Xcode/Android Studio

---

## 🚨 Common Issues & Solutions

### Issue: "Authorization header not sent"
**Solution:** 
1. Check token exists: `localStorage.getItem('auth_token')`
2. Check it's not null
3. Re-read the getAuthHeaders() code - it only includes header if token exists

### Issue: "White screen when error occurs"
**Solution:**
1. Check ErrorBoundary is imported in App.tsx
2. Check it wraps the Router
3. Trigger error again - should see error UI

### Issue: "Memory leak warnings"
**Solution:**
1. Check `mounted` flag is used in useEffect
2. Check cleanup function returns properly
3. Check setState only called when mounted=true

### Issue: "Health endpoint returns 404"
**Solution:**
1. Check server is running: `npm run dev`
2. Check port 5000 is correct
3. Check /api/health path matches registerRoutes()

---

## 🎓 Learning Points

### What Each Fix Teaches:

1. **JWT Auth**: How to handle authentication safely
2. **Error Boundary**: How to prevent full app crashes
3. **useEffect Cleanup**: How to avoid memory leaks
4. **Health Endpoint**: How to debug server connectivity

All these patterns are production best practices used in real apps!

