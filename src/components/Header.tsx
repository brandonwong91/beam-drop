import React from 'react';
import { Activity, Radio, Shield, Volume2, VolumeX, Wifi, WifiOff } from 'lucide-react';
import { ConnectionState, PeerDevice } from '../types';

interface HeaderProps {
  connectionState: ConnectionState;
  peerDevice: PeerDevice | null;
  soundEnabled: boolean;
  onToggleSound: () => void;
  onDisconnect?: () => void;
  roomCode?: string;
}

export const Header: React.FC<HeaderProps> = ({
  connectionState,
  peerDevice,
  soundEnabled,
  onToggleSound,
  onDisconnect,
  roomCode,
}) => {
  const isConnected = connectionState === 'connected';

  return (
    <header id="app-header" className="w-full border-b border-slate-200 bg-white sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 sm:py-3.5 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Branding */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="relative flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-blue-600 text-white shadow-xs shrink-0">
            <Radio className="w-4 h-4 sm:w-5 sm:h-5" />
            {isConnected && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight whitespace-nowrap">
                BeamDrop
              </h1>
              <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shrink-0 whitespace-nowrap">
                <Shield className="w-3 h-3 shrink-0" /> Direct P2P
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-slate-500 hidden md:block truncate">
              Zero server storage • Direct browser data channel
            </p>
          </div>
        </div>

        {/* Right: Connection status & controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
          {/* RTT Latency badge if connected */}
          {isConnected && peerDevice?.rtt !== undefined && (
            <div
              id="latency-badge"
              className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-700 text-xs font-mono shrink-0 whitespace-nowrap"
              title="Round-trip latency to peer"
            >
              <Activity className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>{peerDevice.rtt} ms</span>
            </div>
          )}

          {/* Connection status pill */}
          <div
            id="connection-status-pill"
            className={`flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 rounded-full text-xs font-medium border shrink-0 whitespace-nowrap ${
              isConnected
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : connectionState === 'connecting' || connectionState === 'initializing'
                ? 'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}
          >
            {isConnected ? (
              <>
                <div className="w-2 h-2 bg-emerald-500 rounded-full shrink-0"></div>
                <span className="font-semibold text-xs">Connected</span>
              </>
            ) : connectionState === 'connecting' || connectionState === 'initializing' ? (
              <>
                <div className="w-2 h-2 bg-amber-500 rounded-full animate-ping shrink-0"></div>
                <span className="font-semibold text-xs">Connecting</span>
              </>
            ) : (
              <>
                <div className="w-2 h-2 bg-slate-400 rounded-full shrink-0"></div>
                <span className="text-xs">Idle</span>
              </>
            )}
          </div>

          {/* Sound toggle */}
          <button
            id="sound-toggle-btn"
            onClick={onToggleSound}
            className="p-1.5 sm:p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition shrink-0 cursor-pointer"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
            aria-label="Toggle sound"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-blue-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
          </button>

          {/* Leave/Disconnect button */}
          {isConnected && onDisconnect && (
            <button
              id="disconnect-space-btn"
              onClick={onDisconnect}
              className="px-2.5 sm:px-3 py-1 sm:py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition shrink-0 whitespace-nowrap cursor-pointer"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
