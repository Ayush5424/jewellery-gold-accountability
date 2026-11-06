import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { Karigar, ItemCategory, JobOrder } from '../types';
import { X, Briefcase, AlertCircle, CheckCircle2, ShieldCheck, Loader2 } from 'lucide-react';

interface CreateJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobCreated: (newJob: JobOrder) => void;
  initialKarigarId?: number | string;
}

const CATEGORY_DEFAULT_WASTAGE: Record<ItemCategory, number> = {
  CHAIN: 1.20,
  BANGLES: 1.50,
  NECKLACE: 1.80,
  RING: 1.00,
  EARRINGS: 1.40,
  TEMPLE_JEWELLERY: 2.20,
  COIN_BAR: 0.50,
};

const CATEGORY_LABELS: Record<ItemCategory, string> = {
  CHAIN: 'Chain (Traditional Rope, Thali Kodi, Machine Chains)',
  BANGLES: 'Bangles (Solid Casting, Machine-Cut, Hollow)',
  NECKLACE: 'Necklace (Choker, Haram, Bridal Collars)',
  RING: 'Ring (Signet, Casting, Stone Mounts)',
  EARRINGS: 'Earrings (Jhumkas, Studs, Drops)',
  TEMPLE_JEWELLERY: 'Temple Jewellery (Antique, Nakshi, Deity Work)',
  COIN_BAR: 'Coin / Bullion Bar (Standard Minting)',
};

