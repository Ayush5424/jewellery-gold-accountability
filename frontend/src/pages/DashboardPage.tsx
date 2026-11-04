import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { StockSummary, GoldLedgerEntry, LossAlert, JobOrder } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { StatusBadge } from '../components/StatusBadge';
import { KarigarDashboardPage } from './KarigarDashboardPage';
import {
  AlertTriangle,
  Clock,
  RefreshCw,
  CheckCircle,
  ArrowRight,
  ArrowUpRight,
  ArrowDownLeft,
  Sparkles,
  Users,
  ShieldCheck,
  FileSpreadsheet,
  Lock,
  Unlock,
  AlertCircle,
  Building2,
} from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const { user, hasRole } = useAuth();

  // If logged in as Karigar, render KarigarDashboardPage directly
  if (user?.role === 'ROLE_KARIGAR') {
    return <KarigarDashboardPage />;
  }

  const [stock, setStock] = useState<StockSummary | null>(null);
  const [recentLedger, setRecentLedger] = useState<GoldLedgerEntry[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<LossAlert[]>([]);
  const [readyJobs, setReadyJobs] = useState<JobOrder[]>([]);
  const [activeJobs, setActiveJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Reconciliation Action State
  const [reconcilingId, setReconcilingId] = useState<number | null>(null);
  const [reopeningJobId, setReopeningJobId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState<string>('');
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const isFinance = hasRole('ROLE_FINANCE_HEAD');

      const [stockData, ledgerData, alertsData, jobsData] = await Promise.all([
        api.getStockSummary().catch(() => null),
        api.getRecentLedger().catch(() => []),
        isFinance ? api.getAlerts('PENDING_REVIEW').catch(() => []) : Promise.resolve([]),
        api.getJobs().catch(() => []),
      ]);

      if (stockData) setStock(stockData);
      setRecentLedger(ledgerData.slice(0, 8));
      setPendingAlerts(alertsData);
      setReadyJobs(jobsData.filter(j => j.status === 'READY_FOR_RECONCILIATION'));
      setActiveJobs(jobsData.filter(j => j.status === 'OPEN' || j.status === 'IN_PROGRESS'));
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleFinalizeReconciliation = async (jobId: number) => {
    setReconcilingId(jobId);
    setActionSuccess(null);
    setActionError(null);
    try {
      const reconciled = await api.reconcileJob(jobId);
      setActionSuccess(`Job ${reconciled.jobCode} successfully reconciled! Actual loss: ${reconciled.actualLoss?.toFixed(3)}g.`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to finalize reconciliation.');
    } finally {
      setReconcilingId(null);
    }
  };

  const handleMarkReady = async (jobId: number) => {
    setActionSuccess(null);
    setActionError(null);
    try {
      const updated = await api.markReadyForReconciliation(jobId);
      setActionSuccess(`Job ${updated.jobCode} marked READY_FOR_RECONCILIATION!`);
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to update job status.');
    }
  };

  const handleReopenJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningJobId || !reopenReason) return;
    try {
      await api.reopenJob(reopeningJobId, reopenReason);
      setActionSuccess(`Job #${reopeningJobId} reopened for corrective adjustment.`);
      setReopeningJobId(null);
      setReopenReason('');
      fetchData();
    } catch (err: any) {
      setActionError(err.message || 'Failed to reopen job.');
    }
  };

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mb-2 text-slate-400" />
        <span>Loading authoritative gold accountability dashboard...</span>
      </div>
    );
  }

  const isFinance = hasRole('ROLE_FINANCE_HEAD');

  return (
    <div className="space-y-6">
      {/* Page Title & Context Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span>{isFinance ? 'Finance Head Audit Dashboard' : 'Workshop Operations Cockpit'}</span>
            <span className="text-[10px] font-mono uppercase bg-slate-900 text-amber-400 px-2 py-0.5 rounded">
              {isFinance ? 'Executive Authority' : 'Issue & Receipt Operations'}
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {isFinance
              ? 'Real-time physical reconciliation, loss detection & Tally integration across 5 showrooms & workshop'
              : 'Daily gold issuance, slip extraction, receipt verification & job reconciliation tracking'}
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            <span>Refresh Balances</span>
          </button>
          {isFinance && (
            <button
              onClick={() => onNavigate('stock')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 text-white rounded text-xs font-medium hover:bg-amber-500 shadow-sm"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Stock Statement & Tally</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Banners */}
      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 p-3.5 rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {actionError && (
        <div className="bg-rose-50 border border-rose-300 text-rose-800 p-3.5 rounded text-xs flex items-center justify-between">
          <div className="flex items-center gap-2 font-medium">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-slate-400 hover:text-slate-600 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Reopen Job Audit Modal */}
      {reopeningJobId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg border border-slate-300 shadow-xl max-w-md w-full p-5 space-y-4">
            <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
              <Unlock className="w-5 h-5 text-rose-600" />
              <span>Authorize Job Order Reopening</span>
            </div>
            <p className="text-xs text-slate-600">
              Reopening a reconciled job (ID: {reopeningJobId}) permits corrective issue or receipt adjustments.
              A detailed audit justification is required by company accounting policy.
            </p>
            <form onSubmit={handleReopenJob} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  required
                  rows={3}
                  value={reopenReason}
                  onChange={(e) => setReopenReason(e.target.value)}
                  placeholder="e.g. Authorized assay test correction requested by workshop supervisor..."
                  className="w-full text-xs p-2 border border-slate-300 rounded focus:ring-1 focus:ring-amber-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setReopeningJobId(null)}
                  className="px-3 py-1.5 text-xs border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs bg-rose-600 text-white rounded font-medium hover:bg-rose-500"
                >
                  Authorize Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Core Question KPI: Where is my gold right now? */}
      {isFinance ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-slate-800">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Vault Fine Gold</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.vaultFineGold} className="text-2xl font-bold text-slate-900" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Physical bullion in central vault</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">With Karigars (In-Hand)</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.goldWithKarigars} className="text-2xl font-bold text-amber-700" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Working stock with artisan benches</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-sky-500">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">At Refiner / Melting</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.goldAtRefiner} className="text-2xl font-bold text-slate-800" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Filings & scrap in acid assay</p>
          </div>

          <div className="bg-slate-900 text-white p-4 rounded-lg border border-slate-800 shadow-sm border-l-4 border-l-amber-400">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Total Tracked Fine Gold</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.totalTrackedFineGold} className="text-2xl font-bold text-amber-400" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Authoritative enterprise stock</p>
          </div>
        </div>
      ) : (
        /* Issue Clerk Workshop Metrics */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-amber-500">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Working Gold with Karigars</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.goldWithKarigars} className="text-2xl font-bold text-amber-700" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">In-process across ~40 artisan benches</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-sky-500">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Total Gold Issued</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.totalIssuedFine} className="text-2xl font-bold text-slate-900" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Fine gold dispatched to date</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-emerald-500">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Total Gold Recovered</span>
            <div className="mt-2 flex items-baseline">
              <AlignedDecimal value={stock?.totalRecoveredFine} className="text-2xl font-bold text-emerald-700" />
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Jewellery, clean scrap & bench filings</p>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm border-l-4 border-l-slate-800">
            <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Active Workshop Jobs</span>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold font-mono text-slate-900">{activeJobs.length}</span>
              <span className="text-xs font-mono text-amber-700 font-medium">({readyJobs.length} ready)</span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">Jobs currently in fabrication</p>
          </div>
        </div>
      )}

      {/* Issue Clerk Operations Quick-Action Launcher */}
      {!isFinance && (
        <div className="bg-gradient-to-r from-slate-900 to-slate-850 p-4 rounded-lg text-white shadow-sm space-y-2.5">
          <p className="text-xs font-mono uppercase tracking-wider text-amber-400 font-semibold">
            Workshop Daily Operations Quick-Actions
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <button
              onClick={() => onNavigate('issue')}
              className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">Issue Gold</p>
                <p className="text-[10px] text-slate-400">Dispatch bullion to karigar</p>
              </div>
              <ArrowUpRight className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => onNavigate('receive')}
              className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">Receive Gold</p>
                <p className="text-[10px] text-slate-400">Log jewellery, scrap, dust</p>
              </div>
              <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
            </button>

            <button
              onClick={() => onNavigate('ai-extract')}
              className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-amber-600/60 rounded text-left transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-amber-300">AI Slip Scanner</p>
                <p className="text-[10px] text-slate-400">Extract digital scale slips</p>
              </div>
              <Sparkles className="w-4 h-4 text-amber-400" />
            </button>

            <button
              onClick={() => onNavigate('karigars')}
              className="p-3 bg-slate-800/80 hover:bg-slate-750 border border-slate-700 rounded text-left transition-colors flex items-center justify-between"
            >
              <div>
                <p className="text-xs font-bold text-white">Karigar Master</p>
                <p className="text-[10px] text-slate-400">Manage artisan registry</p>
              </div>
              <Users className="w-4 h-4 text-sky-400" />
            </button>
          </div>
        </div>
      )}

      {/* Finance Head: Jobs Ready For Reconciliation Panel */}
      {isFinance && readyJobs.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-lg p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-amber-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Jobs Ready for Reconciliation ({readyJobs.length} work orders)
              </h2>
            </div>
            <span className="text-[11px] font-mono text-amber-800">All materials weighed & returned</span>
          </div>

          <div className="divide-y divide-amber-200 bg-white rounded border border-amber-200 overflow-hidden">
            {readyJobs.map((job) => {
              const actualLoss = (job.issuedFineWeight - job.recoveredFineWeight);
              const allowedLoss = (job.issuedFineWeight * (job.allowedWastagePercent / 100));
              const excess = actualLoss - allowedLoss;
              const hasExcess = excess > 0.001;

              return (
                <div key={job.id} className="p-3.5 text-xs flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900">{job.jobCode}</span>
                      <span className="text-slate-600 font-medium">— {job.karigar.name}</span>
                      <span className="text-[11px] text-slate-500">({job.itemCategory})</span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-[11px] font-mono">
                      <span className="text-slate-600">Issued: <strong>{job.issuedFineWeight.toFixed(3)}g</strong></span>
                      <span className="text-slate-600">Recovered: <strong>{job.recoveredFineWeight.toFixed(3)}g</strong></span>
                      <span className="text-slate-600">Allowance: <strong>{job.allowedWastagePercent.toFixed(2)}%</strong> ({allowedLoss.toFixed(3)}g)</span>
                      <span className={hasExcess ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}>
                        Variance: {actualLoss.toFixed(3)}g loss {hasExcess ? `(+${excess.toFixed(3)}g EXCESS)` : '(Within allowance)'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end lg:self-center shrink-0">
                    <button
                      onClick={() => handleFinalizeReconciliation(job.id)}
                      disabled={reconcilingId === job.id}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-slate-950 font-bold text-xs rounded shadow flex items-center gap-1.5 transition-colors disabled:opacity-50"
                    >
                      {reconcilingId === job.id ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Reconciling...</span>
                        </>
                      ) : (
                        <>
                          <Lock className="w-3.5 h-3.5" />
                          <span>Finalize Reconciliation</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Loss & Wastage Alerts Queue (Finance Head) */}
      {isFinance && pendingAlerts.length > 0 && (
        <div className="bg-rose-50/70 border border-rose-300 rounded-lg p-4 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-rose-900">
                Wastage & Loss Review Queue ({pendingAlerts.length} pending alerts)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs font-semibold text-rose-900 underline hover:text-rose-950"
            >
              Open Full Alert Cockpit &rarr;
            </button>
          </div>

          <div className="divide-y divide-rose-200 bg-white rounded border border-rose-200">
            {pendingAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{alert.karigar.name}</span>
                    <span className="text-slate-500 font-mono">Job: {alert.jobOrder.jobCode}</span>
                    <span className="text-[10px] font-mono px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">
                      {alert.alertType}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 text-[11px]">{alert.reason}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <div className="text-right text-[11px] font-mono">
                    <span className="text-slate-500">Excess: </span>
                    <span className="font-bold text-rose-700">+{alert.excessLoss.toFixed(3)}g</span>
                  </div>
                  <button
                    onClick={() => onNavigate('alerts')}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-medium hover:bg-slate-800"
                  >
                    Audit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Issue Clerk: In-Progress Jobs Tracker */}
      {!isFinance && activeJobs.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Active Workshop Jobs ({activeJobs.length})
            </h2>
            <button
              onClick={() => onNavigate('issue')}
              className="text-xs font-semibold text-amber-700 hover:text-amber-900"
            >
              + Issue New Job &rarr;
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-4 font-mono">Job Code</th>
                  <th className="py-2.5 px-4">Karigar</th>
                  <th className="py-2.5 px-4">Item</th>
                  <th className="py-2.5 px-4 text-right">Issued Fine</th>
                  <th className="py-2.5 px-4 text-right">Recovered Fine</th>
                  <th className="py-2.5 px-4 text-right">Outstanding</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                  <th className="py-2.5 px-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-mono">
                {activeJobs.map((job) => (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-4 font-bold text-slate-900">{job.jobCode}</td>
                    <td className="py-2 px-4 font-sans font-medium text-slate-800">{job.karigar.name}</td>
                    <td className="py-2 px-4 font-sans text-slate-600">{job.itemCategory}</td>
                    <td className="py-2 px-4 text-right">{job.issuedFineWeight.toFixed(3)}g</td>
                    <td className="py-2 px-4 text-right text-emerald-700">{job.recoveredFineWeight.toFixed(3)}g</td>
                    <td className="py-2 px-4 text-right font-bold text-amber-700">{job.outstandingFineWeight.toFixed(3)}g</td>
                    <td className="py-2 px-4 text-center font-sans">
                      <StatusBadge status={job.status} />
                    </td>
                    <td className="py-2 px-4 text-center font-sans">
                      {job.status === 'IN_PROGRESS' && (
                        <button
                          onClick={() => handleMarkReady(job.id)}
                          className="px-2 py-0.5 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded font-medium"
                          title="Mark job complete and ready for reconciliation"
                        >
                          Mark Ready
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Ledger Audit Trail */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-500" />
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">Recent Ledger Transactions</h2>
          </div>
          <button
            onClick={() => onNavigate('ledger')}
            className="text-xs font-semibold text-slate-700 hover:text-slate-900"
          >
            View Full Ledger &rarr;
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Voucher No</th>
                <th className="py-2.5 px-4">Timestamp</th>
                <th className="py-2.5 px-4">Transaction Type</th>
                <th className="py-2.5 px-4">Karigar</th>
                <th className="py-2.5 px-4">Job Code</th>
                <th className="py-2.5 px-4 text-right">Gross Weight</th>
                <th className="py-2.5 px-4 text-right">Purity</th>
                <th className="py-2.5 px-4 text-right">Fine Weight</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentLedger.map((tx) => (
                <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2 px-4 font-mono font-medium text-slate-900">{tx.voucherNumber}</td>
                  <td className="py-2 px-4 text-slate-500 font-mono text-[11px]">
                    {new Date(tx.createdAt).toLocaleDateString('en-IN', {
                      month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </td>
                  <td className="py-2 px-4">
                    <StatusBadge status={tx.transactionType} />
                  </td>
                  <td className="py-2 px-4 font-medium text-slate-800">{tx.karigar?.name || '—'}</td>
                  <td className="py-2 px-4 font-mono text-slate-600">{tx.jobOrder?.jobCode || '—'}</td>
                  <td className="py-2 px-4 text-right">
                    <AlignedDecimal value={tx.grossWeight} />
                  </td>
                  <td className="py-2 px-4 text-right font-mono tabular-nums">
                    {Number(tx.purity).toFixed(2)}%
                  </td>
                  <td className="py-2 px-4 text-right font-semibold">
                    <AlignedDecimal value={tx.fineWeight} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
