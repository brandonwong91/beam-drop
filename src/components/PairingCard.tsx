import React, { useState, useEffect, useRef } from 'react';
import { 
  ArrowRight, 
  Check, 
  Copy, 
  KeyRound, 
  Link as LinkIcon, 
  Loader2, 
  QrCode, 
  Radio, 
  RefreshCw, 
  Share2, 
  Sparkles,
  Smartphone,
  Laptop
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ConnectionState } from '../types';

interface PairingCardProps {
  roomCode: string;
  shareUrl: string;
  connectionState: ConnectionState;
  onHostNewCode: () => void;
  onJoinCode: (code: string) => void;
  onOpenQRModal: () => void;
}

export const PairingCard: React.FC<PairingCardProps> = ({
  roomCode,
  shareUrl,
  connectionState,
  onHostNewCode,
  onJoinCode,
  onOpenQRModal,
}) => {
  const [mode, setMode] = useState<'host' | 'join'>('host');
  const [digits, setDigits] = useState(['', '', '', '']);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const inputRefs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  const isConnecting = connectionState === 'connecting' || connectionState === 'initializing';

  // Handle single digit input
  const handleDigitChange = (index: number, value: string) => {
    const cleanVal = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = cleanVal;
    setDigits(newDigits);

    if (cleanVal && index < 3) {
      inputRefs[index + 1].current?.focus();
    }

    // Auto submit if all 4 are entered
    if (cleanVal && index === 3) {
      const fullCode = newDigits.join('');
      if (fullCode.length === 4) {
        onJoinCode(fullCode);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pasted.length > 0) {
      const newDigits = ['', '', '', ''];
      for (let i = 0; i < pasted.length; i++) {
        newDigits[i] = pasted[i];
      }
      setDigits(newDigits);
      if (pasted.length === 4) {
        onJoinCode(pasted);
      } else {
        const nextIndex = Math.min(pasted.length, 3);
        inputRefs[nextIndex].current?.focus();
      }
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch {}
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Connect via WebRTC P2P Transfer',
          text: `Join my P2P file sharing space with 4-digit code: ${roomCode}`,
          url: shareUrl,
        });
      } catch {}
    } else {
      handleCopyUrl();
    }
  };

  return (
    <div id="pairing-card-container" className="w-full max-w-xl mx-auto">
      {/* Mode Switcher Tabs */}
      <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 mb-6">
        <button
          id="tab-host-mode"
          onClick={() => setMode('host')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition ${
            mode === 'host'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <Radio className="w-4 h-4 text-blue-600" />
          <span>Host Space (Share Code)</span>
        </button>
        <button
          id="tab-join-mode"
          onClick={() => {
            setMode('join');
            setTimeout(() => inputRefs[0].current?.focus(), 100);
          }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-xs sm:text-sm font-semibold transition ${
            mode === 'join'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-900'
          }`}
        >
          <KeyRound className="w-4 h-4 text-blue-600" />
          <span>Join Space (Enter 4 Digits)</span>
        </button>
      </div>

      {/* Mode 1: Host Space */}
      {mode === 'host' && (
        <div id="host-space-card" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Direct WebRTC Pairing</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Your 4-Digit Pairing Code
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Open this page on your other phone, tablet, or computer and enter this 4-digit code to connect directly.
            </p>
          </div>

          {/* 4-Digit Display Grid */}
          <div className="my-6">
            <div id="digit-boxes-container" className="flex items-center justify-center gap-3 sm:gap-4">
              {roomCode.split('').map((digit, idx) => (
                <div
                  key={idx}
                  id={`host-digit-${idx}`}
                  className="w-14 h-18 sm:w-18 sm:h-22 rounded-xl bg-slate-50 border-2 border-slate-200 flex items-center justify-center shadow-inner text-blue-600 font-mono text-3xl sm:text-4xl font-extrabold"
                >
                  {digit}
                </div>
              ))}
            </div>

            {/* Code actions: Copy & Regenerate */}
            <div className="flex items-center justify-center gap-2 mt-4">
              <button
                id="copy-code-btn"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-200 transition"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Code Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy 4 Digits</span>
                  </>
                )}
              </button>

              <button
                id="refresh-code-btn"
                onClick={onHostNewCode}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-medium border border-slate-200 transition"
                title="Generate a new 4-digit code"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>New Code</span>
              </button>
            </div>
          </div>

          {/* Alternative Quick Sharing: QR Code & Direct Link */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6 pt-6 border-t border-slate-200">
            {/* QR Code Quick trigger */}
            <button
              id="open-qr-modal-btn"
              onClick={onOpenQRModal}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-white border border-slate-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
                  <QRCodeSVG value={shareUrl} size={28} />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-900 block group-hover:text-blue-600 transition">
                    Show QR Code
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    Instant scan with phone camera
                  </span>
                </div>
              </div>
              <QrCode className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>

            {/* Direct Shortlink Copy / Share */}
            <button
              id="copy-shortlink-btn"
              onClick={handleNativeShare}
              className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition group text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shrink-0">
                  <Share2 className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-900 block group-hover:text-blue-600 transition">
                    Share Shortlink
                  </span>
                  <span className="text-[11px] text-slate-500 block">
                    {copiedUrl ? 'Copied to clipboard!' : 'Send link to other device'}
                  </span>
                </div>
              </div>
              <LinkIcon className="w-4 h-4 text-slate-400 group-hover:text-blue-600 transition" />
            </button>
          </div>

          {/* Pulse waiting indicator */}
          <div className="mt-6 flex items-center justify-center gap-2.5 text-xs text-slate-500">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
            </span>
            <span>Listening for peer connection on WebRTC data channel...</span>
          </div>
        </div>
      )}

      {/* Mode 2: Join Space */}
      {mode === 'join' && (
        <div id="join-space-card" className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-sm relative">
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold mb-3">
              <KeyRound className="w-3.5 h-3.5" />
              <span>Connect to Peer</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
              Enter 4-Digit Code
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
              Enter the code displayed on the device sharing the file or space.
            </p>
          </div>

          {/* 4 Interactive Digit Inputs */}
          <div className="my-6">
            <div id="join-digit-inputs" className="flex items-center justify-center gap-3 sm:gap-4" onPaste={handlePaste}>
              {digits.map((digit, idx) => (
                <input
                  key={idx}
                  ref={inputRefs[idx]}
                  id={`join-input-digit-${idx}`}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleDigitChange(idx, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(idx, e)}
                  disabled={isConnecting}
                  className="w-14 h-18 sm:w-18 sm:h-22 rounded-xl bg-slate-50 border-2 border-slate-200 focus:bg-white focus:border-blue-600 focus:ring-4 focus:ring-blue-100 text-center text-slate-900 font-mono text-3xl sm:text-4xl font-extrabold outline-none transition disabled:opacity-50"
                  autoComplete="off"
                />
              ))}
            </div>
          </div>

          {/* Connect button */}
          <div className="mt-6 flex flex-col items-center">
            <button
              id="submit-join-btn"
              onClick={() => {
                const fullCode = digits.join('');
                if (fullCode.length === 4) {
                  onJoinCode(fullCode);
                }
              }}
              disabled={digits.join('').length !== 4 || isConnecting}
              className="w-full sm:w-auto min-w-[200px] flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-semibold text-sm shadow-sm transition disabled:shadow-none cursor-pointer disabled:cursor-not-allowed"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Connecting to WebRTC Peer...</span>
                </>
              ) : (
                <>
                  <span>Connect & Pair Devices</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            <span className="text-xs text-slate-500 mt-4 text-center">
              You can also paste the full 4-digit code directly into the boxes
            </span>
          </div>
        </div>
      )}

      {/* Cross-device help helper */}
      <div className="mt-5 grid grid-cols-2 gap-3 text-center">
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-600 shadow-xs">
          <Smartphone className="w-4 h-4 text-blue-600" />
          <span>Mobile Phone / Tablet</span>
        </div>
        <div className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-center gap-2 text-xs text-slate-600 shadow-xs">
          <Laptop className="w-4 h-4 text-blue-600" />
          <span>Desktop PC / Laptop</span>
        </div>
      </div>
    </div>
  );
};
