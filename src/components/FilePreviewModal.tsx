import React, { useState, useEffect } from 'react';
import { Download, ExternalLink, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FileTransferItem } from '../types';
import { formatBytes, getFileIconCategory } from '../lib/formatters';

interface FilePreviewModalProps {
  item: FileTransferItem | null;
  onClose: () => void;
}

export const FilePreviewModal: React.FC<FilePreviewModalProps> = ({ item, onClose }) => {
  const [textContent, setTextContent] = useState<string | null>(null);
  const [loadingText, setLoadingText] = useState(false);

  const category = item ? getFileIconCategory(item.type, item.name) : 'other';

  useEffect(() => {
    if (!item || !item.blob) {
      setTextContent(null);
      return;
    }

    if (category === 'document' || category === 'code') {
      // Check if it's text/code readable
      if (item.type.includes('text') || item.type.includes('json') || item.type.includes('javascript') || item.name.endsWith('.txt') || item.name.endsWith('.md') || item.name.endsWith('.json') || item.name.endsWith('.csv')) {
        setLoadingText(true);
        const reader = new FileReader();
        reader.onload = () => {
          setTextContent(reader.result as string);
          setLoadingText(false);
        };
        reader.onerror = () => {
          setTextContent(null);
          setLoadingText(false);
        };
        reader.readAsText(item.blob.slice(0, 100000)); // Read first 100KB for preview
      } else {
        setTextContent(null);
      }
    } else {
      setTextContent(null);
    }
  }, [item, category]);

  if (!item) return null;

  const handleDownload = () => {
    if (item.downloadUrl) {
      const a = document.createElement('a');
      a.href = item.downloadUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  return (
    <AnimatePresence>
      <div id="file-preview-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
        <motion.div
          id="file-preview-modal"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-2xl"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/60">
            <div className="min-w-0 flex-1 mr-4">
              <h3 className="text-base font-bold text-slate-900 truncate" title={item.name}>
                {item.name}
              </h3>
              <p className="text-xs text-slate-500 font-mono">
                {formatBytes(item.size)} • {item.type || 'Binary File'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                id="preview-download-btn"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Save</span>
              </button>
              <button
                id="preview-close-btn"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Modal Body Preview Content */}
          <div className="flex-1 overflow-auto p-6 flex items-center justify-center bg-slate-50/30">
            {/* Image Preview */}
            {category === 'image' && item.downloadUrl && (
              <img
                src={item.downloadUrl}
                alt={item.name}
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-xs border border-slate-200"
              />
            )}

            {/* Video Preview */}
            {category === 'video' && item.downloadUrl && (
              <video
                src={item.downloadUrl}
                controls
                autoPlay
                className="max-h-[60vh] max-w-full rounded-lg shadow-xs border border-slate-200"
              />
            )}

            {/* Audio Preview */}
            {category === 'audio' && item.downloadUrl && (
              <div className="w-full max-w-md p-6 bg-white border border-slate-200 rounded-xl text-center shadow-xs">
                <audio src={item.downloadUrl} controls className="w-full mt-2" />
              </div>
            )}

            {/* Text Preview */}
            {(category === 'document' || category === 'code') && textContent !== null && (
              <pre className="w-full max-h-[60vh] p-4 bg-white border border-slate-200 rounded-xl font-mono text-xs text-slate-800 overflow-auto whitespace-pre-wrap">
                {textContent}
              </pre>
            )}

            {/* Fallback for generic binary/archive files */}
            {category !== 'image' && category !== 'video' && category !== 'audio' && textContent === null && (
              <div className="text-center py-12">
                <p className="text-sm text-slate-500 mb-4">
                  In-browser preview not available for this file type.
                </p>
                <button
                  onClick={handleDownload}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition shadow-xs cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download {item.name}</span>
                </button>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
