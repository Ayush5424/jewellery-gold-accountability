import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Karigar, JobOrder, GoldLedgerEntry } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { StatusBadge } from '../components/StatusBadge';
import {
  UserCheck,
  Shield,
  Clock,
  CheckCircle,
  FileText,
  AlertCircle,
  RefreshCw,
  Scale,
  Hammer,
  Sparkles,
} from 'lucide-react';

export const KarigarDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Karigar | null>(null);
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [ledgerEntries, setLedgerEntries] = useState<GoldLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchKarigarData = async () => {
    if (!user || !user.karigarId) {
      setError('No linked karigar profile found for this user account.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [profileData, jobsData, ledgerData] = await Promise.all([
        api.getKarigarById(user.karigarId),
        api.getJobs(undefined, user.karigarId),
        api.getLedgerByKarigar(user.karigarId),
      ]);
      setProfile(profileData);
      setJobs(jobsData);
      setLedgerEntries(ledgerData);
    } catch (err: any) {
      setError(err.message || 'Unable to load personal artisan dashboard.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKarigarData();
  }, [user]);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mb-2 text-amber-500" />
        <span>Loading personal artisan ledger & jobs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded text-sm mb-6 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <span>{error}</span>
      </div>
    );
  }

  // Calculate Personal Summary Statistics
  const totalIssuedFine = ledgerEntries
    .filter(e => e.transactionType === 'ISSUE')
    .reduce((sum, e) => sum + e.fineWeight, 0);

  const totalReturnedFine = ledgerEntries
    .filter(e => e.transactionType === 'RECEIPT_JEWELLERY' || e.transactionType === 'RECEIPT_SCRAP' || e.transactionType === 'RECEIPT_FILINGS')
    .reduce((sum, e) => sum + e.fineWeight, 0);

  const netOutstandingFine = Math.max(0, totalIssuedFine - totalReturnedFine);
  const activeJobs = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'OPEN');
  const reconciledJobs = jobs.filter(j => j.status === 'RECONCILED');

  return (
    <div className="space-y-6">
      {/* Artisan Profile Identity Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="h-12 w-12 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-lg font-mono">
            {profile?.karigarCode || 'KRG'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-slate-100">{profile?.name || user?.fullName}</h1>
              <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800 px-2 py-0.5 rounded">
                Master Artisan
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>{profile?.workshopLocation || 'Coimbatore Main Workshop'}</span>
              <span>•</span>
              <span className="font-mono text-slate-300">{profile?.phone}</span>
            </p>
          </div>
        </div>

        {/* Tenant Isolation Badge */}
        <div className="flex items-center gap-2 text-xs bg-slate-800/80 border border-slate-700/80 px-3.5 py-2 rounded-lg">
          <Shield className="w-4 h-4 text-emerald-400" />
          <div>
            <p className="font-medium text-slate-200">Karigar Isolated Session</p>
            <p className="text-[10px] text-slate-400 font-mono">Authorized to view personal jobs & slips only</p>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Gold */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Current Outstanding Working Gold</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-bold font-mono text-amber-700">
              <AlignedDecimal value={netOutstandingFine} />
            </span>
            <span className="text-xs font-mono text-slate-500">grams fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Fine gold currently on artisan bench</p>
        </div>

        {/* Total Gold Issued */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Gold Issued</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-slate-800">
              <AlignedDecimal value={totalIssuedFine} />
            </span>
            <span className="text-xs font-mono text-slate-500">grams fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Cumulative raw bullion received</p>
        </div>

        {/* Total Gold Returned */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Total Gold Returned</p>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-xl font-bold font-mono text-emerald-700">
              <AlignedDecimal value={totalReturnedFine} />
            </span>
            <span className="text-xs font-mono text-slate-500">grams fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Jewellery, clean scrap & bench dust</p>
        </div>

        {/* Work Orders Status */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
          <p className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Assigned Job Orders</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-800">{activeJobs.length}</span>
            <span className="text-xs text-amber-700 font-medium">active</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-mono text-slate-600">{reconciledJobs.length}</span>
            <span className="text-xs text-slate-500">reconciled</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total {jobs.length} jobs assigned</p>
        </div>
      </div>

      {/* Assigned Job Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">Assigned Job Orders</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Showing {jobs.length} jobs</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 font-mono">Job Code</th>
                <th className="py-2.5 px-4">Item Category</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4 text-right">Allowed Wastage</th>
                <th className="py-2.5 px-4 text-right">Issued Fine</th>
                <th className="py-2.5 px-4 text-right">Recovered Fine</th>
                <th className="py-2.5 px-4 text-right">Outstanding</th>
                <th className="py-2.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No job orders currently assigned.
                  </td>
                </tr>
              ) : (
                jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2.5 px-4 font-mono font-semibold text-slate-900">{job.jobCode}</td>
                    <td className="py-2.5 px-4 font-medium text-slate-700">{job.itemCategory}</td>
                    <td className="py-2.5 px-4 text-slate-600 max-w-[200px] truncate" title={job.description}>
                      {job.description}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                      {job.allowedWastagePercent.toFixed(2)}%
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-slate-900">
                      <AlignedDecimal value={job.issuedFineWeight} /> g
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-emerald-700">
                      <AlignedDecimal value={job.recoveredFineWeight} /> g
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-amber-700">
                      <AlignedDecimal value={job.outstandingFineWeight} /> g
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Personal Gold Ledger / Slips History */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">Personal Weighing Slips & Voucher History</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">Immutable ledger entries</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 font-mono">Voucher #</th>
                <th className="py-2.5 px-4">Transaction Stream</th>
                <th className="py-2.5 px-4 font-mono">Job Code</th>
                <th className="py-2.5 px-4 text-right">Gross Weight</th>
                <th className="py-2.5 px-4 text-right">Purity</th>
                <th className="py-2.5 px-4 text-right">Fine Gold</th>
                <th className="py-2.5 px-4">HUID / Description</th>
                <th className="py-2.5 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    No transactions recorded in personal ledger yet.
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => {
                  const isIssue = entry.transactionType === 'ISSUE';
                  return (
                    <tr key={entry.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-slate-900">{entry.voucherNumber}</td>
                      <td className="py-2.5 px-4 font-sans">
                        <span
                          className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                            isIssue
                              ? 'bg-amber-100 text-amber-900'
                              : 'bg-emerald-100 text-emerald-900'
                          }`}
                        >
                          {entry.transactionType}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-slate-600">{entry.jobOrder?.jobCode || '—'}</td>
                      <td className="py-2.5 px-4 text-right font-medium text-slate-800">
                        {entry.grossWeight.toFixed(3)} g
                      </td>
                      <td className="py-2.5 px-4 text-right text-slate-600">{entry.purity.toFixed(2)} %</td>
                      <td
                        className={`py-2.5 px-4 text-right font-bold ${
                          isIssue ? 'text-amber-800' : 'text-emerald-700'
                        }`}
                      >
                        {isIssue ? '+' : '-'}{entry.fineWeight.toFixed(3)} g
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-600">
                        {entry.huid || entry.itemDescription || '—'}
                      </td>
                      <td className="py-2.5 px-4 font-sans text-slate-500 max-w-[200px] truncate" title={entry.remarks}>
                        {entry.remarks || '—'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
