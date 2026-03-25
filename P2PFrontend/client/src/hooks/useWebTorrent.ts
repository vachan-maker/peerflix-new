import { useEffect, useState, useRef, useCallback } from 'react';
import type WebTorrent from 'webtorrent';
import { addTorrent, removeTorrent, isWebRTCSupported } from '@/lib/webTorrentManager';

interface UseWebTorrentParams {
  magnetURI: string | null | undefined;
  videoId: string;
  fallbackUrl: string;
  autoStart?: boolean;
  maxPeers?: number;
}

export interface UseWebTorrentResult {
  videoSrc: string | null;
  videoType: 'p2p' | 'http' | null;
  isLoading: boolean;
  isReady: boolean;
  error: Error | null;
  downloadSpeed: number;
  uploadSpeed: number;
  downloaded: number;
  uploaded: number;
  numPeers: number;
  progress: number;
  retryP2P: () => void;
  forceHTTP: () => void;
}

/**
 * Custom hook for WebTorrent P2P video streaming with HTTP fallback
 *
 * Strategy: Hybrid progressive enhancement
 * 1. Start with HTTP URL (immediate playback)
 * 2. Load P2P in background (non-blocking)
 * 3. Switch to P2P when ready (if peers available)
 * 4. Fallback to HTTP on timeout/error
 *
 * @param params - Configuration parameters
 * @returns WebTorrent state and controls
 */
