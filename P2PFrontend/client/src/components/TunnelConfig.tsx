import { useState, useEffect } from 'react';
import { Settings, Globe, Server, Check, X, Copy, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TunnelConfigProps {
  isOpen: boolean;
  onClose: () => void;
}

export function TunnelConfig({ isOpen, onClose }: TunnelConfigProps) {
  const [backendUrl, setBackendUrl] = useState('');
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('PEERFLIX_BACKEND_URL');
    if (stored) {
      setBackendUrl(stored);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (backendUrl.trim()) {
      // Remove trailing slash
      const cleanUrl = backendUrl.trim().replace(/\/$/, '');
      localStorage.setItem('PEERFLIX_BACKEND_URL', cleanUrl);
      setSaved(true);
      setTimeout(() => {
        window.location.reload(); // Reload to apply new backend URL
      }, 1000);
    }
  };

  const handleClear = () => {
    localStorage.removeItem('PEERFLIX_BACKEND_URL');
    setBackendUrl('');
    setSaved(true);
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isRemoteAccess = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Globe size={22} className="text-blue-400" />
            Remote Access Setup
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Status */}
          <div className={cn(
            "p-4 rounded-xl border",
            isRemoteAccess 
              ? "bg-green-500/10 border-green-500/30" 
              : "bg-blue-500/10 border-blue-500/30"
          )}>
            <div className="flex items-center gap-2 mb-2">
              {isRemoteAccess ? (
                <Globe size={18} className="text-green-400" />
              ) : (
                <Server size={18} className="text-blue-400" />
              )}
              <span className="font-semibold text-white">
                {isRemoteAccess ? 'Remote Access Active' : 'Local Development'}
              </span>
            </div>
            <p className="text-sm text-gray-400">
              {isRemoteAccess 
                ? `Accessing via: ${window.location.hostname}`
                : 'Running on localhost - only accessible from this machine'}
            </p>
          </div>

          {/* Backend URL Configuration */}
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              Backend Server URL
            </label>
            <p className="text-xs text-gray-500 mb-3">
              Enter the ngrok URL for the backend (port 3000)
            </p>
            <input
              type="url"
              value={backendUrl}
              onChange={(e) => setBackendUrl(e.target.value)}
              placeholder="https://xxxx-xx-xx-xx-xx.ngrok-free.app"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50"
            />
          </div>

          {/* Share URL */}
          {isRemoteAccess && (
            <div>
              <label className="block text-sm font-medium text-white mb-2">
                Share This URL
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-black/30 rounded-lg text-green-400 text-sm truncate">
                  {window.location.href}
                </code>
                <button
                  onClick={handleCopyUrl}
                  className="p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
                >
                  {copied ? (
                    <Check size={18} className="text-green-400" />
                  ) : (
                    <Copy size={18} className="text-gray-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="p-4 bg-white/5 rounded-xl">
            <h3 className="font-semibold text-white mb-2 flex items-center gap-2">
              <Settings size={16} />
              Setup Instructions
            </h3>
            <ol className="text-sm text-gray-400 space-y-2 list-decimal list-inside">
              <li>Start both servers (backend:3000, frontend:5000)</li>
              <li>Run <code className="text-blue-400 bg-blue-500/10 px-1 rounded">start-tunnel.bat</code></li>
              <li>Copy the ngrok URLs from the terminal</li>
              <li>Enter the backend URL above</li>
              <li>Share the frontend URL with other users</li>
            </ol>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleClear}
              className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all"
            >
              Reset to Local
            </button>
            <button
              onClick={handleSave}
              disabled={!backendUrl.trim()}
              className={cn(
                "flex-1 h-12 font-semibold rounded-xl transition-all",
                saved
                  ? "bg-green-500 text-white"
                  : "bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              {saved ? (
                <span className="flex items-center justify-center gap-2">
                  <Check size={18} />
                  Saved!
                </span>
              ) : (
                'Save & Reload'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
