import { Router } from "express";
import { upload } from "../config/multerConfig.js";
import { uploadVideo, listVideos, getVideoById, getMagnetUri, getStats, deleteVideo, updatePrivacy, discoverAllVideos, searchVideos, getUploaderVideos, getTrendingVideos, incrementViewCount } from "../controllers/videoController.js";
import { requireAuth } from "../middleware/auth.js";
import { 
  validateVideoId, 
  validateUpload, 
  validatePrivacyUpdate, 
  validateAccessCode, 
  validateSearch, 
  validateUploaderId,
  validateViewIncrement 
} from "../middleware/validation.js";
const vidRouter = Router();

// POST route for video upload (authenticated + validated)
vidRouter.post('/upload', validateUpload, requireAuth, upload.single('video'), uploadVideo);

// POST route to increment view count (validated)
vidRouter.post('/:id/view', validateViewIncrement, incrementViewCount);

// DISCOVERY ROUTES (Phase 2) - with validation
vidRouter.get('/discover/all', discoverAllVideos);     
vidRouter.get('/discover/search', validateSearch, searchVideos);        
vidRouter.get('/discover/trending', getTrendingVideos); 
vidRouter.get('/discover/uploader/:uploaderId', validateUploaderId, getUploaderVideos); 

// GET routes for video metadata (validated)
vidRouter.get('/', listVideos);
vidRouter.get('/stats', getStats); 
vidRouter.get('/:id/magnet', validateAccessCode, getMagnetUri); // With access code validation
vidRouter.get('/:id', validateVideoId, getVideoById);

// DELETE route (authenticated + validated)
vidRouter.delete('/:id', validateVideoId, requireAuth, deleteVideo);

// PATCH route for privacy settings (authenticated + validated)
vidRouter.patch('/:id/privacy', validatePrivacyUpdate, requireAuth, updatePrivacy);

export default vidRouter;