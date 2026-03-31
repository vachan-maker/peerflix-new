import express from 'express';
import dotenv from 'dotenv';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import authRouter from './router/authRouter.js';
import vidRouter from './router/videoManagementRouter.js';
import connectDB from './config/dbConnection.js';
import Video from './models/videoModel.js';
import { seedFile, shutdown as shutdownTorrent, getClientStats } from './utils/torrent.js';
import { isPathUnderVideos } from './utils/pathUtils.js';
import { initializeViewerTracking, shutdown as shutdownViewerTracking, getViewerStats } from './utils/viewerTracking.js';
dotenv.config()

// ─── Global crash guards ────────────────────────────────────────────────────
// Prevent the server from dying on unhandled promise rejections or unexpected
// thrown errors (e.g. inside event-emitter callbacks, WebTorrent internals).
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception (server kept alive):', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection (server kept alive):', reason);
});
// ────────────────────────────────────────────────────────────────────────────
const port = process.env.PORT || 3000;

// Log environment
console.log(`🔧 Environment: ${process.env.NODE_ENV || 'not set'}`);
console.log(`⚙️  Running in ${process.env.NODE_ENV === 'development' ? 'DEVELOPMENT (auth disabled)' : 'PRODUCTION (auth required)'} mode`);

// Initialize database connection
await connectDB();

const app = express();

// Rate limiting configuration - protect against DDoS attacks
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per 15 minutes per IP
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
});

const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 uploads per hour per IP
  message: {
    success: false,
    error: 'Upload limit exceeded. Please wait before uploading again.'
  },
});

// Apply rate limiting
app.use(generalLimiter);

// Enable CORS for frontend (allow all origins in development)
app.use(cors({
	origin: true,
	credentials: true
}));

// Middleware for parsing cookies and request bodies
app.use(cookieParser());
app.use(express.json({ limit: '1mb' })); // Limit JSON payload to 1MB
app.use(express.urlencoded({ extended: true, limit: '1mb' })); // Limit form data to 1MB

// Serve static files from videos directory (for thumbnails and videos)
app.use('/media', express.static(path.join(process.cwd(), 'videos')));

// Video streaming endpoint with range support
app.get('/stream/:videoId', async (req, res) => {
	try {
		const { videoId } = req.params;
		
		// Try to find by videoId first, then by MongoDB _id
		let video = await Video.findOne({ videoId });
		if (!video) {
			video = await Video.findById(videoId).catch(() => null);
		}
		
		if (!video) {
			return res.status(404).json({ error: 'Video not found' });
		}

		const videoPath = video.filePath;

		// Validate path to prevent serving files outside videos directory
		if (!isPathUnderVideos(videoPath)) {
			console.warn('Attempt to stream file outside videos directory:', videoPath);
			return res.status(403).json({ error: 'Access denied' });
		}

		if (!fs.existsSync(videoPath)) {
			return res.status(404).json({ error: 'Video file not found' });
		}

		const stat = fs.statSync(videoPath);
		const fileSize = stat.size;
		const range = req.headers.range;

		if (range) {
			// Handle range request for seeking
			const parts = range.replace(/bytes=/, '').split('-');
			const start = parseInt(parts[0], 10);
			const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
			const chunkSize = (end - start) + 1;

			const file = fs.createReadStream(videoPath, { start, end });
			const headers = {
				'Content-Range': `bytes ${start}-${end}/${fileSize}`,
				'Accept-Ranges': 'bytes',
				'Content-Length': chunkSize,
				'Content-Type': video.mimeType || 'video/mp4',
			};

			res.writeHead(206, headers);
			file.pipe(res);
		} else {
			// No range, send entire file
			const headers = {
				'Content-Length': fileSize,
				'Content-Type': video.mimeType || 'video/mp4',
			};
			res.writeHead(200, headers);
			fs.createReadStream(videoPath).pipe(res);
		}
	} catch (error) {
		console.error('Streaming error:', error);
		res.status(500).json({ error: 'Failed to stream video' });
	}
});

// Apply stricter rate limiting to upload endpoint specifically
app.use('/api/videos/upload', uploadLimiter);

// Auth routes (register before video routes)
app.use('/api/auth', authRouter);

app.use('/api/videos', vidRouter);

// Error handling middleware for multer errors
app.use((err, req, res, next) => {
	if (err instanceof multer.MulterError) {
		if (err.code === 'LIMIT_FILE_SIZE') {
			return res.status(400).json({
				success: false,
				error: 'File too large',
				details: 'Maximum file size is 500MB'
			});
		}
		return res.status(400).json({
			success: false,
			error: 'Upload error',
			details: err.message
		});
	}

	if (err) {
		return res.status(400).json({
			success: false,
			error: err.message
		});
	}

	next();
});

// Start seeding existing videos on server startup
async function initializeSeeding() {
	try {
		console.log('🌱 Initializing seeding for existing videos...');
		const videos = await Video.find();

		if (videos.length === 0) {
			console.log('📭 No videos found to seed');
			return;
		}

		console.log(`📦 Found ${videos.length} video(s) to seed`);

		for (const video of videos) {
			try {
				// Only seed files that are under the videos directory and exist
				if (video.filePath && isPathUnderVideos(video.filePath) && fs.existsSync(video.filePath)) {
					await seedFile(video.filePath);
				} else {
					console.warn('Skipping seeding for invalid/missing filePath:', video.filePath);
				}
			} catch (error) {
				console.error(`❌ Failed to seed ${video.filename}:`, error.message);
			}
		}

		// Log seeding stats
		const stats = getClientStats();
		console.log(`✅ Seeding initialized: ${stats.activeTorrents} active torrent(s)`);
	} catch (error) {
		console.error('❌ Error initializing seeding:', error);
	}
}

// Start server
const server = app.listen(port, async () => {
	console.log(`🚀 Server listening on port ${port}`);

	// Initialize WebSocket viewer tracking
	initializeViewerTracking(server);

	// Initialize seeding after server starts
	await initializeSeeding();
});

// Graceful shutdown handler
process.on('SIGINT', async () => {
	console.log('\n🛑 Received SIGINT, shutting down gracefully...');

	// Close HTTP server
	server.close(() => {
		console.log('✅ HTTP server closed');
	});

	// Shutdown viewer tracking
	await shutdownViewerTracking();

	// Shutdown WebTorrent client
	await shutdownTorrent();

	process.exit(0);
});

process.on('SIGTERM', async () => {
	console.log('\n🛑 Received SIGTERM, shutting down gracefully...');

	// Close HTTP server
	server.close(() => {
		console.log('✅ HTTP server closed');
	});

	// Shutdown viewer tracking
	await shutdownViewerTracking();

	// Shutdown WebTorrent client
	await shutdownTorrent();

	process.exit(0);
});

// Export getViewerStats for use in other modules
export { getViewerStats };