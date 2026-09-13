import React, { useState, useEffect, useMemo } from 'react';
import { 
  ShieldAlert, 
  Search, 
  Filter, 
  Eye, 
  Send, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Calendar, 
  Layers, 
  ChevronRight, 
  TrendingDown, 
  Clock, 
  ExternalLink, 
  QrCode,
  Globe
} from 'lucide-react';
import { api } from '../services/api';
import CitizenFeedbackModal from './CitizenFeedbackModal';
import { cleanDistrictName } from './CitizenDashboard';

export default function CitizenAnomalyFeed({ 
  district: propDistrict, 
  state: propState, 
  onDistrictChange,
  onStateChange,
  onSelectWork,
  initialTrigger = null
}) {
  const [internalDistrict, setInternalDistrict] = useState('PILIBHIT(DISTRICT MAGISTRAE PILIBHIT_IDA)');
  const [internalState, setInternalState] = useState('Uttar Pradesh');

  const district = propDistrict !== undefined ? propDistrict : internalDistrict;
  const setDistrict = onDistrictChange || setInternalDistrict;

  const state = propState !== undefined ? propState : internalState;
  const setState = onStateChange || setInternalState;

  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(initialTrigger || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reportingWork, setReportingWork] = useState(null);
  const [authOptions, setAuthOptions] = useState({ states: [], districts_by_state: {} });

  useEffect(() => {
    api.getAuthOptions().then((opts) => {
      setAuthOptions(opts || { states: [], districts_by_state: {} });
    }).catch(console.error);
  }, []);

  const availableDistricts = authOptions.districts_by_state?.[state] || (district ? [district] : []);

  const matchedDistrictVal = availableDistricts.find(
    d => d === district || cleanDistrictName(d).toLowerCase() === cleanDistrictName(district).toLowerCase()
  ) || availableDistricts[0] || district || '';

  // Ensure district is aligned with available districts of the fixed state
  useEffect(() => {
    if (availableDistricts.length > 0 && matchedDistrictVal && matchedDistrictVal !== district) {
      setDistrict(matchedDistrictVal);
    }
  }, [availableDistricts, matchedDistrictVal, district, setDistrict]);

  const fetchFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize: 25,
        state: state && state !== 'all' ? state : undefined,
        district: district && district !== 'all' ? district : undefined,
        ida: district && district !== 'all' ? district : undefined,
        search: searchQuery.trim() || undefined,
        sort_by: 'risk_score',
        sort_order: 'desc'
      };

      if (selectedTrigger && selectedTrigger !== 'all') {
        params.trigger = selectedTrigger;
      }
      if (selectedCategory && selectedCategory !== 'all') {
        params.category = selectedCategory;
      }

      const res = await api.getFlags(params);
      const flagList = res.flags || res.items || [];
      setFlags(flagList);
      setTotalCount(res.total !== undefined ? res.total : flagList.length);
    } catch (err) {
      console.error('Error fetching citizen flags feed:', err);
      setError('Could not load district anomaly feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [district, state, selectedTrigger, selectedCategory, page]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchFlags();
  };

  const triggerPills = [
    { id: 'all', label: 'All Anomalies' },
    { id: 'duplicate', label: '🚩 Ghost Photo (Duplicate)', trigger: 'duplicate' },
    { id: 'split_tender', label: '🚩 Split Tender (< ₹10L)', trigger: 'split_tender' },
    { id: 'premature_tranche', label: '🚩 Premature Tranche (Cl. 4.3)', trigger: 'premature_tranche' },
    { id: 'stalled', label: '🚩 Stalled with 100% Funds', trigger: 'stalled' },
    { id: 'missing_photo', label: '🚩 Missing Site Photo', trigger: 'missing_photo' }
  ];

  const categories = [
    'all',
    'Drinking Water Facility',
    'Sanitation & Drainage',
    'Rural Roads & Culverts',
    'Education & Schools',
    'Public Health & Clinics',
    'Irrigation & Borewells',
    'Community Infrastructure'
  ];

  const displayDistrict = cleanDistrictName(district) || 'All Districts';

  return (
    <div className="space-y-5">
      {/* Header Controls & Filters Bar */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>District Public Anomaly Radar</span>
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Showing public infrastructure schemes in <strong className="text-emerald-500 dark:text-emerald-400 font-mono">{displayDistrict}, {state}</strong> flagged by multi-model AI surveillance for suspected fraud or execution failures.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 font-mono text-xs text-slate-400 self-start md:self-auto">
            {/* Fixed State Badge (No option to change state) */}
            <div className="px-3 py-1.5 rounded-xl bg-[#040714] border border-slate-700/80 flex items-center gap-1.5 text-xs font-mono">
              <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <span className="text-slate-500 text-[10px] uppercase font-bold">State:</span>
              <span className="text-white font-bold tracking-wide">{state}</span>
            </div>

            {/* District Picker */}
            <div className="p-1.5 rounded-xl bg-[#040714] border border-emerald-500/40 flex items-center gap-1 shadow-inner">
              <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />
              <select
                value={matchedDistrictVal}
                onChange={(e) => { setDistrict(e.target.value); setPage(1); }}
                className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer pr-2 max-w-[170px] truncate"
                aria-label="Select District"
              >
                {availableDistricts.length === 0 ? (
                  <option value={district}>{cleanDistrictName(district) || 'All Districts'}</option>
                ) : (
                  availableDistricts.map(d => (
                    <option key={d} value={d} className="bg-slate-900 text-white font-sans">{cleanDistrictName(d)}</option>
                  ))
                )}
              </select>
            </div>

            <div className="flex items-center space-x-1.5 px-2 py-1 rounded-xl bg-slate-900 border border-slate-800">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{totalCount} Flagged</span>
            </div>
          </div>
        </div>

        {/* Search & Category Filter */}
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          <div className="sm:col-span-8 relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by scheme title, work ID, village, contractor, or MP..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-xs sm:text-sm placeholder-slate-500 focus:outline-none focus:border-emerald-400 transition-all font-sans"
            />
          </div>

          <div className="sm:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => { setSelectedCategory(e.target.value); setPage(1); }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400 font-sans cursor-pointer"
            >
              <option value="all">All Project Categories</option>
              {categories.filter(c => c !== 'all').map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </form>

        {/* Anomaly Trigger Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          {triggerPills.map(p => (
            <button
              key={p.id}
              onClick={() => { setSelectedTrigger(p.id); setPage(1); }}
              className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all whitespace-nowrap cursor-pointer flex-shrink-0 ${
                selectedTrigger === p.id
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Flagged Works List */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Scanning {displayDistrict} anomaly registers...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : flags.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-slate-800 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No Schemes Flagged in {displayDistrict}</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your search query or selecting "All Anomalies" to view other monitored projects in {displayDistrict}.
          </p>
          <button
            onClick={() => { setSelectedTrigger('all'); setSelectedCategory('all'); setSearchQuery(''); setPage(1); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold cursor-pointer transition-all"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {flags.map((item) => {
            const riskPct = item.risk_score
              ? Math.round(item.risk_score > 1 ? item.risk_score : item.risk_score * 100)
              : 0;
            const tier = (item.risk_label || item.risk_tier || 'LOW').toUpperCase();
            const sanctionAmt = Number(item.sanction_amount || 0);
            const spentAmt = Number(item.total_spent || 0);
            const progressPct = item.progress_pct !== undefined ? Number(item.progress_pct) : 0;
            const workId = item.work_id || item.id;
            const cleanWorkId = String(workId);

            const tierBadgeClass = 
              tier === 'CRITICAL' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
              tier === 'HIGH' ? 'bg-orange-500/20 text-orange-300 border-orange-500/40' :
              tier === 'MEDIUM' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' :
              'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';

            return (
              <div
                key={cleanWorkId}
                className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 hover:border-emerald-500/40 transition-all space-y-3 group bg-[#060913]"
              >
                {/* Top Strip */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-mono font-bold text-violet-300">
                      #{cleanWorkId}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${tierBadgeClass}`}>
                      {tier} RISK: {riskPct}%
                    </span>
                    {item.work_category && (
                      <span className="text-[11px] text-slate-400 font-sans">
                        • {item.work_category}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{cleanDistrictName(item.ida) || displayDistrict}</span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm sm:text-base font-bold text-white font-display group-hover:text-emerald-300 transition-colors">
                  {item.work_title || item.work_description || `Project #${cleanWorkId}`}
                </h4>

                {/* Forensic Trigger Badges */}
                <div className="flex flex-wrap gap-1.5">
                  {item.rule_duplicate_photo && (
                    <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      📸 Ghost Photo Duplicate
                    </span>
                  )}
                  {item.rule_split_tender && (
                    <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      ✂️ Split Tender &lt; ₹10L
                    </span>
                  )}
                  {item.rule_premature_tranche && (
                    <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      ⚡ Premature Tranche (Cl. 4.3)
                    </span>
                  )}
                  {item.rule_stalled_execution && (
                    <span className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-300 border border-orange-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      ⏳ Stalled with 100% Funds
                    </span>
                  )}
                  {item.rule_missing_photo && (
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono font-bold flex items-center gap-1">
                      🚫 Missing Site Photo
                    </span>
                  )}
                  {item.rule_overspend && (
                    <span className="px-2 py-0.5 rounded bg-red-950/40 text-red-300 border border-red-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      💸 Expenditure Exceeds Sanction
                    </span>
                  )}
                  {item.work_vendor_flag && (
                    <span className="px-2 py-0.5 rounded bg-yellow-950/40 text-yellow-300 border border-yellow-500/30 text-[10px] font-mono font-bold flex items-center gap-1">
                      🏢 Contractor Monopoly Alert
                    </span>
                  )}
                </div>

                {/* Financials & Action Row */}
                <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="grid grid-cols-3 gap-4 font-mono">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Sanctioned</span>
                      <span className="font-bold text-white">₹{(sanctionAmt / 100000).toFixed(2)} Lakh</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Disbursed</span>
                      <span className="font-bold text-emerald-400">₹{(spentAmt / 100000).toFixed(2)} Lakh</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Progress</span>
                      <span className="font-bold text-cyan-300">{progressPct}%</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      onClick={() => setReportingWork(item)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer transition-all"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Report Discrepancy</span>
                    </button>

                    <button
                      onClick={() => onSelectWork(cleanWorkId)}
                      className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-600/20 transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Scheme</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination Controls */}
      {totalCount > 25 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            Previous
          </button>
          <span className="text-xs font-mono text-slate-400">
            Page {page} of {Math.ceil(totalCount / 25)}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(totalCount / 25) || loading}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono font-bold text-white hover:bg-slate-800 disabled:opacity-50 cursor-pointer"
          >
            Next
          </button>
        </div>
      )}

      {/* Feedback Modal for Whistleblower Submissions */}
      {reportingWork && (
        <CitizenFeedbackModal
          work={reportingWork}
          onClose={() => setReportingWork(null)}
          onFeedbackSubmitted={() => setReportingWork(null)}
        />
      )}
    </div>
  );
}
