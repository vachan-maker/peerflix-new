import WebTorrent from 'webtorrent';

/**
 * Singleton WebTorrent client manager
 * Manages a single WebTorrent client instance shared across all videos
 * Handles torrent lifecycle, connection pooling, and resource cleanup
 */

let clientInstance: WebTorrent.Instance | null = null;

/**
 * ICE servers for NAT traversal (STUN servers)
 * Required for WebRTC peer connections through firewalls
 */
const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:global.stun.twilio.com:3478' }
];

/**
 * Get or create the singleton WebTorrent client instance
 */
export function getWebTorrentClient(): WebTorrent.Instance {
  if (!clientInstance) {
    console.log('[WebTorrent] Initializing new client instance');

    clientInstance = new WebTorrent({
      // WebRTC configuration
      tracker: {
        rtcConfig: {
          iceServers: ICE_SERVERS
        }
      },
      // Performance tuning
      maxConns: 20,           // Max connections per torrent
      dht: true,              // Enable DHT for peer discovery
      webSeeds: true          // Enable web seed support for HTTP fallback
    });

    // Global error handler
    clientInstance.on('error', (err) => {
      console.error('[WebTorrent] Client error:', err);
    });

    // Log global stats periodically in development
    if (import.meta.env.DEV) {
      setInterval(() => {
        if (clientInstance) {
          console.log('[WebTorrent] Global stats:', {
            torrents: clientInstance.torrents.length,
            downloadSpeed: (clientInstance.downloadSpeed / 1024).toFixed(1) + ' KB/s',
            uploadSpeed: (clientInstance.uploadSpeed / 1024).toFixed(1) + ' KB/s',
            progress: clientInstance.progress
          });
        }
      }, 10000);
    }
  }

  return clientInstance;
}

/**
 * Add a torrent to the client
 * @param magnetURI - Magnet URI to add
 * @param opts - WebTorrent add options
 * @returns Promise that resolves with the torrent instance
 */
export function addTorrent(
  magnetURI: string,
  opts?: WebTorrent.TorrentOptions
): Promise<WebTorrent.Torrent> {
  return new Promise((resolve, reject) => {
    const client = getWebTorrentClient();

    // Check if torrent is already added
    const existing = client.get(magnetURI) as unknown as WebTorrent.Torrent | undefined;
    if (existing) {
      console.log('[WebTorrent] Torrent already exists, reusing:', magnetURI.substring(0, 60));
      if (existing.ready) {
        resolve(existing);
      } else {
        existing.once('ready', () => resolve(existing));
        existing.once('error', reject);
      }
      return;
    }

    console.log('[WebTorrent] Adding torrent:', magnetURI.substring(0, 60));

    const torrent = client.add(magnetURI, opts);

    // Handle torrent ready event
    torrent.on('ready', () => {
      console.log('[WebTorrent] Torrent ready:', {
        name: torrent.name,
        infoHash: torrent.infoHash,
        files: torrent.files.length
      });
      resolve(torrent);
    });

    // Handle torrent errors
    torrent.on('error', (err) => {
      console.error('[WebTorrent] Torrent error:', err);
      reject(err);
    });

    // Set a timeout for torrent initialization
    const timeout = setTimeout(() => {
      reject(new Error('Torrent initialization timeout (30s)'));
    }, 30000);

    // Clear timeout when ready
    torrent.once('ready', () => {
      clearTimeout(timeout);
    });
  });
}

/**
 * Remove a torrent from the client
 * @param torrentId - Torrent instance, infoHash, or magnetURI
 */
export function removeTorrent(torrentId: string | WebTorrent.Torrent): void {
  const client = getWebTorrentClient();
  const torrent = (typeof torrentId === 'string' ? client.get(torrentId) : torrentId) as unknown as WebTorrent.Torrent | undefined;

  if (torrent && !torrent.destroyed) {
    console.log('[WebTorrent] Removing torrent:', torrent.infoHash);
    try {
      torrent.destroy();
    } catch (e) {
      console.error('[WebTorrent] Error destroying torrent:', e);
    }
  }
}

/**
 * Get global client statistics
 */
export function getClientStats() {
  const client = clientInstance;

  if (!client) {
    return {
      torrents: 0,
      downloadSpeed: 0,
      uploadSpeed: 0,
      progress: 0,
      numPeers: 0
    };
  }

  return {
    torrents: client.torrents.length,
    downloadSpeed: client.downloadSpeed,
    uploadSpeed: client.uploadSpeed,
    progress: client.progress,
    numPeers: client.torrents.reduce((sum, t) => sum + t.numPeers, 0)
  };
}

/**
 * Destroy the WebTorrent client
 * Should only be called on app shutdown
 */
export function destroyClient(): Promise<void> {
  return new Promise((resolve) => {
    if (clientInstance) {
      console.log('[WebTorrent] Destroying client');
      clientInstance.destroy((err) => {
        if (err) {
          console.error('[WebTorrent] Error destroying client:', err);
        }
        clientInstance = null;
        resolve();
      });
    } else {
      resolve();
    }
  });
}

/**
 * Check if WebRTC is supported in the current browser
 */
export function isWebRTCSupported(): boolean {
  return !!(
    typeof RTCPeerConnection !== 'undefined' ||
    typeof webkitRTCPeerConnection !== 'undefined' ||
    typeof mozRTCPeerConnection !== 'undefined'
  );
}
