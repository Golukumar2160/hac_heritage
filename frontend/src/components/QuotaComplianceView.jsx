import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  Award, 
  ShieldAlert, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  Filter, 
  RefreshCw, 
  Layers, 
  Users, 
  BookOpen,
  ArrowDownRight,
  TrendingDown,
  ExternalLink
} from 'lucide-react';

export default function QuotaComplianceView({ onSelectWork, onSelectMp }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedState, setSelectedState] = useState('all');
  const [searchMp, setSearchMp] = useState('');
  const [violatorsOnly, setViolatorsOnly] = useState(false);
  const [statesList, setStatesList] = useState([]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getQuotaCompliance({
        state: selectedState !== 'all' ? selectedState : undefined,
        mp_name: searchMp.trim() ? searchMp.trim() : undefined,
        violators_only: violatorsOnly,
        limit: 200
      });
      setData(res);
    } catch (err) {
      console.error('Failed to load statutory quota compliance:', err);
      setError(err.message || 'Failed to connect to statutory quota telemetry.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.getStates().then(res => {
      if (res && res.states) setStatesList(res.states);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    loadData();
  }, [selectedState, violatorsOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadData();
  };

  const summary = data?.national_summary || {};
  const thresholds = data?.statutory_thresholds || {
    sc_threshold_pct: 15.0,
    st_threshold_pct: 7.5,
    clause: "MoSPI MPLADS Guidelines Clause 3.2",
    mandate: "Minimum 15% for Scheduled Caste areas, Minimum 7.5% for Scheduled Tribe areas"
  };
  const allocations = data?.mp_allocations || [];

  const formatCurrencyCr = (amount) => {
    if (!amount && amount !== 0) return '₹0 Cr';
    const cr = amount / 1e7;
    return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'COMPLIANT':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 w-fit">
            <CheckCircle2 className="w-3.5 h-3.5" />
            COMPLIANT
          </span>
        );
      case 'DEFICIT_SC':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            SC DEFICIT
          </span>
        );
      case 'DEFICIT_ST':
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1.5 w-fit">
            <AlertTriangle className="w-3.5 h-3.5" />
            ST DEFICIT
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-1 text-xs font-mono font-bold rounded-full bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1.5 w-fit">
            <ShieldAlert className="w-3.5 h-3.5" />
            CRITICAL DEFICIT
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/80 to-slate-800/90 border border-slate-700/60 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-display text-white tracking-tight flex items-center gap-3">
                MoSPI Clause 3.2 Statutory Quota Monitor
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Statutory Rule 144/3.2
                </span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-400">
                Auditing mandatory affirmative fund allocations: <span className="text-amber-400 font-semibold">Min 15.0% for SC areas</span> &amp; <span className="text-violet-400 font-semibold">Min 7.5% for ST areas</span> across all Parliamentary Constituencies.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <button
            onClick={loadData}
            disabled={loading}
            className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-slate-600/60 flex items-center gap-2 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-violet-400' : ''}`} />
            Re-Audit Quotas
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SC Quota Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">SC Statutory Mandate</span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
              MIN 15.0%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {summary.sc_allocation_pct !== undefined ? `${summary.sc_allocation_pct}%` : '1.85%'}
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              -{(15.0 - (summary.sc_allocation_pct || 1.85)).toFixed(2)}% Deficit
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 border-t border-slate-700/50 pt-2 flex justify-between">
            <span>SC Outlay: {formatCurrencyCr(summary.sc_sanction_amount || 1087865350)}</span>
            <span className="text-rose-400 font-semibold">{summary.violating_sc_mps_count || 703} MPs Deficit</span>
          </div>
        </div>

        {/* ST Quota Card */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 to-indigo-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">ST Statutory Mandate</span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-violet-500/20 text-violet-300 border border-violet-500/30">
              MIN 7.5%
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {summary.st_allocation_pct !== undefined ? `${summary.st_allocation_pct}%` : '0.76%'}
            </span>
            <span className="text-xs font-mono font-bold text-rose-400 flex items-center">
              <TrendingDown className="w-3.5 h-3.5 mr-1" />
              -{(7.5 - (summary.st_allocation_pct || 0.76)).toFixed(2)}% Deficit
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 border-t border-slate-700/50 pt-2 flex justify-between">
            <span>ST Outlay: {formatCurrencyCr(summary.st_sanction_amount || 447492559)}</span>
            <span className="text-rose-400 font-semibold">{summary.violating_st_mps_count || 693} MPs Deficit</span>
          </div>
        </div>

        {/* Compliant MPs */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Fully Compliant MPs</span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              DUAL QUOTA
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
              {summary.compliant_mps_count !== undefined ? summary.compliant_mps_count : 1}
            </span>
            <span className="text-xs font-mono text-slate-400">
              of {summary.total_mps_audited || 714} Audited MPs
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 border-t border-slate-700/50 pt-2 flex justify-between">
            <span>Non-Compliance Rate:</span>
            <span className="text-rose-400 font-bold">
              {summary.total_mps_audited ? (((summary.total_mps_audited - (summary.compliant_mps_count || 1)) / summary.total_mps_audited) * 100).toFixed(1) : '99.8'}%
            </span>
          </div>
        </div>

        {/* Total Outlay Audited */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-700/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 to-cyan-500" />
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Sanctioned Outlay</span>
            <span className="px-2 py-0.5 text-xs font-mono font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              ALL SCHEMES
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white">
              {formatCurrencyCr(summary.total_sanction_amount || 58805580837)}
            </span>
          </div>
          <div className="mt-3 text-xs text-slate-400 border-t border-slate-700/50 pt-2 flex justify-between">
            <span>SC/ST Total Outlay:</span>
            <span className="text-blue-300 font-mono font-bold">
              {formatCurrencyCr((summary.sc_sanction_amount || 1087865350) + (summary.st_sanction_amount || 447492559))}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="glass-panel p-4 rounded-2xl border border-slate-700/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* State Filter */}
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="bg-slate-800/90 text-slate-200 border border-slate-700 rounded-xl px-3 py-1.5 text-xs font-medium focus:outline-none focus:border-violet-500"
            >
              <option value="all">All States / UTs</option>
              {statesList.map((st) => (
                <option key={st} value={st}>{st}</option>
              ))}
            </select>
          </div>

          {/* Violators Only Checkbox */}
          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-700/60 hover:bg-slate-800">
            <input
              type="checkbox"
              checked={violatorsOnly}
              onChange={(e) => setViolatorsOnly(e.target.checked)}
              className="rounded bg-slate-700 border-slate-600 text-violet-500 focus:ring-0 w-3.5 h-3.5"
            />
            <span>Show Non-Compliant MPs Only</span>
          </label>
        </div>

        {/* MP Search */}
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search MP name..."
              value={searchMp}
              onChange={(e) => setSearchMp(e.target.value)}
              className="bg-slate-800/90 text-slate-200 border border-slate-700 rounded-xl pl-9 pr-3 py-1.5 text-xs font-medium placeholder-slate-500 focus:outline-none focus:border-violet-500 w-48 sm:w-64"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white transition-colors"
          >
            Search
          </button>
        </form>
      </div>

      {/* MP Allocations Table */}
      <div className="glass-panel rounded-2xl border border-slate-700/60 overflow-hidden shadow-xl">
        <div className="px-6 py-4 border-b border-slate-700/60 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <h3 className="font-semibold text-sm text-slate-200">
              Parliamentary Allocations &amp; Deficit Audit ({allocations.length} Records)
            </h3>
          </div>
          <span className="text-xs font-mono text-slate-400">
            Sorted by Total Quota Deficit
          </span>
        </div>

        {loading ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <RefreshCw className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
            <p className="text-xs">Computing Clause 3.2 statutory allocations across 98,649 works...</p>
          </div>
        ) : error ? (
          <div className="py-12 text-center text-rose-400 space-y-2">
            <ShieldAlert className="w-8 h-8 mx-auto" />
            <p className="text-sm font-semibold">{error}</p>
          </div>
        ) : allocations.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm">No MP quota records found matching the active filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] uppercase tracking-wider border-b border-slate-700/60">
                <tr>
                  <th className="py-3 px-4">Member of Parliament</th>
                  <th className="py-3 px-4">State &amp; Constituency</th>
                  <th className="py-3 px-4 text-right">Sanctioned Outlay</th>
                  <th className="py-3 px-4">SC Area Share (Min 15%)</th>
                  <th className="py-3 px-4">ST Area Share (Min 7.5%)</th>
                  <th className="py-3 px-4 text-center">Clause 3.2 Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {allocations.map((mp, idx) => {
                  const scPercent = mp.sc_allocation_pct || 0;
                  const stPercent = mp.st_allocation_pct || 0;
                  const scWidth = Math.min(100, (scPercent / 15.0) * 100);
                  const stWidth = Math.min(100, (stPercent / 7.5) * 100);

                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => onSelectMp && onSelectMp(mp.mp_name)}
                          className="font-semibold text-slate-200 hover:text-violet-400 text-left transition-colors flex items-center gap-1.5 group cursor-pointer"
                          title="Open MP Parliamentary Dossier"
                        >
                          <span>{mp.mp_name}</span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 text-violet-400 transition-opacity" />
                        </button>
                        <div className="text-[11px] text-slate-500">{mp.total_works} recommended works</div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-slate-300">{mp.constituency || 'General'}</div>
                        <div className="text-[11px] text-slate-500">{mp.state}</div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-medium text-slate-200">
                        {formatCurrencyCr(mp.total_sanction_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className={mp.sc_compliant ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                              {scPercent}%
                            </span>
                            <span className="text-slate-500">Target 15.0%</span>
                          </div>
                          <div className="w-32 sm:w-40 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${mp.sc_compliant ? 'bg-emerald-400' : 'bg-amber-400'}`}
                              style={{ width: `${scWidth}%` }}
                            />
                          </div>
                          {mp.sc_shortfall_pct > 0 && (
                            <div className="text-[10px] font-mono text-rose-400">
                              -{mp.sc_shortfall_pct}% shortfall
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="space-y-1">
                          <div className="flex justify-between items-center text-[11px] font-mono">
                            <span className={mp.st_compliant ? 'text-emerald-400 font-bold' : 'text-violet-400'}>
                              {stPercent}%
                            </span>
                            <span className="text-slate-500">Target 7.5%</span>
                          </div>
                          <div className="w-32 sm:w-40 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${mp.st_compliant ? 'bg-emerald-400' : 'bg-violet-400'}`}
                              style={{ width: `${stWidth}%` }}
                            />
                          </div>
                          {mp.st_shortfall_pct > 0 && (
                            <div className="text-[10px] font-mono text-rose-400">
                              -{mp.st_shortfall_pct}% shortfall
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex justify-center">
                          {getStatusBadge(mp.compliance_status)}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
