import { Upload, Download, Users } from 'lucide-react';

/**
 * MINIMAL SAFE VERSION - No dependencies on statsTracker
 * Use this if the main version causes errors
 */

interface MinimalGlobalStatsPanelProps {
  totalUploadSpeed?: number;
  totalDownloadSpeed?: number;
  activePeers?: number;
}

function formatSpeedSimple(bytes: number = 0): string {
  if (!bytes || bytes <= 0) return '0 B/s';
  const kb = bytes / 1024;
  if (kb < 1000) return `${kb.toFixed(1)} KB/s`;
  return `${(kb / 1024).toFixed(2)} MB/s`;
}

export function MinimalGlobalStatsPanel({
  totalUploadSpeed = 0,
  totalDownloadSpeed = 0,
  activePeers = 0,
}: MinimalGlobalStatsPanelProps) {
  const hasActivity = totalUploadSpeed > 0 || totalDownloadSpeed > 0;

  return (
    <div className="flex items-center gap-3 px-4 py-2 bg-black/40 backdrop-blur-md rounded-xl border border-white/10">
      {/* Upload */}
      <div className="flex items-center gap-1.5">
        <Upload
          size={14}
          className={totalUploadSpeed > 0 ? "text-green-400" : "text-gray-500"}
        />
        <span className="text-xs font-mono font-semibold text-green-400">
          {formatSpeedSimple(totalUploadSpeed)}
        </span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      {/* Download */}
      <div className="flex items-center gap-1.5">
        <Download
          size={14}
          className={totalDownloadSpeed > 0 ? "text-blue-400" : "text-gray-500"}
        />
        <span className="text-xs font-mono font-semibold text-blue-400">
          {formatSpeedSimple(totalDownloadSpeed)}
        </span>
      </div>

      <div className="w-px h-4 bg-white/20" />

      {/* Peers */}
      <div className="flex items-center gap-1.5">
        <Users size={14} className="text-purple-400" />
        <span className="text-xs font-mono font-semibold text-purple-400">
          {activePeers}
        </span>
      </div>
    </div>
  );
}
