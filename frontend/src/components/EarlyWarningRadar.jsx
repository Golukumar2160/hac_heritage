import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  TrendingDown, 
  Clock, 
  ShieldAlert, 
  Search, 
  Filter, 
  ArrowRight, 
  Calendar, 
  DollarSign, 
  Building2, 
  MapPin, 
  Activity, 
  ChevronRight, 
  TrendingUp, 
  Percent, 
  CheckCircle, 
  HelpCircle,
  RefreshCw,
  Landmark
} from 'lucide-react';
import { api } from '../services/api';

export default function EarlyWarningRadar({ onSelectWork, activeRole }) {
  const [activeSubTab, setActiveSubTab] = useState('works_radar'); // 'works_radar' | 'constituency_forecaster'
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Early Warning Works State
  const [earlyWorks, setEarlyWorks] = useState([]);
  const [threshold, setThreshold] = useState(0.40);
  const [selectedState, setSelectedState] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [availableStates, setAvailableStates] = useState([]);

  // Constituency Forecaster State
  const [constituencyData, setConstituencyData] = useState([]);
  const [constituencyLoading, setConstituencyLoading] = useState(false);
  const [lapseFilter, setLapseFilter] = useState('all'); // 'all' | 'HIGH' | 'MODERATE' | 'LOW'

  // Load States for filter dropdown
  useEffect(() => {
    api.getFilterOptions()
      .then((res) => {
        if (res && Array.isArray(res.states)) {
          setAvailableStates(res.states);
        }
      })
      .catch((err) => console.error('Failed to load filter options:', err));
  }, []);

  // Fetch Early Warning Works
  const fetchEarlyWarningWorks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getEarlyWarningWorks(selectedState || null, threshold);
      if (res && Array.isArray(res.items)) {
        setEarlyWorks(res.items);
      } else if (Array.isArray(res)) {
        setEarlyWorks(res);
      } else {
        setEarlyWorks([]);
      }
    } catch (err) {
      console.error('Failed to fetch early warning works:', err);
      setError(err.message || 'Failed to load early warning works radar.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Constituency Balance Forecasts
  const fetchConstituencyForecasts = async () => {
    setConstituencyLoading(true);
    try {
      const res = await api.getConstituencyForecast(selectedState || null, 100);
      if (res && Array.isArray(res.forecasts)) {
        setConstituencyData(res.forecasts);
      } else {
        setConstituencyData([]);
      }
    } catch (err) {
      console.error('Failed to fetch constituency forecasts:', err);
    } finally {
      setConstituencyLoading(false);
    }
  };

  useEffect(() => {
    fetchEarlyWarningWorks();
  }, [threshold, selectedState]);

  useEffect(() => {
    if (activeSubTab === 'constituency_forecaster') {
      fetchConstituencyForecasts();
    }
  }, [activeSubTab, selectedState]);

  // Filtered early warning works
  const filteredWorks = earlyWorks.filter((w) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const title = (w.work_title || w.work_description || '').toLowerCase();
    const district = (w.district || '').toLowerCase();
    const id = String(w.work_id || '').toLowerCase();
    return title.includes(term) || district.includes(term) || id.includes(term);
  });

  // Filtered constituency forecasts
  const filteredConstituencies = constituencyData.filter((c) => {
    if (lapseFilter !== 'all' && c.lapse_risk !== lapseFilter) return false;
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const pc = (c.constituency || '').toLowerCase();
    const mp = (c.mp_name || '').toLowerCase();
    const st = (c.state || '').toLowerCase();
    return pc.includes(term) || mp.includes(term) || st.includes(term);
  });

  // Metrics calculations
  const totalFundsAtRiskCr = earlyWorks.reduce((acc, curr) => acc + (Number(curr.sanction_amount || curr.sanctioned_amount || 0) / 10000000), 0);
  const avgCompletionProb = earlyWorks.length > 0 
    ? (earlyWorks.reduce((acc, curr) => acc + (Number(curr.completion_probability || 0)), 0) / earlyWorks.length) * 100 
    : 0;

  const totalUnspentIdleCr = constituencyData.reduce((acc, curr) => acc + (Number(curr.current_balance_cr || 0)), 0);
  const highLapseRiskCount = constituencyData.filter((c) => c.lapse_risk === 'HIGH').length;

  return (
    <div className="space-y-6">
      
      {/* Header & Sub-Tab Switcher */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400">
              <ShieldAlert className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-white font-display flex items-center gap-2">
                Predictive Early-Warning Radar & Fund Forecaster
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                  MoSPI PS-26102
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Forward-looking predictive telemetry: Scheme abandonment likelihood and parliamentary unspent balance exhaustion.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Pills */}
        <div className="flex items-center space-x-1.5 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto font-mono text-xs">
          <button
            onClick={() => setActiveSubTab('works_radar')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'works_radar'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
            <span>Abandonment Radar ({earlyWorks.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('constituency_forecaster')}
            className={`px-3.5 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-2 ${
              activeSubTab === 'constituency_forecaster'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent'
            }`}
          >
            <TrendingDown className="w-3.5 h-3.5 text-amber-400" />
            <span>Unspent Balance Forecaster</span>
          </button>
        </div>
      </div>

      {/* SUBTAB 1: WORKS ABANDONMENT RADAR */}
      {activeSubTab === 'works_radar' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">At-Risk Works Flagged</div>
                <div className="text-2xl font-black text-rose-400 font-mono mt-0.5">
                  {earlyWorks.length.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-500">Threshold: Prob &lt; {(threshold * 100).toFixed(0)}%</div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Funds in Jeopardy</div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  ₹{totalFundsAtRiskCr.toFixed(2)} Cr
                </div>
                <div className="text-[10px] text-slate-500">Sanctioned Outlay at Risk</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Average Completion Likelihood</div>
                <div className="text-2xl font-black text-sky-400 font-mono mt-0.5">
                  {avgCompletionProb.toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">Model 6 Logistic Regression</div>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Percent className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Statutory Standard</div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  GFR Rule 144 &amp; Para 3.12
                </div>
                <div className="text-[10px] text-emerald-400 mt-0.5">Ground Verification Trigger</div>
              </div>
              <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search by Scheme ID, Title, or District..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* State Filter */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Monitored States</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              {/* Threshold Filter */}
              <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
                <span>Cutoff:</span>
                {[
                  { val: 0.30, label: '< 30% (Critical)' },
                  { val: 0.40, label: '< 40% (Default)' },
                  { val: 0.50, label: '< 50% (High)' },
                ].map((t) => (
                  <button
                    key={t.val}
                    onClick={() => setThreshold(t.val)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      threshold === t.val
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchEarlyWarningWorks}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Refresh Radar</span>
            </button>
          </div>

          {/* At-Risk Works Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-rose-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs text-slate-400 font-mono">Running Model 6 predictive completion inference...</div>
              </div>
            ) : filteredWorks.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs space-y-2">
                <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                <div className="font-semibold text-white">No Schemes Below Abandonment Threshold</div>
                <p className="text-slate-500 max-w-md mx-auto">
                  All surveyed public schemes in this scope exhibit completion likelihoods above {(threshold * 100).toFixed(0)}%.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Scheme Identification</th>
                      <th className="py-3 px-4">Location</th>
                      <th className="py-3 px-4">Sanctioned / Spent</th>
                      <th className="py-3 px-4">Model 6 Completion Likelihood</th>
                      <th className="py-3 px-4">Projected Delay / Target Date</th>
                      <th className="py-3 px-4">Vigilance Status</th>
                      <th className="py-3 px-4 text-right">Dossier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredWorks.map((item) => {
                      const prob = Number(item.completion_probability || 0);
                      const probPct = (prob * 100).toFixed(1);
                      const isCritical = prob < 0.30;
                      const sanctionL = ((Number(item.sanction_amount || item.sanctioned_amount || 0)) / 100000).toFixed(1);
                      const spentL = ((Number(item.total_spent || 0)) / 100000).toFixed(1);
                      const delayDays = item.projected_delay_days || item.delay_days || 0;
                      const projDate = item.projected_completion_date || 'Target Overrun';

                      return (
                        <tr 
                          key={item.work_id} 
                          className="hover:bg-slate-900/50 transition-colors group cursor-pointer"
                          onClick={() => onSelectWork && onSelectWork(item.work_id)}
                        >
                          <td className="py-3 px-4">
                            <div className="font-mono text-cyan-400 font-bold text-xs group-hover:underline flex items-center gap-1.5">
                              <span>#{item.work_id}</span>
                            </div>
                            <div className="text-slate-200 font-medium text-xs truncate max-w-xs mt-0.5" title={item.work_title || item.work_description}>
                              {item.work_title || item.work_description || 'Public Infrastructure Work'}
                            </div>
                          </td>

                          <td className="py-3 px-4 text-slate-300">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-500" />
                              <span>{item.district || 'District'}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{item.state || 'State'}</div>
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <div className="text-slate-200">₹{spentL} L</div>
                            <div className="text-[10px] text-slate-500">of ₹{sanctionL} L</div>
                          </td>

                          <td className="py-3 px-4">
                            <div className="flex items-center justify-between text-xs font-mono mb-1">
                              <span className={`font-bold ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                                {probPct}%
                              </span>
                              <span className="text-[10px] text-slate-500">AUC: 0.956</span>
                            </div>
                            <div className="w-32 bg-slate-800 h-2 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full transition-all ${isCritical ? 'bg-rose-500' : 'bg-amber-400'}`}
                                style={{ width: `${Math.max(4, Math.min(100, prob * 100))}%` }}
                              />
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs">
                            <div className="flex items-center gap-1.5 text-rose-300 font-semibold">
                              <Clock className="w-3.5 h-3.5 text-rose-400" />
                              <span>+{delayDays} Days Overrun</span>
                            </div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              Proj: {projDate}
                            </div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                              isCritical 
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700 shadow-sm shadow-rose-950'
                                : 'bg-amber-950/80 text-amber-300 border-amber-700'
                            }`}>
                              {isCritical ? 'CRITICAL_RISK' : 'HIGH_DELAY_RISK'}
                            </span>
                          </td>

                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectWork) onSelectWork(item.work_id);
                              }}
                              className="px-2.5 py-1 rounded bg-slate-800 hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-slate-700 hover:border-cyan-500/40 text-[11px] font-semibold transition-all flex items-center gap-1 ml-auto"
                            >
                              <span>Inspect</span>
                              <ChevronRight className="w-3 h-3" />
                            </button>
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
      )}

      {/* SUBTAB 2: CONSTITUENCY UNSPENT BALANCE FORECASTER */}
      {activeSubTab === 'constituency_forecaster' && (
        <div className="space-y-6">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Total Unspent Balances</div>
                <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                  ₹{totalUnspentIdleCr.toFixed(2)} Cr
                </div>
                <div className="text-[10px] text-slate-500">Across {constituencyData.length} Constituencies</div>
              </div>
              <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Landmark className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Lapse Alert Constituencies</div>
                <div className="text-2xl font-black text-rose-400 font-mono mt-0.5">
                  {highLapseRiskCount}
                </div>
                <div className="text-[10px] text-rose-400 font-semibold">Exhaustion Horizon &gt; 36 Months</div>
              </div>
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertTriangle className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Statutory Provision</div>
                <div className="text-xs font-bold text-slate-200 mt-1">
                  GFR Rule 230(8)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">Idle Grants-in-Aid Recovery</div>
              </div>
              <div className="p-2.5 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                <Building2 className="w-5 h-5" />
              </div>
            </div>

            <div className="p-4 rounded-xl glass-panel border border-slate-800 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase font-bold text-slate-400">Forecasting Model</div>
                <div className="text-xs font-bold text-cyan-300 mt-1">
                  Burn Velocity vs Tenure Horizon
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">60-Month Parliamentary Tenure</div>
              </div>
              <div className="p-2.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Activity className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="glass-panel p-4 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 flex-1 min-w-[280px]">
              {/* Search */}
              <div className="relative flex-1 min-w-[200px]">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search Constituency, MP Name, or State..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* State Filter */}
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="">All Monitored States</option>
                {availableStates.map((st) => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>

              {/* Lapse Risk Filter */}
              <div className="flex items-center space-x-1.5 text-xs font-mono text-slate-400">
                <span>Lapse Risk:</span>
                {[
                  { id: 'all', label: 'All' },
                  { id: 'HIGH', label: 'High Risk' },
                  { id: 'MODERATE', label: 'Moderate' },
                  { id: 'LOW', label: 'Optimal' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setLapseFilter(f.id)}
                    className={`px-2.5 py-1 rounded text-[11px] font-semibold border ${
                      lapseFilter === f.id
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/50'
                        : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={fetchConstituencyForecasts}
              disabled={constituencyLoading}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${constituencyLoading ? 'animate-spin' : ''}`} />
              <span>Recalculate Projections</span>
            </button>
          </div>

          {/* Constituency Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            {constituencyLoading ? (
              <div className="py-20 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-xs text-slate-400 font-mono">Computing unspent balance exhaustion trajectories...</div>
              </div>
            ) : filteredConstituencies.length === 0 ? (
              <div className="py-16 text-center text-slate-400 text-xs">
                No constituency balance records found matching filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Constituency &amp; MP</th>
                      <th className="py-3 px-4">State</th>
                      <th className="py-3 px-4">Allocated / Spent</th>
                      <th className="py-3 px-4">Unspent Balance</th>
                      <th className="py-3 px-4">Monthly Burn Rate</th>
                      <th className="py-3 px-4">Projected Exhaustion Horizon</th>
                      <th className="py-3 px-4">Tenure-End Idle Projection</th>
                      <th className="py-3 px-4">Lapse Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-sans">
                    {filteredConstituencies.map((c, idx) => {
                      const isHigh = c.lapse_risk === 'HIGH';
                      const isMod = c.lapse_risk === 'MODERATE';

                      return (
                        <tr key={idx} className="hover:bg-slate-900/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="font-bold text-white text-xs">{c.constituency}</div>
                            <div className="text-slate-400 text-[11px] mt-0.5">{c.mp_name}</div>
                          </td>

                          <td className="py-3 px-4 text-slate-300">
                            {c.state}
                          </td>

                          <td className="py-3 px-4 font-mono">
                            <div className="text-slate-200">₹{c.total_spent_cr} Cr spent</div>
                            <div className="text-[10px] text-slate-500">of ₹{c.true_budget_cr} Cr allocation</div>
                          </td>

                          <td className="py-3 px-4 font-mono font-bold text-amber-400">
                            ₹{c.current_balance_cr} Cr
                          </td>

                          <td className="py-3 px-4 font-mono text-slate-300">
                            ₹{c.monthly_burn_rate_lakh} L / mo
                          </td>

                          <td className="py-3 px-4 font-mono text-xs">
                            <div className={`font-semibold flex items-center gap-1 ${
                              isHigh ? 'text-rose-400' : isMod ? 'text-amber-300' : 'text-emerald-400'
                            }`}>
                              <Clock className="w-3.5 h-3.5" />
                              <span>{c.exhaustion_months > 60 ? '> 60 Months (Severe)' : `${c.exhaustion_months} Months`}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              Based on past disbursement velocity
                            </div>
                          </td>

                          <td className="py-3 px-4 font-mono text-xs">
                            <div className={`font-bold ${Number(c.projected_unspent_at_tenure_end_cr) > 5 ? 'text-rose-400' : 'text-slate-300'}`}>
                              ₹{c.projected_unspent_at_tenure_end_cr} Cr Idle
                            </div>
                            <div className="text-[10px] text-slate-500">at 5-year tenure close</div>
                          </td>

                          <td className="py-3 px-4">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${
                              isHigh 
                                ? 'bg-rose-950/80 text-rose-300 border-rose-700' 
                                : isMod 
                                  ? 'bg-amber-950/80 text-amber-300 border-amber-700' 
                                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-700'
                            }`}>
                              {c.lapse_risk === 'HIGH' ? 'HIGH_LAPSE_RISK' : c.lapse_risk === 'MODERATE' ? 'MODERATE_RISK' : 'OPTIMAL_BURN'}
                            </span>
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
      )}

    </div>
  );
}
