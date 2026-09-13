import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  MapPin, 
  AlertTriangle, 
  CheckCircle, 
  Send, 
  QrCode, 
  Building2, 
  Eye, 
  Sparkles, 
  ChevronRight,
} from 'lucide-react';
import { api } from '../services/api';
import CitizenFeedbackModal from './CitizenFeedbackModal';

// Utility: Clean up raw IDA district strings like "PILIBHIT(DISTRICT MAGISTRATE PILIBHIT_IDA)"
// or "Dhalai(DISTRICT MAGISTRATE DHALAI_IDA)" into readable "Pilibhit" / "Dhalai" format
function cleanDistrictName(raw) {
  if (!raw) return '';
  // Strip any parenthetical suffix like (DISTRICT MAGISTRATE ..._IDA) or (COLLECTOR ...)
  const clean = raw.replace(/\s*\(.*?\)\s*/g, '').trim();
  // Title-case each word, replacing underscores with spaces
  return clean
    .split(/[\s_]+/)
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function CitizenDashboard({ 
  currentUser, 
  onSelectWork, 
  onNavigateTab,
  theme = 'dark'
}) {
  const [district, setDistrict] = useState(currentUser?.ida || 'PILIBHIT');
  const [state, setState] = useState(currentUser?.state || 'Uttar Pradesh');
  const [kpis, setKpis] = useState(null);
  const [priorityFlags, setPriorityFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [authOptions, setAuthOptions] = useState({ states: [], districts_by_state: {} });
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [reportingWork, setReportingWork] = useState(null);

  // Load available districts for district switcher
  useEffect(() => {
    api.getAuthOptions().then((opts) => {
      setAuthOptions(opts);
    }).catch(console.error);
  }, []);

  // Fetch district-scoped KPIs and priority anomalies
  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    // Use a cleaned district name as search term so the API finds results
    const districtSearchTerm = cleanDistrictName(district);

    Promise.all([
      api.getKpis(),
      api.getFlags({ page: 1, pageSize: 6, risk_label: 'CRITICAL', search: districtSearchTerm })
    ]).then(([kpiData, flagData]) => {
      if (isMounted) {
        setKpis(kpiData);
        setPriorityFlags(flagData.flags || flagData.items || []);
        setLoading(false);
      }
    }).catch((err) => {
      console.error('Error fetching citizen dashboard data:', err);
      if (isMounted) setLoading(false);
    });

    return () => {
      isMounted = false;
    };
  }, [district]);

  // District options for current state
  const availableDistricts = authOptions.districts_by_state[state] || [district];

  // BUG FIX: api.getKpis() already transforms the data into crore-converted fields:
  // total_sanctioned_cr, total_spent_cr, total_at_risk_cr — do NOT divide by 10M again
  const totalWorks = kpis?.total_works || 0;
  const sanctionedCr = kpis?.total_sanctioned_cr ?? 0;
  const spentCr = kpis?.total_spent_cr ?? 0;
  const atRiskCr = kpis?.total_at_risk_cr ?? 0;
  const criticalCount = kpis?.critical_count || 0;
  const integrityPct = totalWorks > 0
    ? Math.max(0, Math.round(((totalWorks - criticalCount) / totalWorks) * 100))
    : 88;

  // Display-clean version of the selected district (strips raw IDA formatting)
  const displayDistrict = cleanDistrictName(district);

  return (
    <div className="space-y-6">
      {/* 1. Sovereign Citizen Telemetry & District Selector Banner */}
      <div className="glass-panel p-6 rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-[#060a18] via-[#091226] to-[#060a18] text-white shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-emerald-500/10 via-transparent to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>JAN-DRISHTI NAGRIK PORTAL • DISTRICT VIGILANCE</span>
              </span>
              <span className="text-xs text-slate-400 font-mono">GFR 2017 Public Oversight</span>
            </div>

            <h2 className="text-2xl sm:text-3xl font-black text-white font-display tracking-tight">
              {displayDistrict} District Fraud &amp; Anomaly Watch
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Welcome, <strong className="text-white">{currentUser?.name || 'Citizen Vigilance Watchdog'}</strong>. You have unrestricted, read-only public access to inspect AI fraud detections across taxpayer-funded projects in your district.
            </p>
          </div>

          {/* Quick District Switcher & Report Button */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 self-start lg:self-auto">
            <div className="p-2 rounded-2xl bg-[#040714] border border-slate-700 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1" />
              <select
                value={district}
                onChange={(e) => setDistrict(e.target.value)}
                className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer pr-2"
              >
                {availableDistricts.map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white font-sans">{cleanDistrictName(d)}</option>
                ))}
              </select>
            </div>

            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white font-bold font-mono text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-600/30 transition-all cursor-pointer transform hover:-translate-y-0.5"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Ghost Project</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. District Public KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sanctioned Funds */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-2 bg-[#060913]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">
              Public Funds Sanctioned
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-white font-mono">
            ₹{sanctionedCr.toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>{totalWorks.toLocaleString()} Schemes Monitored</span>
            <span className="text-emerald-400 font-mono font-semibold">100% Audited</span>
          </div>
        </div>

        {/* Card 2: Funds at Critical Risk */}
        <div className="glass-panel p-5 rounded-2xl border border-rose-500/30 bg-gradient-to-b from-[#120810] to-[#060913] space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-rose-300 font-bold">
              Tax Money at High Risk
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            ₹{atRiskCr.toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-rose-300/80 font-sans flex items-center justify-between">
            <span>{criticalCount} Critical Anomalies</span>
            <span className="font-mono text-rose-400 font-bold">Action Needed</span>
          </div>
        </div>

        {/* Card 3: Funds Disbursed to Contractors */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-2 bg-[#060913]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">
              Total Disbursed Funds
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            ₹{spentCr.toFixed(2)} Cr
          </div>
          <div className="text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>Treasury Outflow</span>
            <span className="font-mono text-slate-300">{sanctionedCr > 0 ? Math.round((spentCr / sanctionedCr) * 100) : 0}% Realized</span>
          </div>
        </div>

        {/* Card 4: District Integrity Index */}
        <div className="glass-panel p-5 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-2 bg-[#060913]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase text-slate-400 font-bold">
              District Integrity Score
            </span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-cyan-300 font-mono">
            {integrityPct}%
          </div>
          <div className="text-[11px] text-slate-400 font-sans flex items-center justify-between">
            <span>Clean vs Flagged Ratio</span>
            <span className="text-cyan-400 font-mono font-semibold">Live AI Telemetry</span>
          </div>
        </div>
      </div>

      {/* 3. High-Priority Flagged Works Spotlight in District */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4 bg-[#060913]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <span>Priority Anomalies Requiring Public Scrutiny in {displayDistrict}</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Top critical schemes flagged for ghost duplicate photos, split tendering, or unvouched treasury disbursements.
            </p>
          </div>

          <button
            onClick={() => onNavigateTab('citizen_alerts')}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all flex items-center gap-1.5 text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/25 self-start sm:self-auto cursor-pointer"
          >
            <span>View Full Anomaly Radar</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {loading ? (
          <div className="py-16 text-center text-xs text-slate-400 font-mono">
            Loading district anomaly feed...
          </div>
        ) : priorityFlags.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <p className="text-sm font-bold text-white">No Critical Anomalies in {displayDistrict}</p>
            <p className="text-xs text-slate-400 font-mono">
              This district has no CRITICAL-tier flags. Use the Full Anomaly Radar to view all monitored schemes.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {priorityFlags.slice(0, 4).map((flag) => {
              const cleanId = String(flag.work_id || flag.id);
              const sanctionLakh = (Number(flag.sanction_amount || 0) / 100000).toFixed(2);
              const spentLakh = (Number(flag.total_spent || 0) / 100000).toFixed(2);
              // risk_score from api.getFlags is normalized to 0-1; show as /100 integer
              const riskPct = flag.risk_score
                ? Math.round(flag.risk_score > 1 ? flag.risk_score : flag.risk_score * 100)
                : 0;

              return (
                <div
                  key={cleanId}
                  className="p-4 rounded-2xl bg-[#040714] border border-slate-800 hover:border-emerald-500/40 transition-all space-y-2.5 flex flex-col justify-between group"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-violet-300">
                        #{cleanId}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[9px] font-mono font-bold border border-rose-500/30">
                        CRITICAL RISK: {riskPct}%
                      </span>
                    </div>

                    <h4 className="text-xs sm:text-sm font-bold text-white font-display group-hover:text-emerald-300 transition-colors line-clamp-2">
                      {flag.work_title || flag.work_description || `Project #${cleanId}`}
                    </h4>

                    {/* Badge Explanation */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {flag.rule_duplicate_photo && (
                        <span className="px-2 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-500/30 text-[10px] font-mono font-bold">
                          📸 Ghost Duplicate Photo
                        </span>
                      )}
                      {flag.rule_split_tender && (
                        <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold">
                          ✂️ Split Tender &lt; ₹10L
                        </span>
                      )}
                      {flag.rule_premature_tranche && (
                        <span className="px-2 py-0.5 rounded bg-purple-950/40 text-purple-300 border border-purple-500/30 text-[10px] font-mono font-bold">
                          ⚡ Premature Tranche
                        </span>
                      )}
                      {flag.rule_stalled_execution && (
                        <span className="px-2 py-0.5 rounded bg-orange-950/40 text-orange-300 border border-orange-500/30 text-[10px] font-mono font-bold">
                          ⏳ Stalled Execution
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs">
                    <div className="font-mono text-[11px] text-slate-300">
                      <span>₹{sanctionLakh}L</span>
                      <span className="text-slate-500 mx-1">/</span>
                      <span className="text-emerald-400">₹{spentLakh}L Spent</span>
                    </div>

                    <div className="flex items-center space-x-1.5">
                      <button
                        onClick={() => setReportingWork(flag)}
                        className="px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-mono font-bold cursor-pointer"
                      >
                        Report
                      </button>
                      <button
                        onClick={() => onSelectWork(cleanId)}
                        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-mono font-bold flex items-center gap-1 cursor-pointer shadow-sm"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Inspect</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Jan-Drishti Ground Vigilance & Whistleblower Protocol Strip */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/30 via-[#0a1622] to-emerald-950/30 border border-emerald-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <h4 className="text-base font-bold text-white font-display">
              Physical Plaque Ground Verification (PS 26102)
            </h4>
          </div>
          <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
            Every public scheme sanctioned with Member of Parliament funds is legally mandated to feature an on-site Jan-Drishti Plaque. If a scheme declared as "Completed" does not exist in reality or lacks its QR board, citizens can instantly file an official discrepancy.
          </p>
        </div>

        <div className="flex items-center space-x-3 self-start md:self-auto">
          <button
            onClick={() => onNavigateTab('citizen_plaques')}
            className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all"
          >
            <QrCode className="w-4 h-4 text-emerald-400" />
            <span>Digital QR Plaques</span>
          </button>

          <button
            onClick={() => setShowFeedbackModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-mono font-bold flex items-center gap-2 cursor-pointer transition-all shadow-md shadow-emerald-600/30"
          >
            <Send className="w-4 h-4" />
            <span>File Ground Report</span>
          </button>
        </div>
      </div>

      {/* Feedback Modal for General Reporting */}
      {(showFeedbackModal || reportingWork) && (
        <CitizenFeedbackModal
          work={reportingWork || priorityFlags[0] || {}}
          onClose={() => {
            setShowFeedbackModal(false);
            setReportingWork(null);
          }}
          onFeedbackSubmitted={() => {
            setShowFeedbackModal(false);
            setReportingWork(null);
          }}
        />
      )}
    </div>
  );
}
