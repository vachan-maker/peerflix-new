import mongoose from "mongoose";

const likeSchema = new mongoose.Schema({
    videoId: {
        type: String,
        required: true,
        index: true,
    },
    userId: {
        type: String,
        required: true,
        index: true,
    },
    createdAt: {
        type: Date,
        default: Date.now,
    },
});

// Compound index to ensure a user can only like a video once
likeSchema.index({ videoId: 1, userId: 1 }, { unique: true });

export default mongoose.model("Like", likeSchema);
