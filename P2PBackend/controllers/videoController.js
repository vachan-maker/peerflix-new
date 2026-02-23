import { seedFile, getClientStats } from "../utils/torrent.js";
import { generateThumbnail } from "../utils/thumbnail.js";
import Video from "../models/videoModel.js";
import path from "path";
import { randomUUID } from "crypto";

const uploadVideo = async (req, res) => {
    try {
        // Check if file was uploaded
        if (!req.file) {
            return res.status(400).json({
                success: false,
                error: "No video file uploaded"
            });
        }

        // Get videoId from multer middleware (set in multerConfig.js)
        const videoId = req.videoId;

        // Generate thumbnail from video
        const videoDir = path.dirname(req.file.path);
        const thumbnailPath = await generateThumbnail(req.file.path, videoDir, 'thumbnail');

        // Seed the file to create magnet URI
        const { magnetURI, infoHash } = await seedFile(req.file.path);

        // Check if video should be private
        const isPrivate = req.body.isPrivate === 'true' || req.body.isPrivate === true;

        // Generate unique uploader ID (anonymous identifier)
        const uploaderId = randomUUID();

        // Create video document in database
        const video = new Video({
            videoId,
            filename: req.file.filename,
            originalFilename: req.file.originalname,
            filePath: req.file.path,
            thumbnailPath: thumbnailPath,
            fileSize: req.file.size,
            mimeType: req.file.mimetype,
            magnetURI,
            isPrivate,
            owner: req.user ? req.user.id : null,
            uploaderId, // Store anonymous uploader ID
        });

        // Generate access code if private
        if (isPrivate) {
            video.generateAccessCode();
        }

        await video.save();

        // Return success response with video details
        res.status(201).json({
            success: true,
            message: "Video uploaded successfully",
            data: {
                videoId,
                filename: req.file.filename,
                originalFilename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
                filePath: req.file.path,
                thumbnailPath: thumbnailPath,
                magnetURI: isPrivate ? null : magnetURI,
                infoHash,
                uploadedAt: video.uploadedAt,
                isPrivate: video.isPrivate,
                accessCode: video.isPrivate ? video.accessCode : null,
                uploaderId: uploaderId, // Return uploader ID
                viewCount: 0,
                seedCount: 0
            }
        });

    } catch (error) {
        console.error("Error uploading video:", error);

        // Handle specific error types
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                success: false,
                error: "Validation error",
                details: error.message
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                success: false,
                error: "Video with this ID already exists"
            });
        }

        // Generic error response
        res.status(500).json({
            success: false,
            error: "Failed to upload video",
            details: error.message
        });
    }
};

// List all videos
const listVideos = async (req, res) => {
    try {
        // Retrieve all videos, sorted by upload date (newest first)
        const videos = await Video.find()
            .sort({ uploadedAt: -1 })
            .select('-__v'); // Exclude version key

        // Hide magnet URI and access code for private videos in public listing
        const sanitizedVideos = videos.map(video => {
            const videoObj = video.toObject();
            if (videoObj.isPrivate) {
                videoObj.magnetURI = null; // Never expose magnet for private videos
                videoObj.accessCode = null; // Never expose access code in listing
            }
            return videoObj;
        });

        res.status(200).json({
            success: true,
            count: sanitizedVideos.length,
            data: sanitizedVideos
        });

    } catch (error) {
        console.error("Error listing videos:", error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve videos",
            details: error.message
        });
    }
};

// Get video by ID
const getVideoById = async (req, res) => {
    try {
        const { id } = req.params;

        // Try to find by videoId first, then by MongoDB _id
        let video = await Video.findOne({ videoId: id }).select('-__v');
        
        if (!video) {
            // Try finding by MongoDB _id
            video = await Video.findById(id).select('-__v').catch(() => null);
        }

        if (!video) {
            return res.status(404).json({
                success: false,
                error: "Video not found"
            });
        }

        // If video has an owner, require requester to be owner or admin
        if (video.owner && req.user && video.owner !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden: not owner' });
        }

        // Hide magnet URI and access code for private videos
        const videoObj = video.toObject();
        if (videoObj.isPrivate) {
            videoObj.magnetURI = null; // Never expose magnet publicly
            videoObj.accessCode = null; // Never expose access code
        }

        res.status(200).json({
            success: true,
            data: videoObj
        });

    } catch (error) {
        console.error("Error retrieving video:", error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve video",
            details: error.message
        });
    }
};