export function useWebTorrent(params: UseWebTorrentParams): UseWebTorrentResult {
  const {
    magnetURI,
    videoId,
    fallbackUrl,
    autoStart = true,
    maxPeers = 20
  } = params;

  // State
  const [videoSrc, setVideoSrc] = useState<string | null>(fallbackUrl);
  const [videoType, setVideoType] = useState<'p2p' | 'http' | null>('http');
  const [isLoading, setIsLoading] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [downloadSpeed, setDownloadSpeed] = useState(0);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [downloaded, setDownloaded] = useState(0);
  const [uploaded, setUploaded] = useState(0);
  const [numPeers, setNumPeers] = useState(0);
  const [progress, setProgress] = useState(0);
  const [manualHTTP, setManualHTTP] = useState(false);

  // Refs
  const torrentRef = useRef<WebTorrent.Torrent | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const updateIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Clean up resources
   */
  const cleanup = useCallback(() => {
    console.log('[useWebTorrent] Cleaning up resources for', videoId);

    // Clear intervals and timeouts
    if (updateIntervalRef.current) {
      clearInterval(updateIntervalRef.current);
      updateIntervalRef.current = null;
    }

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    // Revoke blob URL to prevent memory leak
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }

    // Remove torrent
    if (torrentRef.current) {
      removeTorrent(torrentRef.current);
      torrentRef.current = null;
    }

    // Reset state
    setIsLoading(false);
    setIsReady(false);
    setDownloadSpeed(0);
    setUploadSpeed(0);
    setNumPeers(0);
    setProgress(0);
  }, [videoId]);

  /**
   * Fallback to HTTP streaming
   */
  const fallbackToHTTP = useCallback((reason: string) => {
    console.log('[useWebTorrent] Falling back to HTTP:', reason);

    cleanup();
    setVideoSrc(fallbackUrl);
    setVideoType('http');
    setError(new Error(reason));
    setIsReady(true);
  }, [fallbackUrl, cleanup]);

  /**
   * Start P2P streaming
   */
  const startP2P = useCallback(async () => {
    if (!magnetURI || manualHTTP) {
      console.log('[useWebTorrent] P2P disabled or no magnet URI');
      setVideoSrc(fallbackUrl);
      setVideoType('http');
      setIsReady(true);
      return;
    }

    // Check WebRTC support
    if (!isWebRTCSupported()) {
      console.warn('[useWebTorrent] WebRTC not supported in this browser');
      fallbackToHTTP('WebRTC not supported in this browser');
      return;
    }

    console.log('[useWebTorrent] Starting P2P for videoId:', videoId);
    setIsLoading(true);
    setError(null);

    // Set timeout for P2P initialization (30 seconds)
    timeoutRef.current = setTimeout(() => {
      if (!blobUrlRef.current) {
        fallbackToHTTP('P2P connection timeout (30s) - no peers found');
      }
    }, 30000);

    try {
      // Add torrent
      const torrent = await addTorrent(magnetURI, {
        maxWebConns: maxPeers
      });

      if ((torrent as any).destroyed) {
        throw new Error('Torrent was destroyed before it could be used');
      }

      if (!torrent.files || torrent.files.length === 0) {
        throw new Error('No files found in torrent');
      }

      torrentRef.current = torrent;

      // Find the video file (usually the largest file)
      const videoFile = torrent.files.reduce((prev, current) => {
        return current.length > prev.length ? current : prev;
      });

      if (!videoFile) {
        throw new Error('No video file found in torrent');
      }

      console.log('[useWebTorrent] Found video file:', videoFile.name, `(${(videoFile.length / 1024 / 1024).toFixed(2)} MB)`);

      // Create blob URL for the video file
      videoFile.getBlobURL((err, blobUrl) => {
        if (err) {
          console.error('[useWebTorrent] Error creating blob URL:', err);
          fallbackToHTTP('Failed to create video blob URL');
          return;
        }

        if (!blobUrl) {
          fallbackToHTTP('Empty blob URL received');
          return;
        }

        console.log('[useWebTorrent] Blob URL created successfully');

        // Clear timeout since we successfully got the blob URL
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }

        blobUrlRef.current = blobUrl;
        setVideoSrc(blobUrl);
        setVideoType('p2p');
        setIsReady(true);
        setIsLoading(false);
      });

      // Set up event listeners for stats tracking
      const updateStats = () => {
        if (torrent.destroyed) {
          return;
        }

        setDownloadSpeed(torrent.downloadSpeed);
        setUploadSpeed(torrent.uploadSpeed);
        setDownloaded(torrent.downloaded);
        setUploaded(torrent.uploaded);
        setNumPeers(torrent.numPeers);
        setProgress(torrent.progress);
      };

      // Initial stats update
      updateStats();

      // Update stats every second
      updateIntervalRef.current = setInterval(updateStats, 1000);

      // Log peer connections
      torrent.on('wire', (wire) => {
        console.log('[useWebTorrent] Connected to peer:', wire.remoteAddress);
      });

      // Handle download completion
      torrent.on('done', () => {
        console.log('[useWebTorrent] Download complete!');
      });

      // Handle torrent errors
      torrent.on('error', (err) => {
        console.error('[useWebTorrent] Torrent error:', err);
        fallbackToHTTP('Torrent error: ' + err.message);
      });

    } catch (err) {
      console.error('[useWebTorrent] Failed to start P2P:', err);
      fallbackToHTTP(err instanceof Error ? err.message : 'Failed to initialize P2P');
    }
  }, [magnetURI, videoId, fallbackUrl, maxPeers, manualHTTP, fallbackToHTTP]);

  /**
   * Retry P2P connection
   */
  const retryP2P = useCallback(() => {
    console.log('[useWebTorrent] Retrying P2P connection');
    setManualHTTP(false);
    cleanup();
    startP2P();
  }, [cleanup, startP2P]);

  /**
   * Force HTTP streaming
   */
  const forceHTTP = useCallback(() => {
    console.log('[useWebTorrent] Forcing HTTP streaming');
    setManualHTTP(true);
    cleanup();
    setVideoSrc(fallbackUrl);
    setVideoType('http');
    setIsReady(true);
  }, [fallbackUrl, cleanup]);

  // Start P2P when magnetURI changes or autoStart becomes true
  useEffect(() => {
    if (autoStart && magnetURI && !manualHTTP) {
      startP2P();
    } else if (!magnetURI) {
      // No magnet URI, use HTTP
      setVideoSrc(fallbackUrl);
      setVideoType('http');
      setIsReady(true);
    }

    // Cleanup on unmount or when magnetURI changes
    return () => {
      cleanup();
    };
  }, [magnetURI, autoStart, manualHTTP, fallbackUrl, startP2P, cleanup]);

  return {
    videoSrc,
    videoType,
    isLoading,
    isReady,
    error,
    downloadSpeed,
    uploadSpeed,
    downloaded,
    uploaded,
    numPeers,
    progress,
    retryP2P,
    forceHTTP
  };
}
