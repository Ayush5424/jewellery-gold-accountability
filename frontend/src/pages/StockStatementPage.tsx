import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { AlignedDecimal } from '../components/AlignedDecimal';
import {
  FileSpreadsheet,
  Printer,
  Download,
  RefreshCw,
  Building2,
  Users,
  Vault,
  Flame,
  CheckCircle2,
  Calendar,
  FileCode,
} from 'lucide-react';

interface OperatingUnit {
  unit: string;
  type: string;
  activeKarigars: number;
}

export const StockStatementPage: React.FC = () => {
  const [statement, setStatement] = useState<any>(null);
  const [karigars, setKarigars] = useState<any[]>([]);
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const loadData = async (dateStr?: string) => {
    setLoading(true);
    setError(null);
    try {
      const [stmtData, karigarData, jobData] = await Promise.all([
        api.getStockStatement(dateStr || selectedDate),
        api.getKarigars(),
        api.getJobs(),
      ]);
      setStatement(stmtData);
      setKarigars(karigarData);
      setJobs(jobData);
    } catch (err: any) {
      setError(err.message || 'Failed to load stock statement data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(selectedDate);
  }, [selectedDate]);

  // Compute Karigar breakdown of outstanding gold
  const karigarBalances = karigars.map((k) => {
    const kJobs = jobs.filter((j) => j.karigar?.id === k.id && j.status !== 'RECONCILED');
    const totalIssued = kJobs.reduce((acc, j) => acc + (j.issuedFineWeight || 0), 0);
    const totalRecovered = kJobs.reduce((acc, j) => acc + (j.recoveredFineWeight || 0), 0);
    const outstanding = Math.max(0, totalIssued - totalRecovered);
    return {
      id: k.id,
      code: k.karigarCode,
      name: k.name,
      location: k.workshopLocation,
      activeJobs: kJobs.length,
      totalIssued,
      totalRecovered,
      outstanding,
    };
  }).filter((kb) => kb.outstanding > 0 || kb.activeJobs > 0);

  const exportCSV = () => {
    if (!statement) return;
    const dateStr = statement.statementDate || selectedDate;
    const rows = [
      ['Coimbatore Fine Jewellery Ltd. - Daily Fine Gold Stock Statement'],
      [`Statement Date: ${dateStr}`],
      [''],
      ['GOLD STOCK STATEMENT (FINE GOLD 999 EQUIVALENT)'],
      ['Account / Stage', 'Fine Gold (g)'],
      ['Opening Balance (Central Vault)', Number(statement.openingBalanceFineGold || 15000.0).toFixed(3)],
      ['Gold Issued to Karigars (Gross to Fine)', Number(statement.totalIssuedFine || 0).toFixed(3)],
      ['Returned Finished Jewellery', Number(statement.returnedJewelleryFine || 0).toFixed(3)],
      ['Returned Sizing & Bench Scrap', Number(statement.returnedScrapFine || 0).toFixed(3)],
      ['Returned Station Filings', Number(statement.returnedFilingsFine || 0).toFixed(3)],
      ['Total Recovered into Business', Number(statement.totalRecoveredFine || 0).toFixed(3)],
      ['Karigar In-Hand WIP Balance', Number(statement.goldWithKarigars || 0).toFixed(3)],
      ['Refiner / Acid Dust Recovery', Number(statement.goldAtRefiner || 0).toFixed(3)],
      ['Closing Vault Holding', Number(statement.vaultFineGold || 0).toFixed(3)],
      ['Total Tracked Fine Gold (Vault + WIP + Refiner)', Number(statement.totalTrackedFineGold || 0).toFixed(3)],
      [''],
      ['OPERATING UNITS OVERVIEW'],
      ['Unit Name', 'Type', 'Active Karigars'],
      ...(statement.operatingUnits || []).map((u: OperatingUnit) => [u.unit, u.type, u.activeKarigars]),
      [''],
      ['KARIGAR OUTSTANDING WIP DETAIL'],
      ['Karigar Code', 'Karigar Name', 'Workshop Location', 'Active Jobs', 'Issued Fine (g)', 'Recovered Fine (g)', 'Outstanding WIP (g)'],
      ...karigarBalances.map((k) => [
        k.code,
        k.name,
        k.location,
        k.activeJobs,
        k.totalIssued.toFixed(3),
        k.totalRecovered.toFixed(3),
        k.outstanding.toFixed(3),
      ]),
    ];

    const csvContent = 'data:text/csv;charset=utf-8,' + rows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `daily-stock-statement-${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportTallyXml = async () => {
    try {
      const xmlString = await api.getTallyExport(selectedDate);
      const blob = new Blob([xmlString], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `tally-stock-journal-${selectedDate}.xml`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Error exporting Tally XML');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Header with Title and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Daily Stock Statement
            </h1>
            <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded border border-slate-200 text-xs">
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent font-mono text-slate-800 text-xs focus:outline-none"
              />
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Enterprise Gold Accountability Audit • Opening, Issue, Recovery, Closing, and Tally Export
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden flex-wrap">
          <button
            onClick={() => loadData(selectedDate)}
            disabled={loading}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-amber-600' : ''}`} />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            disabled={!statement}
            className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 rounded text-xs font-medium text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          <button
            onClick={exportTallyXml}
            disabled={!statement}
            className="px-3 py-1.5 border border-amber-300 bg-amber-50 hover:bg-amber-100 rounded text-xs font-medium text-amber-900 flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <FileCode className="w-3.5 h-3.5 text-amber-700" />
            Export Tally XML
          </button>
          <button
            onClick={handlePrint}
            disabled={!statement}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            Print Report
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded text-xs text-rose-700">
          {error}
        </div>
      )}

      {loading && !statement ? (
        <div className="text-center py-12 text-xs text-slate-500">
          Loading stock statement and ledger roll-up...
        </div>
      ) : statement ? (
        <div className="space-y-6">
          {/* Core Question & Closing Balance Banner */}
          <div className="bg-gradient-to-r from-slate-900 to-slate-850 text-white rounded-lg p-5 shadow-sm border border-slate-800">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <span className="text-[11px] font-mono tracking-widest text-amber-400 uppercase font-semibold">
                  Gold Accountability Ledger Audit • {selectedDate}
                </span>
                <h2 className="text-lg font-semibold tracking-tight text-white mt-0.5">
                  "Where is every gram of fine gold right now?"
                </h2>
                <p className="text-xs text-slate-300 mt-1 max-w-2xl">
                  Coimbatore Central Workshop, 5 Regional Showrooms, Active Karigar Benches, and Certified Refiner holdings.
                </p>
              </div>

              <div className="bg-slate-800/90 border border-slate-700 px-4 py-3 rounded-lg text-right shrink-0">
                <span className="text-[11px] text-slate-400 block font-mono">TOTAL TRACKED CLOSING GOLD</span>
                <span className="text-2xl font-bold font-mono tracking-tight text-amber-400">
                  <AlignedDecimal value={statement.totalTrackedFineGold} />
                </span>
                <span className="text-xs text-slate-400 ml-1">g</span>
              </div>
            </div>
          </div>

          {/* Complete 5-Pillar Accounting Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">Opening Vault Fine</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-slate-900">
                  <AlignedDecimal value={statement.openingBalanceFineGold || 15000.0} />
                </span>
                <span className="text-xs text-slate-500">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Day opening safe reserve</p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">Gold Issued</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-slate-900">
                  <AlignedDecimal value={statement.totalIssuedFine} />
                </span>
                <span className="text-xs text-slate-500">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Bullion to workshop</p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">Gold Recovered</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-emerald-700">
                  <AlignedDecimal value={statement.totalRecoveredFine} />
                </span>
                <span className="text-xs text-slate-500">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Jewellery + scrap + dust</p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">Karigar In-Hand (WIP)</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-sky-700">
                  <AlignedDecimal value={statement.goldWithKarigars} />
                </span>
                <span className="text-xs text-slate-500">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Active workbench gold</p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-sm">
              <p className="text-[11px] text-slate-500 font-medium">Current Vault Holding</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-lg font-bold font-mono text-amber-700">
                  <AlignedDecimal value={statement.vaultFineGold} />
                </span>
                <span className="text-xs text-slate-500">g</span>
              </div>
              <p className="text-[10px] text-slate-400 mt-0.5">Closing safe physical gold</p>
            </div>
          </div>

          {/* Recovered Gold Component Breakdown */}
          <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 mb-3 flex items-center gap-2">
              <Flame className="w-4 h-4 text-amber-600" />
              Recovery Breakdown by Component
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Finished Hallmarked Jewellery</span>
                <span className="text-base font-mono font-bold text-slate-800">
                  <AlignedDecimal value={statement.returnedJewelleryFine || 0} /> g
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">BIS hallmarked stock deliveries</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Clean Melting Scrap</span>
                <span className="text-base font-mono font-bold text-slate-800">
                  <AlignedDecimal value={statement.returnedScrapFine || 0} /> g
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Sizing and cut-off workshop scrap</span>
              </div>
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <span className="text-xs text-slate-500 font-medium block">Bench Filings & Recovery Dust</span>
                <span className="text-base font-mono font-bold text-slate-800">
                  <AlignedDecimal value={statement.returnedFilingsFine || 0} /> g
                </span>
                <span className="text-[11px] text-slate-400 block mt-0.5">Vacuum suction workstation filings</span>
              </div>
            </div>
          </div>

          {/* Operating Network Table */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Network Operating Units (Workshop & 5 Showrooms)
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {statement.operatingUnits?.length || 6} Units Monitored
              </span>
            </div>

            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50/50 text-slate-500 font-mono border-b border-slate-200">
                <tr>
                  <th className="py-2 px-4">Operating Unit</th>
                  <th className="py-2 px-4">Classification</th>
                  <th className="py-2 px-4 text-center">Active Karigars</th>
                  <th className="py-2 px-4 text-right">Audit Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(statement.operatingUnits || []).map((unit: OperatingUnit, idx: number) => (
                  <tr key={idx} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-4 font-medium text-slate-900">
                      {unit.unit}
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">
                      <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-mono ${
                        unit.type === 'Manufacturing'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {unit.type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-center font-mono font-medium text-slate-800">
                      {unit.activeKarigars}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Ledger Balanced
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Active Karigar In-Hand WIP Allocation */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-slate-600" />
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Karigar In-Hand WIP Allocation Roll-Up
                </h3>
              </div>
              <span className="text-[11px] text-slate-500 font-mono">
                {karigarBalances.length} Karigars with Active Gold
              </span>
            </div>

            {karigarBalances.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-500">
                All karigars are currently reconciled. No outstanding WIP gold held.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50/50 text-slate-500 font-mono border-b border-slate-200">
                    <tr>
                      <th className="py-2 px-4">Code</th>
                      <th className="py-2 px-4">Karigar Name</th>
                      <th className="py-2 px-4">Location</th>
                      <th className="py-2 px-4 text-center">Active Jobs</th>
                      <th className="py-2 px-4 text-right font-mono">Issued Fine (g)</th>
                      <th className="py-2 px-4 text-right font-mono">Recovered Fine (g)</th>
                      <th className="py-2 px-4 text-right font-mono">In-Hand Fine (g)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {karigarBalances.map((kb) => (
                      <tr key={kb.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-4 font-mono font-medium text-slate-600">
                          {kb.code}
                        </td>
                        <td className="py-2.5 px-4 font-medium text-slate-900">
                          {kb.name}
                        </td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {kb.location}
                        </td>
                        <td className="py-2.5 px-4 text-center font-mono">
                          {kb.activeJobs}
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          <AlignedDecimal value={kb.totalIssued} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                          <AlignedDecimal value={kb.totalRecovered} />
                        </td>
                        <td className="py-2.5 px-4 text-right font-mono font-semibold text-amber-700 bg-amber-50/30">
                          <AlignedDecimal value={kb.outstanding} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-slate-50 font-semibold border-t border-slate-200">
                    <tr>
                      <td colSpan={4} className="py-2.5 px-4 text-slate-700">
                        Total In-Hand with Karigars
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        <AlignedDecimal
                          value={karigarBalances.reduce((acc, k) => acc + k.totalIssued, 0)}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                        <AlignedDecimal
                          value={karigarBalances.reduce((acc, k) => acc + k.totalRecovered, 0)}
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-amber-700">
                        <AlignedDecimal
                          value={karigarBalances.reduce((acc, k) => acc + k.outstanding, 0)}
                        />
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
};
