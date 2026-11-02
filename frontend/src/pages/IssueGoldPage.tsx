import React, { useState, useEffect } from 'react';
import { api, saveFormDraft, loadFormDraft, clearFormDraft, generateIdempotencyKey } from '../api/client';
import { Karigar, JobOrder } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { ReviewModal } from '../components/ReviewModal';
import { AlertBanner } from '../components/AlertBanner';
import { Sparkles, Calculator, CheckCircle2, RefreshCw } from 'lucide-react';

export const IssueGoldPage: React.FC<{ onNavigateToLedger: (jobId: number) => void }> = ({ onNavigateToLedger }) => {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<{
    karigarId: string;
    jobId: string;
    grossWeight: string;
    purity: string;
    remarks: string;
    aiExtracted: boolean;
  }>({
    karigarId: '',
    jobId: '',
    grossWeight: '',
    purity: '91.60', // Coimbatore 22K benchmark default
    remarks: 'Initial bullion bar issued for manufacture',
    aiExtracted: false,
  });

  // AI draft readout state
  const [aiDraftNotice, setAiDraftNotice] = useState<string | null>(null);
  const [isReadingAi, setIsReadingAi] = useState(false);

  // Review Dialog State
  const [showReview, setShowReview] = useState(false);

  useEffect(() => {
    // Load cached draft if available
    const saved = loadFormDraft<typeof formData>('issue_gold');
    if (saved) {
      setFormData(saved);
    }

    api.getKarigars().then(setKarigars).catch(console.error);
    api.getJobs().then(setJobs).catch(console.error);
  }, []);

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    saveFormDraft('issue_gold', updated);
  };

  // Live Fine Gold Calculation
  const grossNum = parseFloat(formData.grossWeight) || 0;
  const purityNum = parseFloat(formData.purity) || 0;
  const calculatedFine = grossNum > 0 && purityNum > 0
    ? (grossNum * purityNum) / 100
    : 0;

  const handleAiUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsReadingAi(true);
    setAiDraftNotice(null);
    try {
      const res = await api.extractSlip(file, file.name);
      if (res.weight) {
        handleFieldChange('grossWeight', String(res.weight));
      }
      if (res.purity) {
        handleFieldChange('purity', String(res.purity));
      }
      handleFieldChange('aiExtracted', true);
      setAiDraftNotice(
        `AI draft reading extracted (Confidence: ${Math.round(res.confidence * 100)}%). Notice: Manual confirmation is strictly required.`
      );
    } catch (err) {
      setAiDraftNotice('Unable to extract draft values from slip image. Please enter weights manually.');
    } finally {
      setIsReadingAi(false);
    }
  };

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await api.issueGold({
        jobId: Number(formData.jobId),
        grossWeight: Number(formData.grossWeight),
        purity: Number(formData.purity),
        remarks: formData.remarks,
        aiExtracted: formData.aiExtracted,
        idempotencyKey,
      });

      clearFormDraft('issue_gold');
      setSuccessVoucher(res.voucherNumber);
      setShowReview(false);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to commit gold issue transaction.');
      setShowReview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedKarigar = karigars.find(k => String(k.id) === formData.karigarId);
  const selectedJob = jobs.find(j => String(j.id) === formData.jobId);
  const availableJobsForKarigar = formData.karigarId
    ? jobs.filter(j => String(j.karigar.id) === formData.karigarId && j.status !== 'RECONCILED')
    : [];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Issue Gold to Karigar</h1>
        <p className="text-xs text-slate-500 mt-0.5">Debit Vault stock and credit Karigar physical working balance</p>
      </div>

      {successVoucher && (
        <div className="bg-emerald-50 border border-emerald-300 rounded p-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>
              Gold issue voucher <strong className="font-mono">{successVoucher}</strong> created and recorded to ledger!
            </span>
          </div>
          <button
            onClick={() => {
              setSuccessVoucher(null);
              setFormData({ ...formData, grossWeight: '', aiExtracted: false });
            }}
            className="px-3 py-1 bg-emerald-800 text-white rounded font-medium"
          >
            Issue Another
          </button>
        </div>
      )}

      {errorMessage && (
        <AlertBanner type="error" title="Transaction Rejected" message={errorMessage} />
      )}

      {/* Main Grouped Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowReview(true);
        }}
        className="space-y-6"
      >
        {/* Group 1: Job & Artisan Assignment */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            1. Job Order & Artisan Assignment
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Karigar</label>
              <select
                required
                value={formData.karigarId}
                onChange={(e) => {
                  handleFieldChange('karigarId', e.target.value);
                  handleFieldChange('jobId', '');
                }}
                className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-800 font-medium"
              >
                <option value="">— Choose Artisan —</option>
                {karigars.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.karigarCode} • {k.name} ({k.workshopLocation})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Active Job Order</label>
              <select
                required
                value={formData.jobId}
                disabled={!formData.karigarId}
                onChange={(e) => handleFieldChange('jobId', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-800 font-medium disabled:bg-slate-100"
              >
                <option value="">— Choose Job —</option>
                {availableJobsForKarigar.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobCode} • {j.itemCategory} ({j.description})
                  </option>
                ))}
              </select>
              {formData.karigarId && availableJobsForKarigar.length === 0 && (
                <p className="text-[11px] text-amber-700 mt-1">No open jobs found for this karigar. Create a job first.</p>
              )}
            </div>
          </div>
        </div>

        {/* Group 2: Fine Gold Measurement & Verification */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              2. Gold Weight & Purity Specifications
            </h2>
            {/* Optional AI Slip Reader */}
            <label className="cursor-pointer inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded text-[11px] font-medium text-amber-900 transition-colors">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>{isReadingAi ? 'Reading Slip...' : 'Read Weight from Scale Image'}</span>
              <input type="file" accept="image/*" onChange={handleAiUpload} className="hidden" />
            </label>
          </div>

          {aiDraftNotice && (
            <AlertBanner type="info" message={aiDraftNotice} />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Gross Weight (Scale Reading) <span className="text-slate-400 font-normal">3 decimal places</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  placeholder="e.g. 120.000"
                  value={formData.grossWeight}
                  onChange={(e) => handleFieldChange('grossWeight', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden font-mono font-medium text-slate-900 text-sm"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">grams</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Gold Purity Percentage <span className="text-slate-400 font-normal">2 decimal places</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="100.00"
                  required
                  placeholder="e.g. 91.60"
                  value={formData.purity}
                  onChange={(e) => handleFieldChange('purity', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden font-mono font-medium text-slate-900 text-sm"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">%</span>
              </div>
            </div>
          </div>

          {/* Real-time Centralized Formula Display */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
                Computed Fine Gold Weight
              </span>
              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                formula: grossWeight × purity / 100
              </p>
            </div>
            <div className="text-right">
              <AlignedDecimal
                value={calculatedFine}
                className="text-2xl font-bold text-amber-700"
              />
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1 text-xs">Voucher Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden text-xs text-slate-800"
            />
          </div>
        </div>

        {/* Submit Review Trigger */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={!formData.jobId || calculatedFine <= 0}
            className="px-5 py-2.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 focus:outline-hidden disabled:bg-slate-300 disabled:cursor-not-allowed shadow-xs"
          >
            Review & Commit Issue Voucher &rarr;
          </button>
        </div>
      </form>

      {/* Explicit Review Modal Before Committing */}
      <ReviewModal
        isOpen={showReview}
        title="Confirm Fine Gold Issue Transaction"
        subtitle="Verify all physical measurements against weighing slip before writing to ledger"
        isLoading={submitting}
        onCancel={() => setShowReview(false)}
        onConfirm={handleConfirmSubmit}
        items={[
          { label: 'Artisan Name', value: selectedKarigar?.name || '—' },
          { label: 'Karigar Code', value: selectedKarigar?.karigarCode || '—' },
          { label: 'Job Order', value: selectedJob?.jobCode || '—' },
          { label: 'Gross Weight', value: grossNum, isWeight: true },
          { label: 'Gold Purity', value: `${purityNum.toFixed(2)} %` },
          { label: 'Calculated Fine Gold', value: calculatedFine, isWeight: true },
          { label: 'AI Extraction Flag', value: formData.aiExtracted ? 'Yes (Verified by Clerk)' : 'Manual Entry' },
        ]}
      />
    </div>
  );
};
