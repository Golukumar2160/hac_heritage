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
  QrCode
} from 'lucide-react';
import { api } from '../services/api';
import CitizenFeedbackModal from './CitizenFeedbackModal';

export default function CitizenAnomalyFeed({ 
  district = 'PILIBHIT', 
  state = 'Uttar Pradesh', 
  onSelectWork,
  initialTrigger = null
}) {
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTrigger, setSelectedTrigger] = useState(initialTrigger || 'all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [reportingWork, setReportingWork] = useState(null);

  const fetchFlags = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        pageSize: 25,
        state: state && state !== 'all' ? state : 'all',
        search: searchQuery.trim() || district,
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
      setTotalCount(res.total || flagList.length);
    } catch (err) {
      console.error('Error fetching citizen flags feed:', err);
      setError('Could not load district anomaly feed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFlags();
  }, [district, selectedTrigger, selectedCategory, page]);

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
              Showing public infrastructure schemes in <strong className="text-emerald-500 dark:text-emerald-400 font-mono">{district}</strong> flagged by multi-model AI surveillance for suspected fraud or execution failures.
            </p>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs text-slate-400 self-start md:self-auto">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>{totalCount} Flagged Schemes Monitored</span>
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
          <p className="text-xs text-slate-400 font-mono">Scanning district anomaly registers...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
          <span>{error}</span>
        </div>
      ) : flags.length === 0 ? (
        <div className="p-12 rounded-3xl glass-panel border border-slate-800 text-center space-y-3">
          <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto" />
          <h4 className="text-base font-bold text-white">No Schemes Flagged in this Filter</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Try resetting your search query or selecting "All Anomalies" to view other monitored projects in {district}.
          </p>
          <button
            onClick={() => { setSelectedTrigger('all'); setSelectedCategory('all'); setSearchQuery(''); }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold cursor-pointer transition-all"
          >
            Reset All Filters
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {flags.map((item) => {
            const isCrit = (item.risk_score || 0) >= 0.85;
            const sanctionAmt = Number(item.sanction_amount || 0);
            const spentAmt = Number(item.total_spent || 0);
            const progressPct = item.progress_pct !== undefined ? Number(item.progress_pct) : 0;
            const workId = item.work_id || item.id;
            const cleanWorkId = String(workId);

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
                    <span className="text-slate-600 text-xs hidden sm:inline">•</span>
                    <span className="text-xs text-slate-400 font-medium">
                      {item.work_category || 'Public Works'}
                    </span>
                    <span className="text-slate-600 text-xs hidden sm:inline">•</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{item.district || item.ida || district}</span>
                    </span>
                  </div>

                  <div className="flex items-center space-x-2 self-start sm:self-auto">
                    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                      isCrit 
                        ? 'bg-rose-500/15 text-rose-300 border-rose-500/30' 
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}>
                      {isCrit ? 'CRITICAL ANOMALY' : 'HIGH RISK'}
                    </span>
                    <span className="text-xs font-mono font-bold text-white px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
                      Risk: {Number(item.risk_score || 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* Title */}
                <h4 className="text-sm sm:text-base font-bold text-white font-display group-hover:text-emerald-300 transition-colors leading-snug">
                  {item.work_title || item.work_description || `Scheme #${cleanWorkId}`}
                </h4>

                {/* Plain-Language Layman Anomaly Explanations */}
                <div className="flex flex-wrap gap-2 pt-0.5">
                  {item.rule_duplicate_photo && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-rose-950/40 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                      <span>📸 Ghost Asset</span>
                      <span className="text-rose-400/80 font-sans font-normal">(Reused identical completion photograph)</span>
                    </span>
                  )}
                  {item.rule_split_tender && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-amber-950/40 text-amber-300 border border-amber-500/40 flex items-center gap-1.5">
                      <span>✂️ Split Tender</span>
                      <span className="text-amber-400/80 font-sans font-normal">(Sanctioned under ₹10L to bypass open tender)</span>
                    </span>
                  )}
                  {item.rule_premature_tranche && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-purple-950/40 text-purple-300 border border-purple-500/40 flex items-center gap-1.5">
                      <span>⚡ Premature Payment</span>
                      <span className="text-purple-400/80 font-sans font-normal">(Tranche 2 disbursed before UC submission)</span>
                    </span>
                  )}
                  {item.rule_stalled_execution && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-orange-950/40 text-orange-300 border border-orange-500/40 flex items-center gap-1.5">
                      <span>⏳ Stalled Execution</span>
                      <span className="text-orange-400/80 font-sans font-normal">(&gt;18 mos elapsed with funds drained)</span>
                    </span>
                  )}
                  {item.rule_overspend && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-rose-950/40 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                      <span>📈 Unvouched Overspend</span>
                      <span className="text-rose-400/80 font-sans font-normal">(Disbursed more than engineer certified)</span>
                    </span>
                  )}
                  {item.rule_missing_photo && (
                    <span className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold bg-slate-900 text-slate-300 border border-slate-700 flex items-center gap-1.5">
                      <span>🚫 Missing Photo Proof</span>
                      <span className="text-slate-400 font-sans font-normal">(Zero site photographs uploaded)</span>
                    </span>
                  )}
                </div>

                {/* Financial & Physical Metrics Bar */}
                <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex flex-wrap items-center gap-4 font-mono">
                    <div>
                      <span className="text-slate-500 text-[10px] block">SANCTIONED</span>
                      <span className="font-bold text-white">₹{(sanctionAmt / 100000).toFixed(2)} Lakhs</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">DISBURSED</span>
                      <span className="font-bold text-emerald-400">₹{(spentAmt / 100000).toFixed(2)} Lakhs</span>
                    </div>
                    <div>
                      <span className="text-slate-500 text-[10px] block">PROGRESS</span>
                      <span className="font-bold text-white">{progressPct}%</span>
                    </div>
                    {item.mp_name && (
                      <div className="hidden md:block">
                        <span className="text-slate-500 text-[10px] block">HON'BLE MP</span>
                        <span className="text-slate-300 font-sans font-medium">{item.mp_name}</span>
                      </div>
                    )}
                  </div>

                  {/* Citizen Actions */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setReportingWork(item)}
                      className="px-3 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Report Reality</span>
                    </button>

                    <button
                      onClick={() => onSelectWork(cleanWorkId)}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-mono font-bold transition-all flex items-center gap-1.5 shadow-md shadow-emerald-600/30 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Inspect Evidence</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Embedded Whistleblower Feedback Modal */}
      {reportingWork && (
        <CitizenFeedbackModal
          work={reportingWork}
          onClose={() => setReportingWork(null)}
          onFeedbackSubmitted={() => {
            setReportingWork(null);
            fetchFlags();
          }}
        />
      )}
    </div>
  );
}
