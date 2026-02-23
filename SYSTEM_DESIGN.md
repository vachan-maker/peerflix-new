# PeerFlix - System Design & Architecture

## 📋 Project Overview

**PeerFlix** is a peer-to-peer (P2P) video streaming platform that enables users to upload, stream, and share videos directly between peers using WebTorrent technology. It combines a modern React frontend with an Express backend, featuring both traditional HTTP streaming and P2P torrent-based distribution.

**Key Goals:**
- Decentralized video distribution (reduce bandwidth costs via P2P)
- Easy upload and sharing of videos
- Real-time P2P network statistics
- Support for video metadata (thumbnails, titles, privacy)
- User authentication and video ownership

---

## 🏗️ High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PEERFLIX SYSTEM                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────┐         ┌──────────────────────┐ │
│  │   FRONTEND (React)   │◄───────►│  BACKEND (Express)   │ │
│  │  ├─ HomePage         │         │  ├─ REST API         │ │
│  │  ├─ VideoPlayer      │         │  ├─ File Upload      │ │
│  │  ├─ UploadModal      │         │  ├─ Streaming        │ │
│  │  └─ P2P Stats        │         │  └─ Auth             │ │
│  └──────────────────────┘         └──────────────────────┘ │
│         Port: 5000                      Port: 5000          │
│                                         (Same process)       │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       DATABASE LAYER                                 │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ├─ PostgreSQL (users, videos metadata)              │  │
│  │ └─ MongoDB (video documents - being phased out)    │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │       EXTERNAL SERVICES                              │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ ├─ WebTorrent (P2P seeding)                         │  │
│  │ ├─ FFmpeg (thumbnail generation)                    │  │
│  │ └─ ngrok (tunneling for development)               │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📦 Project Structure

```
P2PFrontend/
├── client/                          # React Frontend (Vite)
│   ├── src/
│   │   ├── App.tsx                 # Main app with routing
│   │   ├── pages/
│   │   │   ├── HomeNew.tsx         # Video grid, stats, upload
│   │   │   └── WatchNew.tsx        # Video player
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── HeaderNew.tsx
│   │   │   │   └── SidebarNew.tsx
│   │   │   ├── ui/                 # Reusable UI components
│   │   │   └── video/
│   │   │       └── UploadModalNew.tsx
│   │   ├── lib/
│   │   │   ├── api.ts              # API client functions
│   │   │   └── queryClient.ts      # React Query setup
│   │   └── stores/
│   │       └── useAppStore.ts      # Zustand state management
│   └── index.html
│
├── server/                          # Express Backend (TypeScript)
│   ├── index.ts                    # Main server setup
│   ├── routes.ts                   # Route registration
│   ├── storage.ts                  # Database interface
│   ├── static.ts                   # Static file serving
│   └── vite.ts                     # Vite dev server setup
│
├── shared/                          # Shared code
│   └── schema.ts                   # Database schema (Drizzle/Zod)
│
├── p2pStreaming-backend/           # Standalone P2P backend (Node.js)
│   ├── index.js                    # Express server + WebTorrent
│   ├── config/
│   │   ├── dbConnection.js        # MongoDB connection
│   │   └── multerConfig.js        # File upload config
│   ├── controllers/
│   │   └── videoController.js     # Business logic
│   ├── models/
│   │   └── videoModel.js          # Video schema (MongoDB)
│   ├── router/
│   │   └── videoManagementRouter.js # Routes
│   ├── utils/
│   │   ├── torrent.js             # WebTorrent logic
│   │   ├── thumbnail.js           # FFmpeg thumbnail gen
│   │   └── pathUtils.js           # Path validation
│   └── middleware/
│       └── auth.js                # JWT authentication
│
└── package.json                     # Main dependencies

```

---

## 🔄 Data Flow Architecture

### 1. **Video Upload Flow**

```
User selects file in UploadModalNew
    ↓
FormData with video sent to /api/videos/upload
    ↓
Server receives multipart upload (multer)
    ↓
Generate thumbnail via FFmpeg
    ↓
Seed file with WebTorrent → get magnetURI
    ↓
Store video metadata + magnetURI in MongoDB
    ↓
Return videoId, magnetURI, thumbnail to frontend
    ↓
Frontend updates video list and shows success
```

### 2. **Video Streaming Flow (Hybrid)**

```
User clicks "Watch Now" on video card
    ↓
Frontend navigates to /watch/:id
    ↓
Fetch video metadata from /api/videos/:id
    ↓
Two streaming options:
  Option A: Direct HTTP streaming via /stream/:videoId
            (file served from local filesystem)
  Option B: P2P via magnet URI
            (WebTorrent client downloads from peers)
    ↓
Video player receives stream and plays
```

