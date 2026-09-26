import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Search, 
  Filter, 
  AlertOctagon, 
  FileSearch, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  Check,
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

const ANOMALY_TYPES = [
  { id: 'all', label: 'Any Flag', icon: Filter },
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
];

export default function LiveAlertFeed({ onSelectWork, initialTier = 'all', activeRole = 'ministry' }) {
  const [flags, setFlags] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tier, setTier] = useState(initialTier);
  const [stateFilter, setStateFilter] = useState('all');
  const [states, setStates] = useState([]);
  const [triggerFilter, setTriggerFilter] = useState('all');
  const [isAnomalyDropdownOpen, setIsAnomalyDropdownOpen] = useState(false);
  const anomalyDropdownRef = useRef(null);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Handle clicking outside to close anomaly dropdown
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (anomalyDropdownRef.current && !anomalyDropdownRef.current.contains(e.target)) {
        setIsAnomalyDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const getWorkViolations = (work) => {
    const list = [];
    if (work.rule_prohibited_work) {
      list.push({
        label: '🚫 Cl. 4.1 Prohibited',
        desc: 'Clause 4.1/5.2 Violation: Prohibited public expenditure (Religious / Memorial / Private / Commercial asset)',
        cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      });
    }
    if (work.is_duplicate) {
      list.push({
        label: '📸 Duplicate pHash',
        desc: 'Perceptual Hashing (pHash): Duplicate image detected across distinct projects',
        cls: 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30'
      });
    }
    if (work.rule_split_tender) {
      list.push({
        label: '✂️ GFR Split Tender',
        desc: 'GFR 2017 Rules 149/155: Evasion of ₹5L/₹10L tender threshold',
        cls: 'bg-indigo-500/15 text-indigo-700 dark:text-indigo-300 border-indigo-500/30'
      });
    }
    if (work.work_vendor_flag) {
      list.push({
        label: '🏢 Monopoly',
        desc: 'Single vendor concentration or cartel pattern detected',
        cls: 'bg-violet-500/15 text-violet-700 dark:text-violet-300 border-violet-500/30'
      });
    }
    if (work.rule_premature_tranche) {
      list.push({
        label: '⚖️ Cl. 4.3 Tranche Gate',
        desc: 'Clause 4.3: Tranche 2 released <=7 days of Tranche 1 (75% utilization gate bypassed)',
        cls: 'bg-purple-500/15 text-purple-700 dark:text-purple-300 border-purple-500/30'
      });
    }
    if (work.rule_missing_photo) {
      list.push({
        label: '⚠️ Missing Photo',
        desc: 'Missing mandatory site inspection evidence photo',
        cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      });
    }
    if (work.rule_stalled_execution) {
      list.push({
        label: '⏳ Stalled (>1y)',
        desc: 'Disbursed public funds but stalled >1 year',
        cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      });
    }
    if (work.rule_missing_photo) {
      list.push({
        label: '⚠️ Missing Photo',
        desc: 'Missing mandatory site inspection evidence photo',
        cls: 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30'
      });
    }
    if (work.rule_overspend) {
      list.push({
        label: '💸 Overspend',
        desc: 'Expenditure exceeds sanctioned amount',
        cls: 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30'
      });
    }
    if (list.length === 0) {
      list.push({
        label: 'ML Statistical Anomaly',
        desc: 'Unsupervised Isolation Forest & statistical outlier flag',
        cls: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30'
      });
    }
    return list;
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-4 font-sans">
      
      {/* Search & Filter Command Ribbon */}
      <div className="glass-panel p-5 rounded-2xl space-y-3.5 border border-slate-200/80 dark:border-white/[0.06] relative z-20">
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

          {/* Anomaly Type Scrollable Dropdown Filter */}
          <div className="relative z-30" ref={anomalyDropdownRef}>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300 whitespace-nowrap">
                Anomaly Type:
              </span>
              <button
                type="button"
                onClick={() => setIsAnomalyDropdownOpen(!isAnomalyDropdownOpen)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all cursor-pointer border ${
                  triggerFilter !== 'all'
                    ? 'bg-violet-600 text-white border-violet-500 shadow-md shadow-violet-500/25 font-bold'
                    : 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-800 hover:border-violet-400 dark:hover:border-violet-600 shadow-sm'
                }`}
              >
                {(() => {
                  const curr = ANOMALY_TYPES.find(a => a.id === triggerFilter) || ANOMALY_TYPES[0];
                  const Icon = curr.icon || Filter;
                  return (
                    <>
                      <Icon className={`w-3.5 h-3.5 shrink-0 ${triggerFilter !== 'all' ? 'text-white' : 'text-violet-600 dark:text-violet-400'}`} />
                      <span className="truncate max-w-[170px] sm:max-w-none">{curr.label}</span>
                    </>
                  );
                })()}
                <ChevronDown className={`w-3.5 h-3.5 ml-0.5 transition-transform duration-200 ${isAnomalyDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Scrollable Popover Menu */}
            {isAnomalyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 max-h-64 overflow-y-auto rounded-xl p-1.5 shadow-2xl z-50 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 animate-in fade-in slide-in-from-top-2 duration-150 custom-scrollbar">
                <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-100 dark:border-slate-800/80 mb-1 flex items-center justify-between">
                  <span>Filter by Anomaly Type</span>
                  <span className="text-[9px] text-slate-500">11 filters</span>
                </div>
                <div className="space-y-0.5">
                  {ANOMALY_TYPES.map((trig) => {
                    const Icon = trig.icon || Filter;
                    const isSelected = triggerFilter === trig.id;
                    return (
                      <button
                        key={trig.id}
                        type="button"
                        onClick={() => {
                          setTriggerFilter(trig.id);
                          setPage(1);
                          setIsAnomalyDropdownOpen(false);
                        }}
                        className={`w-full px-2.5 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-colors text-left cursor-pointer ${
                          isSelected
                            ? 'bg-violet-600 text-white font-semibold shadow-sm'
                            : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Icon className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-white' : 'text-violet-600 dark:text-violet-400'}`} />
                          <span className="truncate">{trig.label}</span>
                        </div>
                        {isSelected && <Check className="w-3.5 h-3.5 shrink-0 text-white ml-2" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Table Feed / Results Card */}
      <div className="glass-panel overflow-hidden rounded-2xl border border-slate-200/80 dark:border-white/[0.06] relative z-10">
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

                      {/* Violation Triggers (2-Line Multi-Badge Layout) */}
                      <td className="py-3 px-4">
                        {(() => {
                          const violations = getWorkViolations(work);
                          const primary = violations[0];
                          const secondary = violations[1];
                          const tertiary = violations[2];
                          const total = violations.length;

                          // If total is 3, show both secondary and tertiary on the second line
                          // If total > 3, show secondary + (+N more) button
                          const remainingCount = total > 3 ? total - 2 : 0;
                          const moreTooltip = remainingCount > 0 
                            ? `Additional flags (${remainingCount}): ${violations.slice(2).map(v => v.label.replace(/[^\w\s\.\(\)\>\-]/g, '').trim()).join(', ')}. Click to inspect case.`
                            : undefined;

                          return (
                            <div className="flex flex-col gap-1.5 items-start min-w-[200px] max-w-[290px]">
                              {/* Upper Line: Primary Trigger */}
                              <span 
                                className={`px-2.5 py-1 rounded-md text-xs font-mono font-bold border whitespace-nowrap shadow-xs ${primary.cls}`} 
                                title={primary.desc}
                              >
                                {primary.label}
                              </span>

                              {/* Lower Line: Secondary Trigger + (Tertiary or +N more badge) */}
                              {secondary && (
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span 
                                    className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border whitespace-nowrap shadow-xs ${secondary.cls}`} 
                                    title={secondary.desc}
                                  >
                                    {secondary.label}
                                  </span>

                                  {total === 3 && tertiary && (
                                    <span 
                                      className={`px-2 py-0.5 rounded-md text-[11px] font-mono font-bold border whitespace-nowrap shadow-xs ${tertiary.cls}`} 
                                      title={tertiary.desc}
                                    >
                                      {tertiary.label}
                                    </span>
                                  )}

                                  {remainingCount > 0 && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        onSelectWork(work.work_id);
                                      }}
                                      className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300/80 dark:border-slate-700 whitespace-nowrap cursor-pointer transition-colors shadow-xs"
                                      title={moreTooltip}
                                    >
                                      +{remainingCount} more
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}
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
