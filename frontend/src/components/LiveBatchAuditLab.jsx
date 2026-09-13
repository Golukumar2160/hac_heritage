import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Download,
  Play,
  RefreshCw,
  Search,
  Filter,
  Layers,
  Building2,
  TrendingDown,
  Info,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Check,
  Clock,
  Network,
  Cpu,
  FileText,
  X,
  Copy,
  Calendar,
  User,
  MapPin,
  Landmark,
  FileCheck
} from 'lucide-react';
import { api, API_BASE } from '../services/api';

export default function LiveBatchAuditLab({ onSelectWork }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [auditData, setAuditData] = useState(null);
  const [filterTier, setFilterTier] = useState('ALL');
  const [selectedModelFilter, setSelectedModelFilter] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [selectedBatchWork, setSelectedBatchWork] = useState(null);
  const [copiedMemo, setCopiedMemo] = useState(false);
  const fileInputRef = useRef(null);

  // Auto-run demo benchmark on mount if no data exists
  useEffect(() => {
    handleRunBenchmark();
  }, []);

  // Keyboard shortcut: close modal on ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setSelectedBatchWork(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleRunBenchmark = async () => {
    setLoading(true);
    setError(null);
    setSelectedModelFilter(null);
    try {
      const data = await api.runDemoBenchmark();
      setAuditData(data);
      setFile({ name: data.filename || 'MPLADS_Hackathon_Benchmark_Dataset.csv', size: 1420 });
    } catch (err) {
      console.error('Failed to run benchmark:', err);
      setError(err.message || 'Error executing demo benchmark.');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (selectedFile) => {
    if (!selectedFile) return;
    if (!selectedFile.name.toLowerCase().endsWith('.csv')) {
      setError('Please upload a valid CSV file (.csv).');
      return;
    }
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setSelectedModelFilter(null);

    try {
      const data = await api.uploadAuditCsv(selectedFile);
      if (data.success) {
        setAuditData(data);
      } else {
        throw new Error(data.error || 'Failed to process CSV file.');
      }
    } catch (err) {
      console.error('Upload audit error:', err);
      setError(err.message || 'Error evaluating batch audit pipeline.');
    } finally {
      setLoading(false);
    }
  };

  const onDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDownloadSample = () => {
    window.open(api.getSampleCsvUrl(), '_blank');
  };

  const handleExportResults = () => {
    if (!auditData || !auditData.results) return;
    const headers = [
      'Work ID',
      'Title',
      'MP Name',
      'State',
      'Constituency',
      'IDA',
      'Sanction Amount',
      'Disbursed Amount',
      'Vendor Name',
      'Work Status',
      'Sanction Date',
      'Risk Score (/100)',
      'Severity',
      'Layman Reason'
    ];
    const rows = auditData.results.map((r) => [
      `"${r.work_id}"`,
      `"${r.work_title.replace(/"/g, '""')}"`,
      `"${r.mp_name}"`,
      `"${r.state}"`,
      `"${r.constituency}"`,
      `"${r.ida || ''}"`,
      r.sanction_amount,
      r.fund_disbursed,
      `"${r.vendor_name}"`,
      `"${r.work_status}"`,
      `"${r.sanction_date || ''}"`,
      r.risk_score,
      r.severity,
      `"${r.layman_reason.replace(/"/g, '""')}"`
    ]);
    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `MPLADS_Batch_Audit_Report_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyWorkMemo = (work) => {
    if (!work) return;
    const memo = `=====================================================
BHARAT-DRISHTI // NATIONAL AUDIT VIGILANCE REPORT
=====================================================
Work ID:         ${work.work_id}
Project Title:   ${work.work_title}
Hon'ble MP:      ${work.mp_name} (${work.constituency}, ${work.state})
District / IDA:  ${work.ida || 'District Authority'}
Status:          ${work.work_status} | Sanctioned Date: ${work.sanction_date || 'N/A'}
Sanction Amount: ₹${(work.sanction_amount / 100000).toFixed(2)} Lakhs
Fund Disbursed:  ₹${(work.fund_disbursed / 100000).toFixed(2)} Lakhs
Primary Vendor:  ${work.vendor_name}

MULTI-MODEL FORENSIC SYNTHESIS:
-----------------------------------------------------
Composite Risk Score: ${work.risk_score} / 100 [${work.severity}]
Model 1 (Isolation Forest):    ${work.model_breakdown?.isolation_forest || 0}/100
Model 2 (Vendor Syndicate):     ${work.model_breakdown?.vendor_concentration || 0}/100
Model 3 (Statutory Rules):     ${work.model_breakdown?.compliance_rules || 0}/100
Model 4 (Timeline Delay):       ${work.model_breakdown?.timeline_risk || 0}/100

AUDIT FINDING (PLAIN-ENGLISH LAYMAN SUMMARY):
${work.layman_reason}

STATUTORY RECOMMENDATION:
${
  work.severity === 'CRITICAL'
    ? 'Mandatory field verification required. Freeze treasury disbursement immediately under GFR Rule 159.'
    : work.severity === 'HIGH'
    ? 'Issue statutory vigilance inquiry. Require utilization certificate and ground verification photos.'
    : work.severity === 'MEDIUM'
    ? 'Flagged for milestone progress audit. Verify completion timeline with district authority.'
    : 'Compliant routine infrastructure. Cleared for statutory standard auditing.'
}
=====================================================`;

    navigator.clipboard.writeText(memo).then(() => {
      setCopiedMemo(true);
      setTimeout(() => setCopiedMemo(false), 2500);
    });
  };

  // Filtered rows
  const results = auditData?.results || [];
  const kpis = auditData?.kpis || {};
  const modelsSummary = auditData?.models_summary || {};

  const filteredResults = results.filter((item) => {
    // Model summary filter
    if (selectedModelFilter === 'isolation_forest' && (item.model_breakdown?.isolation_forest || 0) < 65) return false;
    if (selectedModelFilter === 'vendor_syndicate' && (item.model_breakdown?.vendor_concentration || 0) < 60) return false;
    if (selectedModelFilter === 'compliance_rules' && (item.model_breakdown?.compliance_rules || 0) < 40) return false;
    if (selectedModelFilter === 'timeline_risk' && (item.model_breakdown?.timeline_risk || 0) < 60) return false;
    if (selectedModelFilter === 'ensemble_scorer' && (item.risk_score || 0) < 60) return false;

    // Severity tier filter
    if (filterTier === 'CRITICAL' && item.severity !== 'CRITICAL') return false;
    if (filterTier === 'HIGH' && item.severity !== 'HIGH') return false;
    if (filterTier === 'MEDIUM' && item.severity !== 'MEDIUM') return false;
    if (filterTier === 'LOW' && item.severity !== 'LOW') return false;

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const wId = String(item.work_id || '').toLowerCase();
      const title = String(item.work_title || '').toLowerCase();
      const mp = String(item.mp_name || '').toLowerCase();
      const state = String(item.state || '').toLowerCase();
      const vendor = String(item.vendor_name || '').toLowerCase();
      const reason = String(item.layman_reason || '').toLowerCase();
      return (
        wId.includes(q) ||
        title.includes(q) ||
        mp.includes(q) ||
        state.includes(q) ||
        vendor.includes(q) ||
        reason.includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-300 pb-12">
      {/* Top Banner & Hero Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/30 uppercase tracking-wider">
              PILOT HACKATHON MODULE // 5-MODEL BATCH AUDIT ENGINE
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display mt-1 tracking-tight flex items-center gap-2">
            <span>Live Batch CSV Audit Lab</span>
            <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 font-mono font-normal">
              Zero-Shot Inference Ready
            </span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-1 max-w-3xl leading-relaxed">
            Upload raw portal CSVs matching the Ministry schema. Every single row is evaluated through all five algorithmic &amp; ML engines, outputting a calibrated 0–100 risk score and clear layman reasons for every project.
          </p>
        </div>

        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={handleRunBenchmark}
            disabled={loading}
            className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-violet-600 hover:bg-violet-500 text-white shadow-md shadow-violet-600/30 transition-all cursor-pointer disabled:opacity-50"
            title="Run Curated Demo Works"
          >
            <Play className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>⚡ Run Instant Benchmark (5 Works)</span>
          </button>

          <button
            onClick={handleDownloadSample}
            className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white border border-slate-200 dark:border-slate-700 transition-all cursor-pointer shadow-xs"
            title="Download CSV Template"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Sample CSV</span>
          </button>
        </div>
      </div>

      {/* Interactive Drag & Drop Uploader */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center relative overflow-hidden group ${
          isDragging
            ? 'border-violet-500 bg-violet-500/10'
            : 'border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/40 hover:border-violet-400 dark:hover:border-violet-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleFileUpload(e.target.files[0]);
            }
          }}
        />

        <div className="flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-violet-500/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400 group-hover:scale-110 transition-transform shadow-xs">
            <UploadCloud className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-bold text-slate-900 dark:text-white">
              {loading
                ? 'Ingesting & Evaluating Multi-Model Pipeline...'
                : file
                ? `Active File: ${file.name} (${file.size ? (file.size / 1024).toFixed(1) + ' KB' : 'Benchmark Data'})`
                : 'Drop any MPLADS CSV file here, or browse from computer'}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Compatible with <code className="text-violet-600 dark:text-violet-400 font-mono">Works Sanctioned.csv</code> and <code className="text-violet-600 dark:text-violet-400 font-mono">Expenditure.csv</code> from Ministry Portal
            </p>
          </div>

          <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-500 dark:text-slate-400">
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Auto-Detect Headers</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">5 ML Models</span>
            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">Plain-English Explanations</span>
          </div>
        </div>

        {loading && (
          <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center space-x-3 text-violet-300 font-mono text-xs">
            <RefreshCw className="w-5 h-5 animate-spin text-violet-400" />
            <span>Executing Isolation Forest, Vendor Cartel, and Compliance Rules...</span>
          </div>
        )}
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-500/40 text-xs text-rose-700 dark:text-rose-300 flex items-center space-x-2">
          <AlertOctagon className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TOP SECTION: CONCISE SUMMARY OF EVERY MODEL (CLICKABLE FILTERS)           */}
      {/* ========================================================================= */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-violet-500" />
            Multi-Model Inference Layer Summary ({Object.keys(modelsSummary).length} Engines)
          </span>
          <div className="flex items-center gap-2">
            {selectedModelFilter && (
              <button
                onClick={() => setSelectedModelFilter(null)}
                className="text-[11px] font-mono text-violet-600 dark:text-violet-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Reset Model Filter</span>
                <X className="w-3 h-3" />
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-500">
              Click any engine to filter works
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Model 1: Isolation Forest */}
          <div
            onClick={() =>
              setSelectedModelFilter((prev) => (prev === 'isolation_forest' ? null : 'isolation_forest'))
            }
            className={`p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2 border ${
              selectedModelFilter === 'isolation_forest'
                ? 'border-violet-500 bg-violet-500/15 ring-2 ring-violet-500/50'
                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-violet-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-violet-600 dark:text-violet-400 font-mono uppercase">
                Model 1 // IFOREST
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {modelsSummary.isolation_forest?.anomalies_detected ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Outliers Caught</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Scans expenditure vs sanction ratio &amp; flags statistical spending deviance.
            </p>
          </div>

          {/* Model 2: Vendor Syndicate */}
          <div
            onClick={() =>
              setSelectedModelFilter((prev) => (prev === 'vendor_syndicate' ? null : 'vendor_syndicate'))
            }
            className={`p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2 border ${
              selectedModelFilter === 'vendor_syndicate'
                ? 'border-amber-500 bg-amber-500/15 ring-2 ring-amber-500/50'
                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-amber-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 font-mono uppercase">
                Model 2 // VENDORS
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {modelsSummary.vendor_syndicate?.anomalies_detected ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Cartels Flagged</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Tracks private contractor monopolies and entity clusters taking &gt;40% spend.
            </p>
          </div>

          {/* Model 3: Compliance Rules Engine */}
          <div
            onClick={() =>
              setSelectedModelFilter((prev) => (prev === 'compliance_rules' ? null : 'compliance_rules'))
            }
            className={`p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2 border ${
              selectedModelFilter === 'compliance_rules'
                ? 'border-rose-500 bg-rose-500/15 ring-2 ring-rose-500/50'
                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-rose-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 font-mono uppercase">
                Model 3 // RULES
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {modelsSummary.compliance_rules?.anomalies_detected ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Rule Breaches</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Unmasks split tenders (&lt; ₹50L threshold evasion) and premature payments.
            </p>
          </div>

          {/* Model 4: Timeline Velocity */}
          <div
            onClick={() =>
              setSelectedModelFilter((prev) => (prev === 'timeline_risk' ? null : 'timeline_risk'))
            }
            className={`p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2 border ${
              selectedModelFilter === 'timeline_risk'
                ? 'border-blue-500 bg-blue-500/15 ring-2 ring-blue-500/50'
                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-blue-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-600 dark:text-blue-400 font-mono uppercase">
                Model 4 // TIMELINE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                ACTIVE
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {modelsSummary.timeline_risk?.anomalies_detected ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">Stalled Works</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Identifies projects stuck in administrative limbo with unspent allocations.
            </p>
          </div>

          {/* Model 5: Weighted Ensemble */}
          <div
            onClick={() =>
              setSelectedModelFilter((prev) => (prev === 'ensemble_scorer' ? null : 'ensemble_scorer'))
            }
            className={`p-3.5 rounded-xl transition-all cursor-pointer shadow-xs space-y-2 border ${
              selectedModelFilter === 'ensemble_scorer'
                ? 'border-emerald-500 bg-emerald-500/15 ring-2 ring-emerald-500/50'
                : 'bg-white dark:bg-slate-900/80 border-slate-200 dark:border-slate-800 hover:border-emerald-400/60'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 font-mono uppercase">
                Model 5 // ENSEMBLE
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                CALIBRATED
              </span>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-lg font-black text-slate-900 dark:text-white font-mono">
                {modelsSummary.ensemble_scorer?.anomalies_detected ?? 0}
              </span>
              <span className="text-[10px] text-slate-500 font-mono">High-Risk Synthesized</span>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
              Synthesizes all 4 signals into calibrated 0–100 score + plain-English text.
            </p>
          </div>
        </div>
      </div>

      {/* Middle Row: Executive Batch Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-7 gap-3">
        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Total Ingested</span>
          <span className="text-xl font-black text-slate-900 dark:text-white font-mono">{kpis.total_works || 0}</span>
          <span className="text-[9px] text-slate-400 block">Works in Batch</span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Avg Risk Score</span>
          <span className="text-xl font-black text-violet-600 dark:text-violet-400 font-mono">
            {kpis.average_risk_score || 0} / 100
          </span>
          <span className="text-[9px] text-slate-400 block">Calibrated Mean</span>
        </div>

        <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-500/30 shadow-xs">
          <span className="text-[10px] text-rose-700 dark:text-rose-300 font-mono block">Critical Severity</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            {kpis.critical_count || 0}
          </span>
          <span className="text-[9px] text-rose-600 dark:text-rose-300 font-mono block">&ge; 75 Risk Score</span>
        </div>

        <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-500/30 shadow-xs">
          <span className="text-[10px] text-amber-700 dark:text-amber-300 font-mono block">High Severity</span>
          <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{kpis.high_count || 0}</span>
          <span className="text-[9px] text-amber-700 dark:text-amber-300 font-mono block">55 - 74 Risk Score</span>
        </div>

        <div className="p-3 rounded-xl bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-500/30 shadow-xs">
          <span className="text-[10px] text-yellow-700 dark:text-yellow-300 font-mono block">Medium Caution</span>
          <span className="text-xl font-black text-yellow-600 dark:text-yellow-400 font-mono">
            {kpis.medium_count || 0}
          </span>
          <span className="text-[9px] text-yellow-700 dark:text-yellow-300 font-mono block">35 - 54 Risk Score</span>
        </div>

        <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-500/30 shadow-xs">
          <span className="text-[10px] text-emerald-700 dark:text-emerald-300 font-mono block">Low / Compliant</span>
          <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{kpis.low_count || 0}</span>
          <span className="text-[9px] text-emerald-700 dark:text-emerald-300 font-mono block">&lt; 35 Clean Works</span>
        </div>

        <div className="p-3 rounded-xl bg-white dark:bg-slate-900/70 border border-slate-200 dark:border-slate-800 shadow-xs">
          <span className="text-[10px] text-slate-500 dark:text-slate-400 font-mono block">Funds at Risk</span>
          <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            ₹{((kpis.flagged_funds_at_risk || 0) / 100000).toFixed(1)} L
          </span>
          <span className="text-[9px] text-slate-400 block">Flagged Outlay</span>
        </div>
      </div>

      {/* Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
        <div className="flex items-center space-x-1.5 flex-wrap gap-y-1.5 text-xs font-mono">
          <button
            onClick={() => setFilterTier('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTier === 'ALL'
                ? 'bg-violet-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            All Works ({results.length})
          </button>
          <button
            onClick={() => setFilterTier('CRITICAL')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTier === 'CRITICAL'
                ? 'bg-rose-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🔴 Critical ({kpis.critical_count || 0})
          </button>
          <button
            onClick={() => setFilterTier('HIGH')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTier === 'HIGH'
                ? 'bg-amber-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🟠 High ({kpis.high_count || 0})
          </button>
          <button
            onClick={() => setFilterTier('MEDIUM')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTier === 'MEDIUM'
                ? 'bg-yellow-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🟡 Medium ({kpis.medium_count || 0})
          </button>
          <button
            onClick={() => setFilterTier('LOW')}
            className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              filterTier === 'LOW'
                ? 'bg-emerald-600 text-white font-bold shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            🟢 Clean ({kpis.low_count || 0})
          </button>
        </div>

        <div className="flex items-center space-x-2">
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search work, MP, state, vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-hidden focus:border-violet-500 font-mono shadow-xs"
            />
          </div>

          <button
            onClick={handleExportResults}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs shrink-0"
            title="Export Results to CSV"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Active Model Filter Banner */}
      {selectedModelFilter && (
        <div className="px-4 py-2.5 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-between text-xs font-mono text-violet-700 dark:text-violet-300 animate-in fade-in">
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-violet-500" />
            <span>
              Filtering by{' '}
              <strong>
                {modelsSummary[selectedModelFilter]?.name || selectedModelFilter}
              </strong>{' '}
              ({filteredResults.length} matching works found)
            </span>
          </div>
          <button
            onClick={() => setSelectedModelFilter(null)}
            className="font-bold underline hover:text-violet-900 dark:hover:text-white cursor-pointer"
          >
            Show All Works
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAIN RESULTS SECTION: ROW-BY-ROW AUDIT CARDS WITH SCORE & LAYMAN REASONS */}
      {/* ========================================================================= */}
      {filteredResults.length === 0 ? (
        <div className="py-16 text-center text-slate-500 dark:text-slate-400 font-mono text-xs">
          No works match the selected filter. Try uploading another CSV or resetting filters.
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredResults.map((work, idx) => {
            const isCrit = work.severity === 'CRITICAL';
            const isHigh = work.severity === 'HIGH';
            const isMed = work.severity === 'MEDIUM';
            const isLow = work.severity === 'LOW';

            const badgeBg = isCrit
              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
              : isHigh
              ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
              : isMed
              ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
              : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40';

            const cardBorder = isCrit
              ? 'border-rose-300 dark:border-rose-500/50 bg-rose-50/30 dark:bg-rose-950/15'
              : isHigh
              ? 'border-amber-300 dark:border-amber-500/50 bg-amber-50/30 dark:bg-amber-950/15'
              : isMed
              ? 'border-yellow-300 dark:border-yellow-500/50 bg-yellow-50/30 dark:bg-yellow-950/15'
              : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70';

            return (
              <div
                key={idx}
                className={`p-4 sm:p-5 rounded-2xl border transition-all shadow-xs hover:shadow-md ${cardBorder}`}
              >
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                  {/* Left Column: Metadata & Work Details */}
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                        WORK #{work.work_id}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                        {work.mp_name}
                      </span>
                      <span className="text-slate-300 dark:text-slate-600">&bull;</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                        {work.constituency}, {work.state}
                      </span>
                    </div>

                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {work.work_title}
                    </h4>

                    <div className="flex items-center space-x-4 text-xs font-mono text-slate-500 dark:text-slate-400 pt-1 flex-wrap gap-y-1">
                      <span>
                        Sanction:{' '}
                        <strong className="text-slate-900 dark:text-white">
                          ₹{(work.sanction_amount / 100000).toFixed(2)}L
                        </strong>
                      </span>
                      <span>
                        Disbursed:{' '}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          ₹{(work.fund_disbursed / 100000).toFixed(2)}L
                        </strong>
                      </span>
                      <span>
                        Vendor:{' '}
                        <strong className="text-slate-700 dark:text-slate-300">
                          {work.vendor_name}
                        </strong>
                      </span>
                      <span className="hidden sm:inline">
                        Status: <em>{work.work_status}</em>
                      </span>
                    </div>
                  </div>

                  {/* Right Column: Score & Severity Badge */}
                  <div className="flex items-center md:flex-col md:items-end justify-between gap-2 shrink-0">
                    <div className="flex items-center space-x-2">
                      <div className="text-right">
                        <span className="text-[10px] text-slate-400 font-mono uppercase block">Risk Score</span>
                        <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                          {work.risk_score} <span className="text-xs text-slate-400">/ 100</span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-xl text-xs font-black font-mono border ${badgeBg}`}>
                        {work.severity}
                      </span>
                    </div>

                    {/* Open Built-in Work Dossier Modal */}
                    <button
                      onClick={() => setSelectedBatchWork(work)}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-violet-600 hover:text-white text-slate-700 dark:text-slate-300 text-[11px] font-mono transition-colors cursor-pointer flex items-center gap-1 shadow-xs"
                      title="Inspect Multi-Model Dossier"
                    >
                      <span>View Dossier</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Layman Reason Callout Box (For Common Man) */}
                <div
                  className={`mt-3 p-3 rounded-xl border text-xs font-sans leading-relaxed ${
                    isCrit
                      ? 'bg-rose-100/50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-500/30 text-rose-900 dark:text-rose-200'
                      : isHigh
                      ? 'bg-amber-100/50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-500/30 text-amber-900 dark:text-amber-200'
                      : isMed
                      ? 'bg-yellow-100/50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-500/30 text-yellow-900 dark:text-yellow-200'
                      : 'bg-emerald-100/50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 mb-0.5">
                    {isCrit && <AlertOctagon className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400 shrink-0" />}
                    {isHigh && <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />}
                    {isMed && <Info className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400 shrink-0" />}
                    {isLow && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />}
                    <span>Audit Finding &amp; Layman Reason:</span>
                  </div>
                  <p>{work.layman_reason}</p>
                </div>

                {/* Model Breakdown Mini-Pills */}
                {work.model_breakdown && (
                  <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center space-x-2 flex-wrap gap-y-1 text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    <span className="font-bold uppercase">Model Signals:</span>
                    <span
                      onClick={() =>
                        setSelectedModelFilter((prev) =>
                          prev === 'isolation_forest' ? null : 'isolation_forest'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-violet-500 cursor-pointer"
                    >
                      IForest Anomaly: <strong>{work.model_breakdown.isolation_forest}/100</strong>
                    </span>
                    <span
                      onClick={() =>
                        setSelectedModelFilter((prev) =>
                          prev === 'vendor_syndicate' ? null : 'vendor_syndicate'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-amber-500 cursor-pointer"
                    >
                      Vendor Syndicate: <strong>{work.model_breakdown.vendor_concentration}/100</strong>
                    </span>
                    <span
                      onClick={() =>
                        setSelectedModelFilter((prev) =>
                          prev === 'compliance_rules' ? null : 'compliance_rules'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-rose-500 cursor-pointer"
                    >
                      Compliance Rules: <strong>{work.model_breakdown.compliance_rules}/100</strong>
                    </span>
                    <span
                      onClick={() =>
                        setSelectedModelFilter((prev) =>
                          prev === 'timeline_risk' ? null : 'timeline_risk'
                        )
                      }
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-blue-500 cursor-pointer"
                    >
                      Timeline Delay: <strong>{work.model_breakdown.timeline_risk}/100</strong>
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* WORK AUDIT DOSSIER MODAL (STANDALONE / 100% RELIABLE FOR ANY UPLOADED CSV) */}
      {/* ========================================================================= */}
      {selectedBatchWork && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-y-auto flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="sticky top-0 z-20 px-6 py-4 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-violet-600/15 border border-violet-500/30 flex items-center justify-center text-violet-600 dark:text-violet-400">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-mono font-bold text-violet-600 dark:text-violet-400">
                      CASE DOSSIER #{selectedBatchWork.work_id}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-black font-mono border ${
                        selectedBatchWork.severity === 'CRITICAL'
                          ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40'
                          : selectedBatchWork.severity === 'HIGH'
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40'
                          : selectedBatchWork.severity === 'MEDIUM'
                          ? 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/40'
                          : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/40'
                      }`}
                    >
                      {selectedBatchWork.severity} RISK
                    </span>
                  </div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white font-display line-clamp-1">
                    {selectedBatchWork.work_title}
                  </h3>
                </div>
              </div>

              <button
                onClick={() => setSelectedBatchWork(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                title="Close Dossier"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 flex-1">
              {/* Top Banner: Composite Score & Layman Reason */}
              <div
                className={`p-5 rounded-2xl border ${
                  selectedBatchWork.severity === 'CRITICAL'
                    ? 'bg-rose-50/50 dark:bg-rose-950/25 border-rose-200 dark:border-rose-500/40'
                    : selectedBatchWork.severity === 'HIGH'
                    ? 'bg-amber-50/50 dark:bg-amber-950/25 border-amber-200 dark:border-amber-500/40'
                    : selectedBatchWork.severity === 'MEDIUM'
                    ? 'bg-yellow-50/50 dark:bg-yellow-950/25 border-yellow-200 dark:border-yellow-500/40'
                    : 'bg-emerald-50/50 dark:bg-emerald-950/25 border-emerald-200 dark:border-emerald-500/40'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[11px] font-mono uppercase font-bold text-slate-500 dark:text-slate-400 block">
                      Weighted Triangulation Risk Assessment
                    </span>
                    <div className="flex items-baseline space-x-2 mt-0.5">
                      <span className="text-3xl font-black font-mono text-slate-900 dark:text-white">
                        {selectedBatchWork.risk_score}
                      </span>
                      <span className="text-sm font-mono text-slate-400">/ 100</span>
                      <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-black/10 dark:bg-white/10">
                        {selectedBatchWork.severity} TIER
                      </span>
                    </div>
                  </div>

                  <div className="text-left sm:text-right text-xs font-mono text-slate-500 dark:text-slate-400">
                    <div>Status: <strong className="text-slate-800 dark:text-slate-200">{selectedBatchWork.work_status}</strong></div>
                    <div>Sanctioned: <strong className="text-slate-800 dark:text-slate-200">{selectedBatchWork.sanction_date || 'Portal Verified'}</strong></div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-800/60">
                  <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    {selectedBatchWork.layman_reason}
                  </p>
                </div>
              </div>

              {/* Administrative & Financial Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Administrative Metadata */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-violet-500" />
                    Administrative Particulars
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">Hon'ble MP:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedBatchWork.mp_name}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">Constituency:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedBatchWork.constituency}, {selectedBatchWork.state}
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">District Authority (IDA):</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedBatchWork.ida || 'District Magistrate'}
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Executing Contractor:</span>
                      <span className="font-semibold text-slate-900 dark:text-white text-right">
                        {selectedBatchWork.vendor_name}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Financial Ledger */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Landmark className="w-3.5 h-3.5 text-emerald-500" />
                    Financial Outlay &amp; Release
                  </span>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">Sanctioned Budget:</span>
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{(selectedBatchWork.sanction_amount / 100000).toFixed(2)} Lakhs (₹{selectedBatchWork.sanction_amount?.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">Treasury Disbursed:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400">
                        ₹{(selectedBatchWork.fund_disbursed / 100000).toFixed(2)} Lakhs (₹{selectedBatchWork.fund_disbursed?.toLocaleString('en-IN')})
                      </span>
                    </div>

                    <div className="flex justify-between py-1 border-b border-slate-200/50 dark:border-slate-700/50">
                      <span className="text-slate-500 dark:text-slate-400">Disbursement Ratio:</span>
                      <span className="font-bold text-slate-900 dark:text-white font-mono">
                        {((selectedBatchWork.fund_disbursed / Math.max(selectedBatchWork.sanction_amount, 1)) * 100).toFixed(1)}%
                      </span>
                    </div>

                    <div className="flex justify-between py-1">
                      <span className="text-slate-500 dark:text-slate-400">Overrun / Threshold Flag:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400">
                        {selectedBatchWork.fund_disbursed > selectedBatchWork.sanction_amount
                          ? `+₹${((selectedBatchWork.fund_disbursed - selectedBatchWork.sanction_amount) / 100000).toFixed(2)}L Overrun`
                          : selectedBatchWork.sanction_amount >= 4800000 && selectedBatchWork.sanction_amount < 5000000
                          ? 'Split Tender (< ₹50L)'
                          : 'Within Approved Budget'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 5-Model Multi-Layer Forensic Signal Matrix */}
              <div className="space-y-3">
                <span className="text-xs font-mono font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-violet-500" />
                  5-Engine Signal Decomposition Matrix
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {/* Model 1 Signal */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-violet-600 dark:text-violet-400">M1: IFOREST</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedBatchWork.model_breakdown?.isolation_forest || 0}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-violet-500 h-full rounded-full"
                        style={{ width: `${selectedBatchWork.model_breakdown?.isolation_forest || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Statistical expenditure deviance vs reported physical progress.
                    </p>
                  </div>

                  {/* Model 2 Signal */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-amber-600 dark:text-amber-400">M2: CARTELS</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedBatchWork.model_breakdown?.vendor_concentration || 0}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${selectedBatchWork.model_breakdown?.vendor_concentration || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Vendor concentration share &amp; single-contractor cluster risk.
                    </p>
                  </div>

                  {/* Model 3 Signal */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-rose-600 dark:text-rose-400">M3: STATUTORY</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedBatchWork.model_breakdown?.compliance_rules || 0}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-rose-500 h-full rounded-full"
                        style={{ width: `${selectedBatchWork.model_breakdown?.compliance_rules || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Compliance violation: Split tenders or premature milestone payout.
                    </p>
                  </div>

                  {/* Model 4 Signal */}
                  <div className="p-3.5 rounded-xl bg-white dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800 space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] font-mono">
                      <span className="font-bold text-blue-600 dark:text-blue-400">M4: TIMELINE</span>
                      <span className="font-black text-slate-900 dark:text-white">
                        {selectedBatchWork.model_breakdown?.timeline_risk || 0}/100
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-500 h-full rounded-full"
                        style={{ width: `${selectedBatchWork.model_breakdown?.timeline_risk || 0}%` }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                      Execution velocity gap &amp; stalled capital allocation risk.
                    </p>
                  </div>
                </div>
              </div>

              {/* Statutory Action Recommendation */}
              <div className="p-4 rounded-2xl bg-violet-500/10 border border-violet-500/25 flex items-start space-x-3 text-xs">
                <ShieldAlert className="w-5 h-5 text-violet-600 dark:text-violet-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <strong className="text-violet-900 dark:text-violet-200 font-bold block">
                    Statutory Auditor Recommended Action:
                  </strong>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {selectedBatchWork.severity === 'CRITICAL'
                      ? 'GFR Rule 159 Enforcement Required: Dispatch district vigilance inspection officer to photograph physical works. Freeze subsequent milestone disbursement until technical engineer certificate is uploaded.'
                      : selectedBatchWork.severity === 'HIGH'
                      ? 'Issue Formal Audit Notice: Request contractor tax invoice, physical measurement book (MB) entry, and stage-completion geo-tagged photos from the District Authority.'
                      : selectedBatchWork.severity === 'MEDIUM'
                      ? 'Routine Progress Review: Reconcile expenditure portal records with actual physical ground status at the next quarterly district review.'
                      : 'Statutory Standard Clearance: Project aligns with public procurement norms. Verified milestone disbursement meets guidelines.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Footer Controls */}
            <div className="sticky bottom-0 px-6 py-4 bg-slate-50 dark:bg-slate-950/80 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
              <button
                onClick={() => copyWorkMemo(selectedBatchWork)}
                className="flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-mono font-bold transition-all cursor-pointer shadow-sm"
              >
                {copiedMemo ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedMemo ? 'Copied Case Memo!' : 'Copy Case File Memo'}</span>
              </button>

              <button
                onClick={() => setSelectedBatchWork(null)}
                className="px-4 py-2 rounded-xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700 transition-colors cursor-pointer shadow-xs"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