### 3. **P2P Statistics Collection**

```
Frontend polls /api/videos/stats every 5 seconds
    ↓
Server's WebTorrent client aggregates:
  - Total active torrents
  - Connected peers
  - Upload/download speeds
  - Per-torrent statistics
    ↓
Stats displayed in UI (P2P Status Bar)
```

---

## 🗄️ Data Models

### **Video Model (MongoDB)**
```javascript
{
  _id: ObjectId,
  videoId: UUID,                    // Unique video identifier
  filename: string,                 // Stored filename
  originalFilename: string,         // User's original filename
  filePath: string,                 // Filesystem path
  thumbnailPath: string,            // Thumbnail image path
  fileSize: number,                 // Bytes
  mimeType: string,                 // video/mp4, etc
  magnetURI: string,                // WebTorrent magnet link
  uploadedAt: Date,                 // Timestamp
  isPrivate: boolean,               // Privacy flag
  accessCode: string,               // For private videos
  owner: UUID,                      // User ID (JWT sub)
}
```

### **User Model (PostgreSQL - Drizzle)**
```typescript
{
  id: UUID (primary key),
  username: string (unique),
  password: string (hashed),
}
```

---

## 🔐 Authentication & Authorization

### **Current Implementation:**
- **Method:** JWT (Bearer token in Authorization header)
- **Protected Routes:**
  - `POST /api/videos/upload` — requires auth (sets owner)
  - `DELETE /api/videos/:id` — requires auth (owner/admin check)
  - `PATCH /api/videos/:id/privacy` — requires auth (owner/admin check)
- **Public Routes:**
  - `GET /api/videos` — list all public videos
  - `GET /api/videos/:id` — fetch video metadata
  - `GET /stream/:videoId` — HTTP streaming
  - `GET /api/videos/:id/magnet` — get magnet (with accessCode for private)

### **JWT Payload Expected:**
```json
{
  "sub": "user-id",
  "username": "user@example.com",
  "isAdmin": false,
  "iat": 1234567890,
  "exp": 1234571490
}
```

---

## 🛡️ Security Features Implemented

1. **Path Traversal Prevention**
   - `pathUtils.js` validates that file paths stay under `/videos` directory
   - Applied to streaming, deletion, and startup seeding

2. **JWT Authentication**
   - `requireAuth` middleware on sensitive endpoints
   - Validates token signature with `JWT_SECRET`

3. **Ownership Verification**
   - Videos have `owner` field (user ID)
   - Delete and privacy updates require ownership or admin role

4. **File Upload Validation**
   - Multer: file extension whitelist (.mp4, .avi, .mov, .mkv, .webm)
   - MIME type validation + fallback for browser inconsistencies
   - File size limit: 500MB

5. **Private Videos**
   - `accessCode` (hex random) for private video access
   - Magnet URI hidden from public listing for private videos

6. **Error Handling**
   - Global handlers for uncaught exceptions and unhandled rejections
   - Error middleware logs without re-throwing to prevent crashes

---

## 🚀 Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Frontend** | React 19, TypeScript, Vite | UI, routing, state management |
| **Frontend State** | Zustand | Global UI state (theme, etc) |
| **Data Fetching** | TanStack React Query | Server state, caching, sync |
| **UI Components** | Radix UI, Tailwind CSS | Component library, styling |
| **Backend** | Express 5, TypeScript | HTTP server, API |
| **Database** | PostgreSQL (Drizzle), MongoDB (Mongoose) | User data, video metadata |
| **Schema** | Zod, Drizzle, Drizzle-Zod | Type-safe schemas |
| **P2P** | WebTorrent | Torrent seeding, magnet links |
| **File Upload** | Multer | Multipart form handling |
| **Media** | FFmpeg | Thumbnail generation |
| **Auth** | JWT (jsonwebtoken) | Token-based auth |
| **Session** | express-session (optional) | Session management |
| **Dev Tools** | tsx, TypeScript, Vite | Build and development |

---

## 📡 API Endpoints

### **Video Management**
```
GET    /api/videos                        # List all public videos
GET    /api/videos/:id                    # Get video metadata
GET    /api/videos/:id/magnet?accessCode  # Get magnet URI (private check)
POST   /api/videos/upload                 # Upload new video (auth required)
DELETE /api/videos/:id                    # Delete video (auth required)
PATCH  /api/videos/:id/privacy            # Toggle private (auth required)
```

