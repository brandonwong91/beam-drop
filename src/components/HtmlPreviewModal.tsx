import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Check, 
  Code2, 
  Copy, 
  Download, 
  ExternalLink, 
  Eye, 
  FileCode2, 
  Globe, 
  Laptop, 
  Maximize2, 
  Minimize2, 
  Monitor, 
  Play, 
  Radio, 
  RefreshCw, 
  RotateCcw, 
  RotateCw, 
  Share2, 
  Smartphone, 
  Tablet, 
  X, 
  Zap 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { HtmlPreviewSession, PeerDevice } from '../types';
import { formatBytes } from '../lib/formatters';

interface HtmlPreviewModalProps {
  session: HtmlPreviewSession | null;
  isOpen: boolean;
  onClose: () => void;
  isConnected: boolean;
  peerDevice: PeerDevice | null;
  onBroadcastToPeer?: (session: HtmlPreviewSession) => void;
  onDownloadHtml?: (session: HtmlPreviewSession) => void;
}

type ViewportMode = 'desktop' | 'tablet' | 'mobile';

export const HtmlPreviewModal: React.FC<HtmlPreviewModalProps> = ({
  session,
  isOpen,
  onClose,
  isConnected,
  peerDevice,
  onBroadcastToPeer,
  onDownloadHtml,
}) => {
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [viewportMode, setViewportMode] = useState<ViewportMode>('desktop');
  const [isLandscape, setIsLandscape] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [iframeKey, setIframeKey] = useState<number>(0);
  const [isBroadcasting, setIsBroadcasting] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const iframeRef = useRef<HTMLIFrameElement>(null);
  const modalContainerRef = useRef<HTMLDivElement>(null);

  // Reset states when a new session opens
  useEffect(() => {
    if (session) {
      setIframeKey((k) => k + 1);
    }
  }, [session?.id, session?.htmlContent]);

  // Create a memoized blob URL for "Open in New Tab"
  const blobUrl = useMemo(() => {
    if (!session?.htmlContent) return null;
    const blob = new Blob([session.htmlContent], { type: 'text/html;charset=utf-8' });
    return URL.createObjectURL(blob);
  }, [session?.htmlContent]);

  // Clean up blob URL on unmount
  useEffect(() => {
    return () => {
      if (blobUrl) {
        URL.revokeObjectURL(blobUrl);
      }
    };
  }, [blobUrl]);

  if (!isOpen || !session) return null;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(session.htmlContent);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = session.htmlContent;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleOpenNewTab = () => {
    if (blobUrl) {
      window.open(blobUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleDownload = () => {
    if (onDownloadHtml) {
      onDownloadHtml(session);
      return;
    }
    const a = document.createElement('a');
    a.href = blobUrl || `data:text/html;charset=utf-8,${encodeURIComponent(session.htmlContent)}`;
    a.download = session.fileName.endsWith('.html') || session.fileName.endsWith('.htm') 
      ? session.fileName 
      : `${session.fileName}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleReloadIframe = () => {
    setIframeKey((k) => k + 1);
  };

  const handleBroadcast = () => {
    if (onBroadcastToPeer && isConnected) {
      setIsBroadcasting(true);
      onBroadcastToPeer(session);
      setTimeout(() => setIsBroadcasting(false), 1500);
    }
  };

  // Dimensions based on mode & orientation
  const getViewportDimensions = () => {
    if (viewportMode === 'desktop') {
      return { width: '100%', height: '100%', label: '100% Desktop Viewport' };
    }
    if (viewportMode === 'tablet') {
      return isLandscape
        ? { width: '1024px', height: '640px', label: '1024 × 640 (Tablet Landscape)' }
        : { width: '768px', height: '720px', label: '768 × 720 (Tablet Portrait)' };
    }
    // mobile
    return isLandscape
      ? { width: '667px', height: '375px', label: '667 × 375 (Mobile Landscape)' }
      : { width: '375px', height: '667px', label: '375 × 667 (Mobile Portrait)' };
  };

  const { width: frameWidth, height: frameHeight, label: dimensionLabel } = getViewportDimensions();

  // Highlight or filter code lines
  const codeLines = session.htmlContent.split('\n');

  return (
    <AnimatePresence>
      <div 
        id="html-preview-overlay" 
        className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/60 backdrop-blur-xs"
      >
        <motion.div
          ref={modalContainerRef}
          id="html-preview-modal-card"
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2 }}
          className={`bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden shadow-2xl transition-all duration-200 ${
            isFullscreen 
              ? 'w-full h-full fixed inset-2 sm:inset-3 rounded-xl' 
              : 'w-full max-w-6xl h-[92vh]'
          }`}
        >
          {/* Top Header Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between px-4 sm:px-6 py-3 border-b border-slate-200 bg-slate-50/80 gap-3">
            {/* Left: Title & File Info */}
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 shadow-xs">
                <Globe className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 truncate" title={session.fileName}>
                    {session.fileName}
                  </h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-orange-50 text-orange-700 border border-orange-200 shrink-0">
                    <Zap className="w-2.5 h-2.5 text-orange-600" /> HTML5 Live Mode
                  </span>
                  {session.source === 'peer' && peerDevice && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                      Shared by {peerDevice.name}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-mono flex items-center gap-2 mt-0.5 truncate">
                  <span>{formatBytes(session.fileSize)}</span>
                  {session.title && (
                    <>
                      <span>•</span>
                      <span className="text-slate-700 truncate" title={session.title}>
                        Title: &ldquo;{session.title}&rdquo;
                      </span>
                    </>
                  )}
                </p>
              </div>
            </div>

            {/* Middle: Mode Switcher Tabs */}
            <div className="flex items-center justify-center bg-slate-200/80 p-1 rounded-xl self-center sm:self-auto shrink-0">
              <button
                id="preview-tab-btn"
                onClick={() => setActiveTab('preview')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Interactive Live View</span>
              </button>
              <button
                id="source-tab-btn"
                onClick={() => setActiveTab('code')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  activeTab === 'code'
                    ? 'bg-white text-blue-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Code2 className="w-3.5 h-3.5" />
                <span>Source Code</span>
              </button>
            </div>

            {/* Right: Quick Action Controls */}
            <div className="flex items-center justify-end gap-1.5 sm:gap-2 shrink-0">
              {/* Broadcast / Present to connected peer */}
              {isConnected && onBroadcastToPeer && (
                <button
                  id="broadcast-html-btn"
                  onClick={handleBroadcast}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer shadow-xs ${
                    isBroadcasting
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200'
                  }`}
                  title="Present and live-sync this HTML preview with connected peer"
                >
                  <Radio className={`w-3.5 h-3.5 ${isBroadcasting ? 'animate-spin' : 'text-emerald-600'}`} />
                  <span className="hidden md:inline">
                    {isBroadcasting ? 'Broadcasting...' : 'Present to Peer'}
                  </span>
                </button>
              )}

              {/* Open in Full Native New Tab */}
              <button
                id="open-html-new-tab-btn"
                onClick={handleOpenNewTab}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                title="Open HTML in a full browser new tab"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">New Tab</span>
              </button>

              {/* Download */}
              <button
                id="download-html-btn"
                onClick={handleDownload}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                title="Download HTML file"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Download</span>
              </button>

              {/* Fullscreen toggle */}
              <button
                id="fullscreen-toggle-btn"
                onClick={() => setIsFullscreen(!isFullscreen)}
                className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                title={isFullscreen ? 'Exit full screen' : 'Expand full screen'}
                aria-label="Toggle full screen"
              >
                {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
              </button>

              {/* Close Modal */}
              <button
                id="close-html-modal-btn"
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subheader: Viewport Toolbar (Visible when in Preview Tab) */}
          {activeTab === 'preview' ? (
            <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-2 bg-slate-100/90 border-b border-slate-200 text-xs text-slate-600 gap-2">
              {/* Viewport mode buttons */}
              <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
                <button
                  id="viewport-desktop-btn"
                  onClick={() => setViewportMode('desktop')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    viewportMode === 'desktop'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Full desktop layout"
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Desktop</span>
                </button>
                <button
                  id="viewport-tablet-btn"
                  onClick={() => setViewportMode('tablet')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    viewportMode === 'tablet'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Tablet frame (768px)"
                >
                  <Tablet className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Tablet</span>
                </button>
                <button
                  id="viewport-mobile-btn"
                  onClick={() => setViewportMode('mobile')}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium transition cursor-pointer ${
                    viewportMode === 'mobile'
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                  title="Mobile phone frame (375px)"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Mobile</span>
                </button>
              </div>

              {/* Dimension label & orientation toggle */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {dimensionLabel}
                </span>

                {viewportMode !== 'desktop' && (
                  <button
                    id="rotate-orientation-btn"
                    onClick={() => setIsLandscape(!isLandscape)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-medium transition cursor-pointer"
                    title="Rotate orientation (Portrait / Landscape)"
                  >
                    <RotateCw className="w-3 h-3" />
                    <span>{isLandscape ? 'Landscape' : 'Portrait'}</span>
                  </button>
                )}
              </div>

              {/* Refresh / Reload Iframe */}
              <div className="flex items-center gap-2">
                <button
                  id="reload-iframe-btn"
                  onClick={handleReloadIframe}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer"
                  title="Reload HTML and restart JS scripts"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Reload Sandbox</span>
                </button>
              </div>
            </div>
          ) : (
            /* Subheader for Code View: Search & Copy */
            <div className="flex items-center justify-between px-4 sm:px-6 py-2 bg-slate-100/90 border-b border-slate-200 text-xs text-slate-600 gap-2">
              <span className="font-mono text-xs text-slate-500">
                {codeLines.length} lines of HTML code
              </span>
              <button
                id="copy-html-source-btn"
                onClick={handleCopyCode}
                className="flex items-center gap-1 px-3 py-1 rounded-md bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold transition cursor-pointer shadow-2xs"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-bold">Copied to Clipboard!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500" />
                    <span>Copy All HTML</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Modal Main Content Area */}
          <div className="flex-1 overflow-auto bg-slate-100/50 p-2 sm:p-4 flex items-center justify-center">
            {activeTab === 'preview' ? (
              /* Live HTML Iframe Sandbox Container */
              <div
                id="html-sandbox-viewport"
                className={`flex flex-col items-center justify-center transition-all duration-300 w-full h-full ${
                  viewportMode === 'desktop'
                    ? 'w-full h-full'
                    : 'bg-slate-200/60 p-4 rounded-2xl border border-slate-300 shadow-inner'
                }`}
              >
                {/* Device Frame Wrapper (Bezel for Tablet/Mobile) */}
                <div
                  className={`bg-white rounded-xl overflow-hidden shadow-xl border border-slate-300 flex flex-col transition-all duration-300 ${
                    viewportMode === 'desktop'
                      ? 'w-full h-full rounded-none border-none shadow-none'
                      : 'relative'
                  }`}
                  style={
                    viewportMode === 'desktop'
                      ? { width: '100%', height: '100%' }
                      : { width: frameWidth, height: frameHeight, maxWidth: '100%', maxHeight: '100%' }
                  }
                >
                  {/* Mock Browser Header for Simulated Viewports */}
                  {viewportMode !== 'desktop' && (
                    <div className="bg-slate-100 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between text-[11px] text-slate-500 select-none">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-rose-400 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block"></span>
                      </div>
                      <span className="truncate max-w-[200px] font-mono text-[10px] text-slate-400">
                        {session.fileName}
                      </span>
                      <div className="w-8"></div>
                    </div>
                  )}

                  {/* The Interactive Sandbox Iframe */}
                  <iframe
                    key={iframeKey}
                    ref={iframeRef}
                    id="html-preview-iframe"
                    title={session.fileName}
                    srcDoc={session.htmlContent}
                    sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals"
                    className="w-full h-full border-0 flex-1 bg-white"
                  />
                </div>
              </div>
            ) : (
              /* Source Code View */
              <div className="w-full h-full bg-slate-900 rounded-xl overflow-auto p-4 font-mono text-xs text-slate-200 border border-slate-800 shadow-inner leading-relaxed">
                <pre className="whitespace-pre-wrap selection:bg-blue-600 selection:text-white">
                  {session.htmlContent}
                </pre>
              </div>
            )}
          </div>

          {/* Modal Footer Status Bar */}
          <div className="px-4 sm:px-6 py-2.5 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
              <span>Fully Interactive DOM Sandbox (JavaScript, CSS, Canvas & Web APIs Active)</span>
            </div>
            <div className="flex items-center gap-3">
              <span>Origin: {session.source === 'local' ? 'Your Device' : peerDevice ? peerDevice.name : 'Peer'}</span>
              <span>•</span>
              <span className="font-mono">{formatBytes(session.fileSize)}</span>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