// Get magnet URI only
const getMagnetUri = async (req, res) => {
    try {
        const { id } = req.params;
        const { accessCode } = req.query;

        // Find video by videoId
        const video = await Video.findOne({ videoId: id }).select('magnetURI isPrivate accessCode');

        if (!video) {
            return res.status(404).json({
                success: false,
                error: "Video not found"
            });
        }

        // Check privacy - if private, require access code
        if (video.isPrivate && video.accessCode !== accessCode) {
            return res.status(403).json({
                success: false,
                error: "Access denied. This video is private and requires an access code.",
                isPrivate: true
            });
        }

        res.status(200).json({
            success: true,
            magnetURI: video.magnetURI
        });

    } catch (error) {
        console.error("Error retrieving magnet URI:", error);
        res.status(500).json({
            success: false,
            error: "Failed to retrieve magnet URI",
            details: error.message
        });
    }
};

// Get seeding statistics
const getStats = (req, res) => {
    try {
        const stats = getClientStats();
        res.status(200).json({
            success: true,
            data: stats
        });
    } catch (error) {
        console.error("Error getting stats:", error);
        res.status(500).json({
            success: false,
            error: "Failed to get seeding statistics",
            details: error.message
        });
    }
};

// Delete a video
const deleteVideo = async (req, res) => {
    try {
        const { id } = req.params;

        // Find video by videoId first, then try MongoDB _id
        let video = await Video.findOne({ videoId: id });
        
        if (!video) {
            video = await Video.findById(id).catch(() => null);
        }

        if (!video) {
            return res.status(404).json({
                success: false,
                error: "Video not found"
            });
        }

        // Delete the video file from filesystem
        const fs = await import('fs/promises');
        const path = await import('path');
        
        try {
            // Delete the video directory (contains original video and thumbnail)
            const videoDir = path.dirname(video.filePath);
            // Validate path before removing to prevent accidental deletion outside videos dir
            const { isPathUnderVideos } = await import('../utils/pathUtils.js');
            if (!isPathUnderVideos(video.filePath)) {
                console.warn('Refusing to delete files outside videos directory:', video.filePath);
            } else {
                await fs.rm(videoDir, { recursive: true, force: true });
            }
        } catch (fileError) {
            console.warn("Could not delete video files:", fileError.message);
        }

        res.status(200).json({
            success: true,
            message: "Video deleted successfully"
        });
    } catch (error) {
        console.error("Error deleting video:", error);
        res.status(500).json({
            success: false,
            error: "Failed to delete video",
            details: error.message
        });
    }
};

// Update video privacy settings
const updatePrivacy = async (req, res) => {
    try {
        const { id } = req.params;
        const { isPrivate } = req.body;

        // Find video by videoId first, then try MongoDB _id
        let video = await Video.findOne({ videoId: id });
        
        if (!video) {
            video = await Video.findById(id).catch(() => null);
        }

        if (!video) {
            return res.status(404).json({
                success: false,
                error: "Video not found"
            });
        }

        // If video has an owner, require requester to be owner or admin
        if (video.owner && req.user && video.owner !== req.user.id && !req.user.isAdmin) {
            return res.status(403).json({ success: false, error: 'Forbidden: not owner' });
        }

        // Update privacy setting
        video.isPrivate = isPrivate;
        
        // Generate access code if making private, clear if making public
        if (isPrivate) {
            video.generateAccessCode();
        } else {
            video.accessCode = null;
        }

        await video.save();

        res.status(200).json({
            success: true,
            message: isPrivate ? "Video is now private" : "Video is now public",
            data: {
                videoId: video.videoId,
                isPrivate: video.isPrivate,
                accessCode: video.isPrivate ? video.accessCode : null
            }
        });

    } catch (error) {
        console.error("Error updating privacy:", error);
        res.status(500).json({
            success: false,
            error: "Failed to update privacy settings",
            details: error.message
        });
    }
};

