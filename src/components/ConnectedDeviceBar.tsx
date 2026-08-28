import React from 'react';
import { 
  Activity, 
  CheckCircle2, 
  Laptop, 
  LogOut, 
  Radio, 
  ShieldCheck, 
  Smartphone, 
  Wifi 
} from 'lucide-react';
import { PeerDevice } from '../types';

interface ConnectedDeviceBarProps {
  peerDevice: PeerDevice | null;
  roomCode: string;
  onDisconnect: () => void;
}

export const ConnectedDeviceBar: React.FC<ConnectedDeviceBarProps> = ({
  peerDevice,
  roomCode,
  onDisconnect,
}) => {
  const isMobile = peerDevice?.os.toLowerCase().includes('ios') || 
                   peerDevice?.os.toLowerCase().includes('android');

  return (
    <div id="connected-device-bar" className="w-full bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      {/* Left: Device details */}
      <div className="flex items-center gap-3.5">
        <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
          {isMobile ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-slate-900">
              {peerDevice?.name || 'Connected Peer Device'}
            </h3>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> P2P Paired
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-2">
            <span>Browser: {peerDevice?.browser || 'WebRTC Client'}</span>
            <span>•</span>
            <span>OS: {peerDevice?.os || 'Unknown'}</span>
          </p>
        </div>
      </div>

      {/* Right: Metrics & Controls */}
      <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200">
        <div className="flex items-center gap-2">
          {/* Space Code Pill */}
          <div className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
            Room <span className="font-bold text-blue-600">{roomCode}</span>
          </div>

          {/* RTT Latency */}
          {peerDevice?.rtt !== undefined && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 text-xs font-mono text-emerald-700">
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>{peerDevice.rtt}ms RTT</span>
            </div>
          )}
        </div>

        {/* Disconnect button */}
        <button
          id="bar-disconnect-btn"
          onClick={onDisconnect}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 hover:border-rose-200 border border-slate-200 text-xs font-semibold transition"
        >
          <LogOut className="w-3.5 h-3.5" />
          <span>Disconnect</span>
        </button>
      </div>
    </div>
  );
};
