import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Play, 
  ShoppingCart, 
  Heart, 
  Eye, 
  Users, 
  Wifi, 
  WifiOff,
  ChevronDown,
  Gamepad2,
  Trophy,
  Zap,
  Star,
  Plus,
  Upload,
  Trash2,
  Lock,
  Unlock,
  MoreVertical,
  Copy,
  Check,
  Link2,
  Clock
} from 'lucide-react';
import { HeaderNew } from '@/components/layout/HeaderNew';
import { SidebarNew } from '@/components/layout/SidebarNew';
import { fetchVideos, fetchStats, deleteVideo, updateVideoPrivacy, type VideoFromAPI, type StatsResponse } from '@/lib/api';
import { UploadModalNew } from '@/components/video/UploadModalNew';
import { TunnelConfig } from '@/components/TunnelConfig';
import { cn } from '@/lib/utils';

// Category badges
const categories = [
  { name: 'All Games', icon: Gamepad2 },
  { name: 'Action', icon: Zap },
  { name: 'Adventure', icon: Trophy },
  { name: 'Racing', icon: Star },
  { name: 'Sports', icon: Users },
];

export default function HomeNew() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoFromAPI | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [tunnelConfigOpen, setTunnelConfigOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('All Games');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fetch videos
  const { data: videosData, isLoading: videosLoading, refetch } = useQuery({
    queryKey: ['videos'],
    queryFn: fetchVideos,
    refetchInterval: 30000,
  });

  // Fetch P2P stats
  const { data: statsData } = useQuery({
    queryKey: ['p2p-stats'],
    queryFn: fetchStats,
    refetchInterval: 5000,
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: deleteVideo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      setSelectedVideo(null);
    },
  });

  // Privacy mutation
  const privacyMutation = useMutation({
    mutationFn: ({ id, isPrivate }: { id: string; isPrivate: boolean }) => 
      updateVideoPrivacy(id, isPrivate),
    onSuccess: (data) => {
      console.log('Privacy updated:', data);
      // Force refetch videos
      queryClient.invalidateQueries({ queryKey: ['videos'] });
      queryClient.refetchQueries({ queryKey: ['videos'] });
    },
    onError: (error) => {
      console.error('Privacy update failed:', error);
      alert('Failed to update privacy settings');
    }
  });

  const handleDelete = (videoId: string) => {
    deleteMutation.mutate(videoId);
  };

  const handleTogglePrivacy = (videoId: string, isPrivate: boolean) => {
    privacyMutation.mutate({ id: videoId, isPrivate });
  };

  const videos = videosData?.data || [];
  const featuredVideo = videos[0];
  const trendingVideos = videos.slice(1);
  const stats: StatsResponse | undefined = statsData;

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K`;
    return views.toString();
  };

  return (
    <div className="min-h-screen bg-[#0a0a14] text-white overflow-hidden">
      {/* Gradient background effects */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-600/20 rounded-full blur-[120px]" />
        <div className="absolute top-[40%] left-[50%] w-[30%] h-[30%] bg-pink-600/10 rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <HeaderNew 
        onMenuClick={() => setSidebarOpen(true)} 
        onUploadClick={() => setUploadOpen(true)}
        onTunnelConfigClick={() => setTunnelConfigOpen(true)}
      />

      {/* Sidebar */}
      <SidebarNew isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Tunnel Config Modal */}
      <TunnelConfig isOpen={tunnelConfigOpen} onClose={() => setTunnelConfigOpen(false)} />

      {/* Main Content */}
      <main className="relative pt-20 px-4 lg:px-8 pb-8">
        <div className="max-w-[1800px] mx-auto">
          {/* P2P Status Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
            <div className="flex flex-wrap items-center gap-2 sm:gap-4">
              <div className={cn(
                "flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-xs sm:text-sm font-medium",
                isOnline 
                  ? "bg-green-500/10 border border-green-500/30 text-green-400"
                  : "bg-red-500/10 border border-red-500/30 text-red-400"
              )}>
                {isOnline ? <Wifi size={14} className="sm:w-4 sm:h-4" /> : <WifiOff size={14} className="sm:w-4 sm:h-4" />}
                <span className="hidden xs:inline">{isOnline ? 'P2P Network Online' : 'Offline'}</span>
                <span className="xs:hidden">{isOnline ? 'Online' : 'Offline'}</span>
              </div>
              
              {stats?.data && (
                <div className="hidden sm:flex items-center gap-4 text-sm text-gray-400">
                  <span className="flex items-center gap-1">
                    <Users size={14} className="text-blue-400" />
                    {stats.data.totalPeers} peers
                  </span>
                  <span>{stats.data.activeTorrents} torrents</span>
                </div>
              )}
            </div>

            <button
              onClick={() => setUploadOpen(true)}
              className="hidden sm:flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl shadow-lg shadow-blue-500/20 transition-all"
            >
              <Upload size={18} />
              <span className="hidden md:inline">Upload Video</span>
              <span className="md:hidden">Upload</span>
            </button>
          </div>

          {/* Categories */}
          <div className="flex items-center gap-2 sm:gap-3 mb-6 sm:mb-8 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
            {categories.map((cat) => (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all",
                  activeCategory === cat.name
                    ? "bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg shadow-blue-500/20"
                    : "bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/5"
                )}
              >
                <cat.icon size={16} />
                {cat.name}
              </button>
            ))}
            
            <button className="flex items-center gap-2 px-4 py-2 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white rounded-xl text-sm font-medium border border-white/5 transition-all">
              More
              <ChevronDown size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content Area */}
            <div className="lg:col-span-2 space-y-8">
              {/* Featured Video */}
              {videosLoading ? (
                <FeaturedSkeleton />
              ) : featuredVideo ? (
                <div 
                  className="relative group rounded-2xl overflow-hidden cursor-pointer bg-[#12121f] border border-white/5"
                  onClick={() => setSelectedVideo(featuredVideo)}
                >
                  <div className="aspect-[16/9] relative bg-gray-900">
                    {/* Video thumbnail using actual video frame */}
                    <video
                      src={featuredVideo.videoUrl}
                      className="w-full h-full object-cover"
                      muted
                      preload="metadata"
                      onLoadedData={(e) => {
                        const vid = e.target as HTMLVideoElement;
                        vid.currentTime = 1;
                      }}
                    />
                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                      <div className="w-20 h-20 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30">
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </div>
                    </div>

                    {/* Badge */}
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 bg-gradient-to-r from-orange-500 to-pink-500 text-white text-xs font-bold rounded-full">
                        FEATURED
                      </span>
                    </div>

                    {/* Info Overlay */}
                    <div className="absolute bottom-0 left-0 right-0 p-6">
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">
                        {featuredVideo.title}
                      </h2>
                      <p className="text-gray-300 text-sm line-clamp-2 mb-4">
                        {featuredVideo.description || 'High-quality P2P streaming experience with peer-to-peer technology'}
                      </p>
                      <div className="flex items-center gap-4">
                        <a
                          href={`/watch/${featuredVideo.videoId}`}
                          onClick={(e) => e.stopPropagation()}
                          className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl flex items-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
                        >
                          <Play size={18} className="fill-white" />
                          Watch Now
                        </a>
                        <button className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all">
                          <Heart size={20} className="text-white" />
                        </button>
                        <button className="p-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-xl border border-white/10 transition-all">
                          <Plus size={20} className="text-white" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <EmptyState onUpload={() => setUploadOpen(true)} />
              )}

              {/* Trending Section */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <Zap className="text-yellow-500" size={20} />
                    Trending Videos
                  </h2>
                  <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                    View All →
                  </button>
                </div>

                {videosLoading ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {[...Array(6)].map((_, i) => (
                      <VideoCardSkeleton key={i} />
                    ))}
                  </div>
                ) : trendingVideos.length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {trendingVideos.map((video) => (
                      <VideoCard
                        key={video._id}
                        video={video}
                        isSelected={selectedVideo?._id === video._id}
                        onClick={() => setSelectedVideo(video)}
                        formatViews={formatViews}
                        onDelete={handleDelete}
                        onTogglePrivacy={handleTogglePrivacy}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right Sidebar - Selected Video Details */}
            <div className="hidden lg:block">
              <VideoDetailPanel 
                video={selectedVideo} 
                stats={stats}
                onClose={() => setSelectedVideo(null)}
                onDelete={handleDelete}
                onTogglePrivacy={handleTogglePrivacy}
              />
            </div>
          </div>
        </div>
      </main>

      {/* Upload Modal */}
      <UploadModalNew 
        isOpen={uploadOpen} 
        onClose={() => setUploadOpen(false)}
        onSuccess={refetch}
      />
    </div>
  );
}

// Video Card Component
function VideoCard({ 
  video, 
  isSelected, 
  onClick,
  formatViews,
  onDelete,
  onTogglePrivacy
}: { 
  video: VideoFromAPI; 
  isSelected: boolean;
  onClick: () => void;
  formatViews: (views: number) => string;
  onDelete: (videoId: string) => void;
  onTogglePrivacy: (videoId: string, isPrivate: boolean) => void;
}) {
  const [thumbnailError, setThumbnailError] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopyAccessCode = () => {
    if (video.accessCode) {
      navigator.clipboard.writeText(video.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  return (
    <div className="relative">
      <a
        href={`/watch/${video.videoId}`}
        onClick={(e) => {
          e.preventDefault();
          onClick();
        }}
        className={cn(
          "group relative rounded-xl overflow-hidden cursor-pointer transition-all duration-300 block",
          "bg-[#12121f] border hover:scale-[1.02] hover:shadow-xl hover:shadow-blue-500/10",
          isSelected ? "border-blue-500 ring-2 ring-blue-500/50" : "border-white/5"
        )}
      >
        <div className="aspect-[16/9] relative bg-gray-900">
          {/* Use video element as thumbnail with poster fallback */}
          {!thumbnailError ? (
            <video
              src={video.videoUrl}
              className="w-full h-full object-cover"
              muted
              preload="metadata"
              onLoadedData={(e) => {
                // Seek to 1 second to get a good thumbnail frame
                const vid = e.target as HTMLVideoElement;
                vid.currentTime = 1;
              }}
              onError={() => setThumbnailError(true)}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-blue-900/50 to-purple-900/50">
              <span className="text-white/60 text-sm">{video.title.substring(0, 15)}...</span>
            </div>
          )}
          
          {/* Hover Overlay with Watch Now button */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all">
            <div className="absolute inset-0 flex items-center justify-center">
              <a
                href={`/watch/${video.videoId}`}
                className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-full flex items-center justify-center border border-white/30 transform scale-0 group-hover:scale-100 transition-transform"
              >
                <Play className="w-5 h-5 text-white fill-white ml-0.5" />
              </a>
            </div>
          </div>

          {/* Privacy Badge */}
          {video.isPrivate && (
            <div className="absolute top-2 left-2">
              <span className="px-2 py-1 bg-yellow-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                <Lock size={10} />
                Private
              </span>
            </div>
          )}

          {/* P2P Badge */}
          {video.magnetURI && (
            <div className="absolute top-2 right-2">
              <span className="px-2 py-1 bg-green-500/80 backdrop-blur-sm text-white text-[10px] font-bold rounded-full flex items-center gap-1">
                <Wifi size={10} />
                P2P
            </span>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="font-semibold text-white text-sm line-clamp-1 mb-2">
          {video.title}
        </h3>
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span className="flex items-center gap-1">
            <Eye size={12} />
            {formatViews(Number(video.views) || 0)}
          </span>
          <span className="flex items-center gap-1">
            <Heart size={12} />
            {formatViews(Number(video.likes) || 0)}
          </span>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          {video.seedCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users size={12} />
              {video.seedCount} seeders
            </span>
          )}
          {video.uploadDate && (
            <span className="flex items-center gap-1">
              <Clock size={12} />
              {new Date(video.uploadDate).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
    </a>

    {/* Action Menu Button */}
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        setShowMenu(!showMenu);
      }}
      className="absolute top-2 right-12 z-10 p-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-sm rounded-full transition-all opacity-0 group-hover:opacity-100"
    >
      <MoreVertical size={14} className="text-white" />
    </button>

    {/* Dropdown Menu */}
    {showMenu && (
      <>
        <div 
          className="fixed inset-0 z-20" 
          onClick={() => setShowMenu(false)}
        />
        <div className="absolute top-10 right-2 z-30 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-xl overflow-hidden min-w-[160px]">
          {/* Privacy Toggle */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onTogglePrivacy(video.videoId, !video.isPrivate);
              setShowMenu(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors"
          >
            {video.isPrivate ? (
              <>
                <Unlock size={14} className="text-green-400" />
                Make Public
              </>
            ) : (
              <>
                <Lock size={14} className="text-yellow-400" />
                Make Private
              </>
            )}
          </button>

          {/* Copy Access Code (only for private videos) */}
          {video.isPrivate && video.accessCode && (
            <>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCopyAccessCode();
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors border-t border-white/5"
              >
                {copied ? (
                  <>
                    <Check size={14} className="text-green-400" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy size={14} className="text-blue-400" />
                    Copy Access Code
                  </>
                )}
              </button>
              
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const shareUrl = `${window.location.origin}/watch/${video.videoId}?code=${video.accessCode}`;
                  navigator.clipboard.writeText(shareUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
                className="w-full px-4 py-2.5 text-left text-sm text-white hover:bg-white/10 flex items-center gap-2 transition-colors border-t border-white/5"
              >
                <Link2 size={14} className="text-purple-400" />
                Copy Share Link with Code
              </button>
            </>
          )}

          {/* Delete */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
                onDelete(video.videoId);
              }
              setShowMenu(false);
            }}
            className="w-full px-4 py-2.5 text-left text-sm text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors border-t border-white/5"
          >
            <Trash2 size={14} />
            Delete Video
          </button>
        </div>
      </>
    )}
  </div>
  );
}

// Video Detail Panel Component
function VideoDetailPanel({ 
  video, 
  stats,
  onClose,
  onDelete,
  onTogglePrivacy
}: { 
  video: VideoFromAPI | null;
  stats?: StatsResponse;
  onClose: () => void;
  onDelete: (videoId: string) => void;
  onTogglePrivacy: (videoId: string, isPrivate: boolean) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopyAccessCode = () => {
    if (video?.accessCode) {
      navigator.clipboard.writeText(video.accessCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!video) {
    return (
      <div className="sticky top-24 bg-[#12121f]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-6">
        <div className="text-center py-12">
          <div className="w-16 h-16 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
            <Play size={24} className="text-gray-600" />
          </div>
          <h3 className="text-gray-400 font-medium mb-2">No Video Selected</h3>
          <p className="text-gray-600 text-sm">Click on a video to see details</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sticky top-24 bg-[#12121f]/80 backdrop-blur-xl border border-white/5 rounded-2xl overflow-hidden">
      {/* Video Preview */}
      <div className="aspect-video relative">
        <img
          src={video.thumbnail || `https://picsum.photos/seed/${video._id}/400/225`}
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#12121f] via-transparent to-transparent" />
        
        {/* Privacy Badge */}
        {video.isPrivate && (
          <div className="absolute top-3 left-3">
            <span className="px-2 py-1 bg-yellow-500/80 backdrop-blur-sm text-white text-xs font-bold rounded-full flex items-center gap-1">
              <Lock size={12} />
              Private
            </span>
          </div>
        )}
      </div>

      <div className="p-5 space-y-4">
        <h3 className="text-lg font-bold text-white">{video.title}</h3>
        
        <p className="text-gray-400 text-sm line-clamp-3">
          {video.description || 'Experience high-quality video streaming powered by P2P technology.'}
        </p>

        {/* Privacy Controls */}
        <div className={cn(
          "rounded-xl p-3 border",
          video.isPrivate 
            ? "bg-yellow-500/10 border-yellow-500/20" 
            : "bg-green-500/10 border-green-500/20"
        )}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-sm font-medium">
              {video.isPrivate ? (
                <>
                  <Lock size={14} className="text-yellow-400" />
                  <span className="text-yellow-400">Private Video</span>
                </>
              ) : (
                <>
                  <Unlock size={14} className="text-green-400" />
                  <span className="text-green-400">Public Video</span>
                </>
              )}
            </div>
            <button
              onClick={() => onTogglePrivacy(video.videoId, !video.isPrivate)}
              className={cn(
                "px-3 py-1 text-xs font-medium rounded-lg transition-colors",
                video.isPrivate
                  ? "bg-green-500/20 text-green-400 hover:bg-green-500/30"
                  : "bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30"
              )}
            >
              {video.isPrivate ? "Make Public" : "Make Private"}
            </button>
          </div>
          
          {video.isPrivate && video.accessCode && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-white/5">
              <span className="text-xs text-gray-400">Access Code:</span>
              <code className="text-xs bg-black/30 px-2 py-1 rounded text-white font-mono">
                {video.accessCode}
              </code>
              <button
                onClick={handleCopyAccessCode}
                className="p-1 hover:bg-white/10 rounded transition-colors"
                title="Copy access code"
              >
                {copied ? (
                  <Check size={12} className="text-green-400" />
                ) : (
                  <Copy size={12} className="text-gray-400" />
                )}
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-2">
            {video.isPrivate 
              ? "Only users with the access code can view this video's P2P link" 
              : "Anyone can access this video's P2P streaming link"}
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 py-3 border-y border-white/5">
          <div className="text-center">
            <p className="text-lg font-bold text-white">{Number(video.views) || 0}</p>
            <p className="text-xs text-gray-500">Views</p>
          </div>
          <div className="text-center">
            <p className="text-lg font-bold text-white">{Number(video.likes) || 0}</p>
            <p className="text-xs text-gray-500">Likes</p>
          </div>
          {video.magnetURI && stats?.data && (
            <div className="text-center">
              <p className="text-lg font-bold text-green-400">{stats.data.totalPeers}</p>
              <p className="text-xs text-gray-500">Peers</p>
            </div>
          )}
        </div>

        {/* P2P Info */}
        {video.magnetURI && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3">
            <div className="flex items-center gap-2 text-green-400 text-sm font-medium mb-1">
              <Wifi size={14} />
              P2P Enabled
            </div>
            <p className="text-xs text-gray-500">
              This video is available via peer-to-peer streaming
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-2">
          <a
            href={`/watch/${video.videoId}`}
            className="w-full py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 transition-all"
          >
            <Play size={18} className="fill-white" />
            Watch Now
          </a>
          
          <div className="flex gap-2">
            <button className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all">
              <Heart size={16} />
              Like
            </button>
            <button className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-2 border border-white/5 transition-all">
              <ShoppingCart size={16} />
              Save
            </button>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this video? This action cannot be undone.')) {
                onDelete(video.videoId);
              }
            }}
            className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium rounded-xl flex items-center justify-center gap-2 border border-red-500/20 transition-all"
          >
            <Trash2 size={16} />
            Delete Video
          </button>
        </div>
      </div>
    </div>
  );
}

// Skeleton Components
function FeaturedSkeleton() {
  return (
    <div className="rounded-2xl overflow-hidden bg-[#12121f] border border-white/5">
      <div className="aspect-[16/9] bg-white/5 animate-pulse" />
    </div>
  );
}

function VideoCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-[#12121f] border border-white/5">
      <div className="aspect-[16/9] bg-white/5 animate-pulse" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/5 rounded animate-pulse" />
        <div className="h-3 bg-white/5 rounded w-2/3 animate-pulse" />
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ onUpload }: { onUpload: () => void }) {
  return (
    <div className="rounded-2xl bg-[#12121f] border border-white/5 p-12 text-center">
      <div className="w-20 h-20 mx-auto bg-white/5 rounded-full flex items-center justify-center mb-4">
        <Play size={32} className="text-gray-600" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">No Videos Yet</h3>
      <p className="text-gray-500 mb-6">Be the first to upload and share via P2P!</p>
      <button
        onClick={onUpload}
        className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white font-semibold rounded-xl flex items-center justify-center gap-2 mx-auto shadow-lg shadow-blue-500/20 transition-all"
      >
        <Upload size={18} />
        Upload Video
      </button>
    </div>
  );
}
