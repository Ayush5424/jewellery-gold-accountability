import React, { useState, useEffect } from 'react';
import { api, saveFormDraft, loadFormDraft, clearFormDraft, generateIdempotencyKey } from '../api/client';
import { Karigar, JobOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { ReviewModal } from '../components/ReviewModal';
import { AlertBanner } from '../components/AlertBanner';
import { Sparkles, Calculator, CheckCircle2, RefreshCw, AlertCircle, Plus, Briefcase } from 'lucide-react';
import { CreateJobModal } from '../components/CreateJobModal';

export const IssueGoldPage: React.FC<{
  onNavigateToLedger: (jobId: number) => void;
  initialJobId?: number | null;
}> = ({ onNavigateToLedger, initialJobId }) => {
  const { user, hasRole } = useAuth();
  const canCreateJob = hasRole('ROLE_ISSUE_CLERK', 'ROLE_FINANCE_HEAD');
  const isKarigarUser = hasRole('ROLE_KARIGAR');
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
    karigarId: user?.karigarId ? String(user.karigarId) : '',
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

  // Create Job Modal State
  const [showCreateJobModal, setShowCreateJobModal] = useState(false);
  const [jobCreatedNotice, setJobCreatedNotice] = useState<string | null>(null);



  useEffect(() => {
    setLoading(true);
    // Load cached draft if available
    const saved = loadFormDraft<typeof formData>('issue_gold');
    if (saved) {
      setFormData(prev => ({ ...prev, ...saved }));
    }

    // Load jobs & karigars
    const loadData = async () => {
      try {
        const jobsData = await api.getJobs();
        const activeJobs = jobsData.filter(j => j.status !== 'RECONCILED');
        setJobs(activeJobs);

        if (initialJobId) {
          const matched = activeJobs.find(j => j.id === initialJobId);
          if (matched) {
            setFormData(prev => ({
              ...prev,
              jobId: String(matched.id),
              karigarId: matched.karigar ? String(matched.karigar.id) : prev.karigarId,
            }));
          }
        }

        if (!isKarigarUser) {
          try {
            const karigarsData = await api.getKarigars();
            setKarigars(karigarsData);
          } catch (e) {
            console.warn('Could not fetch karigar master list', e);
          }
        }
      } catch (err: any) {
        console.error('Error loading jobs', err);
        setErrorMessage('Failed to load active job orders.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isKarigarUser]);

  const handleFieldChange = (field: keyof typeof formData, value: any) => {
    const updated = { ...formData, [field]: value };
    setFormData(updated);
    saveFormDraft('issue_gold', updated);
  };

  const handleJobCreated = async (newJob: JobOrder) => {
    setJobs(prev => {
      const exists = prev.some(j => j.id === newJob.id);
      return exists ? prev.map(j => (j.id === newJob.id ? newJob : j)) : [newJob, ...prev];
    });
    const newKarigarId = newJob.karigar ? String(newJob.karigar.id) : formData.karigarId;
    const updated = {
      ...formData,
      jobId: String(newJob.id),
      karigarId: newKarigarId,
    };
    setFormData(updated);
    saveFormDraft('issue_gold', updated);
    setShowCreateJobModal(false);
    setJobCreatedNotice(
      `Job Order ${newJob.jobCode} (${newJob.itemCategory}) created for ${
        newJob.karigar ? newJob.karigar.name : 'Artisan'
      } and automatically selected. Enter bullion details below to issue.`
    );

    try {
      const freshJobs = await api.getJobs();
      const activeJobs = freshJobs.filter(j => j.status !== 'RECONCILED');
      setJobs(activeJobs);
    } catch (e) {
      console.warn('Background sync of jobs failed', e);
    }
  };

  // Job selection logic: selecting a job automatically sets karigarId if known
  const handleJobSelect = (jobId: string) => {
    const matchedJob = jobs.find(j => String(j.id) === jobId);
    const updated = {
      ...formData,
      jobId,
      karigarId: matchedJob?.karigar ? String(matchedJob.karigar.id) : formData.karigarId,
    };
    setFormData(updated);
    saveFormDraft('issue_gold', updated);
  };

  // Invariant: Ensure selected job belongs to currently filtered karigar
  useEffect(() => {
    if (formData.karigarId && formData.jobId) {
      const matched = jobs.find(j => String(j.id) === formData.jobId);
      if (matched?.karigar && String(matched.karigar.id) !== formData.karigarId) {
        const updated = { ...formData, jobId: '' };
        setFormData(updated);
        saveFormDraft('issue_gold', updated);
      }
    }
  }, [formData.karigarId, formData.jobId, jobs]);

  // Karigar selection logic: choosing an artisan filters available jobs
  const handleKarigarSelect = (karigarId: string) => {
    const updated = {
      ...formData,
      karigarId,
      jobId: '', // Reset job if artisan changes
    };
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
        `AI draft reading extracted from scale slip (Confidence: ${Math.round(res.confidence * 100)}%). Verification required before submit.`
      );
    } catch (err) {
      setAiDraftNotice('Unable to extract draft values from slip image. Please enter weights manually.');
    } finally {
      setIsReadingAi(false);
    }
  };

  const handleConfirmSubmit = async () => {
    if (!formData.jobId) {
      setErrorMessage('Please select an active Job Order.');
      setShowReview(false);
      return;
    }
    if (grossNum <= 0) {
      setErrorMessage('Gross weight must be greater than 0.000 g.');
      setShowReview(false);
      return;
    }
    if (purityNum <= 0 || purityNum > 100) {
      setErrorMessage('Purity percentage must be between 0.01% and 100.00%.');
      setShowReview(false);
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    try {
      const idempotencyKey = generateIdempotencyKey();
      const res = await api.issueGold({
        jobId: Number(formData.jobId),
        grossWeight: grossNum,
        purity: purityNum,
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

  // Available jobs: if karigarId is chosen, filter by that karigar; otherwise show all active jobs
  const availableJobs = formData.karigarId
    ? jobs.filter(j => String(j.karigar?.id) === formData.karigarId && j.status !== 'RECONCILED')
    : jobs.filter(j => j.status !== 'RECONCILED');

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

      {jobCreatedNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-300 rounded text-xs text-emerald-900 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{jobCreatedNotice}</span>
          </div>
          <button onClick={() => setJobCreatedNotice(null)} className="text-emerald-700 font-bold ml-2">✕</button>
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
          <div className="flex justify-between items-center border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-700">
              1. Job Order & Artisan Assignment
            </h2>
            <div className="flex items-center gap-2">
              {loading && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1 font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" /> Fetching active orders...
                </span>
              )}
              {canCreateJob && (
                <button
                  type="button"
                  onClick={() => setShowCreateJobModal(true)}
                  className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded font-semibold text-[11px] flex items-center gap-1 transition-colors"
                  data-testid="new-job-order-btn"
                >
                  <Plus className="w-3 h-3 text-amber-700" /> + New Job Order
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Karigar Select or Locked Badge for Karigars */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">
                {isKarigarUser ? 'Assigned Artisan' : 'Select Karigar (Filter)'}
              </label>
              {isKarigarUser ? (
                <div className="p-2.5 bg-slate-100 border border-slate-200 rounded text-slate-800 font-semibold text-xs">
                  {user?.fullName || 'Master Karigar'} (Self)
                </div>
              ) : (
                <select
                  data-testid="artisan-filter-select"
                  value={formData.karigarId}
                  onChange={(e) => handleKarigarSelect(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-800 font-medium"
                >
                  <option value="">— All Active Artisans —</option>
                  {karigars.map((k) => (
                    <option key={k.id} value={k.id}>
                      {k.karigarCode} • {k.name} ({k.workshopLocation})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Active Job Order Select */}
            <div>
              <label className="block text-slate-700 font-medium mb-1">Select Active Job Order</label>
              {availableJobs.length === 0 && !loading ? (
                <div className="p-3 bg-amber-50/80 border border-amber-200 rounded text-xs text-amber-900 space-y-2">
                  <div className="flex items-center gap-1.5">
                    <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>No active fabrication orders found for this artisan.</span>
                  </div>
                  {canCreateJob && (
                    <button
                      type="button"
                      onClick={() => setShowCreateJobModal(true)}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded font-semibold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                      data-testid="create-job-now-btn"
                    >
                      <Plus className="w-3.5 h-3.5" /> Create Job Order Now
                    </button>
                  )}
                </div>
              ) : (
                <select
                  required
                  data-testid="job-order-select"
                  value={formData.jobId}
                  onChange={(e) => handleJobSelect(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-800 font-medium"
                >
                  <option value="">— Choose Active Job Order —</option>
                  {availableJobs.map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.jobCode} • {j.karigar ? j.karigar.name : 'Artisan'} — {j.itemCategory} (Issued: {Number(j.issuedFineWeight).toFixed(3)}g, Outstanding: {Number(j.outstandingFineWeight).toFixed(3)}g)
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Selected Job Card Preview */}
          {selectedJob && (
            <div data-testid="selected-job-preview-card" className="bg-slate-50 border border-slate-200 rounded p-3 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
              <div>
                <span className="text-slate-500">Order Code:</span>
                <p className="font-semibold text-slate-900 font-mono">{selectedJob.jobCode}</p>
              </div>
              <div>
                <span className="text-slate-500">Artisan Assigned:</span>
                <p className="font-semibold text-slate-900">{selectedJob.karigar ? selectedJob.karigar.name : 'Assigned'}</p>
              </div>
              <div>
                <span className="text-slate-500">Item Category:</span>
                <p className="font-semibold text-slate-900">{selectedJob.itemCategory}</p>
              </div>
              <div>
                <span className="text-slate-500">Allowed Wastage:</span>
                <p className="font-semibold text-slate-700 font-mono">{Number(selectedJob.allowedWastagePercent).toFixed(2)}%</p>
              </div>
            </div>
          )}
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
                  className="w-full p-2 border border-slate-300 rounded font-mono font-medium text-slate-900 text-sm focus:border-slate-800 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">grams</span>
              </div>
            </div>

            <div>
              <label className="block text-slate-700 font-medium mb-1">
                Gold Purity (%) <span className="text-slate-400 font-normal">2 decimal places</span>
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
                  className="w-full p-2 border border-slate-300 rounded font-mono font-medium text-slate-900 text-sm focus:border-slate-800 focus:outline-hidden"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-sans text-xs">%</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-slate-700 font-medium mb-1">Internal Reference / Allocation Remarks</label>
            <input
              type="text"
              value={formData.remarks}
              onChange={(e) => handleFieldChange('remarks', e.target.value)}
              className="w-full p-2 border border-slate-300 rounded text-slate-800 focus:border-slate-800 focus:outline-hidden text-xs"
            />
          </div>

          {/* Computed Fine Gold Display */}
          <div className="bg-slate-50 border border-slate-200 rounded p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
            <div>
              <span className="font-semibold text-slate-600">Pure Fine Gold (999.0 Equivalent)</span>
              <p className="text-[11px] text-slate-400">Formula: (Gross Weight × Purity) / 100 with standard rounding</p>
            </div>
            <div className="text-right">
              <AlignedDecimal value={calculatedFine} className="text-2xl font-bold text-amber-900 font-mono" />
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting || !formData.jobId || grossNum <= 0}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold shadow-2xs transition-colors disabled:opacity-50"
          >
            {submitting ? 'Recording Issue...' : 'Review & Confirm Gold Issue'}
          </button>
        </div>
      </form>

      {/* Create Job Order Modal */}
      <CreateJobModal
        isOpen={showCreateJobModal}
        onClose={() => setShowCreateJobModal(false)}
        onJobCreated={handleJobCreated}
        initialKarigarId={formData.karigarId}
      />

      {/* Review Dialog */}
      {showReview && selectedJob && (
        <ReviewModal
          isOpen={showReview}
          title="Confirm Gold Issuance Transaction"
          subtitle={`Debiting Vault and Crediting Artisan ${selectedJob.karigar ? selectedJob.karigar.name : 'Artisan'}`}
          onCancel={() => setShowReview(false)}
          onConfirm={handleConfirmSubmit}
          isLoading={submitting}
          items={[
            { label: 'Job Order', value: selectedJob.jobCode },
            { label: 'Assigned Artisan', value: selectedJob.karigar ? selectedJob.karigar.name : 'Assigned' },
            { label: 'Item Category', value: selectedJob.itemCategory },
            { label: 'Agreed Category Wastage', value: `${selectedJob.allowedWastagePercent.toFixed(2)} %` },
            { label: 'Gross Scale Weight', value: grossNum, isWeight: true },
            { label: 'Fineness / Purity', value: `${purityNum.toFixed(2)} %` },
            { label: 'Calculated Pure Fine Gold', value: calculatedFine, isWeight: true },
            { label: 'Allocation Remarks', value: formData.remarks || 'Standard bullion issuance' },
          ]}
        />
      )}
    </div>
  );
};
