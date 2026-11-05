import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
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
  Globe,
} from 'lucide-react';

export const KarigarDashboardPage: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage, t } = useLanguage();
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
    .filter(e => e.transactionType !== 'ISSUE' && e.transactionType !== 'ADJUSTMENT_REVERSAL')
    .reduce((sum, e) => sum + e.fineWeight, 0);

  const currentOutstandingFine = totalIssuedFine - totalReturnedFine;

  const activeJobs = jobs.filter(j => j.status === 'IN_PROGRESS' || j.status === 'OPEN' || j.status === 'READY_FOR_RECONCILIATION');
  const reconciledJobs = jobs.filter(j => j.status === 'RECONCILED');

  return (
    <div className="space-y-6">
      {/* Header Profile Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-800 rounded-lg p-5 text-white shadow-md border border-slate-700/60">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-lg bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300 font-bold text-lg">
              {profile?.name?.substring(0, 2).toUpperCase() || 'MK'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-100">
                  {profile?.name || user?.fullName}
                </h1>
                <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-amber-500/20 text-amber-300 border border-amber-400/30">
                  {profile?.karigarCode || 'KRG-001'}
                </span>
                <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {language === 'ta' ? 'தனிப்பட்ட பட்டறை பார்வை' : 'Isolated Artisan Access'}
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                <span>{t('dashboard.bench')}: <strong className="text-slate-300">{profile?.workshopLocation}</strong></span>
                <span>•</span>
                <span>{t('dashboard.phone')}: <strong className="text-slate-300">{profile?.phone}</strong></span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Direct Language Switcher */}
            <button
              onClick={() => setLanguage(language === 'en' ? 'ta' : 'en')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-medium transition-colors"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{language === 'en' ? 'தமிழ் இடைமுகம்' : 'English Interface'}</span>
            </button>
            <button
              onClick={fetchKarigarData}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{t('dashboard.refresh')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* KPI Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Outstanding Pure Gold In-Hand */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{t('dashboard.pureGoldBalance')}</span>
            <Scale className="w-4 h-4 text-amber-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-bold font-mono tracking-tight ${
              currentOutstandingFine > 0 ? 'text-amber-600' : 'text-slate-900'
            }`}>
              <AlignedDecimal value={currentOutstandingFine} />
            </span>
            <span className="text-xs font-mono font-medium text-slate-500">g fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.custodianLiability')}</p>
          <div className="absolute top-0 right-0 w-16 h-16 bg-amber-50 rounded-full -mr-8 -mt-8 pointer-events-none" />
        </div>

        {/* Total Issued */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{t('dashboard.totalIssued')}</span>
            <Clock className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900 tracking-tight">
              <AlignedDecimal value={totalIssuedFine} />
            </span>
            <span className="text-xs font-mono font-medium text-slate-500">g fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.cumulativeBullion')}</p>
        </div>

        {/* Total Returned */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{t('dashboard.totalDelivered')}</span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700 tracking-tight">
              <AlignedDecimal value={totalReturnedFine} />
            </span>
            <span className="text-xs font-mono font-medium text-slate-500">g fine</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{t('dashboard.materialsAccounted')}</p>
        </div>

        {/* Active vs Reconciled Jobs */}
        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>{t('dashboard.activeJobs')}</span>
            <Hammer className="w-4 h-4 text-slate-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-xl font-bold font-mono text-slate-800">{activeJobs.length}</span>
            <span className="text-xs text-amber-700 font-medium">{language === 'ta' ? 'செயலில்' : 'active'}</span>
            <span className="text-slate-300">/</span>
            <span className="text-sm font-mono text-slate-600">{reconciledJobs.length}</span>
            <span className="text-xs text-slate-500">{language === 'ta' ? 'முடிந்தது' : 'reconciled'}</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1">{language === 'ta' ? `மொத்தம் ${jobs.length} பணிகள்` : `Total ${jobs.length} jobs assigned`}</p>
        </div>
      </div>

      {/* Assigned Job Orders Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-600" />
            <h2 className="text-sm font-bold text-slate-800">{t('dashboard.myJobs')}</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{language === 'ta' ? `${jobs.length} பணிகள் காட்டப்படுகின்றன` : `Showing ${jobs.length} jobs`}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 font-mono">{t('table.job')}</th>
                <th className="py-2.5 px-4">{t('table.category')}</th>
                <th className="py-2.5 px-4">{t('table.description')}</th>
                <th className="py-2.5 px-4 text-right">{t('dashboard.allowedWastage')}</th>
                <th className="py-2.5 px-4 text-right">{t('dashboard.totalIssued')}</th>
                <th className="py-2.5 px-4 text-right">{t('dashboard.totalDelivered')}</th>
                <th className="py-2.5 px-4 text-right">{t('table.outstanding')}</th>
                <th className="py-2.5 px-4 text-center">{t('table.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {jobs.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    {t('dashboard.emptyJobs')}
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
            <h2 className="text-sm font-bold text-slate-800">{t('dashboard.recentTransactions')}</h2>
          </div>
          <span className="text-xs font-mono text-slate-500">{language === 'ta' ? 'மாற்ற முடியாத கணக்கு பதிவுகள்' : 'Immutable ledger entries'}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-2.5 px-4 font-mono">{t('table.voucher')}</th>
                <th className="py-2.5 px-4">{t('table.type')}</th>
                <th className="py-2.5 px-4 font-mono">{t('table.job')}</th>
                <th className="py-2.5 px-4 text-right">{t('table.grossWeight')}</th>
                <th className="py-2.5 px-4 text-right">{t('table.purity')}</th>
                <th className="py-2.5 px-4 text-right">{t('table.fineWeight')}</th>
                <th className="py-2.5 px-4">{t('table.huid')} / {t('table.description')}</th>
                <th className="py-2.5 px-4">{t('table.remarks')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {ledgerEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400 font-sans">
                    {t('dashboard.emptyLedger')}
                  </td>
                </tr>
              ) : (
                ledgerEntries.map((entry) => {
                  const isIssue = entry.transactionType === 'ISSUE';
                  const txKey = `tx.${entry.transactionType}`;
                  const displayType = t(txKey) !== txKey ? t(txKey) : entry.transactionType;
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
                          {displayType}
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
