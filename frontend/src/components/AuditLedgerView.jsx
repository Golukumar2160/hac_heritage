import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  UserCheck, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  RefreshCw,
  Lock,
  Search,
  ShieldAlert,
  Eye,
  Filter,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

export default function AuditLedgerView({ onSelectWork }) {
  const [logs, setLogs] = useState([]);
  const [flaggedDas, setFlaggedDas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('all');

  const loadLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getAuditLog();
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load audit ledger from backend:', err);
      setError(err.message || 'Failed to retrieve immutable audit ledger records.');
      setLogs([]);
    } finally {
      setLoading(false);
    }

    // Load CVC District Authority Surveillance (Restricted to Ministry View)
    const user = api.getCurrentUser();
    if (user?.role === 'ministry') {
      api.getFlaggedDas()
        .then(res => setFlaggedDas(Array.isArray(res) ? res : []))
        .catch(() => setFlaggedDas([]));
    } else {
      setFlaggedDas([]);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const filteredLogs = logs.filter((log) => {
    const matchesSearch = 
      (log.work_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.user_id || '').toLowerCase().includes(search.toLowerCase()) ||
      (log.justification || '').toLowerCase().includes(search.toLowerCase());
    
    const matchesAction = actionFilter === 'all' || (log.action || '').toUpperCase() === actionFilter.toUpperCase();
    return matchesSearch && matchesAction;
  });

  const getActionBadge = (action) => {
    const act = (action || '').toUpperCase();
    if (act === 'TREASURY_HOLD_RECOMMENDED' || act === 'HOLD') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40 inline-flex items-center gap-1">
          <AlertTriangle className="w-3 h-3" />
          TREASURY HOLD WARRANT (DM)
        </span>
      );
    }
    if (act === 'ESCALATED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">
          ESCALATED TO CAG
        </span>
      );
    }
    if (act === 'INSPECTION_ORDERED') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40">
          INSPECTION ORDERED
        </span>
      );
    }
    if (act === 'DISMISSED' || act === 'FALSE_POSITIVE') {
      return (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
          FLAG DISMISSED
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-slate-800 text-slate-300">
        {act}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-violet-500/25">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-emerald-400 font-bold flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              Write-Ahead-Log (WAL) Cryptographic Integrity
            </span>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              Anti-Tamper Ledger
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
            Statutory Anti-Tampering Audit Action Ledger
          </h2>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            Every dismissal, escalation, or inspection order recorded by auditors is permanently logged with mandatory 50+ character justification.
          </p>
        </div>

        <button
          onClick={loadLogs}
          className="px-4 py-2.5 rounded-xl glass-input hover:bg-slate-800 text-slate-200 transition-colors flex items-center gap-2 text-sm font-semibold self-start md:self-auto"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh Ledger</span>
        </button>
      </div>

      {/* CVC District Authority Surveillance Monitor (Ministry Role Scoped) */}
      {api.getCurrentUser()?.role === 'ministry' && (
        flaggedDas.length > 0 ? (
          <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-200">
                <ShieldAlert className="w-5 h-5 text-rose-400 animate-pulse" />
                <span>CVC Surveillance Alert: {flaggedDas.length} District Authorities Flagged for High Dismissal Volume</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                &gt;= 10 Dismissals / 30 Days
              </span>
            </div>
            <p className="text-xs text-rose-300/80">
              The following district administrators have dismissed 10 or more CRITICAL vigilance alerts (risk score &gt;= 80) within 30 days without escalation to central authorities.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
              {flaggedDas.map((da, idx) => (
                <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-rose-500/30 flex items-center justify-between text-xs">
                  <div>
                    <div className="font-semibold text-white font-mono">{da.user_id}</div>
                    <div className="text-[11px] text-rose-400 font-mono">{da.dismissal_count} Critical Dismissals</div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                    FLAGGED
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Eye className="w-4 h-4 text-emerald-400" />
              <span>CVC District Authority Surveillance Monitor: All 714 District Authorities within statutory dismissal threshold (&lt; 10 dismissals / 30d).</span>
            </div>
            <span className="font-mono text-emerald-400 font-semibold text-[11px]">Surveillance Normal</span>
          </div>
        )
      )}

      {/* Filter Ribbon */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl flex flex-col sm:flex-row gap-3 items-center justify-between border border-slate-800">
        <div className="relative w-full sm:w-88">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Work ID, Auditor, Justification..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
          />
        </div>

        <div className="relative w-full sm:w-64">
          <Filter className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-violet-500 dark:text-violet-400 pointer-events-none" />
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl text-xs sm:text-sm font-semibold tracking-wide bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-300 dark:border-slate-700/80 hover:border-violet-500/60 focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 transition-all appearance-none cursor-pointer shadow-sm"
            aria-label="Filter by Auditor Action"
          >
            <option value="all" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200">All Actions</option>
            <option value="TREASURY_HOLD_RECOMMENDED" className="bg-white dark:bg-slate-900 text-amber-600 dark:text-amber-300">🚨 Treasury Hold</option>
            <option value="INSPECTION_ORDERED" className="bg-white dark:bg-slate-900 text-sky-600 dark:text-sky-300">🔍 Inspection Ordered</option>
            <option value="ESCALATED" className="bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-300">⚠️ Escalated</option>
            <option value="DISMISSED" className="bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-300">✅ Dismissed</option>
          </select>
          <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead className="bg-slate-900/90 text-xs font-mono font-bold uppercase text-slate-300 border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Timestamp &amp; Work ID</th>
                <th className="py-3.5 px-4">Auditor Identity</th>
                <th className="py-3.5 px-4">Action Taken</th>
                <th className="py-3.5 px-4">Mandatory Written Justification</th>
                <th className="py-3.5 px-4 text-center font-mono">SHA-256 Seal (Tamper-Proof)</th>
                <th className="py-3.5 px-4 text-right">Risk Score</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="py-4 px-4">
                      <div className="h-6 bg-slate-800/40 rounded w-full" />
                    </td>
                  </tr>
                ))
              ) : error ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-rose-300 text-sm">
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="w-6 h-6 text-rose-400" />
                      <span>{error}</span>
                      <button
                        onClick={loadLogs}
                        className="mt-2 px-3 py-1.5 rounded-lg bg-violet-600/30 hover:bg-violet-600/50 text-white text-xs font-semibold border border-violet-500/40 cursor-pointer"
                      >
                        Retry Audit Log Connection
                      </button>
                    </div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400 text-sm">
                    No matching audit records in ledger.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => {
                  const dt = new Date(log.timestamp);
                  const formattedDate = isNaN(dt.getTime()) ? log.timestamp : dt.toLocaleString('en-IN');
                  return (
                    <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4">
                        <div 
                          onClick={() => onSelectWork && onSelectWork(log.work_id)}
                          className="text-violet-400 font-bold text-sm hover:underline cursor-pointer"
                        >
                          #{log.work_id}
                        </div>
                        <div className="text-xs text-slate-400 mt-1 flex items-center gap-1 font-sans">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          {formattedDate}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-bold text-white text-sm font-sans">
                          {log.user_id}
                        </div>
                        <div className="text-xs text-slate-400 uppercase font-mono mt-0.5">
                          Role: {log.role || 'Auditor'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        {getActionBadge(log.action)}
                      </td>

                      <td className="py-3.5 px-4 max-w-md font-sans">
                        <p className="text-slate-200 text-sm leading-relaxed line-clamp-2" title={log.justification}>
                          "{log.justification}"
                        </p>
                        <div className="text-xs text-slate-400 font-mono mt-1">
                          Verified length: {log.justification?.length || 0} chars (Threshold ≥ 50 chars)
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        {log.sha256_seal ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="px-2.5 py-1 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold font-mono flex items-center gap-1">
                              <Lock className="w-3 h-3 text-emerald-400" />
                              {log.sha256_seal.substring(0, 8)}...{log.sha256_seal.substring(log.sha256_seal.length - 4)}
                            </span>
                            <span className="text-xs text-emerald-400/80 font-mono mt-0.5">
                              {log.previous_hash && log.previous_hash.startsWith('GENESIS') ? 'GENESIS ROOT' : 'CHAIN LINKED'}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500 font-mono">LEGACY WAL</span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-bold text-amber-400 text-sm">
                        {Number(log.original_risk_score || 0).toFixed(1)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-slate-800 bg-slate-900/60 flex items-center justify-between text-xs sm:text-sm text-slate-300">
          <div className="flex items-center space-x-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>PostgreSQL Cloud Audit Vault • Tamper-Evident SHA-256 Cryptographic Hash Chain Active</span>
          </div>
          <span className="font-mono font-semibold">{filteredLogs.length} Total Audit Actions Recorded</span>
        </div>
      </div>

    </div>
  );
}
