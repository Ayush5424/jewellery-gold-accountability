import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { StockSummary, GoldLedgerEntry, LossAlert } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { StatusBadge } from '../components/StatusBadge';
import { AlertTriangle, Clock, RefreshCw } from 'lucide-react';

export const DashboardPage: React.FC<{ onNavigate: (tab: string) => void }> = ({ onNavigate }) => {
  const [stock, setStock] = useState<StockSummary | null>(null);
  const [recentLedger, setRecentLedger] = useState<GoldLedgerEntry[]>([]);
  const [pendingAlerts, setPendingAlerts] = useState<LossAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [stockData, ledgerData, alertsData] = await Promise.all([
        api.getStockSummary(),
        api.getRecentLedger(),
        api.getAlerts('PENDING_REVIEW').catch(() => []), // May be 403 if karigar role
      ]);
      setStock(stockData);
      setRecentLedger(ledgerData.slice(0, 8));
      setPendingAlerts(alertsData);
    } catch (err: any) {
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-slate-500 text-sm">
        <RefreshCw className="w-5 h-5 animate-spin mb-2 text-slate-400" />
        <span>Loading gold accountability ledger...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded text-sm mb-6 flex justify-between items-center">
        <span>{error}</span>
        <button onClick={fetchData} className="text-xs font-semibold underline">Retry</button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Stock Dashboard</h1>
          <p className="text-xs text-slate-500 mt-0.5">Real-time physical reconciliation across Coimbatore workshop & showrooms</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 self-start"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh Live Balances
        </button>
      </div>

      {/* Core Question KPI: Where is my gold right now? */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">Vault Fine Gold</span>
          <div className="mt-2 flex items-baseline">
            <AlignedDecimal value={stock?.vaultFineGold} className="text-2xl font-bold text-slate-900" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Physical bullion in central vault</p>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">With Karigars (In-Hand)</span>
          <div className="mt-2 flex items-baseline">
            <AlignedDecimal value={stock?.goldWithKarigars} className="text-2xl font-bold text-amber-700" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Working stock with artisan benches</p>
        </div>

        <div className="bg-white p-4 rounded border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-500">At Refiner / Melting</span>
          <div className="mt-2 flex items-baseline">
            <AlignedDecimal value={stock?.goldAtRefiner} className="text-2xl font-bold text-slate-800" />
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Filings & scrap in assay process</p>
        </div>

        <div className="bg-slate-900 text-white p-4 rounded border border-slate-800 shadow-xs">
          <span className="text-[11px] font-semibold tracking-wider uppercase text-slate-400">Total Tracked Fine Gold</span>
          <div className="mt-2 flex items-baseline">
            <AlignedDecimal value={stock?.totalTrackedFineGold} className="text-2xl font-bold text-amber-400" />
          </div>
          <p className="text-[11px] text-slate-400 mt-1">Total reconciled enterprise fine gold</p>
        </div>
      </div>

      {/* Actionable Review Queue (Pending Alerts) */}
      {pendingAlerts.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 rounded p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-700" />
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-900">
                Wastage & Loss Review Queue ({pendingAlerts.length} pending)
              </h2>
            </div>
            <button
              onClick={() => onNavigate('alerts')}
              className="text-xs font-semibold text-amber-900 underline hover:text-amber-950"
            >
              Open Review Queue &rarr;
            </button>
          </div>
          <div className="divide-y divide-amber-200/60 bg-white/70 border border-amber-200 rounded">
            {pendingAlerts.slice(0, 3).map((alert) => (
              <div key={alert.id} className="p-3 text-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                  <span className="font-semibold text-slate-900">{alert.karigar.name}</span>
                  <span className="text-slate-500 ml-2">Job: {alert.jobOrder.jobCode}</span>
                  <p className="text-slate-600 mt-0.5">{alert.reason}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="text-right">
                    <span className="text-slate-500">Excess Loss:</span>{' '}
                    <AlignedDecimal value={alert.excessLoss} className="font-semibold text-rose-700" />
                  </div>
                  <button
                    onClick={() => onNavigate('alerts')}
                    className="px-2.5 py-1 bg-slate-900 text-white rounded text-[11px] font-medium"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Ledger Audit Trail */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
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