// ===== PHASE 2: DISCOVERY APIs =====

// Get all public videos (discover all videos on network)
const discoverAllVideos = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const sort = req.query.sort || 'newest'; // 'newest' or 'popular'
        const skip = (page - 1) * limit;

        // Build sort query
        let sortQuery = { uploadDate: -1 }; // default: newest first
        if (sort === 'popular') {
            sortQuery = { viewCount: -1, seedCount: -1 }; // most viewed + most seeded
        }

        // Get all public videos (excluding private ones)
        const videos = await Video.find({ isPrivate: false })
            .select('videoId title uploaderId uploadDate viewCount seedCount magnetURI')
            .sort(sortQuery)
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await Video.countDocuments({ isPrivate: false });

        res.status(200).json({
            success: true,
            data: videos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error discovering videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to discover videos',
            details: error.message
        });
    }
};

// Search videos by title or description
const searchVideos = async (req, res) => {
    try {
        const query = req.query.q || '';
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!query || query.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Search query required'
            });
        }

        // Case-insensitive search on title and description
        const searchRegex = new RegExp(query, 'i');
        const videos = await Video.find({
            isPrivate: false,
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        })
            .select('videoId title uploaderId uploadDate viewCount seedCount magnetURI')
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await Video.countDocuments({
            isPrivate: false,
            $or: [
                { title: searchRegex },
                { description: searchRegex }
            ]
        });

        res.status(200).json({
            success: true,
            data: videos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error searching videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search videos',
            details: error.message
        });
    }
};

// Get all videos by specific uploader
const getUploaderVideos = async (req, res) => {
    try {
        const { uploaderId } = req.params;
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        if (!uploaderId || uploaderId.trim().length === 0) {
            return res.status(400).json({
                success: false,
                error: 'Uploader ID required'
            });
        }

        // Get all public videos from this uploader, sorted newest first
        const videos = await Video.find({
            uploaderId,
            isPrivate: false
        })
            .select('videoId title uploadDate viewCount seedCount magnetURI')
            .sort({ uploadDate: -1 })
            .limit(limit)
            .skip(skip)
            .lean();

        const total = await Video.countDocuments({
            uploaderId,
            isPrivate: false
        });

        res.status(200).json({
            success: true,
            uploaderId,
            data: videos,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Error getting uploader videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get uploader videos',
            details: error.message
        });
    }
};

// Get trending videos (sorted by views + seeders)
const getTrendingVideos = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 10;
        const timeWindow = req.query.window || 'all'; // 'all', '24h', '7d'

        // Calculate date filter based on time window
        let dateFilter = new Date(0); // all time
        if (timeWindow === '24h') {
            dateFilter = new Date(Date.now() - 24 * 60 * 60 * 1000);
        } else if (timeWindow === '7d') {
            dateFilter = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        }

        // Get trending videos: sorted by views + seeders
        const videos = await Video.find({
            isPrivate: false,
            uploadDate: { $gte: dateFilter }
        })
            .select('videoId title uploaderId uploadDate viewCount seedCount magnetURI')
            .sort({
                viewCount: -1,
                seedCount: -1,
                uploadDate: -1
            })
            .limit(limit)
            .lean();

        res.status(200).json({
            success: true,
            timeWindow,
            data: videos
        });
    } catch (error) {
        console.error('Error getting trending videos:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to get trending videos',
            details: error.message
        });
    }
};

// Increment view count for a video
const incrementViewCount = async (req, res) => {
    try {
        const { id } = req.params;

        const video = await Video.findByIdAndUpdate(
            id,
            { $inc: { viewCount: 1 } },
            { new: true }
        ).lean();

        if (!video) {
            return res.status(404).json({
                success: false,
                error: 'Video not found'
            });
        }

        res.status(200).json({
            success: true,
            data: {
                videoId: video.videoId,
                viewCount: video.viewCount
            }
        });
    } catch (error) {
        console.error('Error incrementing view count:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to increment view count',
            details: error.message
        });
    }
};

export { uploadVideo, listVideos, getVideoById, getMagnetUri, getStats, deleteVideo, updatePrivacy, discoverAllVideos, searchVideos, getUploaderVideos, getTrendingVideos, incrementViewCount };