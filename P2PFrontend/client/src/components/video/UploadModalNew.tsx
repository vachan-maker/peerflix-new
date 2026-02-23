import { useState } from 'react';
import { Upload, X, Film, Loader2, CheckCircle, Lock, Globe, Copy, Check } from 'lucide-react';
import { uploadVideo, formatFileSize } from '@/lib/api';
import { cn } from '@/lib/utils';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function UploadModalNew({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  if (!isOpen) return null;

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile.type.startsWith('video/')) {
      setError('Please select a video file');
      return;
    }
    if (selectedFile.size > 500 * 1024 * 1024) {
      setError('File size must be less than 500MB');
      return;
    }
    setFile(selectedFile);
    setError(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) handleFileSelect(droppedFile);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setProgress(10);

    try {
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const result = await uploadVideo(file, isPrivate);
      clearInterval(progressInterval);
      setProgress(100);
      setSuccess(true);
      
      // If private, show the access code
      if (isPrivate && result.data && 'accessCode' in result.data) {
        setAccessCode((result.data as any).accessCode);
      } else {
        // Auto close for public videos
        setTimeout(() => {
          handleReset();
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      setUploading(false);
      setProgress(0);
    }
  };

  const handleReset = () => {
    setFile(null);
    setProgress(0);
    setUploading(false);
    setSuccess(false);
    setIsPrivate(false);
    setAccessCode(null);
    setCodeCopied(false);
  };

  const handleClose = () => {
    if (!uploading) {
      handleReset();
      onClose();
    }
  };

  const handleCopyCode = () => {
    if (accessCode) {
      navigator.clipboard.writeText(accessCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleDone = () => {
    handleReset();
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-[#12121f] border border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <h2 className="text-xl font-bold text-white">Upload Video</h2>
          <button
            onClick={handleClose}
            disabled={uploading}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        <div className="p-6">
          {/* Drop Zone */}
          <div
            onDrop={handleDrop}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onClick={() => !success && document.getElementById('file-input')?.click()}
            className={cn(
              "border-2 border-dashed rounded-xl p-8 text-center transition-all",
              success ? "border-green-500 bg-green-500/10 cursor-default" :
              dragOver ? "border-blue-500 bg-blue-500/10 cursor-pointer" :
              file ? "border-green-500 bg-green-500/10 cursor-pointer" :
              "border-white/10 hover:border-blue-500/50 hover:bg-white/5 cursor-pointer"
            )}
          >
            <input
              id="file-input"
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
            />

            {success ? (
              <div className="space-y-3">
                <CheckCircle className="mx-auto h-12 w-12 text-green-500" />
                <p className="font-semibold text-green-400">Upload Complete!</p>
                {isPrivate && <p className="text-sm text-yellow-400">Private video created</p>}
              </div>
            ) : file ? (
              <div className="space-y-3">
                <Film className="mx-auto h-12 w-12 text-green-400" />
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-sm text-gray-400">{formatFileSize(file.size)}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <Upload className="mx-auto h-12 w-12 text-gray-500" />
                <p className="font-semibold text-white">Drag & drop your video</p>
                <p className="text-sm text-gray-500">or click to browse</p>
                <p className="text-xs text-gray-600">Max file size: 500MB</p>
              </div>
            )}
          </div>

          {/* Privacy Selection - show after file selected, before upload */}
          {file && !uploading && !success && (
            <div className="mt-4 p-4 bg-white/5 rounded-xl border border-white/10">
              <p className="text-sm font-medium text-white mb-3">Video Visibility</p>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setIsPrivate(false)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                    !isPrivate 
                      ? "border-green-500 bg-green-500/20 text-green-400" 
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                  )}
                >
                  <Globe size={18} />
                  <span className="font-medium">Public</span>
                </button>
                <button
                  onClick={() => setIsPrivate(true)}
                  className={cn(
                    "flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition-all",
                    isPrivate 
                      ? "border-yellow-500 bg-yellow-500/20 text-yellow-400" 
                      : "border-white/10 bg-white/5 text-gray-400 hover:border-white/20"
                  )}
                >
                  <Lock size={18} />
                  <span className="font-medium">Private</span>
                </button>
              </div>
              {isPrivate && (
                <p className="mt-2 text-xs text-yellow-400/80">
                  An access code will be generated. Only users with the code can watch this video.
                </p>
              )}
            </div>
          )}

          {/* Access Code Display - show after private upload success */}
          {success && isPrivate && accessCode && (
            <div className="mt-4 p-4 bg-yellow-500/10 rounded-xl border border-yellow-500/30">
              <div className="flex items-center gap-2 mb-2">
                <Lock size={16} className="text-yellow-400" />
                <p className="text-sm font-semibold text-yellow-400">Your Access Code</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">
                Save this code! Share it only with users you want to grant access.
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-4 py-2 bg-black/30 rounded-lg text-white font-mono text-lg tracking-wider">
                  {accessCode}
                </code>
                <button
                  onClick={handleCopyCode}
                  className="p-2 bg-yellow-500/20 hover:bg-yellow-500/30 rounded-lg transition-colors"
                >
                  {codeCopied ? (
                    <Check size={20} className="text-green-400" />
                  ) : (
                    <Copy size={20} className="text-yellow-400" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Progress */}
          {uploading && (
            <div className="mt-4">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Uploading...</span>
                <span className="text-white font-medium">{progress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 mt-6">
            {success && isPrivate && accessCode ? (
              /* Done button for private videos after showing access code */
              <button
                onClick={handleDone}
                className="flex-1 h-12 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold rounded-xl transition-all shadow-lg shadow-green-500/20"
              >
                Done
              </button>
            ) : (
              <>
                <button
                  onClick={handleClose}
                  disabled={uploading}
                  className="flex-1 h-12 bg-white/5 hover:bg-white/10 text-white font-medium rounded-xl border border-white/10 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUpload}
                  disabled={!file || uploading || success}
                  className={cn(
                    "flex-1 h-12 bg-gradient-to-r from-blue-500 to-purple-500 text-white font-semibold rounded-xl transition-all",
                    "hover:from-blue-600 hover:to-purple-600 shadow-lg shadow-blue-500/20",
                    "disabled:opacity-50 disabled:cursor-not-allowed"
                  )}
                >
                  {uploading ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="animate-spin" size={18} />
                      Uploading
                    </span>
                  ) : (
                    'Upload'
                  )}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