export const CreateJobModal: React.FC<CreateJobModalProps> = ({
  isOpen,
  onClose,
  onJobCreated,
  initialKarigarId,
}) => {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [loadingKarigars, setLoadingKarigars] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [karigarId, setKarigarId] = useState<string>('');
  const [itemCategory, setItemCategory] = useState<ItemCategory>('CHAIN');
  const [description, setDescription] = useState<string>('');
  const [allowedWastagePercent, setAllowedWastagePercent] = useState<string>('1.20');
  const [overrideReason, setOverrideReason] = useState<string>('');
  const [isOverridden, setIsOverridden] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    setErrorMessage(null);
    setDescription('');
    setItemCategory('CHAIN');
    setAllowedWastagePercent(CATEGORY_DEFAULT_WASTAGE.CHAIN.toFixed(2));
    setIsOverridden(false);
    setOverrideReason('');

    // Synchronously set karigarId to initialKarigarId if provided
    if (initialKarigarId && String(initialKarigarId).trim() !== '') {
      setKarigarId(String(initialKarigarId));
    } else {
      setKarigarId('');
    }

    setLoadingKarigars(true);
    api.getKarigars()
      .then((data) => {
        setKarigars(data);
        if (initialKarigarId && String(initialKarigarId).trim() !== '') {
          setKarigarId(String(initialKarigarId));
        } else if (data.length > 0) {
          setKarigarId((prev) => prev || String(data[0].id));
        }
      })
      .catch((err) => {
        console.error('Failed to load karigars for job creation', err);
        setErrorMessage('Failed to load active artisans from workshop.');
      })
      .finally(() => {
        setLoadingKarigars(false);
      });
  }, [isOpen, initialKarigarId]);

  // When category changes, update default wastage unless manually overridden
  const handleCategoryChange = (newCat: ItemCategory) => {
    setItemCategory(newCat);
    const standardDefault = CATEGORY_DEFAULT_WASTAGE[newCat] || 1.20;
    setAllowedWastagePercent(standardDefault.toFixed(2));
    setIsOverridden(false);
    setOverrideReason('');
  };

  const handleWastageChange = (val: string) => {
    setAllowedWastagePercent(val);
    const num = parseFloat(val);
    const defaultVal = CATEGORY_DEFAULT_WASTAGE[itemCategory] || 1.20;
    if (!isNaN(num) && Math.abs(num - defaultVal) > 0.001) {
      setIsOverridden(true);
    } else {
      setIsOverridden(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!karigarId) {
      setErrorMessage('Please select an artisan karigar for this job order.');
      return;
    }

    if (!description.trim()) {
      setErrorMessage('Please enter jewellery description and fabrication details.');
      return;
    }

    const wastageNum = parseFloat(allowedWastagePercent);
    if (isNaN(wastageNum) || wastageNum < 0.01 || wastageNum > 20.00) {
      setErrorMessage('Allowed wastage must be between 0.01% and 20.00%.');
      return;
    }

    setSubmitting(true);
    try {
      const created = await api.createJob({
        karigarId: Number(karigarId),
        itemCategory,
        description: description.trim(),
        allowedWastagePercent: wastageNum,
        overrideReason: isOverridden ? overrideReason.trim() : undefined,
      });

      onJobCreated(created);
      onClose();
    } catch (err: any) {
      console.error('Error creating job order', err);
      setErrorMessage(err.message || 'Failed to create job order. Check inputs and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const selectedKarigar = karigars.find((k) => String(k.id) === karigarId);
  const standardWastage = CATEGORY_DEFAULT_WASTAGE[itemCategory];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-150" data-testid="create-job-modal">
      <div className="bg-white rounded-lg border border-slate-200 shadow-xl w-full max-w-xl overflow-hidden">
        {/* Modal Header */}
        <div className="bg-slate-900 px-5 py-3.5 flex items-center justify-between text-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-500/20 text-amber-400 rounded">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold tracking-tight">Create New Job Order</h2>
              <p className="text-[11px] text-slate-400">Initialize workshop fabrication contract and set wastage tolerance</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Artisan Karigar Selection */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Assigned Artisan Karigar <span className="text-rose-500">*</span>
            </label>
            {loadingKarigars ? (
              <div className="p-2 border border-slate-200 rounded text-slate-500 flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" /> Loading Coimbatore artisans...
              </div>
            ) : (
              <select
                required
                data-testid="job-karigar-select"
                value={karigarId}
                onChange={(e) => setKarigarId(e.target.value)}
                className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-900 font-medium"
              >
                <option value="">— Select Coimbatore Artisan —</option>
                {karigars.map((k) => (
                  <option key={k.id} value={k.id}>
                    {k.karigarCode} • {k.name} ({k.workshopLocation}) — Avg Drift: {k.historicalLossAvgPct?.toFixed(2)}%
                  </option>
                ))}
              </select>
            )}
            {selectedKarigar && (
              <p className="text-[11px] text-slate-500 mt-1 font-mono">
                Artisan: {selectedKarigar.name} | Unit: {selectedKarigar.workshopLocation} | Phone: {selectedKarigar.phone}
              </p>
            )}
          </div>

          {/* Item Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Jewellery Category <span className="text-rose-500">*</span>
              </label>
              <select
                required
                data-testid="job-category-select"
                value={itemCategory}
                onChange={(e) => handleCategoryChange(e.target.value as ItemCategory)}
                className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden bg-white text-slate-900 font-medium"
              >
                {(Object.keys(CATEGORY_DEFAULT_WASTAGE) as ItemCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">
                {CATEGORY_LABELS[itemCategory]}
              </p>
            </div>

            {/* Allowed Wastage Allowance % */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Allowed Wastage Allowance (%) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max="20.00"
                  required
                  data-testid="job-wastage-input"
                  value={allowedWastagePercent}
                  onChange={(e) => handleWastageChange(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden font-mono font-medium text-slate-900"
                />
                <span className="absolute right-3 top-2 text-slate-400 font-mono">%</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-500 mt-1">
                <span>Standard Benchmark: {standardWastage.toFixed(2)}%</span>
                {isOverridden && (
                  <span className="text-amber-700 font-semibold">Custom Rate Active</span>
                )}
              </div>
            </div>
          </div>

          {/* Override Reason (if custom wastage specified) */}
          {isOverridden && (
            <div className="p-3 bg-amber-50/70 border border-amber-200 rounded space-y-1">
              <label className="block font-semibold text-amber-900 text-[11px]">
                Reason for Custom Wastage Allowance:
              </label>
              <input
                type="text"
                value={overrideReason}
                onChange={(e) => setOverrideReason(e.target.value)}
                placeholder="e.g. Intricate filigree work requiring higher cutting allowance"
                className="w-full p-1.5 border border-amber-300 rounded text-xs bg-white text-slate-800"
              />
            </div>
          )}

          {/* Description / Job Specifications */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Jewellery Specifications & Order Notes <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={2}
              data-testid="job-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 916 Hallmarked Traditional Coimbatore Rope Chain (22 Karat standard design)"
              className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden text-slate-900"
            />
          </div>

          {/* Information Notice */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-start gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Creating this job establishes an authoritative tracking ledger with status <strong className="text-slate-800">OPEN</strong>. Once created, you can immediately issue raw gold bullion against this job code.
            </span>
          </div>

          {/* Modal Actions */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-3.5 py-2 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 font-medium transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              data-testid="job-submit-btn"
              disabled={submitting || loadingKarigars || !karigarId}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded font-semibold shadow-xs flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating Job...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Save & Activate Job Order
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
