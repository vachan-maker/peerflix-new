import { Upload, Download, Users, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatSpeed, formatBytes } from '@/lib/statsTracker';

interface GlobalStatsPanelProps {
  totalUploadSpeed: number;
  totalDownloadSpeed: number;
  totalUploaded?: number;
  totalDownloaded?: number;
  activePeers: number;
  className?: string;
  variant?: 'compact' | 'expanded';
}

export function GlobalStatsPanel({
  totalUploadSpeed,
  totalDownloadSpeed,
  totalUploaded,
  totalDownloaded,
  activePeers,
  className,
  variant = 'compact',
}: GlobalStatsPanelProps) {
  const hasActivity = totalUploadSpeed > 0 || totalDownloadSpeed > 0;

  if (variant === 'compact') {
    return (
      <div className={cn(
        "flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10",
        className
      )}>
        {/* Upload Speed */}
        <div className="flex items-center gap-1.5">
          <Upload size={14} className={cn(
            "transition-colors",
            totalUploadSpeed > 0 ? "text-green-400 animate-pulse" : "text-gray-500"
          )} />
          <span className={cn(
            "text-xs font-mono font-semibold",
            totalUploadSpeed > 0 ? "text-green-400" : "text-gray-400"
          )}>
            {formatSpeed(totalUploadSpeed)}
          </span>
        </div>

        <div className="w-px h-4 bg-white/20" />

        {/* Download Speed */}
        <div className="flex items-center gap-1.5">
          <Download size={14} className={cn(
            "transition-colors",
            totalDownloadSpeed > 0 ? "text-blue-400 animate-pulse" : "text-gray-500"
          )} />
          <span className={cn(
            "text-xs font-mono font-semibold",
            totalDownloadSpeed > 0 ? "text-blue-400" : "text-gray-400"
          )}>
            {formatSpeed(totalDownloadSpeed)}
          </span>
        </div>

        <div className="w-px h-4 bg-white/20" />

        {/* Active Peers */}
        <div className="flex items-center gap-1.5">
          <Users size={14} className="text-purple-400" />
          <span className="text-xs font-mono font-semibold text-purple-400">
            {activePeers}
          </span>
        </div>
      </div>
    );
  }

  // Expanded variant
  return (
    <div className={cn(
      "bg-gradient-to-br from-black/60 to-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4",
      className
    )}>
      <div className="flex items-center gap-2 mb-3">
        <Activity size={16} className={cn(
          "transition-colors",
          hasActivity ? "text-green-400 animate-pulse" : "text-gray-500"
        )} />
        <h3 className="text-sm font-bold text-white">Network Activity</h3>
        <span className={cn(
          "ml-auto text-xs px-2 py-0.5 rounded-full font-medium",
          hasActivity
            ? "bg-green-500/20 text-green-400"
            : "bg-gray-500/20 text-gray-400"
        )}>
          {hasActivity ? 'Active' : 'Idle'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* Upload Stats */}
        <div className="bg-black/30 rounded-xl p-3 border border-green-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Upload size={14} className="text-green-400" />
            <span className="text-xs text-gray-400">Upload</span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-green-400 font-mono">
              {formatSpeed(totalUploadSpeed)}
            </p>
            {totalUploaded !== undefined && (
              <p className="text-xs text-gray-500">
                Total: {formatBytes(totalUploaded)}
              </p>
            )}
          </div>
        </div>

        {/* Download Stats */}
        <div className="bg-black/30 rounded-xl p-3 border border-blue-500/20">
          <div className="flex items-center gap-2 mb-2">
            <Download size={14} className="text-blue-400" />
            <span className="text-xs text-gray-400">Download</span>
          </div>
          <div className="space-y-1">
            <p className="text-lg font-bold text-blue-400 font-mono">
              {formatSpeed(totalDownloadSpeed)}
            </p>
            {totalDownloaded !== undefined && (
              <p className="text-xs text-gray-500">
                Total: {formatBytes(totalDownloaded)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Active Peers Count */}
      <div className="mt-3 pt-3 border-t border-white/10">
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-400">Active Connections</span>
          <div className="flex items-center gap-1.5">
            <Users size={14} className="text-purple-400" />
            <span className="text-sm font-bold text-purple-400 font-mono">
              {activePeers} peer{activePeers !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
