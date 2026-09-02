import React, { useState } from 'react';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle2, 
  ChevronDown, 
  ChevronUp, 
  Clock, 
  Copy, 
  Check, 
  HelpCircle, 
  Info, 
  Radio, 
  RefreshCw, 
  Server, 
  Terminal, 
  Trash2, 
  Wifi, 
  Zap 
} from 'lucide-react';
import { ConnectionLog, ConnectionState } from '../types';

interface ConnectionLogsCardProps {
  logs: ConnectionLog[];
  connectionState: ConnectionState;
  roomCode: string;
  isHost?: boolean;
  onClearLogs?: () => void;
  onRefreshSignaling?: () => void;
}

export const ConnectionLogsCard: React.FC<ConnectionLogsCardProps> = ({
  logs,
  connectionState,
  roomCode,
  isHost = true,
  onClearLogs,
  onRefreshSignaling,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedLogs, setCopiedLogs] = useState(false);
  const [filter, setFilter] = useState<'all' | 'requests' | 'errors'>('all');

  const incomingRequests = logs.filter(l => l.level === 'request');
  const errorCount = logs.filter(l => l.level === 'error').length;

  const filteredLogs = logs.filter(log => {
    if (filter === 'requests') return log.level === 'request';
    if (filter === 'errors') return log.level === 'error' || log.level === 'warning';
    return true;
  });

  const handleCopyLogs = async () => {
    const text = logs
      .map(l => `[${new Date(l.timestamp).toLocaleTimeString()}] [${l.level.toUpperCase()}] ${l.message}${l.details ? ` - ${l.details}` : ''}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopiedLogs(true);
      setTimeout(() => setCopiedLogs(false), 2000);
    } catch {}
  };

  const getLevelBadge = (level: ConnectionLog['level']) => {
    switch (level) {
      case 'success':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">OK</span>;
      case 'request':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200 animate-pulse">REQ</span>;
      case 'warning':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">WARN</span>;
      case 'error':
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">ERR</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">LOG</span>;
    }
  };

  return (
    <div id="connection-diagnostics-card" className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden transition-all">
      {/* Header bar with summary and expand toggle */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        className="px-5 py-3.5 bg-slate-50/80 hover:bg-slate-100/80 border-b border-slate-200 flex items-center justify-between cursor-pointer select-none transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shrink-0">
            <Terminal className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-900">
                WebRTC Connection & Signaling Log
              </span>
              {incomingRequests.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                  <Activity className="w-2.5 h-2.5 text-blue-600 animate-spin" />
                  {incomingRequests.length} Request{incomingRequests.length > 1 ? 's' : ''}
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                  <AlertCircle className="w-2.5 h-2.5" />
                  {errorCount} Notice
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Host ID: <code className="font-mono text-slate-700 font-semibold">p2pdrop-{roomCode}-host</code> &bull; Status: <span className="font-medium capitalize text-slate-700">{connectionState}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-slate-500 hidden sm:inline">
            {isExpanded ? 'Hide Details' : 'Show Logs'}
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-slate-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-slate-400" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="p-5">
          {/* Quick Signaling status row */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-4 text-xs">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Server className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Signaling Server</span>
                <span className="font-semibold text-slate-900 truncate block">PeerJS Cloud (Active)</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Wifi className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">STUN Multi-Cloud</span>
                <span className="font-semibold text-slate-900 truncate block">Google & Twilio STUN</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
              <Radio className="w-4 h-4 text-slate-500 shrink-0" />
              <div className="min-w-0">
                <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Channel State</span>
                <span className="font-semibold text-slate-900 truncate block capitalize">
                  {connectionState === 'connected' ? 'Connected (Direct P2P)' : connectionState === 'ready' ? 'Ready (Listening)' : connectionState}
                </span>
              </div>
            </div>
          </div>

          {/* Filter & Actions toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2 mb-3 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5">
              <button
                id="log-filter-all"
                onClick={() => setFilter('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                All Events ({logs.length})
              </button>
              <button
                id="log-filter-requests"
                onClick={() => setFilter('requests')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'requests'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Connection Requests ({incomingRequests.length})
              </button>
              <button
                id="log-filter-errors"
                onClick={() => setFilter('errors')}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  filter === 'errors'
                    ? 'bg-amber-600 text-white'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                }`}
              >
                Errors & Warnings ({errorCount})
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              {onRefreshSignaling && (
                <button
                  id="reconnect-signaling-btn"
                  onClick={onRefreshSignaling}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
                  title="Reconnect to signaling server"
                >
                  <RefreshCw className="w-3 h-3 text-slate-500" />
                  <span>Re-host</span>
                </button>
              )}
              <button
                id="copy-logs-btn"
                onClick={handleCopyLogs}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition cursor-pointer"
              >
                {copiedLogs ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 text-slate-500" />
                    <span>Copy Logs</span>
                  </>
                )}
              </button>
              {onClearLogs && (
                <button
                  id="clear-logs-btn"
                  onClick={onClearLogs}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-md transition"
                  title="Clear log history"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Terminal log window */}
          <div className="bg-slate-950 text-slate-200 rounded-xl p-3 font-mono text-[11px] max-h-56 overflow-y-auto space-y-2 border border-slate-900 shadow-inner">
            {filteredLogs.length === 0 ? (
              <div className="text-center py-6 text-slate-500 font-sans text-xs">
                No logs matching filter. Listening for connection attempts...
              </div>
            ) : (
              filteredLogs.map((log) => (
                <div 
                  key={log.id} 
                  className={`flex items-start gap-2.5 leading-relaxed p-1.5 rounded transition ${
                    log.level === 'request' 
                      ? 'bg-blue-950/60 border border-blue-800/60' 
                      : log.level === 'error' 
                      ? 'bg-rose-950/60 border border-rose-800/60' 
                      : 'hover:bg-slate-900/50'
                  }`}
                >
                  <span className="text-slate-500 shrink-0 text-[10px] select-none pt-0.5">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                  <div className="shrink-0 pt-0.5">
                    {getLevelBadge(log.level)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${
                      log.level === 'request' ? 'text-blue-300' :
                      log.level === 'error' ? 'text-rose-300' :
                      log.level === 'warning' ? 'text-amber-300' :
                      log.level === 'success' ? 'text-emerald-300' : 'text-slate-200'
                    }`}>
                      {log.message}
                    </p>
                    {log.details && (
                      <p className="text-[10px] text-slate-400 mt-0.5 break-all">
                        {log.details}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Connection Troubleshooting Tips Helper */}
          <div className="mt-3.5 p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5">
            <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold block">Trouble connecting from Client to Host?</span>
              <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5">
                <li>Make sure both devices have active internet connections to reach the signaling server.</li>
                <li>Verify the 4-digit code is typed accurately (or scan the QR code directly).</li>
                <li>If on a strict corporate or university Wi-Fi network that blocks WebRTC ports, try switching to mobile hotspot or clicking <strong>Re-host</strong> to get a fresh space.</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
