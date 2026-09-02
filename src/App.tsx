import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Globe, 
  HelpCircle, 
  Info, 
  Radio, 
  RefreshCw, 
  ShieldCheck, 
  Wifi, 
  X, 
  Zap 
} from 'lucide-react';
import { ConnectionLog, ConnectionState, FileTransferItem, HtmlPreviewSession, PeerDevice, TextSnippet } from './types';
import { WebRTCService } from './lib/webrtcService';
import { isSoundEnabled, setSoundEnabled } from './lib/soundEffects';
import { extractHtmlTitle, isHtmlFile } from './lib/formatters';
import { Header } from './components/Header';
import { PairingCard } from './components/PairingCard';
import { ConnectedDeviceBar } from './components/ConnectedDeviceBar';
import { FileDropZone } from './components/FileDropZone';
import { TransferList } from './components/TransferList';
import { QuickTextShare } from './components/QuickTextShare';
import { QRModal } from './components/QRModal';
import { FilePreviewModal } from './components/FilePreviewModal';
import { HtmlPreviewModal } from './components/HtmlPreviewModal';

export default function App() {
  const [connectionState, setConnectionState] = useState<ConnectionState>('initializing');
  const [statusMessage, setStatusMessage] = useState<string>('Initializing WebRTC...');
  const [roomCode, setRoomCode] = useState<string>('');
  const [peerDevice, setPeerDevice] = useState<PeerDevice | null>(null);
  const [transfers, setTransfers] = useState<FileTransferItem[]>([]);
  const [snippets, setSnippets] = useState<TextSnippet[]>([]);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const [isQRModalOpen, setIsQRModalOpen] = useState<boolean>(false);
  const [previewItem, setPreviewItem] = useState<FileTransferItem | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [logs, setLogs] = useState<ConnectionLog[]>([]);

  // Active HTML Live Preview Session
  const [activeHtmlSession, setActiveHtmlSession] = useState<HtmlPreviewSession | null>(null);
  const [isHtmlModalOpen, setIsHtmlModalOpen] = useState<boolean>(false);
  const [peerPresentedToast, setPeerPresentedToast] = useState<HtmlPreviewSession | null>(null);

  const webrtcServiceRef = useRef<WebRTCService | null>(null);

  // Compute shareable URL
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const shareUrl = `${origin}${pathname}?room=${roomCode}`;

  const triggerConfetti = useCallback(() => {
    try {
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}
  }, []);

  const handleTransferUpdate = useCallback((updated: FileTransferItem) => {
    setTransfers((prev) => {
      const index = prev.findIndex((t) => t.id === updated.id);
      if (index >= 0) {
        const next = [...prev];
        next[index] = updated;
        return next;
      }
      return [updated, ...prev];
    });

    if (updated.status === 'completed' && !updated.isSender) {
      triggerConfetti();
    }
  }, [triggerConfetti]);

  const handleTextReceived = useCallback((snippet: TextSnippet) => {
    setSnippets((prev) => [snippet, ...prev]);
  }, []);

  const handleHtmlPresented = useCallback((session: HtmlPreviewSession) => {
    setActiveHtmlSession(session);
    setPeerPresentedToast(session);
    setIsHtmlModalOpen(true);
  }, []);

  // Initialize service
  useEffect(() => {
    const service = new WebRTCService({
      onConnectionStateChange: (state, message) => {
        setConnectionState(state);
        if (message) setStatusMessage(message);
        if (state === 'connected') {
          setErrorMessage(null);
          setIsQRModalOpen(false);
        }
      },
      onPeerDeviceChange: (device) => {
        setPeerDevice(device);
      },
      onTransferUpdate: handleTransferUpdate,
      onTextReceived: handleTextReceived,
      onHtmlPresented: handleHtmlPresented,
      onCodeAssigned: (code) => {
        setRoomCode(code);
      },
      onLog: (newLog) => {
        setLogs((prev) => [newLog, ...prev].slice(0, 100));
      },
      onError: (err) => {
        setErrorMessage(err);
      },
    });

    webrtcServiceRef.current = service;

    // Check if URL has ?room=XXXX or #XXXX to auto-join
    const params = new URLSearchParams(window.location.search);
    const roomParam = params.get('room') || window.location.hash.replace('#', '');

    if (roomParam && /^\d{4}$/.test(roomParam)) {
      setRoomCode(roomParam);
      service.joinRoom(roomParam).catch((err) => {
        console.error('Failed to auto-join room from URL:', err);
      });
    } else {
      service.hostRoom().catch((err) => {
        console.error('Failed to host initial space:', err);
      });
    }

    return () => {
      service.cleanup();
    };
  }, [handleTransferUpdate, handleTextReceived, handleHtmlPresented]);

  const handleHostNewCode = () => {
    if (webrtcServiceRef.current) {
      setErrorMessage(null);
      webrtcServiceRef.current.hostRoom().catch((err) => {
        setErrorMessage('Failed to host space with new code');
      });
    }
  };

  const handleJoinCode = (code: string) => {
    if (webrtcServiceRef.current) {
      setErrorMessage(null);
      webrtcServiceRef.current.joinRoom(code).catch((err) => {
        setErrorMessage(err.message || 'Failed to join room');
      });
    }
  };

  const handleDisconnect = () => {
    if (webrtcServiceRef.current) {
      webrtcServiceRef.current.hostRoom().catch(() => {});
      setPeerDevice(null);
    }
  };

  const handleSelectHtmlFile = async (file: File) => {
    try {
      const htmlText = await file.text();
      const session: HtmlPreviewSession = {
        id: `html-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: file.name,
        htmlContent: htmlText,
        fileSize: file.size,
        source: 'local',
        timestamp: Date.now(),
        title: extractHtmlTitle(htmlText) || undefined,
      };

      setActiveHtmlSession(session);
      setIsHtmlModalOpen(true);

      if (webrtcServiceRef.current) {
        webrtcServiceRef.current.setActiveHtmlSession(session);
        if (connectionState === 'connected') {
          webrtcServiceRef.current.presentHtml(file.name, htmlText, file.size);
          // Also queue file transfer for peer to download
          webrtcServiceRef.current.sendFile(file).catch(() => {});
        }
      }
    } catch (err: any) {
      setErrorMessage(`Failed to read HTML file: ${err.message || 'File error'}`);
    }
  };

  const handleOpenHtmlSandboxFromTransfer = async (item: FileTransferItem) => {
    const source = item.file || item.blob;
    if (!source) return;

    try {
      let htmlText = '';
      if (typeof source.text === 'function') {
        htmlText = await source.text();
      } else {
        htmlText = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsText(source);
        });
      }

      const session: HtmlPreviewSession = {
        id: `html-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        fileName: item.name,
        htmlContent: htmlText,
        fileSize: item.size,
        source: item.isSender ? 'local' : 'peer',
        timestamp: Date.now(),
        title: extractHtmlTitle(htmlText) || undefined,
      };

      setActiveHtmlSession(session);
      setIsHtmlModalOpen(true);
      if (previewItem) {
        setPreviewItem(null);
      }
    } catch (err: any) {
      setErrorMessage(`Failed to preview HTML: ${err.message || 'File read error'}`);
    }
  };

  const handleBroadcastHtml = (session: HtmlPreviewSession) => {
    if (webrtcServiceRef.current && connectionState === 'connected') {
      webrtcServiceRef.current.presentHtml(session.fileName, session.htmlContent, session.fileSize);
    }
  };

  const handleFilesSelected = (files: File[]) => {
    if (!webrtcServiceRef.current || connectionState !== 'connected') {
      // If user dropped an HTML file while not connected, open it in HTML preview mode
      const htmlFile = files.find((f) => isHtmlFile(f.type, f.name));
      if (htmlFile) {
        handleSelectHtmlFile(htmlFile);
        return;
      }
      setErrorMessage('Please connect to a peer before sending files');
      return;
    }

    // Check if any file is HTML to auto-present
    const htmlFile = files.find((f) => isHtmlFile(f.type, f.name));
    if (htmlFile) {
      handleSelectHtmlFile(htmlFile);
    }

    files.forEach((file) => {
      // Don't send twice if already sent in handleSelectHtmlFile
      if (!htmlFile || file !== htmlFile) {
        webrtcServiceRef.current?.sendFile(file).catch((err) => {
          setErrorMessage(`Failed to send ${file.name}: ${err.message}`);
        });
      }
    });
  };

  const handlePreviewTransfer = (item: FileTransferItem) => {
    if (isHtmlFile(item.type, item.name)) {
      handleOpenHtmlSandboxFromTransfer(item);
    } else {
      setPreviewItem(item);
    }
  };

  const handleCancelTransfer = (id: string) => {
    webrtcServiceRef.current?.cancelTransfer(id);
  };

  const handleSendText = (text: string) => {
    if (webrtcServiceRef.current && connectionState === 'connected') {
      const snippet = webrtcServiceRef.current.sendText(text);
      setSnippets((prev) => [snippet, ...prev]);
    }
  };

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  const handleClearCompleted = () => {
    setTransfers((prev) => prev.filter((t) => t.status === 'transferring'));
  };

  const isConnected = connectionState === 'connected';

  return (
    <div id="webrtc-app-root" className="min-h-screen bg-[#FAFAFA] text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header */}
      <Header
        connectionState={connectionState}
        peerDevice={peerDevice}
        soundEnabled={soundOn}
        onToggleSound={handleToggleSound}
        onDisconnect={handleDisconnect}
        roomCode={roomCode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 flex flex-col justify-start">
        {/* Error Banner */}
        {errorMessage && (
          <div id="app-error-banner" className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start justify-between gap-3 text-xs sm:text-sm animate-shake shadow-xs">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-rose-700 hover:text-rose-900 text-xs font-semibold px-2 py-0.5 rounded bg-rose-100 hover:bg-rose-200 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Peer Live HTML Presentation Banner (When Peer presents HTML and user closed modal) */}
        {peerPresentedToast && !isHtmlModalOpen && (
          <div 
            id="peer-html-presentation-banner"
            className="mb-6 p-4 rounded-2xl bg-orange-50/90 border border-orange-200 text-orange-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm shadow-xs animate-fade-in"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-orange-500 text-white flex items-center justify-center shrink-0 shadow-2xs">
                <Globe className="w-5 h-5 animate-pulse" />
              </div>
              <div className="min-w-0">
                <span className="font-bold block text-slate-900">
                  {peerDevice ? peerDevice.name : 'Peer'} is presenting an interactive HTML preview
                </span>
                <span className="text-xs text-slate-600 truncate block font-mono">
                  &ldquo;{peerPresentedToast.fileName}&rdquo; {peerPresentedToast.title ? `(${peerPresentedToast.title})` : ''}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                id="open-peer-presented-html-btn"
                onClick={() => setIsHtmlModalOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Open Live Interactive View</span>
              </button>
              <button
                onClick={() => setPeerPresentedToast(null)}
                className="p-1.5 text-orange-400 hover:text-orange-700 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Active HTML Preview Quick Launcher (When User loaded an HTML file) */}
        {activeHtmlSession && !peerPresentedToast && !isHtmlModalOpen && (
          <div 
            id="active-html-banner"
            className="mb-6 p-3.5 rounded-2xl bg-white border border-orange-200 text-slate-800 flex items-center justify-between gap-3 text-xs shadow-xs"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 flex items-center justify-center shrink-0">
                <Globe className="w-4 h-4" />
              </div>
              <span className="truncate font-medium">
                Active HTML Preview: <strong className="font-semibold text-slate-900">{activeHtmlSession.fileName}</strong>
              </span>
            </div>
            <button
              onClick={() => setIsHtmlModalOpen(true)}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-50 hover:bg-orange-100 text-orange-700 font-bold border border-orange-200 transition cursor-pointer shrink-0"
            >
              <span>View Sandbox</span>
            </button>
          </div>
        )}

        {/* View 1: Not connected -> Pairing Screen */}
        {!isConnected ? (
          <div className="space-y-6 animate-fade-in">
            <PairingCard
              roomCode={roomCode}
              shareUrl={shareUrl}
              connectionState={connectionState}
              onHostNewCode={handleHostNewCode}
              onJoinCode={handleJoinCode}
              onOpenQRModal={() => setIsQRModalOpen(true)}
              onSelectHtmlFile={handleSelectHtmlFile}
              activeHtmlSession={activeHtmlSession}
              onOpenActiveHtml={() => setIsHtmlModalOpen(true)}
              logs={logs}
              onClearLogs={() => setLogs([])}
            />

            {/* Explanatory security & zero-backend note */}
            <div className="max-w-xl mx-auto bg-white border border-slate-200 rounded-2xl p-5 text-xs text-slate-500 space-y-2 shadow-xs">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>How this P2P transfer works (No backend required)</span>
              </div>
              <p className="leading-relaxed">
                Your devices establish a direct <strong className="text-slate-700">WebRTC DataChannel</strong> encrypted peer-to-peer connection. All files and chunks stream straight from browser to browser over your internet / local network connection without ever touching or storing on a server.
              </p>
            </div>
          </div>
        ) : (
          /* View 2: Connected -> Active File Transfer Workspace */
          <div className="space-y-6 animate-fade-in">
            {/* Connected Peer Details Bar */}
            <ConnectedDeviceBar
              peerDevice={peerDevice}
              roomCode={roomCode}
              onDisconnect={handleDisconnect}
            />

            {/* Drag & Drop Send Area */}
            <FileDropZone
              onFilesSelected={handleFilesSelected}
              disabled={!isConnected}
            />

            {/* Active & Completed Transfer Queue */}
            <TransferList
              transfers={transfers}
              onCancelTransfer={handleCancelTransfer}
              onPreviewTransfer={handlePreviewTransfer}
              onClearCompleted={handleClearCompleted}
            />

            {/* Quick Text & Link Sharing Drawer */}
            <QuickTextShare
              snippets={snippets}
              onSendText={handleSendText}
              disabled={!isConnected}
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 py-4 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>BeamDrop — Direct P2P File Transfer</span>
          <span className="flex items-center gap-1.5 text-slate-600">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            STUN / P2P DataChannel Active
          </span>
        </div>
      </footer>

      {/* QR Code Modal */}
      <QRModal
        isOpen={isQRModalOpen}
        onClose={() => setIsQRModalOpen(false)}
        roomCode={roomCode}
        shareUrl={shareUrl}
      />

      {/* Regular File Preview Modal (images, audio, video, text) */}
      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
        onOpenHtmlSandbox={handleOpenHtmlSandboxFromTransfer}
      />

      {/* Dedicated Interactive HTML Preview Modal */}
      <HtmlPreviewModal
        session={activeHtmlSession}
        isOpen={isHtmlModalOpen}
        onClose={() => setIsHtmlModalOpen(false)}
        isConnected={isConnected}
        peerDevice={peerDevice}
        onBroadcastToPeer={handleBroadcastHtml}
      />
    </div>
  );
}
