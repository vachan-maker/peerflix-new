/**
 * Stats Tracker Module
 *
 * Provides utilities for tracking and formatting P2P network statistics
 * Works with WebSocket data from useViewerTracking hook
 */

export interface PeerStats {
  peerId: string;
  address: string;
  uploadSpeed: number;      // bytes/sec
  downloadSpeed: number;    // bytes/sec
  uploaded: number;         // total bytes
  downloaded: number;       // total bytes
  lastUpdate: number;       // timestamp
}

export interface GlobalStats {
  totalUploadSpeed: number;
  totalDownloadSpeed: number;
  totalUploaded: number;
  totalDownloaded: number;
  activePeers: number;
}

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * Format bytes per second to human-readable speed string
 */
export function formatSpeed(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '0 B/s';

  const k = 1024;
  const sizes = ['B/s', 'KB/s', 'MB/s', 'GB/s'];
  const i = Math.floor(Math.log(bytesPerSecond) / Math.log(k));

  // For speeds, we want to show more precision for small values
  const decimals = i === 0 ? 0 : i === 1 ? 1 : 2;
  return parseFloat((bytesPerSecond / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Aggregate stats from all peers
 */
export function aggregateGlobalStats(peers: Array<{
  uploadSpeed?: number;
  downloadSpeed?: number;
  uploaded?: number;
  downloaded?: number;
}>): GlobalStats {
  return peers.reduce(
    (acc, peer) => ({
      totalUploadSpeed: acc.totalUploadSpeed + (peer.uploadSpeed || 0),
      totalDownloadSpeed: acc.totalDownloadSpeed + (peer.downloadSpeed || 0),
      totalUploaded: acc.totalUploaded + (peer.uploaded || 0),
      totalDownloaded: acc.totalDownloaded + (peer.downloaded || 0),
      activePeers: acc.activePeers + 1,
    }),
    {
      totalUploadSpeed: 0,
      totalDownloadSpeed: 0,
      totalUploaded: 0,
      totalDownloaded: 0,
      activePeers: 0,
    }
  );
}

/**
 * Calculate speed trend (increasing/stable/decreasing)
 * Returns: 1 (increasing), 0 (stable), -1 (decreasing)
 */
export function getSpeedTrend(currentSpeed: number, previousSpeed: number, threshold: number = 0.1): number {
  const diff = currentSpeed - previousSpeed;
  const percentChange = previousSpeed === 0 ? 0 : Math.abs(diff / previousSpeed);

  if (percentChange < threshold) return 0; // stable
  return diff > 0 ? 1 : -1;
}

/**
 * Get speed color based on value (for UI styling)
 */
export function getSpeedColor(bytesPerSecond: number): string {
  if (bytesPerSecond === 0) return '#6b7280'; // gray
  if (bytesPerSecond < 10 * 1024) return '#fbbf24'; // yellow - slow (< 10 KB/s)
  if (bytesPerSecond < 100 * 1024) return '#60a5fa'; // blue - medium (10-100 KB/s)
  return '#34d399'; // green - fast (> 100 KB/s)
}

/**
 * Get upload/download activity level for peer
 */
export function getActivityLevel(uploadSpeed: number, downloadSpeed: number): 'high' | 'medium' | 'low' | 'idle' {
  const totalSpeed = uploadSpeed + downloadSpeed;

  if (totalSpeed === 0) return 'idle';
  if (totalSpeed < 10 * 1024) return 'low';      // < 10 KB/s
  if (totalSpeed < 100 * 1024) return 'medium';  // 10-100 KB/s
  return 'high';                                  // > 100 KB/s
}

/**
 * Calculate average speed over time window
 */
export class SpeedTracker {
  private history: Array<{ timestamp: number; bytes: number }> = [];
  private readonly windowMs: number;

  constructor(windowMs: number = 5000) {
    this.windowMs = windowMs;
  }

  addDataPoint(bytes: number): void {
    const now = Date.now();
    this.history.push({ timestamp: now, bytes });

    // Clean old data points outside window
    const cutoff = now - this.windowMs;
    this.history = this.history.filter(point => point.timestamp >= cutoff);
  }

  getAverageSpeed(): number {
    if (this.history.length < 2) return 0;

    const oldest = this.history[0];
    const newest = this.history[this.history.length - 1];
    const timeDiff = (newest.timestamp - oldest.timestamp) / 1000; // seconds
    const bytesDiff = newest.bytes - oldest.bytes;

    return timeDiff > 0 ? bytesDiff / timeDiff : 0;
  }

  reset(): void {
    this.history = [];
  }
}

/**
 * Peer stats manager - tracks individual peer statistics over time
 */
export class PeerStatsManager {
  private peerStats: Map<string, PeerStats> = new Map();
  private uploadTrackers: Map<string, SpeedTracker> = new Map();
  private downloadTrackers: Map<string, SpeedTracker> = new Map();

  /**
   * Update peer stats
   */
  updatePeer(
    peerId: string,
    address: string,
    uploadSpeed: number,
    downloadSpeed: number,
    uploaded?: number,
    downloaded?: number
  ): void {
    const existing = this.peerStats.get(peerId);

    this.peerStats.set(peerId, {
      peerId,
      address,
      uploadSpeed,
      downloadSpeed,
      uploaded: uploaded || existing?.uploaded || 0,
      downloaded: downloaded || existing?.downloaded || 0,
      lastUpdate: Date.now(),
    });

    // Track speed trends
    if (uploaded !== undefined) {
      if (!this.uploadTrackers.has(peerId)) {
        this.uploadTrackers.set(peerId, new SpeedTracker());
      }
      this.uploadTrackers.get(peerId)!.addDataPoint(uploaded);
    }

    if (downloaded !== undefined) {
      if (!this.downloadTrackers.has(peerId)) {
        this.downloadTrackers.set(peerId, new SpeedTracker());
      }
      this.downloadTrackers.get(peerId)!.addDataPoint(downloaded);
    }
  }

  /**
   * Remove peer
   */
  removePeer(peerId: string): void {
    this.peerStats.delete(peerId);
    this.uploadTrackers.delete(peerId);
    this.downloadTrackers.delete(peerId);
  }

  /**
   * Get all peer stats
   */
  getAllPeers(): PeerStats[] {
    return Array.from(this.peerStats.values());
  }

  /**
   * Get specific peer stats
   */
  getPeer(peerId: string): PeerStats | undefined {
    return this.peerStats.get(peerId);
  }

  /**
   * Clean stale peers (no update in last N seconds)
   */
  cleanStalePeers(maxAgeMs: number = 30000): void {
    const now = Date.now();
    for (const [peerId, stats] of this.peerStats.entries()) {
      if (now - stats.lastUpdate > maxAgeMs) {
        this.removePeer(peerId);
      }
    }
  }

  /**
   * Clear all stats
   */
  clear(): void {
    this.peerStats.clear();
    this.uploadTrackers.clear();
    this.downloadTrackers.clear();
  }
}
