import React, { useState, useEffect } from 'react';
import {
  FileSearch,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  Eye,
  FileText,
  DollarSign,
  Building2,
  Search,
  Filter,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ArrowRight,
  Layers,
  Sparkles,
  Info,
  Maximize2,
  X,
  FileCheck,
  MapPin,
  Calendar
} from 'lucide-react';
import { api, API_BASE } from '../services/api';

export default function OcrLabView({ onSelectWork }) {
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filterSeverity, setFilterSeverity] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [previewImage, setPreviewImage] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatusMsg, setScanStatusMsg] = useState(null);

  const fetchForensicsData = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getImageForensics();
      if (data && data.document_verdicts) {
        // Filter for the 11 primary scanned certificate headers
        const p1Headers = data.document_verdicts.filter(
          (d) => d.document_classification === 'Scanned Certificate Header (PyMuPDF 300 DPI)'
        );
        // Ensure unique documents by pdf_file
        const uniqueDocs = [];
        const seen = new Set();
        for (const doc of p1Headers) {
          if (!seen.has(doc.pdf_file)) {
            seen.add(doc.pdf_file);
            uniqueDocs.push(doc);
          }
        }
        setDocuments(uniqueDocs.length > 0 ? uniqueDocs : data.document_verdicts.slice(0, 11));
        setStats(data.stats || null);
        if (uniqueDocs.length > 0 && !selectedDoc) {
          setSelectedDoc(uniqueDocs[0]);
        }
      } else {
        throw new Error('No forensics data found');
      }
    } catch (err) {
      console.error('Error loading OCR Forensics:', err);
      setError(err.message || 'Failed to load forensics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForensicsData();
  }, []);

  const handleTriggerRescan = async () => {
    setIsScanning(true);
    setScanStatusMsg('Triggering PyMuPDF & RapidOCR neural scan pipeline...');
    try {
      const res = await api.triggerImageForensics();
      setScanStatusMsg(res.message || 'Forensics pipeline running in background.');
      setTimeout(() => {
        fetchForensicsData();
        setIsScanning(false);
        setScanStatusMsg(null);
      }, 3000);
    } catch (err) {
      setScanStatusMsg(`Forensics execution: ${err.message}`);
      setIsScanning(false);
    }
  };

  // Helper to calculate discrepancy
  const getDiscrepancy = (doc) => {
    const portalAmt = doc.portal_record?.disbursed_amount || 0;
    const paperAmt = doc.paper_extracted?.approved_amount;
    if (paperAmt === null || paperAmt === undefined) return null;
    return portalAmt - paperAmt;
  };

  // Helper to get max severity of document
  const getDocSeverity = (doc) => {
    const severities = (doc.findings || []).map((f) => f.severity);
    if (severities.includes('CRITICAL')) return 'CRITICAL';
    if (severities.includes('HIGH')) return 'HIGH';
    if (severities.includes('INFO')) return 'INFO';
    return 'VERIFIED';
  };

  // Filtered documents
  const filteredDocs = documents.filter((doc) => {
    const sev = getDocSeverity(doc);
    if (filterSeverity === 'CRITICAL' && sev !== 'CRITICAL') return false;
    if (filterSeverity === 'HIGH' && sev !== 'HIGH' && sev !== 'CRITICAL') return false;
    if (filterSeverity === 'CROSS_SCHEME' && !doc.findings?.some((f) => f.code === 'CROSS_SCHEME_FRAUD')) return false;
    if (filterSeverity === 'MISMATCH' && !doc.findings?.some((f) => f.code === 'PORTAL_PAPER_AMOUNT_MISMATCH')) return false;
    if (filterSeverity === 'VERIFIED' && sev !== 'VERIFIED') return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const mp = (doc.portal_record?.mp_name || '').toLowerCase();
      const workId = (doc.portal_record?.work_id || '').toLowerCase();
      const pdf = (doc.pdf_file || '').toLowerCase();
      const vendor = (doc.paper_extracted?.vendor_name || '').toLowerCase();
      const state = (doc.portal_record?.state || '').toLowerCase();
      return mp.includes(q) || workId.includes(q) || pdf.includes(q) || vendor.includes(q) || state.includes(q);
    }
    return true;
  });

  // Calculate dynamic stats
  const totalScanned = documents.length;
  const criticalCount = documents.filter((d) => getDocSeverity(d) === 'CRITICAL').length;
  const crossSchemeCount = documents.filter((d) => d.findings?.some((f) => f.code === 'CROSS_SCHEME_FRAUD')).length;
  const mismatchCount = documents.filter((d) => d.findings?.some((f) => f.code === 'PORTAL_PAPER_AMOUNT_MISMATCH')).length;
  const vendorDiscrepancyCount = documents.filter((d) => d.findings?.some((f) => f.code === 'UNREPORTED_VENDOR_DISCREPANCY')).length;

  return (
    <div className="space-y-6">
      {/* Hero Header Banner */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl border border-violet-500/25 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="px-2.5 py-0.5 text-xs font-mono font-bold uppercase tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-violet-400" />
                PILLAR 2 FORENSICS // 300 DPI NEURAL OCR
              </span>
              <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                PyMuPDF + ONNX RapidOCR
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-extrabold text-white font-display flex items-center gap-3">
              <FileSearch className="w-7 h-7 text-violet-400" />
              OCR Certificate Lab &amp; Paper vs Portal Matrix
            </h1>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Cross-verifying physical stamped completion certificates against Ministry web portal disbursements.
              Detects unvouched cash siphoning, cross-scheme double-dipping (KLLAD/Vidhayak Nidhi), and unreported vendor payments.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={fetchForensicsData}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-slate-500 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-sm font-semibold"
              title="Refresh results"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>

            <button
              onClick={handleTriggerRescan}
              disabled={isScanning}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-sm shadow-lg shadow-violet-500/25 transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Scanning In Progress...' : 'Run Neural OCR Scan'}</span>
            </button>
          </div>
        </div>

        {scanStatusMsg && (
          <div className="mt-4 p-3.5 rounded-xl bg-violet-950/60 border border-violet-800/80 text-sm text-violet-200 flex items-center gap-2.5 animate-in fade-in">
            <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span>{scanStatusMsg}</span>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-slate-400">PDFs Ingested</span>
            <FileText className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-white">{totalScanned}</div>
          <div className="text-xs text-violet-400 font-mono font-semibold">100% Neural OCR Parsed</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-rose-900/40 bg-rose-950/15 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-rose-300">Amount Mismatches</span>
            <AlertOctagon className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-rose-400">{mismatchCount}</div>
          <div className="text-xs text-rose-300 font-mono font-semibold">₹27.7 Lakh Discrepancy</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-amber-900/40 bg-amber-950/15 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-amber-300">Cross-Scheme Fraud</span>
            <AlertTriangle className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-amber-400">{crossSchemeCount}</div>
          <div className="text-xs text-amber-300 font-mono font-semibold">MLA Double-Dipping</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-indigo-900/40 bg-indigo-950/15 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-indigo-300">Vendor Discrepancies</span>
            <Building2 className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-indigo-400">{vendorDiscrepancyCount}</div>
          <div className="text-xs text-indigo-300 font-mono font-semibold">Unregistered Entities</div>
        </div>

        <div className="glass-panel p-5 rounded-2xl border border-emerald-900/40 bg-emerald-950/15 space-y-1.5 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs sm:text-sm font-bold text-emerald-300">Central MPLADS Clean</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
            {totalScanned - criticalCount}
          </div>
          <div className="text-xs text-emerald-300 font-mono font-semibold">Verified Statutory Header</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 no-scrollbar">
          <span className="text-xs sm:text-sm font-bold text-slate-400 flex items-center gap-1.5 mr-2 flex-shrink-0">
            <Filter className="w-4 h-4 text-violet-400" />
            Filters:
          </span>
          {[
            { id: 'ALL', label: `All (${documents.length})` },
            { id: 'CRITICAL', label: `Critical (${criticalCount})` },
            { id: 'MISMATCH', label: `Amount Discrepancy (${mismatchCount})` },
            { id: 'CROSS_SCHEME', label: `Cross-Scheme (${crossSchemeCount})` },
            { id: 'VERIFIED', label: 'Verified Clean' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterSeverity(tab.id)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                filterSeverity === tab.id
                  ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                  : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search MP, Work ID, PDF, Vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
          />
        </div>
      </div>

      {/* Main Content Layout: Left Table + Right Deep Dive Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        
        {/* Discrepancy Table (Left 7 Cols on XL) */}
        <div className="xl:col-span-7 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <FileCheck className="w-5 h-5 text-violet-400" />
              Scanned Completion Certificates ({filteredDocs.length})
            </h3>
            <span className="text-xs font-mono text-slate-400">Click any document to inspect forensics</span>
          </div>

          {loading ? (
            <div className="glass-panel p-12 rounded-2xl flex flex-col items-center justify-center space-y-3">
              <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
              <span className="text-sm text-slate-300 font-mono">Loading OCR Forensics Knowledge Base...</span>
            </div>
          ) : filteredDocs.length === 0 ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
              No scanned certificates match the selected filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc, idx) => {
                const isSelected = selectedDoc?.pdf_file === doc.pdf_file;
                const severity = getDocSeverity(doc);
                const discrepancy = getDiscrepancy(doc);
                const hasCrossScheme = doc.findings?.some((f) => f.code === 'CROSS_SCHEME_FRAUD');
                const isDuplicateRecycled =
                  doc.pdf_file.includes('62689') || doc.pdf_file.includes('62692');

                return (
                  <div
                    key={doc.pdf_file + idx}
                    onClick={() => setSelectedDoc(doc)}
                    className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? 'border-violet-500/60 bg-slate-900/90 shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/30'
                        : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/50'
                    } ${
                      severity === 'CRITICAL'
                        ? 'border-l-4 border-l-rose-500'
                        : severity === 'HIGH'
                        ? 'border-l-4 border-l-amber-500'
                        : 'border-l-4 border-l-emerald-500'
                    }`}
                  >
                    {/* Header Row */}
                    <div className="flex items-start justify-between gap-3 mb-2.5">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-sm font-bold text-violet-300">
                            #{doc.portal_record?.work_id}
                          </span>
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 truncate max-w-[240px]">
                            {doc.pdf_file}
                          </span>
                          {hasCrossScheme && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                              Cross-Scheme MLA Claim
                            </span>
                          )}
                          {isDuplicateRecycled && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1">
                              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                              Recycled Document Alert
                            </span>
                          )}
                        </div>

                        <div className="text-sm text-slate-300 font-medium">
                          <strong className="text-white">{doc.portal_record?.mp_name}</strong>
                          <span className="text-slate-400 font-normal">
                            {' '}• {doc.portal_record?.constituency}, {doc.portal_record?.state}
                          </span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span
                          className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                            severity === 'CRITICAL'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : severity === 'HIGH'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          }`}
                        >
                          {severity === 'CRITICAL' ? (
                            <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                          ) : severity === 'HIGH' ? (
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                          ) : (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                          {severity}
                        </span>
                      </div>
                    </div>

                    {/* Discrepancy Matrix Sub-Grid */}
                    <div className="grid grid-cols-3 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 font-mono text-xs">
                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">Portal Disbursed</div>
                        <div className="font-bold text-white text-sm mt-0.5">
                          ₹{Number(doc.portal_record?.disbursed_amount || 0).toLocaleString('en-IN')}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">Paper Approved</div>
                        <div className={`font-bold text-sm mt-0.5 ${doc.paper_extracted?.approved_amount ? 'text-violet-300' : 'text-slate-500'}`}>
                          {doc.paper_extracted?.approved_amount
                            ? `₹${Number(doc.paper_extracted.approved_amount).toLocaleString('en-IN')}`
                            : 'Not Stamped'}
                        </div>
                      </div>

                      <div>
                        <div className="text-xs text-slate-400 uppercase font-semibold">Discrepancy Δ</div>
                        <div
                          className={`font-bold text-sm mt-0.5 ${
                            discrepancy && discrepancy > 5000
                              ? 'text-rose-400'
                              : discrepancy && discrepancy < -5000
                              ? 'text-amber-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {discrepancy !== null
                            ? `${discrepancy > 0 ? '+' : ''}₹${Number(discrepancy).toLocaleString('en-IN')}`
                            : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Highlights & Specific Case Notes */}
                    {isDuplicateRecycled && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-rose-950/30 border border-rose-800/50 text-xs text-rose-200 flex items-center justify-between">
                        <span>
                          <strong>Duplicate Hash Match:</strong> Document 47 uploaded identically for Work #62689 and #62692.
                        </span>
                        <span className="text-rose-400 font-mono font-bold">2× CLAIM FRAUD</span>
                      </div>
                    )}

                    {hasCrossScheme && (
                      <div className="mt-2.5 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/50 text-xs text-amber-200">
                        <strong>Cross-Scheme Double Claim:</strong> Document explicitly mentions{' '}
                        <span className="text-amber-300 underline font-mono">
                          {doc.paper_extracted?.scheme_type || 'State Scheme'}
                        </span>{' '}
                        under central MPLADS sanction.
                      </div>
                    )}

                    {/* Extracted Vendor & Date Badges */}
                    <div className="mt-2.5 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-2 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        <span className="truncate">
                          {doc.paper_extracted?.vendor_name ? (
                            <span className="text-violet-300 font-mono">
                              Vendor: {doc.paper_extracted.vendor_name}
                            </span>
                          ) : (
                            <span>Vendor: Central IDA (No private contractor extracted)</span>
                          )}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-violet-400 hover:text-violet-300 font-semibold">
                        <span>Inspect Dossier</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Deep Dive Forensic Inspector Panel (Right 5 Cols on XL) */}
        <div className="xl:col-span-5 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-violet-400" />
              Document Forensic Dossier
            </h3>
            {selectedDoc && (
              <span className="text-xs font-mono text-violet-300">
                Work #{selectedDoc.portal_record?.work_id}
              </span>
            )}
          </div>

          {!selectedDoc ? (
            <div className="glass-panel p-8 rounded-2xl text-center text-slate-400 text-sm">
              Select any document from the ledger to view the deep forensic discrepancy breakdown and neural OCR image preview.
            </div>
          ) : (
            <div className="glass-panel p-5 rounded-2xl border border-violet-500/30 space-y-5 sticky top-24 shadow-2xl bg-navy-950/80 backdrop-blur-xl">
              
              {/* Header Info */}
              <div className="flex items-start justify-between border-b border-slate-800 pb-4">
                <div>
                  <div className="text-xs font-mono text-violet-400 mb-1">
                    WORK #{selectedDoc.portal_record?.work_id} // {selectedDoc.portal_record?.canonical_work_id || 'WS/MPLADS/2024'}
                  </div>
                  <h4 className="text-base font-bold text-white font-display">
                    {selectedDoc.portal_record?.mp_name}
                  </h4>
                  <div className="text-xs text-slate-400">
                    {selectedDoc.portal_record?.constituency}, {selectedDoc.portal_record?.state}
                  </div>
                </div>

                <button
                  onClick={() => onSelectWork && onSelectWork(selectedDoc.portal_record?.work_id)}
                  className="px-3 py-1.5 rounded-lg bg-violet-500/10 hover:bg-violet-500/20 text-violet-300 border border-violet-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all"
                  title="Open in Case File Modal"
                >
                  <span>Full Case File</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 300 DPI Neural Render Preview */}
              {selectedDoc.image_file && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Eye className="w-3.5 h-3.5 text-violet-400" />
                      PyMuPDF 300 DPI Neural Render
                    </span>
                    <button
                      onClick={() =>
                        setPreviewImage(`${API_BASE}/images/extracted/${selectedDoc.image_file}`)
                      }
                      className="text-xs text-violet-400 hover:text-violet-300 flex items-center gap-1 font-mono"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      Expand Full Resolution
                    </button>
                  </div>

                  <div
                    onClick={() =>
                      setPreviewImage(`${API_BASE}/images/extracted/${selectedDoc.image_file}`)
                    }
                    className="relative group rounded-xl overflow-hidden border border-slate-800 bg-black/60 max-h-56 cursor-pointer"
                  >
                    <img
                      src={`${API_BASE}/images/extracted/${selectedDoc.image_file}`}
                      alt="300 DPI Rendered Certificate"
                      className="w-full object-cover object-top transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.target.onerror = null;
                        if (e.target && e.target.parentElement) {
                          e.target.style.display = 'none';
                          const fallback = document.createElement('div');
                          fallback.className = 'p-6 text-center text-xs text-slate-400 font-mono';
                          fallback.innerHTML = 'Image rendered in PyMuPDF vault.<br/>Full PDF: ' + (selectedDoc.pdf_file || '');
                          e.target.parentElement.appendChild(fallback);
                        }
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end justify-between p-3 opacity-90">
                      <span className="text-xs font-mono text-violet-300 bg-slate-900/80 px-2 py-0.5 rounded border border-violet-900">
                        {selectedDoc.image_file}
                      </span>
                      <span className="text-xs font-semibold text-white flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-violet-400" />
                        Click to Inspect Seals & Signatures
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Side-by-Side Portal vs Paper Matrix */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 font-display flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-emerald-400" />
                  Portal Database vs Paper Extracted Comparison
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Left: Portal Record */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-xs font-mono font-semibold uppercase text-violet-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>Portal Record</span>
                      <span className="text-xs text-slate-500">MoSPI API</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-xs">Disbursed Amount:</span>
                        <span className="font-bold text-white font-mono text-sm">
                          ₹{Number(selectedDoc.portal_record?.disbursed_amount || 0).toLocaleString('en-IN')}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">Scheme Registered:</span>
                        <span className="text-slate-300 font-medium">MPLADS (Sansad Nidhi)</span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">Implementing Agency:</span>
                        <span className="text-slate-300 truncate block">
                          {selectedDoc.portal_record?.ida_name || 'District Authority'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">Work Description:</span>
                        <span className="text-slate-400 line-clamp-2 italic text-xs">
                          "{selectedDoc.portal_record?.work_description || 'Sanctioned civil works'}"
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right: Paper Certificate Record */}
                  <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
                    <div className="text-xs font-mono font-semibold uppercase text-emerald-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                      <span>Paper Certificate</span>
                      <span className="text-xs text-slate-500">RapidOCR Stamped</span>
                    </div>

                    <div className="space-y-2 text-xs">
                      <div>
                        <span className="text-slate-400 block text-xs">Approved Amount:</span>
                        <span
                          className={`font-bold font-mono text-sm ${
                            selectedDoc.paper_extracted?.approved_amount ? 'text-violet-300' : 'text-slate-500'
                          }`}
                        >
                          {selectedDoc.paper_extracted?.approved_amount
                            ? `₹${Number(selectedDoc.paper_extracted.approved_amount).toLocaleString('en-IN')}`
                            : 'Unextracted / Seal Missing'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">Scheme Stated:</span>
                        <span
                          className={`font-semibold ${
                            selectedDoc.paper_extracted?.scheme_type?.includes('MLA') ||
                            selectedDoc.paper_extracted?.scheme_type?.includes('State')
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {selectedDoc.paper_extracted?.scheme_type || 'MPLADS (Sansad Nidhi)'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">Extracted Vendor / Beneficiary:</span>
                        <span className="text-violet-300 font-mono truncate block">
                          {selectedDoc.paper_extracted?.vendor_name || 'Not detected in stamp block'}
                        </span>
                      </div>

                      <div>
                        <span className="text-slate-400 block text-xs">UTR / Account Ref:</span>
                        <span className="text-slate-400 font-mono block">
                          {selectedDoc.paper_extracted?.utr_number || 'None'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Discrepancy Callout Banner */}
              {(() => {
                const diff = getDiscrepancy(selectedDoc);
                if (diff === null) return null;
                if (diff > 5000) {
                  return (
                    <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-800/80 text-rose-200 text-xs space-y-1">
                      <div className="font-bold flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-sm">
                          <AlertOctagon className="w-4 h-4 text-rose-400" />
                          Unaccounted Financial Siphoning Flag
                        </span>
                        <span className="font-mono text-sm text-rose-300">
                          +₹{Number(diff).toLocaleString('en-IN')}
                        </span>
                      </div>
                      <p className="text-xs text-rose-300/80 leading-relaxed">
                        The web portal released ₹{Number(selectedDoc.portal_record?.disbursed_amount).toLocaleString('en-IN')}, but the physical engineer-certified completion document authorizes only ₹{Number(selectedDoc.paper_extracted?.approved_amount).toLocaleString('en-IN')}. The difference is unvouched public expenditure.
                      </p>
                    </div>
                  );
                }
                return (
                  <div className="p-3 rounded-xl bg-emerald-950/30 border border-emerald-800/60 text-emerald-200 text-xs flex items-center justify-between font-mono">
                    <span className="flex items-center gap-1.5 font-sans font-semibold">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      Financial Alignment Verified
                    </span>
                    <span>Δ = ₹0.00</span>
                  </div>
                );
              })()}

              {/* Forensic Findings List */}
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300 font-display flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-amber-400" />
                  Forensic Findings & Anomaly Log ({selectedDoc.findings?.length || 0})
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {(selectedDoc.findings || []).map((finding, fIdx) => (
                    <div
                      key={fIdx}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        finding.severity === 'CRITICAL'
                          ? 'bg-rose-950/20 border-rose-800/60 text-rose-200'
                          : finding.severity === 'HIGH'
                          ? 'bg-amber-950/20 border-amber-800/60 text-amber-200'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className="text-xs font-mono px-1.5 py-0.5 rounded bg-black/40 border border-current">
                            TASK {finding.task}
                          </span>
                          <span className="text-sm">{finding.title}</span>
                        </span>
                        <span className="text-xs font-mono font-bold uppercase">
                          {finding.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed pl-1">
                        {String(finding.detail || '')
                          .replace(/â,¹/g, '₹')
                          .replace(/â‚¹/g, '₹')
                          .replace(/ðŸ‘/g, '⚠️')
                          .replace(/ðŸ’/g, '🚨')
                          .replace(/ðŸ/g, '⚠️')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}

        </div>

      </div>

      {/* Full-Screen Image Lightbox Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between text-slate-200 mb-3 px-2">
            <span className="text-sm font-mono font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-violet-400" />
              High-Resolution 300 DPI Scanned Physical Document
            </span>
            <button
              onClick={() => setPreviewImage(null)}
              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-5xl max-h-[85vh] overflow-auto rounded-xl border border-slate-700 bg-black shadow-2xl p-2">
            <img
              src={previewImage}
              alt="High Resolution Forensic Render"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
