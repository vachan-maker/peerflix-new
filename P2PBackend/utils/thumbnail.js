import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

/**
 * Generate a thumbnail from a video file using ffmpeg
 * @param {string} videoPath - Path to the video file
 * @param {string} outputDir - Directory to save the thumbnail
 * @param {string} filename - Output filename (without extension)
 * @returns {Promise<string>} - Path to the generated thumbnail
 */
export async function generateThumbnail(videoPath, outputDir, filename = 'thumbnail') {
    const thumbnailPath = path.join(outputDir, `${filename}.jpg`);
    
    return new Promise((resolve, reject) => {
        // Extract frame at 1 second (or 0 if video is shorter)
        const ffmpeg = spawn('ffmpeg', [
            '-i', videoPath,
            '-ss', '00:00:01',  // Seek to 1 second
            '-vframes', '1',    // Extract 1 frame
            '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2', // Resize to 640x360
            '-y',               // Overwrite output file
            thumbnailPath
        ]);

        let stderr = '';
        
        ffmpeg.stderr.on('data', (data) => {
            stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
            if (code === 0 && fs.existsSync(thumbnailPath)) {
                console.log(`✅ Thumbnail generated: ${thumbnailPath}`);
                resolve(thumbnailPath);
            } else {
                // Try at 0 seconds if 1 second failed (video might be too short)
                const ffmpegRetry = spawn('ffmpeg', [
                    '-i', videoPath,
                    '-ss', '00:00:00',
                    '-vframes', '1',
                    '-vf', 'scale=640:360:force_original_aspect_ratio=decrease,pad=640:360:(ow-iw)/2:(oh-ih)/2',
                    '-y',
                    thumbnailPath
                ]);

                ffmpegRetry.on('close', (retryCode) => {
                    if (retryCode === 0 && fs.existsSync(thumbnailPath)) {
                        console.log(`✅ Thumbnail generated (from start): ${thumbnailPath}`);
                        resolve(thumbnailPath);
                    } else {
                        console.error(`❌ Failed to generate thumbnail: ${stderr}`);
                        resolve(null); // Return null instead of rejecting to not break upload
                    }
                });

                ffmpegRetry.on('error', (err) => {
                    console.error(`❌ FFmpeg not found or error: ${err.message}`);
                    console.log('💡 Install ffmpeg to enable thumbnail generation');
                    resolve(null);
                });
            }
        });

        ffmpeg.on('error', (err) => {
            console.error(`❌ FFmpeg not found or error: ${err.message}`);
            console.log('💡 Install ffmpeg to enable thumbnail generation');
            resolve(null); // Return null instead of rejecting to not break upload
        });
    });
}
