import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { LossAlert, AlertStatus } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { StatusBadge } from '../components/StatusBadge';
import { AlertTriangle, CheckCircle2, RefreshCw, MessageSquare } from 'lucide-react';

export const LossAlertsPage: React.FC = () => {
  const [alerts, setAlerts] = useState<LossAlert[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('PENDING_REVIEW');
  const [loading, setLoading] = useState(true);
  const [reviewAlertId, setReviewAlertId] = useState<number | null>(null);
  const [actionStatus, setActionStatus] = useState<AlertStatus>('REVIEWED_APPROVED');
  const [financeNotes, setFinanceNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const data = await api.getAlerts(statusFilter || undefined);
      setAlerts(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [statusFilter]);

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewAlertId) return;
    setSaving(true);
    try {
      await api.reviewAlert(reviewAlertId, actionStatus, financeNotes);
      setReviewAlertId(null);
      setFinanceNotes('');
      fetchAlerts();
    } catch (err: any) {
      alert(err.message || 'Failed to update alert');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Wastage & Loss Review Queue</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Finance oversight for completed jobs exceeding contractual wastage or deviating from artisan historical baselines
          </p>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex bg-slate-200 p-0.5 rounded text-xs self-start">
          <button
            onClick={() => setStatusFilter('PENDING_REVIEW')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === 'PENDING_REVIEW' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Review
          </button>
          <button
            onClick={() => setStatusFilter('')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              statusFilter === '' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Alerts ({alerts.length})
          </button>
        </div>
      </div>

      {/* Advisory Banner: Calm & Non-accusatory Tone */}
      <div className="bg-slate-50 border border-slate-200 rounded p-4 text-xs text-slate-600 leading-relaxed">
        <span className="font-semibold text-slate-900">Governance Principle:</span> Loss alerts are designed for constructive physical verification and process review. Deviations may reflect complex casting geometry, stone-setting friction, or bench recovery variance. All notes should remain professional and objective.
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Artisan & Workshop</th>
                <th className="py-2.5 px-4">Job Code</th>
                <th className="py-2.5 px-4">Trigger Type</th>
                <th className="py-2.5 px-4 text-right">Actual Loss</th>
                <th className="py-2.5 px-4 text-right">Allowed Loss</th>
                <th className="py-2.5 px-4 text-right">Excess Variance</th>
                <th className="py-2.5 px-4 text-right">Historical Baseline</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4 text-right">Review Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.map((alert) => (
                <tr key={alert.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-900 block">{alert.karigar.name}</span>
                    <span className="text-slate-400 font-mono text-[11px]">{alert.karigar.karigarCode} • {alert.karigar.workshopLocation}</span>
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-slate-800">{alert.jobOrder.jobCode}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex px-2 py-0.5 rounded text-[11px] font-medium border ${
                      alert.alertType === 'EXCESS_OVER_ALLOWANCE'
                        ? 'bg-amber-50 text-amber-900 border-amber-300'
                        : 'bg-blue-50 text-blue-900 border-blue-300'
                    }`}>
                      {alert.alertType === 'EXCESS_OVER_ALLOWANCE' ? 'Allowance Breach' : 'Baseline Drift'}
                    </span>
                    <p className="text-[11px] text-slate-500 mt-1 max-w-xs">{alert.reason}</p>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-semibold text-slate-900">
                    <AlignedDecimal value={alert.actualLoss} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-slate-600">
                    <AlignedDecimal value={alert.allowedLoss} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-bold text-rose-700">
                    <AlignedDecimal value={alert.excessLoss} />
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {Number(alert.historicalBaselinePct || 0).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4">
                    <StatusBadge status={alert.status} />
                    {alert.reviewedBy && (
                      <span className="block text-[10px] text-slate-400 mt-0.5">by {alert.reviewedBy}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => {
                        setReviewAlertId(alert.id);
                        setActionStatus(alert.status);
                        setFinanceNotes(alert.financeNotes || '');
                      }}
                      className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-medium hover:bg-slate-800"
                    >
                      {alert.status === 'PENDING_REVIEW' ? 'Review Alert' : 'Update Notes'}
                    </button>
                  </td>
                </tr>
              ))}
              {alerts.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No alerts in this view. All reconciled jobs are operating within agreed tolerances.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Review Modal */}
      {reviewAlertId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Finance Review Disposition</h3>
            <p className="text-xs text-slate-600">
              Record findings following discussion with workshop manager and physical bench review.
            </p>

            <form onSubmit={handleReviewSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Disposition Status</label>
                <select
                  value={actionStatus}
                  onChange={(e) => setActionStatus(e.target.value as AlertStatus)}
                  className="w-full p-2 border border-slate-300 rounded font-medium text-slate-800 bg-white"
                >
                  <option value="REVIEWED_APPROVED">Reviewed & Approved (Normal process variation)</option>
                  <option value="ESCALATED">Escalated to Internal Auditor</option>
                  <option value="PENDING_REVIEW">Keep in Pending Review</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Finance Review Notes</label>
                <textarea
                  required
                  rows={4}
                  value={financeNotes}
                  onChange={(e) => setFinanceNotes(e.target.value)}
                  placeholder="e.g. Discussed with workshop supervisor. Verified that intricate Coimbatore temple filigree work produced higher bench dust, accounted for in subsequent refining batch."
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:border-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setReviewAlertId(null)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded font-medium disabled:bg-slate-400"
                >
                  {saving ? 'Saving...' : 'Save Disposition'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
