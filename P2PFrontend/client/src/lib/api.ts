// API configuration
// Uses VITE_BACKEND_URL environment variable at build time.
//   - Local dev  : not set → falls back to http://localhost:3000
//   - Vercel prod: set to https://peerflix-backend.vercel.app via .env.production
const BACKEND_URL: string =
  (import.meta.env.VITE_BACKEND_URL as string | undefined) ?? 'http://localhost:3000';

const API_BASE_URL = `${BACKEND_URL}/api`;

// Debug: Log backend URL to help diagnose connection issues
console.log('[PeerFlix] Backend URL:', BACKEND_URL);

// Export backend URL for other uses (thumbnails, video streaming)
export { BACKEND_URL };

// Helper: Get JWT token - now uses httpOnly cookies instead of localStorage
export function getAuthToken(): string | null {
  // Tokens are now in httpOnly cookies, not accessible via JavaScript
  // This is intentional for security - cookies are sent automatically
  return null;
}

// Helper: Add auth headers to request - simplified since cookies handle auth
export function getAuthHeaders(): Record<string, string> {
  // No need to manually add auth headers - cookies are sent automatically
  // Keep this function for backward compatibility
  return {};
}

// Types for API responses
export interface VideoFromAPI {
  _id: string;
  videoId: string;
  filename: string;
  originalFilename: string;
  filePath: string;
  thumbnailPath?: string;
  fileSize: number;
  mimeType: string;
  magnetURI: string;
  uploadedAt: string;
  infoHash: string;
  // Privacy settings
  isPrivate: boolean;
  accessCode?: string | null;
  // UI statistics
  views?: number | string;
  likes?: number | string;
  likeCount?: number;
  createdAt?: string;
  // Phase 2: P2P Discovery fields
  uploaderId?: string | null;
  viewCount?: number;
  seedCount?: number;
  uploadDate?: string;
  owner?: string | null;
  // Computed properties for UI display
  title: string;
  thumbnail: string;
  videoUrl: string;
  description?: string;
}

// Helper to transform API video to include computed properties
export function transformVideo(video: Omit<VideoFromAPI, 'title' | 'thumbnail' | 'videoUrl'>): VideoFromAPI {
  // Build video streaming URL
  const videoUrl = `${BACKEND_URL}/stream/${video.videoId}`;

  // Build thumbnail URL - try actual thumbnail first, fallback to video poster
  let thumbnail: string;
  if (video.thumbnailPath) {
    thumbnail = `${BACKEND_URL}/media/${video.videoId}/thumbnail.jpg`;
  } else {
    // Use video URL as thumbnail (browser will show first frame as poster)
    // Or use a placeholder with video title
    thumbnail = `https://placehold.co/640x360/1a1a2e/ffffff?text=${encodeURIComponent(video.originalFilename.replace(/\.[^/.]+$/, '').substring(0, 20))}`;
  }

  return {
    ...video,
    title: video.originalFilename.replace(/\.[^/.]+$/, ''), // Remove file extension
    thumbnail,
    videoUrl,
    isPrivate: video.isPrivate ?? false,
    accessCode: video.accessCode ?? null,
  };
}

export interface VideosResponse {
  success: boolean;
  count: number;
  data: VideoFromAPI[];
}

export interface VideoResponse {
  success: boolean;
  data: VideoFromAPI;
}

export interface UploadResponse {
  success: boolean;
  message: string;
  data: {
    videoId: string;
    filename: string;
    originalFilename: string;
    fileSize: number;
    mimeType: string;
    filePath: string;
    magnetURI: string;
    infoHash: string;
    uploadedAt: string;
  };
}

export interface StatsResponse {
  success: boolean;
  data: {
    activeTorrents: number;
    totalUploaded: number;
    totalDownloaded: number;
    totalPeers: number;
    uploadSpeed: number;
    downloadSpeed: number;
    torrents: Array<{
      name: string;
      infoHash: string;
      uploaded: number;
      downloaded: number;
      numPeers: number;
      peers: number;
      progress: number;
      uploadSpeed: number;
      connectedPeers?: Array<{
        address: string;
        port: number;
        downloaded: number;
        uploaded: number;
        downloadSpeed: number;
        uploadSpeed: number;
        type: string;
      }>;
    }>;
  };
}

// API functions
export async function fetchVideos(): Promise<VideosResponse> {
  const response = await fetch(`${API_BASE_URL}/videos`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch videos');
  }
  const data = await response.json();
  // Transform videos to include computed title property
  return {
    ...data,
    data: data.data.map(transformVideo),
  };
}

export async function fetchVideoById(id: string): Promise<VideoResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch video');
  }
  const data = await response.json();
  return {
    ...data,
    data: transformVideo(data.data),
  };
}

export async function fetchMagnetUri(id: string): Promise<{ success: boolean; data: { magnetURI: string } }> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/magnet`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch magnet URI');
  }
  return response.json();
}

export async function fetchStats(): Promise<StatsResponse> {
  const response = await fetch(`${API_BASE_URL}/videos/stats`, {
    credentials: 'include'
  });
  if (!response.ok) {
    throw new Error('Failed to fetch stats');
  }
  return response.json();
}

export async function uploadVideo(file: File, isPrivate: boolean = false): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('video', file);
  formData.append('isPrivate', String(isPrivate));

  const response = await fetch(`${API_BASE_URL}/videos/upload`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to upload video');
  }

  return response.json();
}

// Helper to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Helper to format date
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Delete a video
export async function deleteVideo(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}`, {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to delete video');
  }

  return response.json();
}

// Update video privacy settings
export async function updateVideoPrivacy(id: string, isPrivate: boolean): Promise<{
  success: boolean;
  message: string;
  data: {
    videoId: string;
    isPrivate: boolean;
    accessCode: string | null;
  }
}> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/privacy`, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ isPrivate }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to update privacy');
  }

  return response.json();
}

// Verify access code for private video
export async function verifyAccessCode(id: string, accessCode: string): Promise<{
  success: boolean;
  magnetURI?: string;
  error?: string;
}> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/magnet?accessCode=${encodeURIComponent(accessCode)}`, {
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    return {
      success: false,
      error: error.error || 'Invalid access code'
    };
  }

  return response.json();
}

// Like a video
export async function likeVideo(id: string): Promise<{
  success: boolean;
  data: {
    videoId: string;
    likeCount: number;
  }
}> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/like`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to like video');
  }

  return response.json();
}

// Unlike a video
export async function unlikeVideo(id: string): Promise<{
  success: boolean;
  data: {
    videoId: string;
    likeCount: number;
  }
}> {
  const response = await fetch(`${API_BASE_URL}/videos/${id}/unlike`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to unlike video');
  }

  return response.json();
}

// Auth types
export interface AuthResponse {
  success: boolean;
  user?: {
    id: string;
    username: string;
    isAdmin: boolean;
  };
  error?: string;
}

// Auth API functions
export async function register(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function login(
  username: string,
  password: string
): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ username, password }),
  });
  return response.json();
}

export async function logout(): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: "POST",
    credentials: "include",
  });
  return response.json();
}

export async function getCurrentUser(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    credentials: "include",
  });
  if (!response.ok) return { success: false };
  return response.json();
}
