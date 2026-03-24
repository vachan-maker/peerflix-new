# PeerFlix - Entity Relationship Diagram

This project uses a hybrid database architecture:
- **PostgreSQL** (via Drizzle ORM) for user authentication
- **MongoDB** (via Mongoose) for video metadata and likes

## ER Diagram

```mermaid
erDiagram
    %% PostgreSQL Tables
    USERS {
        uuid id PK "Primary Key (auto-generated UUID)"
        text username UK "Unique username"
        text password "Hashed password"
    }

    %% MongoDB Collections
    VIDEOS {
        ObjectId _id PK "MongoDB ObjectId (auto-generated)"
        String videoId UK "Unique video identifier"
        String filename "Stored filename"
        String originalFilename "Original upload filename"
        String filePath "File system path"
        String thumbnailPath "Thumbnail path (nullable)"
        Number fileSize "File size in bytes"
        String mimeType "Video MIME type"
        String magnetURI "BitTorrent magnet URI"
        Date uploadedAt "Upload timestamp"
        Boolean isPrivate "Privacy flag (default: false)"
        String accessCode "Access code for private videos"
        String owner FK "Owner user ID (nullable)"
        String uploaderId "Anonymous uploader UUID"
        Number viewCount "View counter (default: 0)"
        Number likeCount "Like counter (default: 0)"
        Number seedCount "Active seeders count"
        Date uploadDate "Upload date"
    }

    LIKES {
        ObjectId _id PK "MongoDB ObjectId (auto-generated)"
        String videoId FK "Video reference (indexed)"
        String userId FK "User reference (indexed)"
        Date createdAt "Like timestamp"
    }

    %% Relationships
    USERS ||--o{ VIDEOS : "owns (optional)"
    USERS ||--o{ LIKES : "creates"
    VIDEOS ||--o{ LIKES : "has"

    %% Notes about indexes
    %% LIKES has compound unique index on (videoId, userId)
    %% LIKES has individual indexes on videoId and userId
```

## Database Details

### PostgreSQL (Users)
- **Table**: `users`
- **ORM**: Drizzle ORM
- **Purpose**: User authentication and account management

### MongoDB (Videos & Likes)
- **Collections**: `videos`, `likes`
- **ODM**: Mongoose
- **Purpose**: Video metadata, P2P streaming info, and user interactions

## Relationships

1. **USERS → VIDEOS** (One-to-Many, Optional)
   - A user can own multiple videos
   - Videos can exist without an owner (legacy/anonymous uploads)
   - Foreign Key: `videos.owner` references `users.id`

2. **USERS → LIKES** (One-to-Many)
   - A user can create multiple likes
   - Foreign Key: `likes.userId` references `users.id`

3. **VIDEOS → LIKES** (One-to-Many)
   - A video can have multiple likes
   - Foreign Key: `likes.videoId` references `videos.videoId`

## Indexes

### Videos Collection
- `videoId`: Unique index

### Likes Collection
- `videoId`: Single field index
- `userId`: Single field index
- `(videoId, userId)`: Compound unique index (prevents duplicate likes)

## Key Features

### Privacy Controls
- Videos can be marked as private (`isPrivate` boolean)
- Private videos require an `accessCode` for access
- Access codes are automatically generated using crypto

### P2P Streaming
- Each video has a `magnetURI` for BitTorrent-based streaming
- `seedCount` tracks active peers sharing the video
- `uploaderId` provides anonymous uploader tracking

### Engagement Metrics
- `viewCount`: Number of video views
- `likeCount`: Number of likes (denormalized from Likes collection)
- Likes are tracked per-user to prevent duplicates
