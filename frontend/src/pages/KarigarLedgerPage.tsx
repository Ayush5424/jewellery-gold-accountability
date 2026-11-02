import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Karigar, JobOrder, GoldLedgerEntry } from '../types';
import { useAuth } from '../context/AuthContext';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { StatusBadge } from '../components/StatusBadge';
import { Search, RotateCcw, Filter, FileText, CheckCircle2 } from 'lucide-react';

export const KarigarLedgerPage: React.FC<{ initialKarigarId?: number | null }> = ({ initialKarigarId }) => {
  const { user, hasRole } = useAuth();
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [selectedKarigarId, setSelectedKarigarId] = useState<string>(
    user?.karigarId ? String(user.karigarId) : initialKarigarId ? String(initialKarigarId) : ''
  );
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [entries, setEntries] = useState<GoldLedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);

  // Reversal dialog state
  const [reversalVoucher, setReversalVoucher] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState('');
  const [reversing, setReversing] = useState(false);

  useEffect(() => {
    if (hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD')) {
      api.getKarigars().then((list) => {
        setKarigars(list);
        if (!selectedKarigarId && list.length > 0) {
          setSelectedKarigarId(String(list[0].id));
        }
      }).catch(console.error);
    } else if (user?.karigarId) {
      setSelectedKarigarId(String(user.karigarId));
    }
  }, [user]);

  const fetchLedger = async () => {
    if (!selectedKarigarId) return;
    setLoading(true);
    try {
      const [entriesData, jobsData] = await Promise.all([
        api.getLedgerByKarigar(Number(selectedKarigarId)),
        api.getJobs(undefined, Number(selectedKarigarId)),
      ]);
      setEntries(entriesData);
      setJobs(jobsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLedger();
  }, [selectedKarigarId]);

  const handleReversalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalVoucher || !reversalReason) return;
    setReversing(true);
    try {
      await api.reverseVoucher(reversalVoucher, reversalReason);
      setReversalVoucher(null);
      setReversalReason('');
      fetchLedger();
    } catch (err: any) {
      alert(err.message || 'Reversal failed');
    } finally {
      setReversing(false);
    }
  };

  const currentKarigar = karigars.find(k => String(k.id) === selectedKarigarId);

  // Compute Karigar Fine Gold Summary derived transactionally from the ledger
  const totalIssued = entries
    .filter(e => e.transactionType === 'ISSUE')
    .reduce((sum, e) => sum + Number(e.fineWeight), 0);

  const totalJewellery = entries
    .filter(e => e.transactionType === 'RECEIPT_JEWELLERY')
    .reduce((sum, e) => sum + Number(e.fineWeight), 0);

  const totalScrap = entries
    .filter(e => e.transactionType === 'RECEIPT_SCRAP')
    .reduce((sum, e) => sum + Number(e.fineWeight), 0);

  const totalFilings = entries
    .filter(e => e.transactionType === 'RECEIPT_FILINGS')
    .reduce((sum, e) => sum + Number(e.fineWeight), 0);

  const totalRecovered = totalJewellery + totalScrap + totalFilings;
  const currentOutstanding = Math.max(0, totalIssued - totalRecovered);

  const filteredEntries = selectedJobId
    ? entries.filter(e => e.jobOrder && String(e.jobOrder.id) === selectedJobId)
    : entries;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Karigar Physical Gold Ledger</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable voucher record of every gram of fine gold issued and returned
          </p>
        </div>

        {hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD') && (
          <div className="flex items-center gap-2">
            <label className="text-xs text-slate-500 font-medium">Select Karigar:</label>
            <select
              value={selectedKarigarId}
              onChange={(e) => {
                setSelectedKarigarId(e.target.value);
                setSelectedJobId('');
              }}
              className="p-1.5 border border-slate-300 rounded text-xs bg-white font-medium text-slate-800"
            >
              {karigars.map(k => (
                <option key={k.id} value={k.id}>{k.karigarCode} • {k.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Karigar Account Summary Card */}
      <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3 gap-2">
          <div>
            <h2 className="text-base font-bold text-slate-900">{currentKarigar?.name || user?.fullName}</h2>
            <p className="text-xs text-slate-500 font-mono">
              Artisan ID: {currentKarigar?.karigarCode || 'KRG'} • Location: {currentKarigar?.workshopLocation || 'Coimbatore Workshop'}
            </p>
          </div>
          <div className="text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200">
            Historical Baseline Wastage: <strong className="font-mono">{Number(currentKarigar?.historicalLossAvgPct || 0).toFixed(2)}%</strong> ({currentKarigar?.completedJobsCount || 0} completed jobs)
          </div>
        </div>

        {/* 5-Column Ledger Breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          <div className="p-3 bg-slate-50 rounded border border-slate-200">
            <span className="text-[11px] font-semibold text-slate-500 uppercase">Total Issued Fine</span>
            <div className="mt-1">
              <AlignedDecimal value={totalIssued} className="text-lg font-bold text-slate-900" />
            </div>
          </div>

          <div className="p-3 bg-emerald-50/50 rounded border border-emerald-200">
            <span className="text-[11px] font-semibold text-emerald-800 uppercase">Jewellery Returned</span>
            <div className="mt-1">
              <AlignedDecimal value={totalJewellery} className="text-lg font-bold text-emerald-800" />
            </div>
          </div>

          <div className="p-3 bg-amber-50/50 rounded border border-amber-200">
            <span className="text-[11px] font-semibold text-amber-800 uppercase">Scrap Returned</span>
            <div className="mt-1">
              <AlignedDecimal value={totalScrap} className="text-lg font-bold text-amber-800" />
            </div>
          </div>

          <div className="p-3 bg-blue-50/50 rounded border border-blue-200">
            <span className="text-[11px] font-semibold text-blue-800 uppercase">Filings Returned</span>
            <div className="mt-1">
              <AlignedDecimal value={totalFilings} className="text-lg font-bold text-blue-800" />
            </div>
          </div>

          <div className="p-3 bg-slate-900 text-white rounded border border-slate-800 col-span-2 sm:col-span-1">
            <span className="text-[11px] font-semibold text-amber-400 uppercase">Working Gold Balance</span>
            <div className="mt-1">
              <AlignedDecimal value={currentOutstanding} className="text-lg font-bold text-amber-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter by Job */}
      <div className="bg-white p-3 rounded border border-slate-200 flex flex-wrap items-center gap-3 text-xs">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-slate-600 font-medium">Filter by Job:</span>
        <select
          value={selectedJobId}
          onChange={(e) => setSelectedJobId(e.target.value)}
          className="p-1 border border-slate-300 rounded text-xs bg-white text-slate-800"
        >
          <option value="">— All Assigned Jobs ({jobs.length}) —</option>
          {jobs.map(j => (
            <option key={j.id} value={j.id}>
              {j.jobCode} • {j.itemCategory} ({j.status})
            </option>
          ))}
        </select>
        {selectedJobId && (
          <button
            onClick={() => setSelectedJobId('')}
            className="text-xs text-slate-500 hover:text-slate-800 underline ml-2"
          >
            Clear Filter
          </button>
        )}
      </div>

      {/* Detailed Ledger Transactions Table */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
        <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
          <span className="font-bold text-slate-700 uppercase tracking-wider">
            Chronological Transaction Ledgers ({filteredEntries.length} vouchers)
          </span>
          <span className="text-slate-400 font-mono text-[11px]">Source of Truth • Immutable</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Date & Time</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Job Code</th>
                <th className="py-2.5 px-4">Description / HUID</th>
                <th className="py-2.5 px-4 text-right">Gross Weight</th>
                <th className="py-2.5 px-4 text-right">Purity</th>
                <th className="py-2.5 px-4 text-right">Fine Weight</th>
                {hasRole('ROLE_FINANCE_HEAD') && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEntries.map((e) => (
                <tr key={e.id} className={`hover:bg-slate-50/80 transition-colors ${e.isReversal ? 'bg-rose-50/40 text-rose-900' : ''}`}>
                  <td className="py-2.5 px-4 font-mono font-medium text-slate-900">
                    {e.voucherNumber}
                    {e.isReversal && (
                      <span className="block text-[10px] text-rose-700 font-sans">
                        Reversal of {e.reversalOfVoucher}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(e.createdAt).toLocaleDateString('en-IN', {
                      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="py-2.5 px-4">
                    <StatusBadge status={e.transactionType} />
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-700">{e.jobOrder?.jobCode || '—'}</td>
                  <td className="py-2.5 px-4 text-slate-600 max-w-xs truncate">
                    {e.huid && <span className="font-mono text-slate-900 font-semibold mr-1.5">[{e.huid}]</span>}
                    {e.itemDescription || e.remarks || '—'}
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono">
                    <AlignedDecimal value={e.grossWeight} />
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono tabular-nums">
                    {Number(e.purity).toFixed(2)}%
                  </td>
                  <td className="py-2.5 px-4 text-right font-mono font-semibold">
                    <AlignedDecimal value={e.fineWeight} />
                  </td>
                  {hasRole('ROLE_FINANCE_HEAD') && (
                    <td className="py-2.5 px-4 text-right">
                      {!e.isReversal && (
                        <button
                          onClick={() => setReversalVoucher(e.voucherNumber)}
                          className="text-[11px] text-slate-500 hover:text-rose-700 font-medium inline-flex items-center gap-1"
                          title="Create audit reversal voucher"
                        >
                          <RotateCcw className="w-3 h-3" />
                          Reverse
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {filteredEntries.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    No transactions recorded for this selection.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Controlled Reversal Modal */}
      {reversalVoucher && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-800">
              <RotateCcw className="w-5 h-5" />
              <h3 className="text-base font-bold text-slate-900">Post Reversal Adjustment</h3>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Historical ledger vouchers are never deleted. Posting a reversal creates an offsetting counter-entry linking directly to voucher <strong className="font-mono">{reversalVoucher}</strong>.
            </p>

            <form onSubmit={handleReversalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Supervisor Justification / Audit Reason</label>
                <textarea
                  required
                  rows={3}
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  placeholder="e.g. Scale calibration discrepancy confirmed by workshop supervisor"
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReversalVoucher(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reversing}
                  className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded font-medium disabled:bg-rose-300"
                >
                  {reversing ? 'Reversing...' : 'Commit Reversal Voucher'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
