import mongoose from "mongoose";
import dotenv from 'dotenv';
import Video from './models/videoModel.js';

// Load environment variables
dotenv.config();

async function fixVideoPath() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.CONNECTION_STRING);
        console.log("🔗 Connected to MongoDB");

        // Find the video with the wrong path
        const brokenVideo = await Video.findOne({ 
            videoId: "de4fcb16-2c8c-46ad-8e94-838a7d374337" 
        });

        if (!brokenVideo) {
            console.error("❌ Video not found");
            process.exit(1);
        }

        console.log("📹 Found video with broken path:");
        console.log("   Current path:", brokenVideo.filePath);

        // Update to correct path
        const correctPath = "C:\\Users\\sabuv\\OneDrive\\Desktop\\PeerFlix\\P2PBackend\\videos\\de4fcb16-2c8c-46ad-8e94-838a7d374337\\original.mp4";
        
        await Video.updateOne(
            { _id: brokenVideo._id },
            { filePath: correctPath }
        );

        console.log("✅ Updated video path to:", correctPath);
        
        // Verify the update
        const updatedVideo = await Video.findById(brokenVideo._id);
        console.log("🔍 Verified new path:", updatedVideo.filePath);

    } catch (error) {
        console.error("❌ Error fixing video path:", error);
    } finally {
        await mongoose.disconnect();
        console.log("🔌 Disconnected from MongoDB");
    }
}

fixVideoPath();