### **Streaming**
```
GET    /stream/:videoId                   # HTTP video streaming with range support
GET    /media/*                           # Static file serving (thumbnails, etc)
GET    /api/videos/stats                  # P2P network statistics
```

---

## ⚙️ Configuration & Environment

### **Backend Environment Variables**
```env
NODE_ENV=development|production
PORT=5000
JWT_SECRET=your-secret-key
CONNECTION_STRING=mongodb://...    # MongoDB URI
VIDEOS_ROOT=/path/to/videos        # Optional: video directory root
```

### **Frontend Configuration**
- API base URL: http://localhost:5000/api
- Polling intervals:
  - Videos list: 30 seconds
  - P2P stats: 5 seconds

---

## 🔄 Key Workflows

### **Startup Sequence**
1. Server initializes Express app
2. Registers routes (currently empty in `registerRoutes`)
3. Sets up Vite dev server (or static serving in production)
4. Reads all videos from database
5. Seeds existing videos via WebTorrent
6. Listens on PORT (default 5000)

### **Upload Workflow**
1. User selects file → UploadModalNew component
2. POST to `/api/videos/upload` with JWT
3. Multer validates file and saves to `/videos/{videoId}/`
4. Controller generates thumbnail
5. WebTorrent seeds file (blocking until magnet ready)
6. Metadata stored in MongoDB with `owner` = JWT subject
7. Response includes magnet URI (or null if private)

### **Playback Workflow**
1. User clicks video → navigates to `/watch/:id`
2. Frontend fetches metadata from `/api/videos/:id`
3. Renders video player with playback options
4. Can stream via:
   - Direct HTTP: `/stream/:videoId` (fallback)
   - P2P: Magnet URI with WebTorrent client on frontend

---

## 📊 Performance Considerations

| Aspect | Current | Notes |
|--------|---------|-------|
| **Max File Size** | 500 MB | Configurable in `multerConfig` |
| **Concurrent Uploads** | Limited by server resources | No queue; consider adding |
| **Video Polling** | 30s refetch interval | Adjustable in React Query config |
| **Stats Polling** | 5s refetch interval | May impact CPU; consider debouncing |
| **P2P Seeding** | Single Node process | Memory-intensive for many files; consider worker process |
| **Database** | MongoDB + PostgreSQL | Potential inconsistency; consider consolidating |

---

## 🐛 Known Issues & TODOs

1. **Dual Database**
   - PostgreSQL (users via Drizzle)
   - MongoDB (videos via Mongoose)
   - **Action:** Consolidate to single DB

2. **Empty Routes**
   - `registerRoutes` is a stub; no actual routes defined
   - **Action:** Implement auth routes (login, register, etc.)

3. **Frontend Auth**
   - No login/register UI
   - **Action:** Add auth pages and token storage

4. **Resource Management**
   - Seeding all videos at startup can spike IO
   - **Action:** Add seeding queue or worker process

5. **Error Handling**
   - Some async operations lack error boundaries
   - **Action:** Add try-catch and React error boundaries

6. **Testing**
   - No unit/integration tests
   - **Action:** Add Jest + test suites

---

## 💡 Architectural Highlights (Mark Zuckerberg Perspective)

### **What's Working Well:**
1. **Separation of Concerns** — Frontend (React), backend (Express), P2P (WebTorrent) are decoupled
2. **Scalability Ready** — P2P model reduces central bandwidth; can scale horizontally
3. **User Ownership** — Videos tied to users; enables future monetization, DRM, etc.
4. **Type Safety** — TypeScript + Zod ensure data integrity
5. **Simplicity** — MVP feature set; no bloat

### **What Could Be Improved:**
1. **Consolidate Data Layer** — Use PostgreSQL for everything (migrate MongoDB to Postgres)
2. **Implement User Auth** — Complete JWT flow with login/register endpoints
3. **Add Analytics** — Track uploads, views, P2P performance
4. **Optimize P2P** — Consider CDN fallback, tracker optimization
5. **Rate Limiting** — Protect against abuse on upload/streaming

---

## 📝 Summary

PeerFlix is a **hybrid P2P streaming platform** combining traditional HTTP delivery with decentralized torrent-based distribution. It prioritizes:
- **User Control** via ownership and privacy settings
- **Efficiency** through P2P bandwidth sharing
- **Simplicity** with minimal core features
- **Security** with JWT auth and path validation

The architecture is clean, modular, and production-ready with room for enhancement in consolidation, testing, and analytics.

