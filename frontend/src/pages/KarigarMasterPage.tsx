import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Karigar, KarigarWastageAllowance, ItemCategory } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { useAuth } from '../context/AuthContext';
import { Search, UserPlus, RefreshCw, Phone, MapPin, Sliders, Check, AlertCircle, X } from 'lucide-react';

export const KarigarMasterPage: React.FC<{ onSelectKarigar: (id: number) => void }> = ({ onSelectKarigar }) => {
  const { hasRole } = useAuth();
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // Wastage Matrix Modal state
  const [matrixKarigar, setMatrixKarigar] = useState<Karigar | null>(null);
  const [allowances, setAllowances] = useState<KarigarWastageAllowance[]>([]);
  const [loadingMatrix, setLoadingMatrix] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [matrixMsg, setMatrixMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [newKarigar, setNewKarigar] = useState({
    name: '',
    phone: '',
    workshopLocation: 'Central Workshop - Bench 1',
    karigarCode: '',
  });

  const fetchKarigars = async () => {
    setLoading(true);
    try {
      const data = await api.getKarigars();
      setKarigars(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKarigars();
  }, []);

  const handleOpenMatrix = async (karigar: Karigar) => {
    setMatrixKarigar(karigar);
    setLoadingMatrix(true);
    setMatrixMsg(null);
    setEditingCategory(null);
    try {
      const data = await api.getKarigarWastageAllowances(karigar.id);
      setAllowances(data);
    } catch (err: any) {
      setMatrixMsg({ type: 'error', text: err.message || 'Failed to load wastage allowances' });
    } finally {
      setLoadingMatrix(false);
    }
  };

  const handleSaveAllowance = async (category: string) => {
    if (!matrixKarigar) return;
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0.01 || num > 20.00) {
      setMatrixMsg({ type: 'error', text: 'Allowed wastage must be between 0.01% and 20.00%' });
      return;
    }
    try {
      await api.updateKarigarWastageAllowance(matrixKarigar.id, category, num);
      setMatrixMsg({ type: 'success', text: `Updated ${category} allowance to ${num.toFixed(2)}%` });
      setEditingCategory(null);
      // Reload matrix
      const refreshed = await api.getKarigarWastageAllowances(matrixKarigar.id);
      setAllowances(refreshed);
    } catch (err: any) {
      setMatrixMsg({ type: 'error', text: err.message || 'Failed to update allowance' });
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = newKarigar.karigarCode || `KRG-${String(karigars.length + 1).padStart(3, '0')}`;
      await api.createKarigar({ ...newKarigar, karigarCode: code });
      setShowAddModal(false);
      setNewKarigar({ name: '', phone: '', workshopLocation: 'Central Workshop - Bench 1', karigarCode: '' });
      fetchKarigars();
    } catch (err: any) {
      alert(err.message || 'Failed to register karigar');
    }
  };

  const filtered = karigars.filter(k =>
    k.name.toLowerCase().includes(search.toLowerCase()) ||
    k.karigarCode.toLowerCase().includes(search.toLowerCase()) ||
    k.workshopLocation.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Karigar Master Directory</h1>
          <p className="text-xs text-slate-500 mt-0.5">Assigned artisan benches, performance history, and category wastage matrices</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchKarigars}
            className="p-2 border border-slate-300 rounded hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800 transition-colors shadow-xs"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Karigar</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by artisan name, bench code, or unit..."
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded focus:border-slate-800 focus:outline-hidden"
          />
        </div>
        <span className="text-xs text-slate-500 font-mono">
          Showing {filtered.length} of {karigars.length} artisans
        </span>
      </div>

      {/* Karigars Table */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                <th className="py-3 px-4 font-mono">Code</th>
                <th className="py-3 px-4">Artisan Details</th>
                <th className="py-3 px-4">Bench / Showroom Unit</th>
                <th className="py-3 px-4 text-right">30-Day Avg Loss</th>
                <th className="py-3 px-4 text-center">Jobs Done</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{k.karigarCode}</td>
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-800">{k.name}</p>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3" /> {k.phone}
                    </p>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {k.workshopLocation}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono font-medium">
                    <span className="text-slate-700">
                      <AlignedDecimal value={k.historicalLossAvgPct || 0} decimals={2} />%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-mono text-slate-600">
                    {k.completedJobsCount || 0}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleOpenMatrix(k)}
                        className="px-2.5 py-1 border border-amber-300 bg-amber-50 rounded text-[11px] font-medium text-amber-900 hover:bg-amber-100 flex items-center gap-1 transition-colors"
                        title="Manage category-specific wastage allowances"
                      >
                        <Sliders className="w-3 h-3 text-amber-700" />
                        <span>Wastage Matrix</span>
                      </button>
                      <button
                        onClick={() => onSelectKarigar(k.id)}
                        className="px-2.5 py-1 border border-slate-300 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View Ledger
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Wastage Allowance Matrix */}
      {matrixKarigar && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full border border-slate-200 p-6 space-y-4">
            <div className="flex items-start justify-between border-b border-slate-200 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Agreed Wastage Matrix: {matrixKarigar.name}
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  Artisan Code: {matrixKarigar.karigarCode} • Unit: {matrixKarigar.workshopLocation}
                </p>
              </div>
              <button
                onClick={() => setMatrixKarigar(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {matrixMsg && (
              <div
                className={`p-3 rounded text-xs flex items-center gap-2 ${
                  matrixMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {matrixMsg.type === 'success' ? (
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span>{matrixMsg.text}</span>
              </div>
            )}

            {loadingMatrix ? (
              <div className="py-12 flex justify-center items-center text-slate-400 text-xs">
                <RefreshCw className="w-5 h-5 animate-spin mr-2 text-amber-500" />
                Loading agreed category allowances...
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-2.5 px-3">Item Category</th>
                      <th className="py-2.5 px-3 text-right">Agreed Wastage %</th>
                      <th className="py-2.5 px-3">Updated By</th>
                      <th className="py-2.5 px-3">Last Modified</th>
                      {hasRole('ROLE_FINANCE_HEAD') && (
                        <th className="py-2.5 px-3 text-right">Action</th>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {allowances.map((a) => {
                      const isEditing = editingCategory === a.itemCategory;
                      return (
                        <tr key={a.itemCategory} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 font-semibold text-slate-800">
                            {a.itemCategory}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                            {isEditing ? (
                              <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max="20.00"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 border border-amber-500 rounded text-right font-mono text-xs focus:outline-hidden"
                                autoFocus
                              />
                            ) : (
                              `${Number(a.allowedWastagePercent).toFixed(2)}%`
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">
                            {a.updatedBy || 'SYSTEM'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                            {a.updatedAt ? new Date(a.updatedAt).toLocaleDateString() : 'Baseline'}
                          </td>
                          {hasRole('ROLE_FINANCE_HEAD') && (
                            <td className="py-2.5 px-3 text-right">
                              {isEditing ? (
                                <div className="flex items-center justify-end gap-1">
                                  <button
                                    onClick={() => handleSaveAllowance(a.itemCategory)}
                                    className="px-2 py-0.5 bg-emerald-600 text-white rounded text-[11px] font-semibold hover:bg-emerald-700"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingCategory(null)}
                                    className="px-2 py-0.5 border border-slate-300 rounded text-[11px] text-slate-600 hover:bg-slate-100"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => {
                                    setEditingCategory(a.itemCategory);
                                    setEditValue(String(a.allowedWastagePercent));
                                  }}
                                  className="px-2 py-0.5 border border-slate-300 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-100"
                                >
                                  Edit %
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end border-t border-slate-200">
              <button
                type="button"
                onClick={() => setMatrixKarigar(null)}
                className="px-4 py-1.5 bg-slate-900 text-white rounded text-xs font-medium hover:bg-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Registering Karigar */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full border border-slate-200 p-6">
            <h3 className="text-base font-bold text-slate-900 mb-4">Register Master Karigar</h3>
            <form onSubmit={handleCreate} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newKarigar.name}
                  onChange={(e) => setNewKarigar({ ...newKarigar, name: e.target.value })}
                  placeholder="e.g. Balasubramaniam C"
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Karigar Code</label>
                <input
                  type="text"
                  value={newKarigar.karigarCode}
                  onChange={(e) => setNewKarigar({ ...newKarigar, karigarCode: e.target.value })}
                  placeholder="Auto-generated if blank (e.g. KRG-009)"
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newKarigar.phone}
                  onChange={(e) => setNewKarigar({ ...newKarigar, phone: e.target.value })}
                  placeholder="+91 98422 10009"
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-slate-700 font-medium mb-1">Workshop Unit / Showroom Location</label>
                <input
                  type="text"
                  value={newKarigar.workshopLocation}
                  onChange={(e) => setNewKarigar({ ...newKarigar, workshopLocation: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded focus:border-slate-800 focus:outline-hidden"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-slate-900 text-white rounded font-medium hover:bg-slate-800"
                >
                  Save Karigar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
