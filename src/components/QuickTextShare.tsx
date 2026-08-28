import React, { useState } from 'react';
import { Check, Copy, MessageSquare, Send, Sparkles } from 'lucide-react';
import { TextSnippet } from '../types';

interface QuickTextShareProps {
  snippets: TextSnippet[];
  onSendText: (text: string) => void;
  disabled?: boolean;
}

export const QuickTextShare: React.FC<QuickTextShareProps> = ({
  snippets,
  onSendText,
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() || disabled) return;
    onSendText(textInput.trim());
    setTextInput('');
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {}
  };

  return (
    <div id="quick-text-share-container" className="mt-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs">
      {/* Header toggle */}
      <button
        id="toggle-text-share-btn"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between text-left text-sm font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-blue-600" />
          <span>Quick Text & Link Clipboard</span>
          {snippets.length > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-50 text-blue-700 border border-blue-200 font-semibold">
              {snippets.length}
            </span>
          )}
        </div>
        <span className="text-xs text-blue-600 font-semibold">
          {isOpen ? 'Hide' : 'Send Text/Links'}
        </span>
      </button>

      {isOpen && (
        <div className="mt-4 space-y-4 pt-3 border-t border-slate-200">
          {/* Send Input */}
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              id="quick-text-input"
              type="text"
              placeholder="Paste a link, note, Wi-Fi password, or message..."
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              disabled={disabled}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
            />
            <button
              id="send-text-btn"
              type="submit"
              disabled={!textInput.trim() || disabled}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-xl text-xs sm:text-sm font-semibold shadow-xs transition cursor-pointer disabled:cursor-not-allowed"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Send</span>
            </button>
          </form>

          {/* Snippet history */}
          {snippets.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {snippets.map((snip) => (
                <div
                  key={snip.id}
                  className={`p-3 rounded-xl border text-xs flex items-start justify-between gap-3 ${
                    snip.sender === 'me'
                      ? 'bg-blue-50/60 border-blue-200 text-slate-800'
                      : 'bg-slate-50 border-slate-200 text-slate-800'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <span className="text-[10px] text-slate-500 block mb-0.5 font-mono font-medium">
                      {snip.sender === 'me' ? 'You' : 'Peer'} • {new Date(snip.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <p className="whitespace-pre-wrap break-words text-slate-900">{snip.text}</p>
                  </div>
                  <button
                    onClick={() => handleCopy(snip.id, snip.text)}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition shrink-0"
                    title="Copy text"
                  >
                    {copiedId === snip.id ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
