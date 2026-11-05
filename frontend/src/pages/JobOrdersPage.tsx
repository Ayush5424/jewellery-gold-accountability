import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { JobOrder, Karigar, ItemCategory, JobStatus } from '../types';
import { useAuth } from '../context/AuthContext';
import { CreateJobModal } from '../components/CreateJobModal';
import {
  Briefcase,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  ArrowUpRight,
  Clock,
  CheckCheck,
  RotateCcw,
  Scale,
} from 'lucide-react';

interface JobOrdersPageProps {
  onNavigateToIssue: (jobId: number) => void;
  onNavigateToLedger?: (jobId: number) => void;
}

export const JobOrdersPage: React.FC<JobOrdersPageProps> = ({
  onNavigateToIssue,
  onNavigateToLedger,
}) => {
  const { user, hasRole } = useAuth();
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [karigarFilter, setKarigarFilter] = useState<string>('ALL');

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [reopeningJobId, setReopeningJobId] = useState<number | null>(null);
  const [reopenReason, setReopenReason] = useState('');
  const [processingId, setProcessingId] = useState<number | null>(null);

  const isFinance = hasRole('ROLE_FINANCE_HEAD');
  const canCreate = hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD');

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const [jobsData, karigarsData] = await Promise.all([
        api.getJobs(),
        api.getKarigars().catch(() => []),
      ]);
      setJobs(jobsData);
      setKarigars(karigarsData);
    } catch (err: any) {
      console.error('Failed to load job orders', err);
      setActionError('Failed to fetch job orders from backend.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  const handleJobCreated = (newJob: JobOrder) => {
    setJobs((prev) => [newJob, ...prev]);
    setActionSuccess(`Job Order ${newJob.jobCode} created successfully! You can now issue gold.`);
  };

  const handleMarkReady = async (jobId: number) => {
    setProcessingId(jobId);
    setActionError(null);
    try {
      const updated = await api.markReadyForReconciliation(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      setActionSuccess(`Job ${updated.jobCode} marked READY_FOR_RECONCILIATION!`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to update job status.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReconcile = async (jobId: number) => {
    setProcessingId(jobId);
    setActionError(null);
    try {
      const updated = await api.reconcileJob(jobId);
      setJobs((prev) => prev.map((j) => (j.id === jobId ? updated : j)));
      setActionSuccess(`Job ${updated.jobCode} reconciled! Actual loss: ${updated.actualLoss?.toFixed(3)}g.`);
    } catch (err: any) {
      setActionError(err.message || 'Failed to reconcile job order.');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReopen = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reopeningJobId || !reopenReason.trim()) return;

    setProcessingId(reopeningJobId);
    setActionError(null);
    try {
      const updated = await api.reopenJob(reopeningJobId, reopenReason.trim());
      setJobs((prev) => prev.map((j) => (j.id === reopeningJobId ? updated : j)));
      setActionSuccess(`Job ${updated.jobCode} reopened for corrective adjustments.`);
      setReopeningJobId(null);
      setReopenReason('');
    } catch (err: any) {
      setActionError(err.message || 'Failed to reopen job order.');
    } finally {
      setProcessingId(null);
    }
  };

  // Filtered jobs
  const filteredJobs = jobs.filter((j) => {
    // Status filter
    if (statusFilter !== 'ALL' && j.status !== statusFilter) return false;
    // Category filter
    if (categoryFilter !== 'ALL' && j.itemCategory !== categoryFilter) return false;
    // Karigar filter
    if (karigarFilter !== 'ALL' && String(j.karigar?.id) !== karigarFilter) return false;
    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchCode = j.jobCode?.toLowerCase().includes(q);
      const matchArtisan = j.karigar?.name?.toLowerCase().includes(q) || j.karigar?.karigarCode?.toLowerCase().includes(q);
      const matchDesc = j.description?.toLowerCase().includes(q);
      if (!matchCode && !matchArtisan && !matchDesc) return false;
    }
    return true;
  });

  // Aggregate metrics
  const activeJobsCount = jobs.filter((j) => j.status === 'OPEN' || j.status === 'IN_PROGRESS').length;
  const readyJobsCount = jobs.filter((j) => j.status === 'READY_FOR_RECONCILIATION').length;
  const reconciledJobsCount = jobs.filter((j) => j.status === 'RECONCILED').length;
  const totalOutstandingFine = jobs.reduce((sum, j) => sum + (Number(j.outstandingFineWeight) || 0), 0);

  const getStatusBadge = (status: JobStatus) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-sky-50 text-sky-700 border border-sky-200">OPEN</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">IN PROGRESS</span>;
      case 'READY_FOR_RECONCILIATION':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">READY</span>;
      case 'RECONCILED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">RECONCILED</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">{status}</span>;
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Workshop Job Orders</h1>
            <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs font-mono font-bold rounded">
              {jobs.length} Total
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Assign fabrication contracts to Coimbatore artisans, track metal weight balances, and reconcile production loss
          </p>
        </div>

        {canCreate && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-4 h-4 text-amber-400" /> + Create New Job Order
          </button>
        )}
      </div>

      {/* Notifications */}
      {actionSuccess && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 font-bold ml-2">✕</button>
        </div>
      )}
      {actionError && (
        <div className="p-3 bg-rose-50 border border-rose-300 rounded text-xs text-rose-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{actionError}</span>
          </div>
          <button onClick={() => setActionError(null)} className="text-rose-700 font-bold ml-2">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Active Workshop Jobs</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{activeJobsCount}</span>
            <span className="text-[11px] text-amber-600 font-medium font-mono">In Progress</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Ready for Reconciliation</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-purple-700">{readyJobsCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">Pending Audit</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Outstanding Fine Gold</span>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-2xl font-bold font-mono text-amber-700">{totalOutstandingFine.toFixed(3)}</span>
            <span className="text-xs text-slate-400 font-mono">g</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Reconciled Jobs</span>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">{reconciledJobsCount}</span>
            <span className="text-[11px] text-slate-400 font-mono">Completed</span>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-3.5 rounded border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between text-xs">
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search code, artisan, description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden text-slate-900"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded bg-white text-slate-800 text-xs"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open (Unissued)</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="READY_FOR_RECONCILIATION">Ready for Reconciliation</option>
              <option value="RECONCILED">Reconciled</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Category:</span>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded bg-white text-slate-800 text-xs"
            >
              <option value="ALL">All Categories</option>
              <option value="CHAIN">Chain</option>
              <option value="BANGLES">Bangles</option>
              <option value="NECKLACE">Necklace</option>
              <option value="RING">Ring</option>
              <option value="EARRINGS">Earrings</option>
              <option value="TEMPLE_JEWELLERY">Temple Jewellery</option>
              <option value="COIN_BAR">Coin / Bar</option>
            </select>
          </div>

          {/* Karigar Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-slate-500">Artisan:</span>
            <select
              value={karigarFilter}
              onChange={(e) => setKarigarFilter(e.target.value)}
              className="py-1 px-2 border border-slate-300 rounded bg-white text-slate-800 text-xs"
            >
              <option value="ALL">All Artisans</option>
              {karigars.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={fetchJobs}
            title="Refresh jobs"
            className="p-1.5 border border-slate-300 rounded text-slate-600 hover:bg-slate-50 ml-auto"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Job Orders Table */}
      <div className="bg-white rounded border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-[11px] uppercase tracking-wider text-slate-600 border-b border-slate-200">
              <tr>
                <th className="py-3 px-3.5 font-semibold">Job Order</th>
                <th className="py-3 px-3.5 font-semibold">Artisan Karigar</th>
                <th className="py-3 px-3.5 font-semibold">Category & Description</th>
                <th className="py-3 px-3.5 font-semibold">Status</th>
                <th className="py-3 px-3 text-right font-semibold">Issued (g)</th>
                <th className="py-3 px-3 text-right font-semibold">Recovered (g)</th>
                <th className="py-3 px-3 text-right font-semibold">Balance (g)</th>
                <th className="py-3 px-3 text-right font-semibold">Wastage %</th>
                <th className="py-3 px-3.5 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && jobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-400">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-amber-500" />
                    Loading workshop job orders...
                  </td>
                </tr>
              ) : filteredJobs.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-slate-500">
                    <Briefcase className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                    No job orders found matching the filter criteria.
                  </td>
                </tr>
              ) : (
                filteredJobs.map((job) => {
                  const issued = Number(job.issuedFineWeight) || 0;
                  const recovered = Number(job.recoveredFineWeight) || 0;
                  const outstanding = Number(job.outstandingFineWeight) || 0;
                  const wastagePct = Number(job.allowedWastagePercent) || 0;

                  return (
                    <tr key={job.id} className="hover:bg-slate-50/80 transition-colors">
                      {/* Job Code */}
                      <td className="py-2.5 px-3.5 font-mono font-bold text-slate-900 whitespace-nowrap">
                        {job.jobCode}
                      </td>

                      {/* Artisan */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        <span className="font-semibold text-slate-900">{job.karigar?.name || 'Unassigned'}</span>
                        <p className="text-[10px] text-slate-400 font-mono">{job.karigar?.karigarCode} • {job.karigar?.workshopLocation}</p>
                      </td>

                      {/* Category & Description */}
                      <td className="py-2.5 px-3.5 max-w-xs">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 mr-1.5 font-mono">
                          {job.itemCategory}
                        </span>
                        <span className="text-slate-700 line-clamp-1">{job.description}</span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3.5 whitespace-nowrap">
                        {getStatusBadge(job.status)}
                      </td>

                      {/* Weights */}
                      <td className="py-2.5 px-3 text-right font-mono text-slate-800">
                        {issued.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-emerald-700">
                        {recovered.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-amber-700">
                        {outstanding.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                        {wastagePct.toFixed(2)}%
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Issue Gold Action: For OPEN or IN_PROGRESS jobs */}
                          {(job.status === 'OPEN' || job.status === 'IN_PROGRESS') && (
                            <button
                              type="button"
                              onClick={() => onNavigateToIssue(job.id)}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                              title="Issue gold bullion to this job"
                            >
                              <ArrowUpRight className="w-3 h-3 text-amber-700" /> Issue Gold
                            </button>
                          )}

                          {/* Mark Ready Action */}
                          {job.status === 'IN_PROGRESS' && recovered > 0 && (
                            <button
                              type="button"
                              onClick={() => handleMarkReady(job.id)}
                              disabled={processingId === job.id}
                              className="px-2 py-1 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-300 rounded text-[11px] font-medium"
                              title="Mark job complete and ready for reconciliation"
                            >
                              Mark Ready
                            </button>
                          )}

                          {/* Finance Head: Reconcile Action */}
                          {isFinance && job.status === 'READY_FOR_RECONCILIATION' && (
                            <button
                              type="button"
                              onClick={() => handleReconcile(job.id)}
                              disabled={processingId === job.id}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded font-semibold text-[11px] flex items-center gap-1"
                            >
                              <CheckCheck className="w-3 h-3" /> Reconcile
                            </button>
                          )}

                          {/* Finance Head: Reopen Action */}
                          {isFinance && job.status === 'RECONCILED' && (
                            <button
                              type="button"
                              onClick={() => setReopeningJobId(job.id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded text-[11px] flex items-center gap-1"
                              title="Reopen reconciled job for corrective adjustment"
                            >
                              <RotateCcw className="w-3 h-3" /> Reopen
                            </button>
                          )}

                          {/* View Ledger */}
                          {onNavigateToLedger && (
                            <button
                              type="button"
                              onClick={() => onNavigateToLedger(job.id)}
                              className="text-slate-500 hover:text-slate-800 underline text-[11px] px-1"
                            >
                              Ledger
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Job Order Modal */}
      <CreateJobModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onJobCreated={handleJobCreated}
      />

      {/* Reopen Audit Modal */}
      {reopeningJobId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-md p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Authorize Job Order Reopening</h3>
            <p className="text-xs text-slate-500">
              Reopening job order #{reopeningJobId} allows subsequent issue or receipt adjustments. Provide an audit reason.
            </p>
            <form onSubmit={handleReopen} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Audit reason for reopening (e.g., karigar returned additional bench dust filings)"
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded text-xs text-slate-900"
              />
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setReopeningJobId(null);
                    setReopenReason('');
                  }}
                  className="px-3 py-1.5 border border-slate-300 rounded text-xs text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={processingId === reopeningJobId}
                  className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
                >
                  Confirm Reopen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
