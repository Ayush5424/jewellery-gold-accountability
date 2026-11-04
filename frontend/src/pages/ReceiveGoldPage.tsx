import React, { useState, useEffect } from 'react';
import { api, generateIdempotencyKey, saveFormDraft, loadFormDraft, clearFormDraft } from '../api/client';
import { JobOrder, TransactionType } from '../types';
import { useAuth } from '../context/AuthContext';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { ReviewModal } from '../components/ReviewModal';
import { AlertBanner } from '../components/AlertBanner';
import { CheckCircle2, AlertCircle, ArrowDownLeft, Sparkles, Scale, RefreshCw } from 'lucide-react';

export const ReceiveGoldPage: React.FC<{ onNavigateToLedger: (jobId: number) => void }> = ({ onNavigateToLedger }) => {
  const { user } = useAuth();
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successVoucher, setSuccessVoucher] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);

  // Form State
  const [formData, setFormData] = useState<{
    jobId: string;
    transactionType: TransactionType;
    grossWeight: string;
    purity: string;
    huid: string;
    itemDescription: string;
    scrapCategory: string;
    filingsSource: string;
    remarks: string;
  }>({
    jobId: '',
    transactionType: 'RECEIPT_JEWELLERY',
    grossWeight: '',
    purity: '91.60',
    huid: '',
    itemDescription: '',
    scrapCategory: 'Trimmings & Sheet Cutoffs',
    filingsSource: 'Workstation Bench Tray',
    remarks: 'Finished jewellery received into showroom vault',
  });

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const data = await api.getJobs();
      // Filter for in-progress or ready jobs
      const eligible = data.filter(j => j.status === 'IN_PROGRESS' || j.status === 'READY_FOR_RECONCILIATION');
      setJobs(eligible);

      // If user had a previously selected job that is still eligible, keep it
      const saved = loadFormDraft<typeof formData>('receive_gold');
      if (saved && saved.jobId) {
        if (eligible.some(j => String(j.id) === saved.jobId)) {
          setFormData(saved);
        } else if (eligible.length > 0) {
          setFormData(prev => ({ ...prev, ...saved, jobId: String(eligible[0].id) }));
        }
      } else if (eligible.length > 0 && !formData.jobId) {
        setFormData(prev => ({ ...prev, jobId: String(eligible[0].id) }));
      }
    } catch (err: any) {
      console.error('Failed to load eligible jobs for receipt', err);
      setErrorMessage('Unable to load active job orders. Please check backend connection.');
    } finally {
      setLoading(false);
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

  const handleReceiptTypeChange = (type: TransactionType) => {
    let defaultRemarks = 'Receipt recorded into inventory';
    if (type === 'RECEIPT_JEWELLERY') {
      defaultRemarks = 'Finished hallmarked jewellery received into vault';
    } else if (type === 'RECEIPT_SCRAP') {
      defaultRemarks = `Workshop clean scrap (${formData.scrapCategory}) returned`;
    } else if (type === 'RECEIPT_FILINGS') {
      defaultRemarks = `Artisan bench filings (${formData.filingsSource}) collected`;
    }

    const updated = {
      ...formData,
      transactionType: type,
      remarks: defaultRemarks,
    };
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
    if (!formData.jobId) {
      setErrorMessage('Please select an active job order.');
      setShowReview(false);
      return;
    }
    if (grossNum <= 0) {
      setErrorMessage('Gross weight must be greater than 0.000 g.');
      setShowReview(false);
      return;
    }
    if (purityNum <= 0 || purityNum > 100) {
      setErrorMessage('Purity must be between 0.01% and 100.00%.');
      setShowReview(false);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = generateIdempotencyKey();

      let finalDescription = formData.itemDescription;
      let finalRemarks = formData.remarks;

      if (formData.transactionType === 'RECEIPT_SCRAP') {
        finalDescription = `Clean Scrap - ${formData.scrapCategory}`;
        finalRemarks = `[${formData.scrapCategory}] ${formData.remarks}`;
      } else if (formData.transactionType === 'RECEIPT_FILINGS') {
        finalDescription = `Bench Filings - ${formData.filingsSource}`;
        finalRemarks = `[${formData.filingsSource}] ${formData.remarks}`;
      }

      const res = await api.receiveGold({
        jobId: Number(formData.jobId),
        transactionType: formData.transactionType,
        grossWeight: grossNum,
        purity: purityNum,
        huid: formData.transactionType === 'RECEIPT_JEWELLERY' ? (formData.huid || undefined) : undefined,
        itemDescription: finalDescription,
        remarks: finalRemarks,
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
      alert('Job successfully transitioned to READY_FOR_RECONCILIATION for Finance Head review.');
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
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Select Active Job & Artisan
            </h2>
            {loading && (
              <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                <RefreshCw className="w-3 h-3 animate-spin" /> Fetching active orders...
              </span>
            )}
          </div>

          <div className="text-xs">
            <label className="block text-slate-700 font-medium mb-1">Active In-Progress Job Order</label>
            {jobs.length === 0 && !loading ? (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>No in-progress fabrication orders found ready for receipt. Please issue gold to an open order first.</span>
              </div>
            ) : (
              <select
                required
                value={formData.jobId}
                onChange={(e) => handleFieldChange('jobId', e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-900 font-medium"
              >
                <option value="">— Choose Active Job Order —</option>
                {jobs.map((j) => (
                  <option key={j.id} value={j.id}>
                    {j.jobCode} • {j.karigar ? j.karigar.name : 'Unassigned'} — {j.itemCategory} (Issued: {Number(j.issuedFineWeight).toFixed(3)}g | Outstanding: {Number(j.outstandingFineWeight).toFixed(3)}g)
                  </option>
                ))}
              </select>
            )}
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

        {/* Step 2: Receipt Classification & Measurements (Accessible Radio Buttons) */}
        <div className="bg-white p-5 rounded border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-slate-100 pb-2">
            2. Gold Receipt Details
          </h2>

          {/* Fully Clickable Radio Button Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <label
              className={`relative flex items-start p-3.5 rounded-lg border cursor-pointer transition-all ${
                formData.transactionType === 'RECEIPT_JEWELLERY'
                  ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 ring-2 ring-emerald-600 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
              }`}
            >
              <input
                type="radio"
                name="transactionType"
                value="RECEIPT_JEWELLERY"
                checked={formData.transactionType === 'RECEIPT_JEWELLERY'}
                onChange={() => handleReceiptTypeChange('RECEIPT_JEWELLERY')}
                className="mt-0.5 h-4 w-4 text-emerald-600 border-slate-300 focus:ring-emerald-500 cursor-pointer"
              />
              <div className="ml-2.5">
                <span className="font-bold block text-xs">Finished Jewellery</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Hallmarked retail pieces</span>
              </div>
            </label>

            <label
              className={`relative flex items-start p-3.5 rounded-lg border cursor-pointer transition-all ${
                formData.transactionType === 'RECEIPT_SCRAP'
                  ? 'border-amber-600 bg-amber-50/70 text-amber-950 ring-2 ring-amber-600 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
              }`}
            >
              <input
                type="radio"
                name="transactionType"
                value="RECEIPT_SCRAP"
                checked={formData.transactionType === 'RECEIPT_SCRAP'}
                onChange={() => handleReceiptTypeChange('RECEIPT_SCRAP')}
                className="mt-0.5 h-4 w-4 text-amber-600 border-slate-300 focus:ring-amber-500 cursor-pointer"
              />
              <div className="ml-2.5">
                <span className="font-bold block text-xs">Clean Scrap</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Trimmings and sprues</span>
              </div>
            </label>

            <label
              className={`relative flex items-start p-3.5 rounded-lg border cursor-pointer transition-all ${
                formData.transactionType === 'RECEIPT_FILINGS'
                  ? 'border-blue-600 bg-blue-50/70 text-blue-950 ring-2 ring-blue-600 shadow-sm'
                  : 'border-slate-200 hover:bg-slate-50 text-slate-700 bg-white'
              }`}
            >
              <input
                type="radio"
                name="transactionType"
                value="RECEIPT_FILINGS"
                checked={formData.transactionType === 'RECEIPT_FILINGS'}
                onChange={() => handleReceiptTypeChange('RECEIPT_FILINGS')}
                className="mt-0.5 h-4 w-4 text-blue-600 border-slate-300 focus:ring-blue-500 cursor-pointer"
              />
              <div className="ml-2.5">
                <span className="font-bold block text-xs">Bench Filings</span>
                <span className="text-[11px] text-slate-500 mt-0.5 block">Fine dust for assay refining</span>
              </div>
            </label>
          </div>

          {/* Scale Weight & Purity Input Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
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

          {/* Dynamic Component Specific Fields: Finished Jewellery */}
          {formData.transactionType === 'RECEIPT_JEWELLERY' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-3 bg-emerald-50/50 border border-emerald-200 rounded">
              <div>
                <label className="block text-emerald-950 font-medium mb-1">
                  BIS Hallmark HUID <span className="text-emerald-700 font-normal">(6 alphanumeric characters)</span>
                </label>
                <input
                  type="text"
                  maxLength={10}
                  placeholder="e.g. HUID916A01"
                  value={formData.huid}
                  onChange={(e) => handleFieldChange('huid', e.target.value.toUpperCase())}
                  className="w-full p-2 border border-emerald-300 bg-white rounded font-mono uppercase text-slate-900 focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-emerald-950 font-medium mb-1">Item Description</label>
                <input
                  type="text"
                  placeholder="e.g. 22K Traditional Bangle 4-Piece Set"
                  value={formData.itemDescription}
                  onChange={(e) => handleFieldChange('itemDescription', e.target.value)}
                  className="w-full p-2 border border-emerald-300 bg-white rounded text-slate-800 focus:border-emerald-700 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Dynamic Component Specific Fields: Clean Scrap */}
          {formData.transactionType === 'RECEIPT_SCRAP' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-3 bg-amber-50/50 border border-amber-200 rounded">
              <div>
                <label className="block text-amber-950 font-medium mb-1">Clean Scrap Classification</label>
                <select
                  value={formData.scrapCategory}
                  onChange={(e) => handleFieldChange('scrapCategory', e.target.value)}
                  className="w-full p-2 border border-amber-300 bg-white rounded text-slate-900 focus:border-amber-700 focus:outline-hidden"
                >
                  <option value="Trimmings & Sheet Cutoffs">Trimmings & Sheet Cutoffs</option>
                  <option value="Casting Sprues & Risers">Casting Sprues & Risers</option>
                  <option value="Sizing Wire Ends">Sizing Wire Ends</option>
                  <option value="Melting Buttons">Melting Buttons</option>
                </select>
              </div>
              <div>
                <label className="block text-amber-950 font-medium mb-1">Scrap Remarks & Workshop Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Sizing cutoffs returned for crucible remelt"
                  value={formData.remarks}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  className="w-full p-2 border border-amber-300 bg-white rounded text-slate-800 focus:border-amber-700 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Dynamic Component Specific Fields: Bench Filings */}
          {formData.transactionType === 'RECEIPT_FILINGS' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs p-3 bg-blue-50/50 border border-blue-200 rounded">
              <div>
                <label className="block text-blue-950 font-medium mb-1">Filings Collection Source</label>
                <select
                  value={formData.filingsSource}
                  onChange={(e) => handleFieldChange('filingsSource', e.target.value)}
                  className="w-full p-2 border border-blue-300 bg-white rounded text-slate-900 focus:border-blue-700 focus:outline-hidden"
                >
                  <option value="Workstation Bench Tray">Workstation Bench Tray</option>
                  <option value="Vacuum Filter Collection">Vacuum Filter Collection</option>
                  <option value="Hand-Wash Basin Sediment">Hand-Wash Basin Sediment</option>
                  <option value="Polishing Machine Dust">Polishing Machine Dust</option>
                  <option value="Crucible Assay Residue">Crucible Assay Residue</option>
                </select>
              </div>
              <div>
                <label className="block text-blue-950 font-medium mb-1">Assay & Refining Notes</label>
                <input
                  type="text"
                  placeholder="e.g. Station 4 bench tray vacuum collection"
                  value={formData.remarks}
                  onChange={(e) => handleFieldChange('remarks', e.target.value)}
                  className="w-full p-2 border border-blue-300 bg-white rounded text-slate-800 focus:border-blue-700 focus:outline-hidden"
                />
              </div>
            </div>
          )}

          {/* Computed Fine & Job Balance Preview */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-600">Calculated Receipt Fine Gold</span>
              <p className="text-[11px] text-slate-400">Credited directly to vault inventory balance</p>
            </div>
            <div className="text-right">
              <AlignedDecimal value={calculatedFine} className="text-2xl font-bold text-emerald-700 font-mono" />
              {selectedJob && (
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Projected artisan balance: <span className="font-mono font-semibold">{projectedRemaining.toFixed(3)}g</span>
                </p>
              )}
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

          <div className="flex items-center gap-3 self-end">
            <button
              type="submit"
              disabled={submitting || !formData.jobId || grossNum <= 0}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
            >
              {submitting ? 'Recording Receipt...' : 'Review & Submit Gold Receipt'}
            </button>
          </div>
        </div>
      </form>

      {/* Review Confirmation Modal */}
      {showReview && selectedJob && (
        <ReviewModal
          isOpen={showReview}
          title="Confirm Gold Receipt Transaction"
          subtitle={`Crediting Vault and Debiting Artisan ${selectedJob.karigar ? selectedJob.karigar.name : 'Artisan'}`}
          onCancel={() => setShowReview(false)}
          onConfirm={handleConfirmSubmit}
          isLoading={submitting}
          items={[
            { label: 'Job Order', value: selectedJob.jobCode },
            { label: 'Assigned Artisan', value: selectedJob.karigar ? selectedJob.karigar.name : 'Artisan' },
            {
              label: 'Receipt Stream',
              value: formData.transactionType === 'RECEIPT_JEWELLERY'
                ? 'Finished Hallmarked Jewellery'
                : formData.transactionType === 'RECEIPT_SCRAP'
                ? `Clean Scrap (${formData.scrapCategory})`
                : `Bench Filings (${formData.filingsSource})`,
            },
            { label: 'Gross Scale Weight', value: grossNum, isWeight: true },
            { label: 'Gold Purity', value: `${purityNum.toFixed(2)} %` },
            { label: 'Fine Gold Credited to Vault', value: calculatedFine, isWeight: true },
            ...(formData.transactionType === 'RECEIPT_JEWELLERY' && formData.huid ? [{ label: 'BIS Hallmark HUID', value: formData.huid }] : []),
            ...(formData.itemDescription ? [{ label: 'Item Description', value: formData.itemDescription }] : []),
          ]}
        />
      )}
    </div>
  );
};
