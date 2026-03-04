import { WebSocketServer } from 'ws';

// Track active viewers per video: videoId -> Set of WebSocket connections
const activeViewers = new Map();

// Track which video each connection is watching: WebSocket -> videoId
const connectionToVideo = new Map();

// WebSocket server instance
let wss = null;

/**
 * Initialize the WebSocket server for viewer tracking
 * @param {http.Server} server - HTTP server to attach WebSocket to
 */
function initializeViewerTracking(server) {
    wss = new WebSocketServer({ server, path: '/ws/viewers' });
    
    console.log('👁️  Viewer tracking WebSocket initialized on /ws/viewers');
    
    wss.on('connection', (ws, req) => {
        console.log('🔗 New viewer connection established');
        
        ws.on('message', (data) => {
            try {
                const message = JSON.parse(data);
                handleMessage(ws, message);
            } catch (error) {
                console.error('Error parsing viewer message:', error);
            }
        });
        
        ws.on('close', () => {
            handleDisconnect(ws);
        });
        
        ws.on('error', (error) => {
            console.error('WebSocket error:', error);
            handleDisconnect(ws);
        });
        
        // Send initial connection acknowledgment
        ws.send(JSON.stringify({ type: 'connected', message: 'Viewer tracking active' }));
    });
    
    // Broadcast viewer counts periodically
    setInterval(() => {
        broadcastViewerCounts();
    }, 2000);
}

/**
 * Handle incoming messages from viewers
 */
function handleMessage(ws, message) {
    const { type, videoId } = message;
    
    switch (type) {
        case 'join':
            // User started watching a video
            if (videoId) {
                // Remove from previous video if switching
                handleDisconnect(ws);
                
                // Add to new video
                if (!activeViewers.has(videoId)) {
                    activeViewers.set(videoId, new Set());
                }
                activeViewers.get(videoId).add(ws);
                connectionToVideo.set(ws, videoId);
                
                const viewerCount = activeViewers.get(videoId).size;
                console.log(`👁️  Viewer joined video ${videoId} (${viewerCount} viewers)`);
                
                // Send current viewer count back
                ws.send(JSON.stringify({
                    type: 'viewerCount',
                    videoId,
                    count: viewerCount
                }));
                
                // Broadcast updated count to all viewers of this video
                broadcastToVideo(videoId, {
                    type: 'viewerCount',
                    videoId,
                    count: viewerCount
                });
            }
            break;
            
        case 'leave':
            handleDisconnect(ws);
            break;
            
        case 'ping':
            ws.send(JSON.stringify({ type: 'pong' }));
            break;
    }
}

/**
 * Handle viewer disconnect
 */
function handleDisconnect(ws) {
    const videoId = connectionToVideo.get(ws);
    
    if (videoId && activeViewers.has(videoId)) {
        activeViewers.get(videoId).delete(ws);
        
        const remainingViewers = activeViewers.get(videoId).size;
        console.log(`👁️  Viewer left video ${videoId} (${remainingViewers} viewers remaining)`);
        
        // Clean up empty sets
        if (remainingViewers === 0) {
            activeViewers.delete(videoId);
        } else {
            // Broadcast updated count to remaining viewers
            broadcastToVideo(videoId, {
                type: 'viewerCount',
                videoId,
                count: remainingViewers
            });
        }
    }
    
    connectionToVideo.delete(ws);
}

/**
 * Broadcast a message to all viewers of a specific video
 */
function broadcastToVideo(videoId, message) {
    const viewers = activeViewers.get(videoId);
    if (viewers) {
        const messageStr = JSON.stringify(message);
        viewers.forEach(ws => {
            if (ws.readyState === ws.OPEN) {
                ws.send(messageStr);
            }
        });
    }
}

/**
 * Broadcast viewer counts to all connected clients
 */
function broadcastViewerCounts() {
    if (!wss) return;
    
    const allCounts = getViewerStats();
    const message = JSON.stringify({
        type: 'stats',
        ...allCounts
    });
    
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

/**
 * Get viewer statistics
 * @returns {object} Viewer statistics
 */
function getViewerStats() {
    const videoStats = [];
    let totalViewers = 0;
    
    activeViewers.forEach((viewers, videoId) => {
        const count = viewers.size;
        totalViewers += count;
        videoStats.push({
            videoId,
            viewers: count
        });
    });
    
    return {
        totalViewers,
        activeVideos: activeViewers.size,
        videos: videoStats
    };
}

/**
 * Get viewer count for a specific video
 * @param {string} videoId - Video ID
 * @returns {number} Number of active viewers
 */
function getVideoViewerCount(videoId) {
    const viewers = activeViewers.get(videoId);
    return viewers ? viewers.size : 0;
}

/**
 * Shutdown viewer tracking
 */
function shutdown() {
    return new Promise((resolve) => {
        if (wss) {
            wss.close(() => {
                console.log('👁️  Viewer tracking shut down');
                resolve();
            });
        } else {
            resolve();
        }
    });
}

export {
    initializeViewerTracking,
    getViewerStats,
    getVideoViewerCount,
    shutdown
};
