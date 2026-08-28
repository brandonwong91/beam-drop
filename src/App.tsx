import React, { useState, useEffect, useRef, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { 
  AlertTriangle, 
  CheckCircle2, 
  HelpCircle, 
  Info, 
  Radio, 
  RefreshCw, 
  ShieldCheck, 
  Wifi, 
  Zap 
} from 'lucide-react';
import { ConnectionState, FileTransferItem, PeerDevice, TextSnippet } from './types';
import { WebRTCService } from './lib/webrtcService';
import { isSoundEnabled, setSoundEnabled } from './lib/soundEffects';
import { Header } from './components/Header';
import { PairingCard } from './components/PairingCard';
import { ConnectedDeviceBar } from './components/ConnectedDeviceBar';
import { FileDropZone } from './components/FileDropZone';
import { TransferList } from './components/TransferList';
import { QuickTextShare } from './components/QuickTextShare';
import { QRModal } from './components/QRModal';
import { FilePreviewModal } from './components/FilePreviewModal';

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
      onCodeAssigned: (code) => {
        setRoomCode(code);
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
  }, [handleTransferUpdate, handleTextReceived]);

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

  const handleFilesSelected = (files: File[]) => {
    if (!webrtcServiceRef.current || connectionState !== 'connected') {
      setErrorMessage('Please connect to a peer before sending files');
      return;
    }

    files.forEach((file) => {
      webrtcServiceRef.current?.sendFile(file).catch((err) => {
        setErrorMessage(`Failed to send ${file.name}: ${err.message}`);
      });
    });
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
              onPreviewTransfer={(item) => setPreviewItem(item)}
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

      {/* File Preview Modal */}
      <FilePreviewModal
        item={previewItem}
        onClose={() => setPreviewItem(null)}
      />
    </div>
  );
}
