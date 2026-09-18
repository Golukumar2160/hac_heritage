import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { 
  X, 
  User, 
  MapPin, 
  Building2, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Flame, 
  ShieldAlert, 
  Layers, 
  ExternalLink, 
  TrendingUp, 
  Award,
  RefreshCw,
  FileText
} from 'lucide-react';

export default function MpProfileModal({ mpName, onClose, onSelectWork }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!mpName) return;
    setLoading(true);
    setError(null);
    api.getMpDetails(mpName)
      .then(res => setData(res))
      .catch(err => {
        console.error('Failed to load MP profile:', err);
        setError(err.message || `Failed to load dossier for MP: ${mpName}`);
      })
      .finally(() => setLoading(false));
  }, [mpName]);

  if (!mpName) return null;

  const formatCr = (val) => {
    if (!val && val !== 0) return '₹0 Cr';
    const cr = val / 1e7;
    return `₹${cr.toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`;
  };

  const getRiskChip = (tier) => {
    const t = (tier || 'LOW').toUpperCase();
    if (t === 'CRITICAL') {
      return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">CRITICAL</span>;
    }
    if (t === 'HIGH') {
      return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">HIGH</span>;
    }
    if (t === 'MEDIUM') {
      return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-yellow-500/20 text-yellow-400 border border-yellow-500/30">MEDIUM</span>;
    }
    return <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">LOW</span>;
  };

  const compliance = data?.statutory_compliance || {};
  const workCounts = data?.work_counts || {};
  const topVendors = data?.top_vendors || [];
  const works = data?.works || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-5xl max-h-[90vh] bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-violet-600/20 border border-violet-500/30 text-violet-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-display text-white">{data?.mp_name || mpName}</h2>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded bg-violet-500/15 text-violet-300 border border-violet-500/30">
                  Hon'ble MP
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span>Parliamentary Constituency Dossier</span>
                {data?.total_works && (
                  <span>• {data.total_works} recommended works</span>
                )}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {loading ? (
            <div className="py-24 text-center text-slate-400 space-y-3">
              <RefreshCw className="w-8 h-8 animate-spin text-violet-400 mx-auto" />
              <p className="text-sm">Synthesizing parliamentary analytics for {mpName}...</p>
            </div>
          ) : error ? (
            <div className="py-16 text-center text-rose-400 space-y-2">
              <ShieldAlert className="w-10 h-10 mx-auto text-rose-500" />
              <p className="text-sm font-semibold">{error}</p>
            </div>
          ) : (
            <>
              {/* Financial & Risk Overview Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Sanctioned Outlay</span>
                  <div className="text-xl font-extrabold font-mono text-white mt-1">
                    {formatCr(data.total_amount)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {data.total_works} works sanctioned
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Disbursed Spend</span>
                  <div className="text-xl font-extrabold font-mono text-indigo-300 mt-1">
                    {formatCr(data.total_spent)}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    {data.total_amount ? ((data.total_spent / data.total_amount) * 100).toFixed(1) : 0}% fund absorption
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Flagged Anomalies</span>
                  <div className="text-xl font-extrabold font-mono text-rose-400 mt-1">
                    {data.critical_count + data.high_count}
                  </div>
                  <div className="text-[11px] text-rose-400/80 mt-1">
                    {data.critical_count} Critical • {data.high_count} High
                  </div>
                </div>

                <div className="glass-panel p-4 rounded-xl border border-slate-800 bg-slate-900/50">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Average Risk Score</span>
                  <div className="text-xl font-extrabold font-mono text-amber-400 mt-1">
                    {data.avg_risk_score} <span className="text-xs text-slate-500">/ 100</span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    L2 Tabular Ensemble
                  </div>
                </div>
              </div>

              {/* Milestones & Statutory Clause 3.2 Split */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Physical Milestone Progress */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-violet-400" />
                      Physical Delivery Progress
                    </span>
                    <span className="text-xs font-mono text-slate-400">{data.total_works} Total Works</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-1 text-xs">
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-emerald-400 flex items-center gap-1.5 font-medium">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Completed
                      </span>
                      <span className="font-mono font-bold text-white">{workCounts.completed || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-blue-400 flex items-center gap-1.5 font-medium">
                        <Clock className="w-3.5 h-3.5" /> In Progress
                      </span>
                      <span className="font-mono font-bold text-white">{workCounts.in_progress || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-amber-400 flex items-center gap-1.5 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5" /> Delayed (&gt;50d)
                      </span>
                      <span className="font-mono font-bold text-white">{workCounts.delayed || 0}</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
                      <span className="text-rose-400 flex items-center gap-1.5 font-medium">
                        <Flame className="w-3.5 h-3.5" /> Flagged Schemes
                      </span>
                      <span className="font-mono font-bold text-white">{workCounts.flagged || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Clause 3.2 Statutory Affirmative Earmarking */}
                <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/40 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <Award className="w-3.5 h-3.5 text-amber-400" />
                      Clause 3.2 Statutory Earmarking
                    </span>
                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded ${
                      compliance.status === 'COMPLIANT' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {compliance.status || 'DEFICIT'}
                    </span>
                  </div>

                  <div className="space-y-3 pt-1">
                    {/* SC Area Allocation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">SC Area Allocation (Min 15%):</span>
                        <span className={compliance.sc_compliant ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                          {compliance.sc_quota_pct}%
                          {compliance.sc_shortfall_pct > 0 && ` (-${compliance.sc_shortfall_pct}% shortfall)`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${compliance.sc_compliant ? 'bg-emerald-400' : 'bg-amber-400'}`}
                          style={{ width: `${Math.min(100, ((compliance.sc_quota_pct || 0) / 15.0) * 100)}%` }}
                        />
                      </div>
                    </div>

                    {/* ST Area Allocation */}
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs font-mono">
                        <span className="text-slate-400">ST Area Allocation (Min 7.5%):</span>
                        <span className={compliance.st_compliant ? 'text-emerald-400 font-bold' : 'text-violet-400 font-bold'}>
                          {compliance.st_quota_pct}%
                          {compliance.st_shortfall_pct > 0 && ` (-${compliance.st_shortfall_pct}% shortfall)`}
                        </span>
                      </div>
                      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full ${compliance.st_compliant ? 'bg-emerald-400' : 'bg-violet-400'}`}
                          style={{ width: `${Math.min(100, ((compliance.st_quota_pct || 0) / 7.5) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Contractors Section */}
              {topVendors.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                    Top Implementing Contractors &amp; Concentration Risk
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {topVendors.map((v, i) => (
                      <div key={i} className="p-3 rounded-xl bg-slate-950/40 border border-slate-800 flex items-center justify-between text-xs">
                        <div className="truncate pr-2">
                          <div className="font-semibold text-slate-200 truncate">{v.work_top_vendor}</div>
                          <div className="text-[11px] text-slate-500 font-mono">{v.contracts} contracts awarded</div>
                        </div>
                        <span className="font-mono font-bold text-indigo-300 flex-shrink-0">
                          {formatCr(v.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Works Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-violet-400" />
                    Recommended Works ({works.length})
                  </h3>
                  <span className="text-[11px] font-mono text-slate-500">Sorted by AI Forensic Risk</span>
                </div>

                <div className="border border-slate-800 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-950/90 text-slate-400 font-mono text-[10px] uppercase sticky top-0 border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3">Work ID</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3">Sanction</th>
                        <th className="py-2.5 px-3 text-center">Risk Tier</th>
                        <th className="py-2.5 px-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {works.map((w, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-400">
                            #{w.work_id}
                          </td>
                          <td className="py-2.5 px-3 max-w-xs truncate text-slate-200">
                            {w.work_description || w.work_title || 'MPLADS Scheme'}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-slate-300 whitespace-nowrap">
                            ₹{(Number(w.sanction_amount || 0) / 1e5).toFixed(2)} L
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {getRiskChip(w.risk_label)}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                if (onSelectWork) onSelectWork(w.work_id);
                              }}
                              className="px-2 py-1 text-[11px] font-medium rounded bg-violet-600/20 hover:bg-violet-600 text-violet-300 hover:text-white border border-violet-500/30 transition-colors flex items-center gap-1 ml-auto"
                            >
                              <span>Inspect</span>
                              <ExternalLink className="w-3 h-3" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
