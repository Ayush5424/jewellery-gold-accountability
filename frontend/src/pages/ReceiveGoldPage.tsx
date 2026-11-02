import React, { useState, useEffect } from 'react';
import { api, generateIdempotencyKey, saveFormDraft, loadFormDraft, clearFormDraft } from '../api/client';
import { JobOrder, TransactionType } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { ReviewModal } from '../components/ReviewModal';
import { AlertBanner } from '../components/AlertBanner';
import { CheckCircle2, AlertCircle, ArrowDownLeft } from 'lucide-react';

export const ReceiveGoldPage: React.FC<{ onNavigateToLedger: (jobId: number) => void }> = ({ onNavigateToLedger }) => {
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  const [formData, setFormData] = useState<{
    jobId: string;
    transactionType: TransactionType;
    grossWeight: string;
    purity: string;
    huid: string;
    itemDescription: string;
    remarks: string;
  }>({
    jobId: '',
    transactionType: 'RECEIPT_JEWELLERY',
    grossWeight: '',
    purity: '91.60',
    huid: '',
    itemDescription: '',
    remarks: 'Finished jewellery received into vault',
  });

  const fetchJobs = async () => {
    try {
      const data = await api.getJobs();
      setJobs(data.filter(j => j.status === 'IN_PROGRESS' || j.status === 'READY_FOR_RECONCILIATION'));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    const saved = loadFormDraft<typeof formData>('receive_gold');
    if (saved) setFormData(saved);
    fetchJobs();
  }, []);

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    saveFormDraft('receive_gold', updated);
  };

  const selectedJob = jobs.find(j => String(j.id) === formData.jobId);

  // Live Fine Gold Calculation
  const grossNum = parseFloat(formData.grossWeight) || 0;
  const purityNum = parseFloat(formData.purity) || 0;
  const calculatedFine = grossNum > 0 && purityNum > 0
    ? (grossNum * purityNum) / 100
    : 0;

  // Expected Remaining Working Gold after this receipt
  const currentOutstanding = selectedJob ? Number(selectedJob.outstandingFineWeight) : 0;
  const projectedRemaining = Math.max(0, currentOutstanding - calculatedFine);

  const handleConfirmSubmit = async () => {
    setSubmitting(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await api.receiveGold({
        jobId: Number(formData.jobId),
        transactionType: formData.transactionType,
        grossWeight: grossNum,
        purity: purityNum,
        huid: formData.huid || undefined,
        itemDescription: formData.itemDescription,
        remarks: formData.remarks,
        idempotencyKey,
      });

      clearFormDraft('receive_gold');
      setSuccessVoucher(res.voucherNumber);
      setShowReview(false);
      fetchJobs();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to record receipt transaction.');
      setShowReview(false);
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkReady = async () => {
    if (!formData.jobId) return;
    try {
      await api.markReadyForReconciliation(Number(formData.jobId));
      alert('Job successfully marked as READY_FOR_RECONCILIATION for Finance Head review.');
      fetchJobs();
    } catch (err: any) {
      alert(err.message || 'Error updating job status.');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Title */}
      <div className="border-b border-slate-200 pb-4">
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">Receive Gold from Karigar</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Record finished hallmarked jewellery, clean scrap, or workshop bench filings into vault inventory
        </p>
      </div>

      {successVoucher && (
        <div className="bg-emerald-50 border border-emerald-300 rounded p-4 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2 text-emerald-900">
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
            <span>
              Receipt voucher <strong className="font-mono">{successVoucher}</strong> recorded to ledger!
            </span>
          </div>
          <button
            onClick={() => {
              setSuccessVoucher(null);
              setFormData({ ...formData, grossWeight: '', huid: '' });
            }}
            className="px-3 py-1 bg-emerald-800 text-white rounded font-medium"
          >
            Record Another Receipt
          </button>
        </div>
      )}

      {errorMessage && (
        <AlertBanner type="error" title="Transaction Rejected" message={errorMessage} />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          setShowReview(true);
        }}
        className="space-y-6"
      >
        {/* Step 1: Select Active Job */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            1. Select Active Job & Artisan
          </h2>

          <div className="text-xs">
            <label className="block text-slate-700 font-medium mb-1">Active In-Progress Job Order</label>
            <select
              required
              value={formData.jobId}
              onChange={(e) => handleFieldChange('jobId', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-900 font-medium"
            >
              <option value="">— Choose In-Progress Job —</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobCode} • {j.karigar.name} — {j.itemCategory} (Issued: {Number(j.issuedFineWeight).toFixed(3)}g | Outstanding: {Number(j.outstandingFineWeight).toFixed(3)}g)
                </option>
              ))}
            </select>
          </div>

          {selectedJob && (
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <span className="text-slate-500">Issued Fine:</span>
                <p className="font-semibold text-slate-900 font-mono"><AlignedDecimal value={selectedJob.issuedFineWeight} /></p>
              </div>
              <div>
                <span className="text-slate-500">Recovered Fine:</span>
                <p className="font-semibold text-slate-900 font-mono"><AlignedDecimal value={selectedJob.recoveredFineWeight} /></p>
              </div>
              <div>
                <span className="text-slate-500">Current Outstanding:</span>
                <p className="font-semibold text-amber-800 font-mono"><AlignedDecimal value={selectedJob.outstandingFineWeight} /></p>
              </div>
              <div>
                <span className="text-slate-500">Allowed Wastage:</span>
                <p className="font-semibold text-slate-700 font-mono">{Number(selectedJob.allowedWastagePercent).toFixed(2)}%</p>
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Receipt Classification & Measurements */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            2. Gold Receipt Details
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                handleFieldChange('transactionType', 'RECEIPT_JEWELLERY');
                handleFieldChange('remarks', 'Finished jewellery received into showroom vault');
              }}
              className={`p-3 rounded border text-left transition-colors ${
                formData.transactionType === 'RECEIPT_JEWELLERY'
                  ? 'border-emerald-600 bg-emerald-50/60 text-emerald-950 ring-1 ring-emerald-600'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="font-bold block text-sm">Finished Jewellery</span>
              <span className="text-[11px] text-slate-500">Hallmarked retail pieces</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleFieldChange('transactionType', 'RECEIPT_SCRAP');
                handleFieldChange('remarks', 'Melting scrap returned from workshop');
              }}
              className={`p-3 rounded border text-left transition-colors ${
                formData.transactionType === 'RECEIPT_SCRAP'
                  ? 'border-amber-600 bg-amber-50/60 text-amber-950 ring-1 ring-amber-600'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="font-bold block text-sm">Clean Scrap</span>
              <span className="text-[11px] text-slate-500">Trimmings and sprues</span>
            </button>

            <button
              type="button"
              onClick={() => {
                handleFieldChange('transactionType', 'RECEIPT_FILINGS');
                handleFieldChange('remarks', 'Workstation bench filings vacuum collection');
              }}
              className={`p-3 rounded border text-left transition-colors ${
                formData.transactionType === 'RECEIPT_FILINGS'
                  ? 'border-blue-600 bg-blue-50/60 text-blue-950 ring-1 ring-blue-600'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="font-bold block text-sm">Bench Filings</span>
              <span className="text-[11px] text-slate-500">Fine dust for assay refining</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Gross Weight (Scale Reading)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.001"
                  min="0.001"
                  required
                  placeholder="e.g. 112.450"
                  value={formData.grossWeight}
                  onChange={(e) => handleFieldChange('grossWeight', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded font-mono font-medium text-slate-900 text-sm focus:border-slate-800 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">grams</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">Gold Purity (%)</label>
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
                  className="w-full p-2 border border-slate-300 rounded font-mono font-medium text-slate-900 text-sm focus:border-slate-800 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">%</span>
              </div>
            </div>
          </div>

          {formData.transactionType === 'RECEIPT_JEWELLERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">
                  BIS Hallmark HUID <span className="text-slate-400 font-normal">(6 alphanumeric chars)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. HUID916A01"
                  value={formData.huid}
                  onChange={(e) => handleFieldChange('huid', e.target.value.toUpperCase())}
                  className="w-full p-2 border border-slate-300 rounded font-mono uppercase text-slate-900 focus:border-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Item Description</label>
                <input
                  type="text"
                  placeholder="e.g. 916 Rope Chain with S-Hook"
                  value={formData.itemDescription}
                  onChange={(e) => handleFieldChange('itemDescription', e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:border-slate-800 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Computed Fine & Job Balance Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-600">Calculated Receipt Fine Gold</span>
              <p className="text-[11px] text-slate-400">Credited to vault stock</p>
            </div>
            <div className="text-right">
              <AlignedDecimal value={calculatedFine} className="text-2xl font-bold text-emerald-700" />
            </div>
          </div>
        </div>

        {/* Submission Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
          {selectedJob && (
            <button
              type="button"
              onClick={handleMarkReady}
              className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 rounded text-xs font-semibold self-start"
            >
              Mark Job Ready for Reconciliation
            </button>
          )}

          <button
            type="submit"
            disabled={!formData.jobId || calculatedFine <= 0}
            className="px-5 py-2.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 focus:outline-hidden disabled:bg-slate-300 disabled:cursor-not-allowed ml-auto shadow-xs"
          >
            Review & Commit Receipt Voucher &rarr;
          </button>
        </div>
      </form>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReview}
        title="Confirm Gold Receipt Transaction"
        subtitle="Verify weights against physical balance before crediting vault"
        isLoading={submitting}
        onCancel={() => setShowReview(false)}
        onConfirm={handleConfirmSubmit}
        items={[
          { label: 'Job Order', value: selectedJob?.jobCode || '—' },
          { label: 'Artisan', value: selectedJob?.karigar.name || '—' },
          { label: 'Receipt Category', value: formData.transactionType.replace('RECEIPT_', '') },
          { label: 'Gross Weight', value: grossNum, isWeight: true },
          { label: 'Purity', value: `${purityNum.toFixed(2)} %` },
          { label: 'Fine Gold Weight', value: calculatedFine, isWeight: true },
          ...(formData.huid ? [{ label: 'BIS HUID', value: formData.huid }] : []),
          { label: 'Projected Remaining Working Gold', value: projectedRemaining, isWeight: true },
        ]}
      />
    </div>
  );
};
