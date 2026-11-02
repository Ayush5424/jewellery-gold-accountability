import React, { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Karigar } from '../types';
import { AlignedDecimal } from '../components/AlignedDecimal';
import { Search, UserPlus, RefreshCw, Phone, MapPin } from 'lucide-react';

export const KarigarMasterPage: React.FC<{ onSelectKarigar: (id: number) => void }> = ({ onSelectKarigar }) => {
  const [karigars, setKarigars] = useState<Karigar[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = newKarigar.karigarCode || `KRG-${String(karigars.length + 1).padStart(3, '0')}`;
      await api.createJob; // placeholder check
      await fetch('/api/karigars', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('gold_auth_token')}` },
        body: JSON.stringify({ ...newKarigar, karigarCode: code }),
      });
      setShowAddModal(false);
      setNewKarigar({ name: '', phone: '', workshopLocation: 'Central Workshop', karigarCode: '' });
      fetchKarigars();
    } catch (err) {
      alert('Failed to register karigar');
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
          <p className="text-xs text-slate-500 mt-0.5">Assigned artisan benches, performance history, and active balance links</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded text-xs font-semibold hover:bg-slate-800"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Register Karigar
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded border border-slate-200 flex items-center gap-3">
        <Search className="w-4 h-4 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Filter by Karigar name, code (e.g. KRG-001), or workshop bench..."
          className="w-full text-xs bg-transparent focus:outline-hidden text-slate-800 placeholder-slate-400"
        />
      </div>

      {/* Karigars Table */}
      <div className="bg-white rounded border border-slate-200 overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Artisan Code</th>
                <th className="py-2.5 px-4">Name</th>
                <th className="py-2.5 px-4">Workshop Location</th>
                <th className="py-2.5 px-4">Phone</th>
                <th className="py-2.5 px-4 text-right">Historical Baseline Loss</th>
                <th className="py-2.5 px-4 text-right">Completed Jobs</th>
                <th className="py-2.5 px-4 text-center">Status</th>
                <th className="py-2.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((k) => (
                <tr key={k.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-mono font-medium text-slate-900">{k.karigarCode}</td>
                  <td className="py-3 px-4 font-semibold text-slate-900">{k.name}</td>
                  <td className="py-3 px-4 text-slate-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      {k.workshopLocation}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                    <span className="inline-flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {k.phone || '—'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums font-medium text-slate-800">
                    {Number(k.historicalLossAvgPct || 0).toFixed(2)}%
                  </td>
                  <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                    {k.completedJobsCount} jobs
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                      Active
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => onSelectKarigar(k.id)}
                      className="px-2.5 py-1 border border-slate-300 rounded text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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
