import React, { useState, useEffect } from 'react';
import { api, generateIdempotencyKey } from '../api/client';
import { JobOrder, Karigar, GoldLedgerEntry } from '../types';
import {
  Upload,
  FileText,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Eye,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  HelpCircle,
  Hash,
  Scale,
} from 'lucide-react';

interface ExtractedData {
  weight: number | null;
  purity: number | null;
  confidence: number;
  status: string;
  notice: string;
  requires_human_confirmation: boolean;
  missing_fields: string[];
  extracted_fields?: any;
}

export const AiSlipExtractionPage: React.FC<{ onNavigateToLedger?: () => void }> = ({ onNavigateToLedger }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedData | null>(null);
  const [extractError, setExtractError] = useState<string | null>(null);

  // Form State for Human Confirmation & Submission
  const [jobs, setJobs] = useState<JobOrder[]>([]);
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [transactionType, setTransactionType] = useState<string>('ISSUE');
  const [grossWeight, setGrossWeight] = useState<string>('');
  const [purity, setPurity] = useState<string>('91.60');
  const [huid, setHuid] = useState<string>('');
  const [itemDescription, setItemDescription] = useState<string>('');
  const [remarks, setRemarks] = useState<string>('');

  const [submitting, setSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState<GoldLedgerEntry | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Discrepancy & Mismatch State
  const [mismatchResolved, setMismatchResolved] = useState(false);
  const [mismatchReason, setMismatchReason] = useState('');

  useEffect(() => {
    // Load active jobs and karigars for transaction assignment
    Promise.all([
      api.getJobs().catch(() => []),
      api.getKarigars().catch(() => []),
    ]).then(([jobsData, karigarsData]) => {
      setJobs(jobsData.filter(j => j.status === 'OPEN' || j.status === 'IN_PROGRESS'));
      setKarigars(karigarsData);
    });
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      loadFile(file);
    }
  };

  const loadFile = (file: File) => {
    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setExtractedData(null);
    setExtractError(null);
    setSubmitSuccess(null);
    setSubmitError(null);
    setMismatchResolved(false);
    setMismatchReason('');
    runExtraction(file);
  };

  const loadSampleSlip = async (slipName: string, title: string) => {
    try {
      setAnalyzing(true);
      setExtractError(null);
      // Create synthetic sample file object
      const response = await fetch(`/sample_slips/${slipName}`);
      let blob: Blob;
      if (response.ok) {
        blob = await response.blob();
      } else {
        // Fallback transparent dummy canvas blob if static folder isn't directly mapped in dev server
        const canvas = document.createElement('canvas');
        canvas.width = 450;
        canvas.height = 220;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, 450, 220);
          ctx.fillStyle = '#000000';
          ctx.font = 'bold 16px monospace';
          ctx.fillText(`COIMBATORE WORKSHOP SCALE SLIP`, 20, 35);
          ctx.font = '14px monospace';
          ctx.fillText(`Type: ${title}`, 20, 75);
          ctx.fillText(`Ref: ${slipName}`, 20, 105);
        }
        blob = await new Promise(res => canvas.toBlob(b => res(b!), 'image/png'));
      }
      const file = new File([blob], slipName, { type: 'image/png' });
      loadFile(file);
    } catch (err: any) {
      setExtractError(`Unable to load sample slip: ${err.message}`);
      setAnalyzing(false);
    }
  };

  const runExtraction = async (file: File) => {
    setAnalyzing(true);
    setExtractError(null);
    try {
      const result: ExtractedData = await api.extractSlip(file);
      setExtractedData(result);

      // Pre-fill editable form with non-authoritative draft suggestions
      if (result.weight !== null && result.weight !== undefined) {
        setGrossWeight(result.weight.toString());
      }
      if (result.purity !== null && result.purity !== undefined) {
        setPurity(result.purity.toString());
      }
      setRemarks(`AI Extracted draft from slip [${file.name}] (Confidence: ${(result.confidence * 100).toFixed(0)}%)`);

      // Intelligently infer transaction type based on matched benchmark or filename
      if (file.name.toLowerCase().includes('jewellery') || file.name.toLowerCase().includes('rcpt')) {
        setTransactionType('RECEIPT_JEWELLERY');
      } else if (file.name.toLowerCase().includes('scrap')) {
        setTransactionType('RECEIPT_SCRAP');
      } else {
        setTransactionType('ISSUE');
      }
    } catch (err: any) {
      setExtractError(
        'AI microservice is currently unreachable or image processing failed. Manual entry mode enabled below.'
      );
      // Fallback manual default
      setExtractedData({
        weight: null,
        purity: null,
        confidence: 0,
        status: 'MANUAL_FALLBACK',
        notice: 'AI service unavailable. Please enter scale readings manually.',
        requires_human_confirmation: true,
        missing_fields: ['weight', 'purity'],
      });
    } finally {
      setAnalyzing(false);
    }
  };

  // Discrepancy calculation between typed values and AI reading
  const weightNumVal = parseFloat(grossWeight);
  const purityNumVal = parseFloat(purity);

  const hasWeightMismatch =
    extractedData?.weight != null &&
    !isNaN(weightNumVal) &&
    Math.abs(weightNumVal - extractedData.weight) > 0.0001;

  const hasPurityMismatch =
    extractedData?.purity != null &&
    !isNaN(purityNumVal) &&
    Math.abs(purityNumVal - extractedData.purity) > 0.01;

  const hasMismatch = hasWeightMismatch || hasPurityMismatch;
  const isBlockedByMismatch = hasMismatch && !mismatchResolved;

  // Fine Gold Preview Calculation (BigDecimal logic replica: round(gross * purity / 100, 3))
  const calculatedFineGold = () => {
    const w = parseFloat(grossWeight);
    const p = parseFloat(purity);
    if (isNaN(w) || isNaN(p) || w <= 0 || p <= 0) return '0.000';
    return (Math.round((w * (p / 100)) * 1000) / 1000).toFixed(3);
  };

  const handleConfirmAndPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJobId) {
      setSubmitError('Please select a valid Job Order to assign this transaction.');
      return;
    }
    if (isBlockedByMismatch) {
      setSubmitError('Saving is blocked: The manually typed value differs from the AI reading. Please resolve the discrepancy below before posting.');
      return;
    }

    const weightNum = parseFloat(grossWeight);
    const purityNum = parseFloat(purity);
    if (isNaN(weightNum) || weightNum <= 0) {
      setSubmitError('Gross weight must be greater than 0.000 g.');
      return;
    }
    if (isNaN(purityNum) || purityNum <= 0 || purityNum > 100) {
      setSubmitError('Purity percentage must be between 0.01% and 100.00%.');
      return;
    }

    setSubmitting(true);
    setSubmitError(null);
    try {
      let result: GoldLedgerEntry;
      const idempotencyKey = generateIdempotencyKey();

      const finalRemarks = hasMismatch && mismatchResolved
        ? `${remarks || 'AI scale slip verified'} [Manual Override: ${mismatchReason}]`
        : (remarks || `AI scale slip verified [${selectedFile?.name || 'slip'}]`);

      if (transactionType === 'ISSUE') {
        result = await api.issueGold({
          jobId: parseInt(selectedJobId),
          grossWeight: weightNum,
          purity: purityNum,
          remarks: finalRemarks,
          aiExtracted: true,
          idempotencyKey,
        });
      } else {
        result = await api.receiveGold({
          jobId: parseInt(selectedJobId),
          transactionType,
          grossWeight: weightNum,
          purity: purityNum,
          huid: huid || undefined,
          itemDescription: itemDescription || undefined,
          remarks: finalRemarks,
          aiExtracted: true,
          idempotencyKey,
        });
      }

      setSubmitSuccess(result);
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to record transaction to authoritative gold ledger.');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedJob = jobs.find(j => j.id.toString() === selectedJobId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-600" />
            AI Scale-Slip Vision Extractor
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Convert workshop weighing scale slips & tickets into structured ledger drafts with human-in-the-loop verification.
          </p>
        </div>

        {/* Quick Test Sample Slip Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-mono text-slate-500 font-medium">Quick Test Slips:</span>
          <button
            type="button"
            onClick={() => loadSampleSlip('slip_issue_120g_murugesan.png', '120g Issue (Murugesan)')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium text-slate-700 transition-colors"
          >
            120g Issue Slip
          </button>
          <button
            type="button"
            onClick={() => loadSampleSlip('slip_receive_jewellery_112g.png', '112.450g Jewellery Receipt')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium text-slate-700 transition-colors"
          >
            112.45g Jewellery
          </button>
          <button
            type="button"
            onClick={() => loadSampleSlip('slip_receive_scrap_3g.png', '3.300g Scrap Receipt')}
            className="px-2.5 py-1 text-xs bg-slate-100 hover:bg-slate-200 border border-slate-300 rounded font-medium text-slate-700 transition-colors"
          >
            3.30g Scrap
          </button>
          <button
            type="button"
            onClick={() => loadSampleSlip('blurry_invalid_slip.png', 'Blurry Unreadable Slip')}
            className="px-2.5 py-1 text-xs bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded font-medium text-rose-700 transition-colors"
          >
            Blurry Slip Test
          </button>
        </div>
      </div>

      {/* Success Modal / Banner */}
      {submitSuccess && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-lg p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-900 font-semibold text-sm">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <span>Transaction Confirmed & Recorded into Authoritative Gold Ledger!</span>
            </div>
            <span className="font-mono text-xs font-bold bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded">
              VOUCHER: {submitSuccess.voucherNumber}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs bg-white p-3.5 rounded border border-emerald-200">
            <div>
              <p className="text-slate-500">Transaction Type</p>
              <p className="font-medium text-slate-800">{submitSuccess.transactionType}</p>
            </div>
            <div>
              <p className="text-slate-500">Gross Weight</p>
              <p className="font-mono font-medium text-slate-800">{submitSuccess.grossWeight.toFixed(3)} g</p>
            </div>
            <div>
              <p className="text-slate-500">Purity</p>
              <p className="font-mono font-medium text-slate-800">{submitSuccess.purity.toFixed(2)} %</p>
            </div>
            <div>
              <p className="text-slate-500">Authoritative Fine Gold</p>
              <p className="font-mono font-bold text-amber-700">{submitSuccess.fineWeight.toFixed(3)} g</p>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => {
                setSubmitSuccess(null);
                setSelectedFile(null);
                setPreviewUrl(null);
                setExtractedData(null);
              }}
              className="px-3 py-1.5 text-xs bg-white border border-slate-300 rounded font-medium hover:bg-slate-50"
            >
              Scan Another Slip
            </button>
            {onNavigateToLedger && (
              <button
                type="button"
                onClick={onNavigateToLedger}
                className="px-3.5 py-1.5 text-xs bg-amber-600 text-white rounded font-medium hover:bg-amber-500 flex items-center gap-1.5"
              >
                <span>View in Karigar Ledger</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main Two-Column Workflow */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Column 1: Scale Slip Image Upload & Preview (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-semibold text-slate-800 flex items-center justify-between">
              <span>Step 1: Upload Scale Slip / Ticket</span>
              {selectedFile && (
                <span className="text-[11px] font-mono text-slate-500">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </span>
              )}
            </h2>

            {/* Dropzone */}
            <label className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer transition-colors bg-slate-50/50 hover:bg-amber-50/30">
              <Upload className="w-8 h-8 text-slate-400 mb-2" />
              <p className="text-xs font-medium text-slate-700">Click to upload or drag & drop slip photo</p>
              <p className="text-[11px] text-slate-400 mt-1">PNG, JPG, JPEG up to 10MB</p>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            {/* Image Preview */}
            {previewUrl && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium text-slate-700">
                  <span className="flex items-center gap-1.5">
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    Slip Visual Preview
                  </span>
                  <span className="font-mono text-[11px] text-slate-500 truncate max-w-[200px]">
                    {selectedFile?.name}
                  </span>
                </div>
                <div className="border border-slate-200 rounded overflow-hidden bg-slate-900 max-h-64 flex items-center justify-center p-2">
                  <img
                    src={previewUrl}
                    alt="Scale slip"
                    className="max-h-60 max-w-full object-contain rounded"
                  />
                </div>
              </div>
            )}

            {/* Non-Authoritative Disclaimer Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200/80 rounded text-[11px] text-amber-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <span>
                <strong>Audit Compliance Guarantee:</strong> AI extraction is strictly a non-authoritative draft assistant.
                No financial entry is created until reviewed, edited, and explicitly confirmed by an authorized clerk.
              </span>
            </div>
          </div>
        </div>

        {/* Column 2: Extracted Information & Human Confirmation Form (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-sm font-semibold text-slate-800">
                  Step 2: Review, Correct & Confirm Transaction Draft
                </h2>
                <p className="text-[11px] text-slate-500">
                  Verify extracted weight and purity against physical scale slip before posting.
                </p>
              </div>

              {/* Confidence Badge */}
              {analyzing ? (
                <span className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 px-2.5 py-1 rounded font-mono">
                  <RefreshCw className="w-3 h-3 animate-spin" />
                  Analyzing Slip...
                </span>
              ) : extractedData ? (
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[11px] font-mono font-semibold px-2 py-0.5 rounded border ${
                      extractedData.confidence >= 0.70
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-rose-50 text-rose-800 border-rose-300'
                    }`}
                  >
                    Confidence: {(extractedData.confidence * 100).toFixed(0)}%
                  </span>
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-medium ${
                      extractedData.status === 'HIGH_CONFIDENCE_DRAFT'
                        ? 'bg-sky-100 text-sky-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {extractedData.status}
                  </span>
                </div>
              ) : (
                <span className="text-xs text-slate-400 font-mono">Waiting for slip upload</span>
              )}
            </div>

            {/* Missing Fields Warning Alert */}
            {extractedData && extractedData.missing_fields && extractedData.missing_fields.length > 0 && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">Incomplete Slip Extraction Notice:</p>
                  <p className="text-[11px] mt-0.5">
                    The AI could not confidently detect: <strong>{extractedData.missing_fields.join(', ')}</strong>.
                    Please manually specify these values in the form below before proceeding.
                  </p>
                </div>
              </div>
            )}

            {extractError && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start gap-2">
                <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>{extractError}</span>
              </div>
            )}

            {submitError && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-800 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{submitError}</span>
              </div>
            )}

            {/* Editable Confirmation Form */}
            <form onSubmit={handleConfirmAndPost} className="space-y-4">
              {/* Job Order & Transaction Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Assign to Active Job Order *
                  </label>
                  <select
                    value={selectedJobId}
                    onChange={(e) => setSelectedJobId(e.target.value)}
                    required
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  >
                    <option value="">-- Select Work Order --</option>
                    {jobs.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.jobCode} — {j.karigar.name} ({j.description.substring(0, 24)}...)
                      </option>
                    ))}
                  </select>
                  {selectedJob && (
                    <p className="text-[11px] text-slate-500 mt-1">
                      Assigned Karigar: <strong className="text-slate-700">{selectedJob.karigar.name}</strong> ({selectedJob.karigar.karigarCode})
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Transaction Stream *
                  </label>
                  <select
                    value={transactionType}
                    onChange={(e) => setTransactionType(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500 focus:border-amber-500 font-medium"
                  >
                    <option value="ISSUE">ISSUE — Raw Gold Dispatched to Karigar</option>
                    <option value="RECEIPT_JEWELLERY">RECEIPT_JEWELLERY — Finished Item Return</option>
                    <option value="RECEIPT_SCRAP">RECEIPT_SCRAP — Clean Sizing Scrap</option>
                    <option value="RECEIPT_FILINGS">RECEIPT_FILINGS — Bench Dust & Filings</option>
                  </select>
                </div>
              </div>

              {/* Weight & Purity Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-50 rounded border border-slate-200">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>Gross Weight (g) *</span>
                    <span className="text-[10px] font-mono text-slate-400">0.001g</span>
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0.001"
                    required
                    value={grossWeight}
                    onChange={(e) => setGrossWeight(e.target.value)}
                    placeholder="e.g. 120.000"
                    className="w-full text-xs font-mono font-bold bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1 flex items-center justify-between">
                    <span>Purity (%) *</span>
                    <span className="text-[10px] font-mono text-slate-400">0.01%</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="100.00"
                    required
                    value={purity}
                    onChange={(e) => setPurity(e.target.value)}
                    placeholder="91.60"
                    className="w-full text-xs font-mono bg-white border border-slate-300 rounded px-3 py-2 text-slate-900 focus:ring-1 focus:ring-amber-500 focus:border-amber-500"
                  />
                  <div className="flex gap-1 mt-1">
                    <button
                      type="button"
                      onClick={() => setPurity('91.60')}
                      className="text-[10px] font-mono text-slate-600 hover:text-amber-700 bg-white px-1 border border-slate-200 rounded"
                    >
                      22K
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurity('75.00')}
                      className="text-[10px] font-mono text-slate-600 hover:text-amber-700 bg-white px-1 border border-slate-200 rounded"
                    >
                      18K
                    </button>
                    <button
                      type="button"
                      onClick={() => setPurity('99.90')}
                      className="text-[10px] font-mono text-slate-600 hover:text-amber-700 bg-white px-1 border border-slate-200 rounded"
                    >
                      24K
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Calculated Fine Gold (g)
                  </label>
                  <div className="w-full text-xs font-mono font-bold bg-amber-100/60 border border-amber-300 rounded px-3 py-2 text-amber-950 flex items-center justify-between">
                    <span>{calculatedFineGold()} g</span>
                    <Scale className="w-3.5 h-3.5 text-amber-700" />
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Authoritative pure gold</p>
                </div>
              </div>

              {/* HUID & Description (Conditional for Jewellery) */}
              {transactionType === 'RECEIPT_JEWELLERY' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Hallmark Unique ID (HUID)
                    </label>
                    <input
                      type="text"
                      value={huid}
                      onChange={(e) => setHuid(e.target.value)}
                      placeholder="e.g. HUID916C01"
                      className="w-full text-xs font-mono bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Item Description
                    </label>
                    <input
                      type="text"
                      value={itemDescription}
                      onChange={(e) => setItemDescription(e.target.value)}
                      placeholder="e.g. Traditional Rope Chain 22K"
                      className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Remarks */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">
                  Audit Remarks & Reference Notes
                </label>
                <input
                  type="text"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Slip notes, bench number, or balance reading..."
                  className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-3 py-2 text-slate-800 focus:bg-white focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Mismatch Warning & Resolution Banner */}
              {hasMismatch && (
                <div className={`p-4 rounded-lg border text-xs space-y-2.5 ${
                  mismatchResolved
                    ? 'bg-emerald-50/80 border-emerald-300 text-emerald-900'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}>
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${mismatchResolved ? 'text-emerald-600' : 'text-rose-600'}`} />
                    <div className="flex-1">
                      <p className="font-bold">
                        {mismatchResolved ? 'Manual Discrepancy Override Resolved' : 'Manual Entry Discrepancy with AI Reading Detected'}
                      </p>
                      <div className="mt-1 font-mono text-[11px] space-y-0.5">
                        {hasWeightMismatch && (
                          <p>
                            • Gross Weight: AI read <span className="underline font-bold">{extractedData?.weight?.toFixed(3)} g</span> vs Typed <span className="underline font-bold">{grossWeight} g</span>
                          </p>
                        )}
                        {hasPurityMismatch && (
                          <p>
                            • Purity Touch: AI read <span className="underline font-bold">{extractedData?.purity?.toFixed(2)} %</span> vs Typed <span className="underline font-bold">{purity} %</span>
                          </p>
                        )}
                      </div>
                      {!mismatchResolved && (
                        <p className="text-[11px] text-rose-700 font-semibold mt-1">
                          Saving is blocked until the mismatch between the photo reading and typed values is explicitly resolved.
                        </p>
                      )}
                    </div>
                  </div>

                  {!mismatchResolved ? (
                    <div className="pt-2 border-t border-rose-200/80 space-y-2">
                      <div>
                        <label className="block text-[11px] font-medium text-rose-900 mb-1">
                          Reason for overriding AI reading (required to resolve):
                        </label>
                        <input
                          type="text"
                          value={mismatchReason}
                          onChange={(e) => setMismatchReason(e.target.value)}
                          placeholder="e.g. Scale tare container deducted, light reflection on decimal, lab certificate verification"
                          className="w-full p-2 bg-white border border-rose-300 rounded text-xs text-slate-800 focus:outline-hidden"
                        />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-rose-700 italic">
                          Photo comparison verified by Issue Clerk
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            if (!mismatchReason.trim()) {
                              alert('Please enter a brief reason for overriding the AI slip reading.');
                              return;
                            }
                            setMismatchResolved(true);
                          }}
                          className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded text-xs font-semibold shadow-xs"
                        >
                          Confirm Manual Override & Resolve
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between pt-1 border-t border-emerald-200 text-[11px]">
                      <span className="text-emerald-800">
                        Resolved: <em>"{mismatchReason}"</em>
                      </span>
                      <button
                        type="button"
                        onClick={() => setMismatchResolved(false)}
                        className="text-xs text-slate-600 underline hover:text-slate-900"
                      >
                        Edit Override
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Confirmation CTA */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <div className="text-[11px] text-slate-500 font-mono">
                  {grossWeight ? `${grossWeight}g @ ${purity}% ➔ ${calculatedFineGold()}g fine` : 'No weight entered'}
                </div>

                <button
                  type="submit"
                  disabled={submitting || !selectedJobId || !grossWeight || isBlockedByMismatch}
                  className={`px-5 py-2.5 font-semibold text-xs rounded-md shadow flex items-center gap-2 transition-colors ${
                    isBlockedByMismatch
                      ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                      : 'bg-amber-600 hover:bg-amber-500 text-slate-950'
                  }`}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Posting to Authoritative Ledger...</span>
                    </>
                  ) : isBlockedByMismatch ? (
                    <>
                      <ShieldAlert className="w-4 h-4 text-rose-600" />
                      <span>Resolve Mismatch to Save</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      <span>Confirm & Post Transaction to Ledger</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
