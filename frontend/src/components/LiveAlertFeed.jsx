import React, { useState, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  AlertOctagon, 
  FileSearch, 
  ChevronLeft, 
  ChevronRight, 
  RefreshCw,
  Image as ImageIcon,
  Building2,
  TrendingDown,
  CameraOff,
  Clock,
  Ban,
  Copy,
  Timer
} from 'lucide-react';
import { api } from '../services/api';

export default function LiveAlertFeed({ onSelectWork, initialTier = 'all', activeRole = 'ministry' }) {
  const [flags, setFlags] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState(initialTier);
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState([]);
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Load States for dropdown & re-fetch when activeRole changes
  useEffect(() => {
    setPage(1);
    setStateFilter('all');
    api.getStates()
      .then(res => setStates(res.states || []))
      .catch(() => {});
  }, [activeRole]);

  // Sync tier if parent updates it
  useEffect(() => {
    if (initialTier) {
      setTier(initialTier);
      setPage(1);
    }
  }, [initialTier]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getFlags({
        page,
        pageSize,
        risk_label: tier,
        state: stateFilter,
        search: search.trim() || undefined,
        trigger: triggerFilter !== 'all' ? triggerFilter : undefined,
      });

      let items = res.flags || [];
      
      // Client-side quick filter fallback for specific trigger flags if selected
      if (triggerFilter === 'split_tender') {
        items = items.filter(f => f.rule_split_tender);
      } else if (triggerFilter === 'premature_tranche') {
        items = items.filter(f => f.rule_premature_tranche);
      } else if (triggerFilter === 'stalled') {
        items = items.filter(f => f.rule_stalled_execution);
      } else if (triggerFilter === 'duplicate') {
        items = items.filter(f => f.is_duplicate || f.rule_text_duplicate);
      } else if (triggerFilter === 'prohibited') {
        items = items.filter(f => f.rule_prohibited_work);
      } else if (triggerFilter === 'text_duplicate') {
        items = items.filter(f => f.rule_text_duplicate);
      } else if (triggerFilter === 'stalling') {
        items = items.filter(f => f.rule_sanction_stalling);
      } else if (triggerFilter === 'missing_photo') {
        items = items.filter(f => f.rule_missing_photo);
      } else if (triggerFilter === 'overspend') {
        items = items.filter(f => f.rule_overspend);
      } else if (triggerFilter === 'vendor') {
        items = items.filter(f => f.work_vendor_flag);
      }

      setFlags(items);
      setTotalCount(res.total || items.length);
    } catch (err) {
      console.error('Error fetching flags:', err);
    } finally {
      setLoading(false);
    }
  }, [page, tier, stateFilter, search, triggerFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 250);
    return () => clearTimeout(timer);
  }, [loadData]);

  const getTierBadge = (riskScore, tierName) => {
    const rawScore = Number(riskScore) || 0;
    const score100 = rawScore <= 1.0 ? rawScore * 100 : rawScore;
    const tierUpper = String(tierName || '').toUpperCase();

    if (tierUpper === 'CRITICAL' || score100 >= 85.0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-rose-500/15 text-rose-300 border border-rose-500/30">
          <span className="w-2 h-2 rounded-full bg-rose-500 mr-1.5 animate-pulse" />
          CRITICAL ({score100.toFixed(1)})
        </span>
      );
    }
    if (tierUpper === 'HIGH' || score100 >= 58.0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
          <span className="w-2 h-2 rounded-full bg-amber-400 mr-1.5" />
          HIGH ({score100.toFixed(1)})
        </span>
      );
    }
    if (tierUpper === 'MEDIUM' || score100 >= 39.0) {
      return (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-violet-500/15 text-violet-300 border border-violet-500/30">
          MED ({score100.toFixed(1)})
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold font-mono bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
        LOW ({score100.toFixed(1)})
      </span>
    );
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4 font-sans">
      
      {/* Search & Filter Command Ribbon */}
      <div className="glass-panel p-5 rounded-2xl space-y-3.5 border border-slate-200/80 dark:border-white/[0.06]">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Work ID, Scheme Title, MP Name, District..."
              className="w-full pl-11 pr-4 py-2.5 rounded-xl glass-input text-sm placeholder:text-slate-400 font-sans"
            />
            {search && (
              <button 
                onClick={() => setSearch('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-slate-700 dark:hover:text-white"
              >
                ✕
              </button>
            )}
          </div>

          {/* State Dropdown */}
          <div className="w-full md:w-60">
            <select
              value={stateFilter}
              onChange={(e) => {
                setStateFilter(e.target.value);
                setPage(1);
              }}
              className="w-full px-3.5 py-2.5 rounded-xl glass-input text-sm cursor-pointer font-sans bg-white dark:bg-navy-900"
            >
              <option value="all" className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">All Indian States</option>
              {states.map((s, idx) => (
                <option key={idx} value={s} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{s}</option>
              ))}
            </select>
          </div>

          {/* Reload Button */}
          <button
            onClick={() => loadData()}
            className="px-4 py-2.5 rounded-xl glass-input hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors flex items-center justify-center gap-2 text-sm font-semibold cursor-pointer"
            title="Refresh feed"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>

        {/* Tier & Trigger Filter Chips */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
          {/* Risk Tier Chips */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mr-1">Risk Tier:</span>
            {[
              { id: 'all', label: 'All Tiers' },
              { id: 'critical', label: 'Critical' },
              { id: 'high', label: 'High Risk' },
              { id: 'medium', label: 'Medium' },
              { id: 'low', label: 'Verified' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setTier(t.id);
                  setPage(1);
                }}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                  tier === t.id
                    ? t.id === 'critical'
                      ? 'bg-rose-600 text-white font-bold shadow-lg shadow-rose-500/30'
                      : t.id === 'high'
                      ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/30'
                      : 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold shadow-lg shadow-violet-500/30'
                    : 'bg-slate-100 hover:bg-slate-200 dark:bg-black/30 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-400 dark:hover:text-white border border-slate-200 dark:border-white/5'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* Trigger Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 mr-1">Anomaly Type:</span>
            {[
              { id: 'all', label: 'Any Flag', icon: null },
              { id: 'prohibited', label: 'Clause 4.1 Prohibited', icon: Ban },
              { id: 'text_duplicate', label: 'Semantic Duplicate', icon: Copy },
              { id: 'stalling', label: 'Clause 3.10 Stalled (>45d)', icon: Timer },
              { id: 'premature_tranche', label: 'Clause 4.3 Tranche Gate', icon: AlertOctagon },
              { id: 'split_tender', label: 'GFR Split Tender', icon: FileSearch },
              { id: 'stalled', label: 'Stalled (>1y)', icon: Clock },
              { id: 'duplicate', label: 'Duplicate Works', icon: ImageIcon },
              { id: 'missing_photo', label: 'Missing Photo', icon: CameraOff },
              { id: 'overspend', label: 'Cost Overrun', icon: TrendingDown },
              { id: 'vendor', label: 'Vendor Monopoly', icon: Building2 },
            ].map((trig) => {
              const Icon = trig.icon;
              return (
                <button
                  key={trig.id}
                  onClick={() => {
                    setTriggerFilter(trig.id);
                    setPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                    triggerFilter === trig.id
                      ? 'bg-violet-600 text-white font-semibold shadow-sm'
                      : 'bg-slate-100 hover:bg-slate-200 dark:bg-black/20 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 border border-slate-200 dark:border-white/5'
                  }`}
                >
                  {Icon && <Icon className={`w-3.5 h-3.5 ${triggerFilter === trig.id ? 'text-white' : 'text-violet-600 dark:text-violet-300'}`} />}
                  {trig.label}
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Table Feed / Results Card */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-xs font-mono font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-black/30 border-b border-slate-200 dark:border-white/[0.06]">
                <th className="py-4 px-4">Scheme Dossier</th>
                <th className="py-4 px-4">Constituency & MP</th>
                <th className="py-4 px-4">Sanction vs Disbursed</th>
                <th className="py-4 px-4">Risk Severity</th>
                <th className="py-4 px-4">Violation Triggers</th>
                <th className="py-4 px-4 text-right">Forensic Action</th>
              </tr>
            </thead>
            <tbody className="text-sm" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-7 bg-slate-800/40 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    <AlertOctagon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                    No schemes match your filter parameters.
                  </td>
                </tr>
              ) : (
                flags.map((work) => {
                  const sanction = Number(work.sanction_amount || 0);
                  const spent = Number(work.total_spent || 0);
                  const overrun = work.cost_overrun_pct || 0;
                  const rawScore = Number(work.risk_score_100 || work.risk_score || 0);
                  const score100 = rawScore <= 1.0 ? rawScore * 100 : rawScore;
                  const tierUpper = String(work.risk_label || work.risk_tier || '').toUpperCase();
                  const isCritical = tierUpper === 'CRITICAL' || score100 >= 85.0;

                  return (
                    <tr 
                      key={work.work_id} 
                      className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group border-b border-slate-100 dark:border-white/[0.03] ${
                        isCritical ? 'bg-rose-50/60 dark:bg-rose-950/10' : ''
                      }`}
                    >
                      {/* Work ID & Title */}
                      <td className="py-4 px-4 max-w-xs">
                        <div 
                          className="font-mono font-bold text-sm tracking-tight cursor-pointer text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
                          onClick={() => onSelectWork(work.work_id)}
                        >
                          #{work.work_id}
                        </div>
                        <div className="text-slate-900 dark:text-white text-sm line-clamp-1 font-semibold mt-0.5" title={work.work_title}>
                          {work.work_title || 'Public Works Scheme'}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 mt-0.5">
                          {work.category || 'General Infrastructure'}
                        </div>
                      </td>

                      {/* Constituency & MP */}
                      <td className="py-4 px-4">
                        <div className="text-slate-900 dark:text-white font-semibold text-sm">
                          {work.district || 'District N/A'}, {work.state || 'State N/A'}
                        </div>
                        <div className="text-xs text-slate-600 dark:text-slate-300 truncate max-w-[180px] mt-0.5" title={work.mp_name}>
                          MP: {work.mp_name || 'Constituency Rep'}
                        </div>
                      </td>

                      {/* Sanction vs Disbursed */}
                      <td className="py-4 px-4 font-mono">
                        <div className="text-slate-900 dark:text-white font-bold text-sm">
                          ₹{(sanction / 100000).toFixed(2)} Lakhs
                        </div>
                        <div className={`text-xs flex items-center gap-1.5 mt-0.5 ${spent > sanction ? 'text-rose-600 dark:text-rose-400 font-bold' : 'text-slate-500 dark:text-slate-400'}`}>
                          <span>Spent: ₹{(spent / 100000).toFixed(2)}L</span>
                          {overrun > 0 && <span className="text-rose-600 dark:text-rose-400 font-bold">(+{overrun}%)</span>}
                        </div>
                      </td>

                      {/* Risk Score */}
                      <td className="py-4 px-4">
                        <div>
                          {getTierBadge(score100, work.risk_tier)}
                        </div>
                        <div className="w-28 bg-slate-800 h-2 rounded-full overflow-hidden mt-2">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isCritical ? 'bg-rose-500' :
                              score100 >= 58.0 ? 'bg-amber-400' :
                              'bg-violet-400'
                            }`}
                            style={{ width: `${Math.min(100, Math.max(3, score100))}%` }}
                          />
                        </div>
                        {work.completion_probability !== undefined && (
                          <div className="text-xs font-mono text-slate-300 mt-1.5 flex items-center gap-1" title="Logistic Regression Completion Likelihood">
                            <span>Comp:</span>
                            <span className={`font-semibold ${
                              Number(work.completion_probability) >= 0.70 ? 'text-emerald-400' :
                              Number(work.completion_probability) >= 0.40 ? 'text-amber-400' :
                              'text-rose-400'
                            }`}>
                              {(Number(work.completion_probability) * 100).toFixed(0)}%
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Anomaly Triggers & Model 5 Ensemble Signals */}
                      <td className="py-4 px-4">
                        <div className="w-full flex items-center gap-1 text-[10px] font-mono text-slate-400 mb-1.5" title="Model 5 Weighted Ensemble 4-Signal Percentiles: Anomaly (35%), Vendor (30%), Compliance (20%), Timeline (15%)">
                          <span className="px-1.5 py-0.5 rounded bg-violet-500/15 text-violet-300 border border-violet-500/30" title="Layer 1/2 Isolation Forest Percentile">
                            A:{Math.round(work.anomaly_score_pct || 0)}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30" title="Layer 3 Vendor Cartel Percentile">
                            V:{Math.round(work.vendor_score_pct || 0)}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 border border-purple-500/30" title="Layer 3 Statutory Compliance Percentile">
                            C:{Math.round(work.compliance_score_pct || 0)}%
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 border border-sky-500/30" title="Layer 4 Timeline Delay Percentile">
                            T:{Math.round(work.timeline_score_pct || 0)}%
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {work.rule_prohibited_work && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-rose-600/30 text-rose-300 border border-rose-500/60 shadow-sm" title="Clause 4.1/5.2 Violation: Prohibited public expenditure (Religious / Memorial / Private / Commercial asset)">
                              🚫 Cl. 4.1 Prohibited
                            </span>
                          )}
                          {work.rule_text_duplicate && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-pink-500/20 text-pink-300 border border-pink-500/40" title="GFR 144: High semantic textual similarity with other project in same MP jurisdiction">
                              📑 Semantic Duplicate
                            </span>
                          )}
                          {work.rule_sanction_stalling && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Clause 3.10: District Authority sanction delayed beyond 45-day statutory SLA">
                              ⏱️ Cl. 3.10 Delay ({Math.round(work.days_to_sanction || 0)}d)
                            </span>
                          )}
                          {work.rule_premature_tranche && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-purple-500/20 text-purple-300 border border-purple-500/40" title="Clause 4.3: Tranche 2 released <=7 days of Tranche 1 (75% utilization gate bypassed)">
                              ⚖️ Cl. 4.3 Tranche Gate
                            </span>
                          )}
                          {work.rule_split_tender && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40" title="GFR 2017 Rules 149/155: Evasion of ₹5L/₹10L tender threshold">
                              ✂️ GFR Split Tender
                            </span>
                          )}
                          {work.rule_stalled_execution && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40" title="Disbursed public funds but stalled >1 year">
                              ⏳ Stalled (&gt;1y)
                            </span>
                          )}
                          {work.is_duplicate && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/40">
                              📸 Duplicate pHash
                            </span>
                          )}
                          {work.rule_missing_photo && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              ⚠️ Missing Photo
                            </span>
                          )}
                          {work.rule_overspend && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              💸 Overspend
                            </span>
                          )}
                          {work.work_vendor_flag && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-violet-500/20 text-violet-300 border border-violet-500/40">
                              🏢 Monopoly
                            </span>
                          )}
                          {!work.rule_prohibited_work && !work.rule_text_duplicate && !work.rule_sanction_stalling && !work.rule_premature_tranche && !work.rule_split_tender && !work.rule_stalled_execution && !work.is_duplicate && !work.rule_missing_photo && !work.rule_overspend && !work.work_vendor_flag && (
                            <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-emerald-500/10 text-emerald-400">
                              ML Statistical Anomaly
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Action Button */}
                      <td className="py-4 px-4 text-right">
                        <button
                          onClick={() => onSelectWork(work.work_id)}
                          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all active:scale-95 cursor-pointer text-violet-200 hover:text-white"
                          style={{ background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.3)' }}
                        >
                          <FileSearch className="w-4 h-4 text-violet-300" />
                          <span>Case File</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 bg-slate-50/80 dark:bg-black/20 border-t border-slate-200/80 dark:border-white/[0.06]">
          <div>
            Showing <span className="text-slate-900 dark:text-white font-mono font-bold">{flags.length}</span> of{' '}
            <span className="text-slate-900 dark:text-white font-mono font-bold">{Number(totalCount).toLocaleString('en-IN')}</span> flagged works
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              disabled={page <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-semibold shadow-xs"
            >
              Previous
            </button>
            <span className="font-mono text-slate-600 dark:text-slate-400 text-xs px-2">
              Page {page} of {totalPages}
            </span>
            <button
              disabled={page >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-xs font-semibold shadow-xs"
            >
              Next
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
