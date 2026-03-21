import { useState, useEffect, useRef } from 'react';
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  ArrowLeft,
  Heart,
  Share2,
  Download,
  Copy,
  Check,
  Users,
  Wifi,
  WifiOff,
  Clock,
  Eye,
  ChevronRight,
  Settings,
  SkipBack,
  SkipForward,
  Activity,
  Lock,
  Key,
} from 'lucide-react';
import { fetchVideoById, fetchStats, fetchVideos, verifyAccessCode, type VideoFromAPI, type StatsResponse } from '@/lib/api';
import { cn } from '@/lib/utils';
import { Logo } from '@/components/ui/Logo';
import { P2PNetworkGraph } from '@/components/video/P2PNetworkGraph';
import { GlobalStatsPanel } from '@/components/video/GlobalStatsPanel';
import { useViewerTracking } from '@/hooks/useViewerTracking';
import { aggregateGlobalStats } from '@/lib/statsTracker';

export default function WatchNew() {
  const [, params] = useRoute('/watch/:id');
  const videoId = params?.id;

  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [copied, setCopied] = useState(false);
  const [liked, setLiked] = useState(false);
  const [accessCode, setAccessCode] = useState('');
  const [accessGranted, setAccessGranted] = useState(false);
  const [accessError, setAccessError] = useState('');
  const [videoError, setVideoError] = useState<string | null>(null);

  // Video error handler for debugging playback issues
  const handleVideoError = (e: React.SyntheticEvent<HTMLVideoElement, Event>) => {
    const videoEl = e.currentTarget;
    const error = videoEl.error;
    const errorMessages: Record<number, string> = {
      1: 'Video loading aborted',
      2: 'Network error - check if backend is running',
      3: 'Video decoding failed',
      4: 'Video format not supported',
    };
    const msg = error ? errorMessages[error.code] || error.message : 'Unknown error';
    console.error('[PeerFlix] Video error:', error?.code, msg);
    setVideoError(msg);
  };

  // Check for access code in URL query parameter
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const codeFromUrl = urlParams.get('code');
      if (codeFromUrl) {
        setAccessCode(codeFromUrl);
      }
    } catch (error) {
      console.error('Error reading URL params:', error);
    }
  }, []);

  // Auto-verify access code if it came from URL
  useEffect(() => {
    let mounted = true;

    const verifyCode = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const codeFromUrl = urlParams.get('code');
        if (codeFromUrl && videoId && !accessGranted && mounted) {
          const result = await verifyAccessCode(videoId, codeFromUrl);
          if (mounted && result.success) {
            setAccessGranted(true);
          }
        }
      } catch (error) {
        if (mounted) {
          console.error('Error verifying access code:', error);
        }
      }
    };

    verifyCode();
    return () => { mounted = false; };
  }, [videoId, accessGranted]);

  // Fetch video
  const { data: videoData, isLoading } = useQuery({
    queryKey: ['video', videoId],
    queryFn: () => fetchVideoById(videoId!),
    enabled: !!videoId,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['p2p-stats'],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  // Fetch related videos
  const { data: relatedVideos } = useQuery({
    queryKey: ['videos'],
    queryFn: fetchVideos,
  });

  // Real-time viewer tracking via WebSocket
  const viewerStats = useViewerTracking(videoId);

  const video = videoData?.data;
  const stats: StatsResponse | undefined = statsData;
  const related = relatedVideos?.data?.filter(v => v._id !== videoId).slice(0, 5) || [];

  // Use real-time peers from viewer tracking, falling back to REST API stats
  const realtimePeers = viewerStats.peers.length > 0
    ? viewerStats.peers
    : (stats?.data?.torrents?.flatMap(t => t.connectedPeers || []) || []);
  const realtimeTotalPeers = viewerStats.totalPeers > 0
    ? viewerStats.totalPeers
    : (stats?.data?.totalPeers || 0);
  // Real upload/download speeds: prefer WebSocket data, fall back to REST API, then peer aggregation
  const realtimeUploadSpeed = viewerStats.uploadSpeed > 0
    ? viewerStats.uploadSpeed
    : (stats?.data?.uploadSpeed || 0);

  // Calculate global stats from peers
  const globalStats = aggregateGlobalStats(realtimePeers);

  // Use best available stats for the network panel:
  // Prefer direct stats from backend (most accurate), fall back to peer aggregation
  const networkUploadSpeed = realtimeUploadSpeed || globalStats.totalUploadSpeed;
  const networkDownloadSpeed = viewerStats.downloadSpeed > 0
    ? viewerStats.downloadSpeed
    : ((stats?.data?.downloadSpeed || 0) || globalStats.totalDownloadSpeed);
  const networkTotalUploaded = viewerStats.totalUploaded > 0 ? viewerStats.totalUploaded : (stats?.data?.totalUploaded || globalStats.totalUploaded);
  const networkTotalDownloaded = viewerStats.totalDownloaded > 0
    ? viewerStats.totalDownloaded
    : (stats?.data?.totalDownloaded || globalStats.totalDownloaded);

  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout | null = null;

    const handleMouseMove = () => {
      setShowControls(true);
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        if (isPlaying) setShowControls(false);
      }, 3000);
    };

    const player = playerRef.current;
    try {
      player?.addEventListener('mousemove', handleMouseMove);
    } catch (error) {
      console.error('Error adding mouse listener:', error);
    }

    return () => {
      try {
        player?.removeEventListener('mousemove', handleMouseMove);
        if (timeout) clearTimeout(timeout);
      } catch (error) {
        console.error('Error cleaning up mouse listener:', error);
      }
    };
  }, [isPlaying]);

  // Video event handlers
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      setVolume(vol);
      setIsMuted(vol === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const toggleFullscreen = () => {
    if (playerRef.current) {
      if (!isFullscreen) {
        playerRef.current.requestFullscreen?.();
      } else {
        document.exitFullscreen?.();
      }
      setIsFullscreen(!isFullscreen);
    }
  };

  const handleCopyMagnet = async () => {
    if (video?.magnetURI) {
      await navigator.clipboard.writeText(video.magnetURI);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  if (!video) {
    return <NotFoundState />;
  }

  // Check if video is private and user hasn't provided access code yet
  const isPrivateVideo = video.isPrivate === true;
  const needsAccessCode = isPrivateVideo && !accessGranted;

  // Handle access code submission
  const handleAccessCodeSubmit = async () => {
    if (!accessCode.trim()) {
      setAccessError('Please enter an access code.');
      return;
    }

    // Verify with the backend
    const result = await verifyAccessCode(videoId!, accessCode.trim());

    if (result.success) {
      setAccessGranted(true);
      setAccessError('');
    } else {
      setAccessError(result.error || 'Invalid access code. Please try again.');
    }
  };

  // Use the video URL from the transformed video object
  const videoUrl = video.videoUrl;

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
      </div>

      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a14]/80 backdrop-blur-xl border-b border-white/5">
        <div className="flex items-center justify-between px-4 lg:px-6 h-16">
          <div className="flex items-center gap-4">
            <Link href="/">
              <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                <ArrowLeft size={20} className="text-gray-400" />
              </button>
            </Link>
            <Link href="/">
              <Logo size="sm" variant="light" />
            </Link>
          </div>

          {/* P2P Status */}
          <div className="flex items-center gap-4">
            {stats && (
              <div className="hidden md:flex items-center gap-3 text-sm">
                <span className="flex items-center gap-1.5 text-green-400">
                  <Wifi size={14} />
                  P2P Active
                </span>
                <span className="text-gray-500">•</span>
                <span className="flex items-center gap-1 text-gray-400">
                  <Users size={14} />
                  {stats?.data?.totalPeers || 0} peers
                </span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative pt-16">
        <div className="max-w-[1800px] mx-auto">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-0 xl:gap-6 p-4 xl:p-6">

            {/* Video Player Section */}
            <div className="xl:col-span-2 space-y-4">
              {/* Private Video Access Prompt */}
              {needsAccessCode ? (
                <div className="relative bg-[#12121f] rounded-2xl overflow-hidden aspect-video flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10" />
                  <div className="relative text-center p-8 max-w-md">
                    <div className="w-20 h-20 mx-auto bg-yellow-500/20 rounded-full flex items-center justify-center mb-6">
                      <Lock size={40} className="text-yellow-400" />
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">Private Video</h2>
                    <p className="text-gray-400 mb-6">
                      This video is private. Enter the access code to watch and access the P2P stream.
                    </p>

                    <div className="space-y-4">
                      <div className="relative">
                        <Key size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
                        <input
                          type="text"
                          value={accessCode}
                          onChange={(e) => setAccessCode(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAccessCodeSubmit()}
                          placeholder="Enter access code"
                          className="w-full pl-12 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 focus:ring-2 focus:ring-yellow-500/20"
                        />
                      </div>

                      {accessError && (
                        <p className="text-red-400 text-sm">{accessError}</p>
                      )}

                      <button
                        onClick={handleAccessCodeSubmit}
                        className="w-full py-3 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-xl transition-all"
                      >
                        Unlock Video
                      </button>
                    </div>

                    <p className="text-xs text-gray-500 mt-4">
                      Don't have the access code? Ask the video owner to share it with you.
                    </p>
                  </div>
                </div>
              ) : (
                /* Video Player */
                <div
                  ref={playerRef}
                  className="relative bg-black rounded-2xl overflow-hidden group aspect-video"
                >
                  {/* Private badge */}
                  {isPrivateVideo && (
                    <div className="absolute top-4 left-4 z-10 px-3 py-1.5 bg-yellow-500/80 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1.5">
                      <Lock size={12} />
                      Private
                    </div>
                  )}

                  {/* Global Stats Panel - Top Right Overlay */}
                  {video.magnetURI && (
                    <div className="absolute top-4 right-4 z-10">
                      <GlobalStatsPanel
                        totalUploadSpeed={networkUploadSpeed}
                        totalDownloadSpeed={networkDownloadSpeed}
                        totalUploaded={networkTotalUploaded}
                        totalDownloaded={networkTotalDownloaded}
                        activePeers={realtimeTotalPeers}
                        variant="compact"
                      />
                    </div>
                  )}

                  <video
                    ref={videoRef}
                    src={videoUrl}
                    className="w-full h-full object-contain"
                    onTimeUpdate={handleTimeUpdate}
                    onLoadedMetadata={handleLoadedMetadata}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onClick={handlePlayPause}
                    onError={handleVideoError}
                    crossOrigin="anonymous"
                  />

                  {/* Video Error Display */}
                  {videoError && (
                    <div className="absolute inset-0 flex items-center justify-center bg-red-900/90">
                      <div className="text-center px-6">
                        <p className="text-white text-lg font-semibold mb-2">Playback Error</p>
                        <p className="text-red-200">{videoError}</p>
                        <p className="text-red-300 text-sm mt-2">URL: {videoUrl}</p>
                      </div>
                    </div>
                  )}

                  {/* Play/Pause Overlay */}
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <button
                        onClick={handlePlayPause}
                        className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 hover:bg-white/30 transition-all"
                      >
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </button>
                    </div>
                  )}

                  {/* Controls */}
                  <div
                    className={cn(
                      "absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4 transition-opacity",
                      showControls ? "opacity-100" : "opacity-0"
                    )}
                  >
                    {/* Progress Bar */}
                    <div className="mb-3">
                      <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={handleSeek}
                        className="w-full h-1 bg-white/20 rounded-full appearance-none cursor-pointer
                        [&::-webkit-slider-thumb]:appearance-none
                        [&::-webkit-slider-thumb]:w-3
                        [&::-webkit-slider-thumb]:h-3
                        [&::-webkit-slider-thumb]:rounded-full
                        [&::-webkit-slider-thumb]:bg-blue-500
                        [&::-webkit-slider-thumb]:cursor-pointer
                        [&::-webkit-slider-thumb]:shadow-lg"
                        style={{
                          background: `linear-gradient(to right, #3b82f6 ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.2) ${(currentTime / (duration || 1)) * 100}%)`,
                        }}
                      />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={handlePlayPause}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {isPlaying ? (
                            <Pause size={20} className="text-white" />
                          ) : (
                            <Play size={20} className="text-white fill-white" />
                          )}
                        </button>

                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <SkipBack size={18} className="text-white" />
                        </button>
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <SkipForward size={18} className="text-white" />
                        </button>

                        {/* Volume */}
                        <div className="flex items-center gap-2 group/vol">
                          <button
                            onClick={toggleMute}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                          >
                            {isMuted || volume === 0 ? (
                              <VolumeX size={20} className="text-white" />
                            ) : (
                              <Volume2 size={20} className="text-white" />
                            )}
                          </button>
                          <input
                            type="range"
                            min={0}
                            max={1}
                            step={0.1}
                            value={isMuted ? 0 : volume}
                            onChange={handleVolumeChange}
                            className="w-20 h-1 bg-white/20 rounded-full appearance-none cursor-pointer opacity-0 group-hover/vol:opacity-100 transition-opacity
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-3
                            [&::-webkit-slider-thumb]:h-3
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-white"
                          />
                        </div>

                        {/* Time */}
                        <span className="text-sm text-gray-300">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                          <Settings size={18} className="text-white" />
                        </button>
                        <button
                          onClick={toggleFullscreen}
                          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        >
                          {isFullscreen ? (
                            <Minimize size={18} className="text-white" />
                          ) : (
                            <Maximize size={18} className="text-white" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Expanded Global Stats Panel - Below Video Player */}
              {video.magnetURI && stats?.data && (
                <GlobalStatsPanel
                  totalUploadSpeed={networkUploadSpeed}
                  totalDownloadSpeed={networkDownloadSpeed}
                  totalUploaded={networkTotalUploaded}
                  totalDownloaded={networkTotalDownloaded}
                  activePeers={realtimeTotalPeers}
                  variant="expanded"
                />
              )}

              {/* Video Info */}
              <div className="bg-[#12121f]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-4 sm:p-5">
                <h1 className="text-xl sm:text-2xl font-bold text-white mb-3">{video.title}</h1>

                <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-400 mb-4">
                  <span className="flex items-center gap-1">
                    <Eye size={14} className="sm:w-4 sm:h-4" />
                    {Number(video.viewCount || video.views) || 0} views
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={14} className="sm:w-4 sm:h-4" />
                    {new Date(video.uploadDate || video.uploadedAt).toLocaleDateString()}
                  </span>
                  {video.seedCount !== undefined && video.seedCount > 0 && (
                    <span className="flex items-center gap-1 text-blue-400">
                      <Users size={14} className="sm:w-4 sm:h-4" />
                      {video.seedCount} seeders
                    </span>
                  )}
                  {video.magnetURI && (
                    <span className="flex items-center gap-1 text-green-400">
                      <Wifi size={14} className="sm:w-4 sm:h-4" />
                      P2P Enabled
                    </span>
                  )}
                </div>

                <p className="text-gray-400 text-sm sm:text-base mb-5">
                  {video.description || 'High-quality video streaming powered by P2P technology.'}
                </p>

                {/* Actions */}
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={cn(
                      "flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl text-sm font-medium transition-all",
                      liked
                        ? "bg-pink-500/20 text-pink-400 border border-pink-500/30"
                        : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/5"
                    )}
                  >
                    <Heart size={16} className={cn("sm:w-[18px] sm:h-[18px]", liked ? "fill-pink-400" : "")} />
                    <span className="hidden xs:inline">{liked ? 'Liked' : 'Like'}</span>
                  </button>

                  <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium border border-white/5 transition-all">
                    <Share2 size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden xs:inline">Share</span>
                  </button>

                  <button className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-white/5 hover:bg-white/10 text-gray-300 rounded-xl text-sm font-medium border border-white/5 transition-all">
                    <Download size={16} className="sm:w-[18px] sm:h-[18px]" />
                    <span className="hidden xs:inline">Download</span>
                  </button>

                  {video.magnetURI && (
                    <button
                      onClick={handleCopyMagnet}
                      className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 rounded-xl text-sm font-medium border border-green-500/20 transition-all"
                    >
                      {copied ? <Check size={16} className="sm:w-[18px] sm:h-[18px]" /> : <Copy size={16} className="sm:w-[18px] sm:h-[18px]" />}
                      <span className="hidden sm:inline">{copied ? 'Copied!' : 'Copy Magnet'}</span>
                      <span className="sm:hidden">{copied ? '✓' : 'Magnet'}</span>
                    </button>
                  )}
                </div>
              </div>

              {/* P2P Info Card */}
              {video.magnetURI && stats?.data && (
                <div className="bg-gradient-to-r from-green-500/10 to-blue-500/10 border border-green-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-green-500/20 rounded-xl flex items-center justify-center">
                      <Wifi size={20} className="text-green-400" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">P2P Network Stats</h3>
                      <p className="text-xs text-gray-500">Real-time peer information</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-white">{stats.data.totalPeers || 0}</p>
                      <p className="text-xs text-gray-500">Active Peers</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-white">{stats.data.activeTorrents || 0}</p>
                      <p className="text-xs text-gray-500">Total Torrents</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-green-400">{((stats.data.totalUploaded || 0) / 1024 / 1024).toFixed(1)} MB</p>
                      <p className="text-xs text-gray-500">Uploaded</p>
                    </div>
                    <div className="bg-black/20 rounded-xl p-3 text-center">
                      <p className="text-xl font-bold text-blue-400">{((stats.data.uploadSpeed || 0) / 1024).toFixed(1)} KB/s</p>
                      <p className="text-xs text-gray-500">Upload Speed</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Related Videos Sidebar */}
            <div className="mt-6 xl:mt-0 space-y-4">
              {/* Private Video Info - Only show when access code needed */}
              {needsAccessCode && (
                <div className="bg-[#12121f]/80 backdrop-blur-xl border border-yellow-500/20 rounded-2xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center">
                      <Lock size={20} className="text-yellow-400" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-white">Access Required</h2>
                      <p className="text-xs text-gray-400">Enter code to unlock P2P</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-400">
                    This video's P2P network information is protected. Enter the access code on the left to view and stream via P2P.
                  </p>
                </div>
              )}

              {/* P2P Network Graph */}
              {video.magnetURI && stats?.data && !needsAccessCode && (
                <div className="bg-[#12121f]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-white/5">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Activity size={18} className="text-green-400" />
                        P2P Network
                        {viewerStats.isConnected && (
                          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" title="Real-time connected" />
                        )}
                      </h2>
                      <span className={cn(
                        "px-2 py-1 rounded-full text-xs font-medium",
                        isPlaying
                          ? "bg-green-500/20 text-green-400 animate-pulse"
                          : "bg-gray-500/20 text-gray-400"
                      )}>
                        {isPlaying ? 'Active' : 'Idle'}
                      </span>
                    </div>
                  </div>

                  <div className="h-[280px]">
                    <P2PNetworkGraph
                      peers={realtimePeers}
                      totalPeers={realtimeTotalPeers}
                      isPlaying={isPlaying}
                    />
                  </div>

                  {/* Stats below graph */}
                  <div className="grid grid-cols-2 gap-2 p-3 bg-black/20">
                    <div className="text-center">
                      <p className="text-lg font-bold text-white">
                        {realtimeTotalPeers}
                      </p>
                      <p className="text-[10px] text-gray-500">Connected Peers</p>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-green-400">
                        {(realtimeUploadSpeed / 1024).toFixed(1)} KB/s
                      </p>
                      <p className="text-[10px] text-gray-500">Upload Speed</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-[#12121f]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  Related Videos
                  <ChevronRight size={18} className="text-gray-500" />
                </h2>

                <div className="space-y-3">
                  {related.length > 0 ? (
                    related.map((vid) => (
                      <Link key={vid._id} href={`/watch/${vid.videoId}`}>
                        <div className="flex gap-3 p-2 rounded-xl hover:bg-white/5 cursor-pointer transition-all group">
                          <div className="relative w-32 aspect-video rounded-lg overflow-hidden flex-shrink-0">
                            <video
                              src={vid.videoUrl}
                              className="w-full h-full object-cover"
                              muted
                              preload="metadata"
                              onLoadedData={(e) => {
                                const v = e.target as HTMLVideoElement;
                                v.currentTime = 1;
                              }}
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                              <Play size={16} className="text-white fill-white" />
                            </div>
                            {vid.magnetURI && (
                              <div className="absolute top-1 right-1">
                                <span className="px-1.5 py-0.5 bg-green-500/80 text-white text-[8px] font-bold rounded">
                                  P2P
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-white text-sm line-clamp-2 mb-1">
                              {vid.title}
                            </h3>
                            <p className="text-xs text-gray-500 flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <Eye size={10} />
                                {Number(vid.viewCount || vid.views) || 0} views
                              </span>
                              {vid.seedCount !== undefined && vid.seedCount > 0 && (
                                <span className="flex items-center gap-1 text-blue-400">
                                  <Users size={10} />
                                  {vid.seedCount}
                                </span>
                              )}
                            </p>
                          </div>
                        </div>
                      </Link>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm text-center py-6">
                      No related videos yet
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a14] text-white pt-20 px-6">
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="aspect-video bg-white/5 rounded-2xl animate-pulse" />
        <div className="bg-[#12121f] rounded-2xl p-5 space-y-3">
          <div className="h-8 bg-white/5 rounded w-3/4 animate-pulse" />
          <div className="h-4 bg-white/5 rounded w-1/2 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

// Not Found State
function NotFoundState() {
  return (
    <div className="min-h-screen bg-[#0a0a14] flex items-center justify-center">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
          <WifiOff size={32} className="text-gray-600" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Video Not Found</h2>
        <p className="text-gray-500 mb-6">This video doesn't exist or has been removed</p>
        <Link href="/">
          <button className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl">
            Back to Home
          </button>
        </Link>
      </div>
    </div>
  );
}
