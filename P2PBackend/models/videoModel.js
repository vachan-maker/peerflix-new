import mongoose, { mongo } from "mongoose";
import crypto from "crypto";

const videoSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        unique: true,
    },
    filename: {
        type: String,
        required: true,
    },
    originalFilename: {
        type: String,
        required: true,
    },
    filePath: {
        type: String,
        required: true,
    },
    thumbnailPath: {
        type: String,
        default: null,
    },
    fileSize: {
        type: Number,
        required: true,
    },
    mimeType: {
        type: String,
        required: true,
    },
    magnetURI: {
        type: String,
        required: true,
    },
    uploadedAt: {
        type: Date,
        default: Date.now,
    },
    // Privacy settings
    isPrivate: {
        type: Boolean,
        default: false,
    },
    accessCode: {
        type: String,
        default: null,
    },
    // Owner (user id) for ownership checks; optional for legacy entries
    owner: {
        type: String,
        default: null,
    },
    // Phase 2: P2P Discovery Fields
    uploaderId: {
        type: String,
        default: null, // Anonymous uploader ID (UUID)
    },
    viewCount: {
        type: Number,
        default: 0, // Number of times video has been viewed
    },
    likeCount: {
        type: Number,
        default: 0, // Number of likes
    },
    seedCount: {
        type: Number,
        default: 0, // Number of active seeders
    },
    uploadDate: {
        type: Date,
        default: Date.now, // When video was uploaded (same as uploadedAt)
    },
});

// Generate a random access code for private videos
videoSchema.methods.generateAccessCode = function() {
    this.accessCode = crypto.randomBytes(8).toString('hex');
    return this.accessCode;
};

// Check if access code is valid
videoSchema.methods.validateAccessCode = function(code) {
    if (!this.isPrivate) return true;
    return this.accessCode === code;
};

export default mongoose.model("Video", videoSchema);