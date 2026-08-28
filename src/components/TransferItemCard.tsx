import React from 'react';
import { 
  AlertCircle, 
  ArrowDownCircle, 
  ArrowUpCircle, 
  Check, 
  Clock, 
  Download, 
  Eye, 
  File, 
  FileArchive, 
  FileAudio, 
  FileCode, 
  FileImage, 
  FileText, 
  FileVideo, 
  Loader2, 
  X, 
  Zap 
} from 'lucide-react';
import { FileTransferItem } from '../types';
import { formatBytes, formatDuration, formatSpeed, getFileIconCategory } from '../lib/formatters';

interface TransferItemCardProps {
  item: FileTransferItem;
  onCancel: (id: string) => void;
  onPreview?: (item: FileTransferItem) => void;
  onDownload?: (item: FileTransferItem) => void;
}

export const TransferItemCard: React.FC<TransferItemCardProps> = ({
  item,
  onCancel,
  onPreview,
  onDownload,
}) => {
  const category = getFileIconCategory(item.type, item.name);

  const renderIcon = () => {
    switch (category) {
      case 'image':
        return <FileImage className="w-6 h-6 text-pink-400" />;
      case 'video':
        return <FileVideo className="w-6 h-6 text-purple-400" />;
      case 'audio':
        return <FileAudio className="w-6 h-6 text-amber-400" />;
      case 'document':
        return <FileText className="w-6 h-6 text-blue-400" />;
      case 'archive':
        return <FileArchive className="w-6 h-6 text-orange-400" />;
      case 'code':
        return <FileCode className="w-6 h-6 text-emerald-400" />;
      default:
        return <File className="w-6 h-6 text-slate-400" />;
    }
  };

  const handleDirectDownload = () => {
    if (onDownload) {
      onDownload(item);
      return;
    }
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const canPreview = category === 'image' || category === 'video' || category === 'audio' || category === 'document' || category === 'code';

  return (
    <div
      id={`transfer-item-${item.id}`}
      className="bg-white border border-slate-200 rounded-xl p-4 sm:p-5 shadow-xs hover:border-slate-300 transition"
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left: Icon & File Meta */}
        <div className="flex items-start gap-3.5 min-w-0 flex-1">
          <div className="w-11 h-11 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
            {renderIcon()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-semibold text-slate-900 truncate max-w-[240px] sm:max-w-xs md:max-w-md" title={item.name}>
                {item.name}
              </h4>
              {/* Transfer direction pill */}
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                  item.isSender
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                }`}
              >
                {item.isSender ? (
                  <>
                    <ArrowUpCircle className="w-2.5 h-2.5 text-blue-600" /> Sending
                  </>
                ) : (
                  <>
                    <ArrowDownCircle className="w-2.5 h-2.5 text-emerald-600" /> Receiving
                  </>
                )}
              </span>

              {/* Status pill */}
              {item.status === 'completed' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <Check className="w-2.5 h-2.5 text-emerald-600" /> Completed
                </span>
              )}
              {item.status === 'cancelled' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                  Cancelled
                </span>
              )}
              {item.status === 'error' && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-2.5 h-2.5" /> Error
                </span>
              )}
            </div>

            {/* Size & progress text */}
            <div className="flex items-center gap-2.5 text-xs text-slate-500 mt-1 flex-wrap font-mono">
              <span>{formatBytes(item.bytesTransferred)} / {formatBytes(item.size)}</span>
              {item.status === 'transferring' && (
                <>
                  <span>•</span>
                  <span className="text-blue-600 font-semibold flex items-center gap-1">
                    <Zap className="w-3 h-3 text-amber-500" />
                    {formatSpeed(item.speed)}
                  </span>
                  {item.timeRemaining !== undefined && item.timeRemaining > 0 && (
                    <>
                      <span>•</span>
                      <span className="text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDuration(item.timeRemaining)} left
                      </span>
                    </>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {item.status === 'transferring' && (
            <button
              id={`cancel-transfer-${item.id}`}
              onClick={() => onCancel(item.id)}
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
              title="Cancel transfer"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {item.status === 'completed' && !item.isSender && (
            <>
              {canPreview && onPreview && (
                <button
                  id={`preview-file-${item.id}`}
                  onClick={() => onPreview(item)}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  title="Preview in browser"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
              )}
              <button
                id={`download-file-${item.id}`}
                onClick={handleDirectDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save File</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mt-3">
        <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            id={`progress-bar-${item.id}`}
            className={`h-full transition-all duration-300 rounded-full ${
              item.status === 'completed'
                ? 'bg-emerald-500'
                : item.status === 'cancelled' || item.status === 'error'
                ? 'bg-rose-500'
                : 'bg-blue-600'
            }`}
            style={{ width: `${item.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
