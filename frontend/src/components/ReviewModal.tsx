import React from 'react';
import { AlignedDecimal } from './AlignedDecimal';

interface ReviewModalProps {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  items: { label: string; value: string | number; isWeight?: boolean; unit?: string }[];
  onConfirm: () => void;
  onCancel: () => void;
  confirmLabel?: string;
  isLoading?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  isOpen,
  title,
  subtitle,
  items,
  onConfirm,
  onCancel,
  confirmLabel = 'Commit Transaction to Ledger',
  isLoading = false,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <h3 className="text-base font-semibold text-slate-900">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>

        <div className="p-6 space-y-3">
          <div className="bg-amber-50/50 border border-amber-200/80 rounded p-3 text-xs text-amber-900">
            <span className="font-semibold">Ledger Invariant:</span> This transaction will be permanently recorded in the immutable gold ledger. Once committed, physical balances will update immediately.
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded">
            {items.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center py-2.5 px-3 text-sm">
                <span className="text-slate-600 font-medium">{item.label}</span>
                {item.isWeight ? (
                  <AlignedDecimal value={item.value} unit={item.unit || 'g'} />
                ) : (
                  <span className="font-medium text-slate-900 text-right">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="px-4 py-2 border border-slate-300 rounded text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-hidden"
          >
            Modify Values
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold focus:outline-hidden flex items-center gap-2"
          >
            {isLoading ? 'Writing to Ledger...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
