# PeerFlix Public Access Guide

This guide explains how to expose your local PeerFlix server to the public internet so other users on different devices and networks can access it.

## Prerequisites

1. **ngrok account** (free): https://ngrok.com/signup
2. **ngrok installed**: https://ngrok.com/download

## Quick Setup

### Step 1: Install ngrok

```bash
# Windows (using Chocolatey)
choco install ngrok

# Or download from https://ngrok.com/download
# Extract and add to your PATH
```

### Step 2: Authenticate ngrok

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken

### Step 3: Start PeerFlix Servers

Open two terminals:

**Terminal 1 - Backend:**
```bash
cd p2pStreaming-backend
node index.js
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Step 4: Start ngrok Tunnels

**Option A: Use the batch script**
```bash
start-tunnel.bat
```

**Option B: Manual command**
```bash
ngrok start --config ngrok.yml --all
```

You'll see output like:
```
Forwarding  https://xxxx-xx-xx.ngrok-free.app -> http://localhost:5000 (frontend)
Forwarding  https://yyyy-yy-yy.ngrok-free.app -> http://localhost:3000 (backend)
```

### Step 5: Configure the Frontend

1. Open the **frontend ngrok URL** in your browser
2. Click the **Globe icon** (🌐) in the header
3. Enter the **backend ngrok URL** in the configuration
4. Click "Save & Reload"

### Step 6: Share with Users

Share the **frontend ngrok URL** with other users (B, C, etc.)

## How It Works

```
┌─────────────────────────────────────────────────────────────┐
│                    PUBLIC INTERNET                          │
│                                                             │
│  User B ─────┐                                              │
│              │                                              │
│  User C ─────┼──▶ ngrok URLs ──▶ ┌──────────────────────┐  │
│              │                    │   YOUR MACHINE (A)   │  │
│  User D ─────┘                    │                      │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │ Frontend:5000  │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │ Backend:3000   │  │  │
│                                   │  └────────────────┘  │  │
│                                   │  ┌────────────────┐  │  │
│                                   │  │ MongoDB        │  │  │
│                                   │  └────────────────┘  │  │
│                                   └──────────────────────┘  │
│                                                             │
│         WebRTC P2P connections between users                │
│         (direct peer-to-peer after initial connection)      │
└─────────────────────────────────────────────────────────────┘
```

## P2P Streaming Flow

1. **Parent server** (your machine) seeds all videos via WebTorrent
2. **User B** accesses the site through ngrok
3. **User B** gets magnet link from parent server
4. **User B's browser** connects to WebTorrent swarm
5. **User B** downloads from parent server + other peers
6. **User C** joins → downloads from parent server + User B + others
7. **More users = faster downloads** (true P2P!)

## WebRTC/WebSocket Compatibility

ngrok automatically handles:
- ✅ WebSocket connections (for real-time stats)
- ✅ HTTP/HTTPS upgrade
- ✅ WebRTC signaling (via WebTorrent trackers)

WebRTC P2P connections work because:
- WebTorrent uses public STUN/TURN servers
- Peers connect directly after signaling
- No special configuration needed

## Troubleshooting

### "Backend not responding"
1. Make sure backend is running on port 3000
2. Check that you entered the correct backend ngrok URL
3. Click the Globe icon and verify the URL

### "Videos not loading"
1. Verify the backend ngrok URL is set correctly
2. Check browser console for errors
3. Try "Reset to Local" then reconfigure

### "Peers not connecting"
- WebTorrent trackers may take a moment to connect
- Ensure all users are on the same video
- Check if firewalls are blocking WebRTC

### "ngrok session expired"
- Free ngrok sessions expire after 2 hours
- Restart ngrok and update the backend URL

## Security Notes

⚠️ **For Development/Demo Only!**

- ngrok URLs are publicly accessible
- Anyone with the URL can access your PeerFlix
- Private videos still require access codes
- Don't expose sensitive data

## Alternative Tunnel Services

If ngrok doesn't work for you:

- **localtunnel**: `npx localtunnel --port 5000`
- **cloudflared**: Cloudflare Tunnel (free)
- **serveo**: `ssh -R 80:localhost:5000 serveo.net`
- **bore**: `bore local 5000 --to bore.pub`

Each requires similar setup - expose both ports and configure frontend.
