import { useEffect, useRef, useState, useCallback } from 'react';
import { BACKEND_URL } from '@/lib/api';

interface PeerInfo {
  id: string;
  address: string;
  uploadSpeed?: number;
  downloadSpeed?: number;
}

interface ViewerStats {
  viewerCount: number;
  isConnected: boolean;
  uploadSpeed: number;
  totalUploaded: number;
  totalPeers: number;
  peers: PeerInfo[];
}

/**
 * Hook to track viewers watching a video via WebSocket
 * Reports the current user as a viewer and receives real-time viewer counts and upload stats
 */
export function useViewerTracking(videoId: string | null | undefined): ViewerStats {
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [viewerCount, setViewerCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [uploadSpeed, setUploadSpeed] = useState(0);
  const [totalUploaded, setTotalUploaded] = useState(0);
  const [totalPeers, setTotalPeers] = useState(0);
  const [peers, setPeers] = useState<PeerInfo[]>([]);

  const connect = useCallback(() => {
    if (!videoId) return;

    // Build WebSocket URL from backend URL
    const wsUrl = BACKEND_URL.replace(/^http/, 'ws') + '/ws/viewers';
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('[ViewerTracking] Connected to viewer tracking');
        setIsConnected(true);
        
        // Join the video room
        ws.send(JSON.stringify({
          type: 'join',
          videoId
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          
          switch (message.type) {
            case 'viewerCount':
              if (message.videoId === videoId) {
                setViewerCount(message.count);
              }
              break;
            case 'stats':
              // Find viewer count for current video in stats
              const videoStats = message.videos?.find((v: { videoId: string }) => v.videoId === videoId);
              if (videoStats) {
                setViewerCount(videoStats.viewers);
              }
              
              // Update torrent stats
              if (typeof message.uploadSpeed === 'number') {
                setUploadSpeed(message.uploadSpeed);
              }
              if (typeof message.totalUploaded === 'number') {
                setTotalUploaded(message.totalUploaded);
              }
              if (typeof message.totalPeers === 'number') {
                setTotalPeers(message.totalPeers);
              }
              
              // Build stable peer list from torrent data
              if (message.torrents && Array.isArray(message.torrents)) {
                const allPeers: PeerInfo[] = [];
                message.torrents.forEach((torrent: { connectedPeers?: Array<{ address?: string; uploadSpeed?: number; downloadSpeed?: number }> }, torrentIndex: number) => {
                  if (torrent.connectedPeers && Array.isArray(torrent.connectedPeers)) {
                    torrent.connectedPeers.forEach((peer, peerIndex: number) => {
                      allPeers.push({
                        id: peer.address || `peer-${torrentIndex}-${peerIndex}`,
                        address: peer.address || `Peer ${peerIndex + 1}`,
                        uploadSpeed: peer.uploadSpeed,
                        downloadSpeed: peer.downloadSpeed
                      });
                    });
                  }
                });
                setPeers(allPeers);
              }
              break;
            case 'connected':
              console.log('[ViewerTracking]', message.message);
              break;
            case 'pong':
              // Heartbeat response
              break;
          }
        } catch (error) {
          console.error('[ViewerTracking] Error parsing message:', error);
        }
      };

      ws.onclose = () => {
        console.log('[ViewerTracking] Disconnected');
        setIsConnected(false);
        wsRef.current = null;
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          if (videoId) {
            connect();
          }
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('[ViewerTracking] WebSocket error:', error);
        ws.close();
      };
    } catch (error) {
      console.error('[ViewerTracking] Failed to connect:', error);
    }
  }, [videoId]);

  // Connect when videoId changes
  useEffect(() => {
    if (videoId) {
      connect();
    }

    return () => {
      // Clean up on unmount or videoId change
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      
      if (wsRef.current) {
        // Send leave message before closing
        if (wsRef.current.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({ type: 'leave' }));
        }
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [videoId, connect]);

  // Heartbeat to keep connection alive
  useEffect(() => {
    const interval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ type: 'ping' }));
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  return { viewerCount, isConnected, uploadSpeed, totalUploaded, totalPeers, peers };
}
