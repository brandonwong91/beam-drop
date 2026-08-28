import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Check, Copy, ExternalLink, QrCode, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  roomCode: string;
  shareUrl: string;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  roomCode,
  shareUrl,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div id="qr-modal-overlay" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <motion.div
            id="qr-modal-content"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.18 }}
            className="bg-white border border-slate-200 rounded-2xl w-full max-w-sm p-6 shadow-xl relative"
          >
            <button
              id="qr-modal-close-btn"
              onClick={onClose}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center mb-5">
              <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-blue-50 text-blue-600 mb-2">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Scan to Connect</h3>
              <p className="text-xs text-slate-500 mt-1">
                Scan with any phone camera or tablet to join instantly
              </p>
            </div>

            {/* QR Code container with high-contrast card */}
            <div id="qr-code-canvas-wrapper" className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex items-center justify-center mx-auto max-w-[220px]">
              <QRCodeSVG
                value={shareUrl}
                size={180}
                level="M"
                includeMargin={false}
              />
            </div>

            {/* 4-digit code badge */}
            <div className="mt-5 text-center">
              <span className="text-xs text-slate-500 block mb-1">Or enter 4-digit room code</span>
              <div className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-slate-100 border border-slate-200 rounded-lg">
                <span className="font-mono text-xl font-bold tracking-widest text-blue-600">
                  {roomCode}
                </span>
              </div>
            </div>

            {/* Link Copy */}
            <div className="mt-5 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1.5 pl-3">
                <span className="text-xs text-slate-600 truncate flex-1 font-mono">
                  {shareUrl}
                </span>
                <button
                  id="qr-copy-link-btn"
                  onClick={handleCopy}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-md transition shadow-xs cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
