import path from 'path';

// Return true if targetPath is inside the project's videos directory
export function isPathUnderVideos(targetPath) {
    if (!targetPath || typeof targetPath !== 'string') return false;
    const videosDir = path.resolve(process.cwd(), 'videos');
    const resolved = path.resolve(targetPath);
    // Ensure trailing separator on videosDir for strict startsWith
    const prefix = videosDir.endsWith(path.sep) ? videosDir : videosDir + path.sep;
    return resolved === videosDir || resolved.startsWith(prefix);
}

export function normalizeToVideos(targetPath) {
    // Resolve and return normalized absolute path under videos directory
    const resolved = path.resolve(targetPath);
    return resolved;
}
