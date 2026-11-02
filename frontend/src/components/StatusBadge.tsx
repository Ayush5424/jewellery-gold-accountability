import React from 'react';
import { JobStatus, AlertStatus, TransactionType } from '../types';

interface StatusBadgeProps {
  status: JobStatus | AlertStatus | TransactionType | string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  let style = 'bg-slate-100 text-slate-700 border-slate-200';
  let label = status.replace(/_/g, ' ');

  switch (status) {
    case 'OPEN':
      style = 'bg-slate-100 text-slate-700 border-slate-300';
      label = 'Open';
      break;
    case 'IN_PROGRESS':
      style = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'In Progress';
      break;
    case 'READY_FOR_RECONCILIATION':
      style = 'bg-blue-50 text-blue-800 border-blue-300';
      label = 'Ready for Reconciliation';
      break;
    case 'RECONCILED':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      label = 'Reconciled';
      break;
    case 'PENDING_REVIEW':
      style = 'bg-amber-50 text-amber-900 border-amber-300';
      label = 'Review Recommended';
      break;
    case 'REVIEWED_APPROVED':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      label = 'Reviewed & Approved';
      break;
    case 'ESCALATED':
      style = 'bg-rose-50 text-rose-800 border-rose-300';
      label = 'Escalated to Auditor';
      break;
    case 'ISSUE':
      style = 'bg-slate-100 text-slate-800 border-slate-300';
      label = 'Gold Issue';
      break;
    case 'RECEIPT_JEWELLERY':
      style = 'bg-emerald-50 text-emerald-800 border-emerald-300';
      label = 'Jewellery Receipt';
      break;
    case 'RECEIPT_SCRAP':
      style = 'bg-amber-50 text-amber-800 border-amber-300';
      label = 'Scrap Receipt';
      break;
    case 'RECEIPT_FILINGS':
      style = 'bg-blue-50 text-blue-800 border-blue-300';
      label = 'Filings Receipt';
      break;
    case 'ADJUSTMENT_REVERSAL':
      style = 'bg-rose-50 text-rose-800 border-rose-300';
      label = 'Adjustment Reversal';
      break;
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${style}`}>
      {label}
    </span>
  );
};
