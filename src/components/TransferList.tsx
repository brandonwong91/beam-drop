import React from 'react';
import { ArrowDownUp, CheckCircle, Trash2 } from 'lucide-react';
import { FileTransferItem } from '../types';
import { TransferItemCard } from './TransferItemCard';

interface TransferListProps {
  transfers: FileTransferItem[];
  onCancelTransfer: (id: string) => void;
  onPreviewTransfer: (item: FileTransferItem) => void;
  onClearCompleted?: () => void;
}

export const TransferList: React.FC<TransferListProps> = ({
  transfers,
  onCancelTransfer,
  onPreviewTransfer,
  onClearCompleted,
}) => {
  if (transfers.length === 0) return null;

  const activeCount = transfers.filter((t) => t.status === 'transferring').length;
  const completedCount = transfers.filter((t) => t.status === 'completed').length;

  return (
    <div id="transfers-section" className="mt-8 space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownUp className="w-4 h-4 text-blue-600" />
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
            Transfers ({transfers.length})
          </h3>
          {activeCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 animate-pulse">
              {activeCount} active
            </span>
          )}
        </div>

        {completedCount > 0 && onClearCompleted && (
          <button
            id="clear-completed-btn"
            onClick={onClearCompleted}
            className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-900 transition cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear list</span>
          </button>
        )}
      </div>

      {/* Items list */}
      <div className="space-y-3">
        {transfers.map((item) => (
          <TransferItemCard
            key={item.id}
            item={item}
            onCancel={onCancelTransfer}
            onPreview={onPreviewTransfer}
          />
        ))}
      </div>
    </div>
  );
};
