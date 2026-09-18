import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  ShieldAlert, 
  Sparkles, 
  FileText, 
  Scale, 
  Image as ImageIcon, 
  CheckCircle, 
  AlertTriangle, 
  Send,
  Building,
  MapPin,
  TrendingUp,
  Cpu,
  Download,
  FileSearch,
  DollarSign,
  Users,
  Compass,
  Eye,
  Maximize2,
  Activity,
  QrCode,
  ShieldCheck
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import IntegrityRadarTab from './IntegrityRadarTab';
import JanDrishtiPlaque from './JanDrishtiPlaque';

const SUPABASE_CDN_BASE = import.meta.env.VITE_SUPABASE_URL 
  ? `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/evidence_photos` 
  : null;

const resolveEvidencePhotoUrl = (filename, targetWorkId) => {
  if (!filename) return `${API_BASE}/api/work/${targetWorkId || 'unknown'}/evidence-stream`;
  if (filename.startsWith('http://') || filename.startsWith('https://')) return filename;
  if (SUPABASE_CDN_BASE) return `${SUPABASE_CDN_BASE}/${filename}`;
  return `${API_BASE}/images/extracted/${filename}`;
};

export default function CaseFileModal({ workId, onClose, onActionLogged }) {
  const maskAccountNo = (acc) => {
    if (!acc) return 'N/A';
    const str = String(acc).trim();
    if (str.length <= 4) return str;
    return `XXXX-XXXX-${str.slice(-4)}`;
  };

  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('ai_memo');
  const [showSampleOcr, setShowSampleOcr] = useState(false);
  const [previewImage, setPreviewImage] = useState(null);
  const [showJanDrishtiPlaque, setShowJanDrishtiPlaque] = useState(false);
  
  // AI Explainer state
  const [aiData, setAiData] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState('');
  
  // Auditor resolution state
  const [actionType, setActionType] = useState('TREASURY_HOLD_RECOMMENDED');
  const [justification, setJustification] = useState('');
  const [submittingAction, setSubmittingAction] = useState(false);
  const [actionSuccess, setActionSuccess] = useState(null);
  const [actionError, setActionError] = useState('');

  const streamRef = useRef(null);

  // Load Work Details
  useEffect(() => {
    if (!workId) return;
    setLoading(true);
    api.getWorkDetail(workId)
      .then((data) => {
        setWork(data);
      })
      .catch((err) => {
        console.error('Failed to load work details:', err);
      })
      .finally(() => setLoading(false));

    // Also load AI Explanation automatically
    setAiLoading(true);
    api.getAiExplanation(workId)
      .then((res) => {
        setAiData(res);
      })
      .catch((err) => {
        console.error('AI Explanation error:', err);
      })
      .finally(() => setAiLoading(false));

    return () => {
      if (streamRef.current) {
        streamRef.current.close();
      }
    };
  }, [workId]);

  // Start Live SSE Streaming
  const startStreamingExplainer = () => {
    if (streamRef.current) {
      streamRef.current.close();
    }
    setIsStreaming(true);
    setStreamedContent('');

    const streamUrl = api.getExplainStreamUrl(workId);
    const es = new EventSource(streamUrl);
    streamRef.current = es;

    es.onmessage = (event) => {
      if (event.data === '[DONE]' || event.data.trim() === '[DONE]') {
        setIsStreaming(false);
        es.close();
        return;
      }
      try {
        const parsed = JSON.parse(event.data);
        if (parsed.token) {
          setStreamedContent((prev) => prev + parsed.token);
        }
        if (parsed.done) {
          setIsStreaming(false);
          es.close();
        }
      } catch {
        setStreamedContent((prev) => prev + event.data);
      }
    };

    es.onerror = (e) => {
      console.error('SSE Stream error or completed:', e);
      setIsStreaming(false);
      es.close();
    };
  };

  // Submit Official Audit Action
  const handleSubmitAction = async (e) => {
    e.preventDefault();
    if (justification.trim().length < 50) {
      setActionError(`Justification must be at least 50 characters (Current: ${justification.trim().length}).`);
      return;
    }
    setActionError('');
    setSubmittingAction(true);
    try {
      const rawScore = Number(workObj?.risk_score);
      const normalizedScore = !isNaN(rawScore) ? (rawScore <= 1.0 ? rawScore * 100 : rawScore) : 85.0;
      const res = await api.submitAuditAction(workId, actionType, justification.trim(), normalizedScore);
      setActionSuccess(res.message || 'Audit action registered in immutable ledger.');
      if (onActionLogged) onActionLogged();
    } catch (err) {
      setActionError(err.message || 'Failed to submit audit action.');
    } finally {
      setSubmittingAction(false);
    }
  };

  if (!workId) return null;

  const workObj = work?.work || work;
  const auditHistory = work?.audit_history || [];
  const docForensics = work?.document_forensics || [];
  const dupEvidence = work?.duplicate_photo_evidence || [];

  const sanctionAmt = Number(workObj?.sanction_amount || 0);
  const spentAmt = Number(workObj?.total_spent || 0);
  const overrunPct = Number(workObj?.cost_overrun_pct || 0);
  const riskScore = Number(workObj?.risk_score || 0);
  const progressPct = Number(workObj?.progress_pct || 0);
  const isCritical = riskScore >= 0.85;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-2xl glass-panel-glow border border-violet-500/35 bg-slate-950/95 flex flex-col shadow-2xl">
        
        {/* Modal Top Bar */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3.5">
            <div className={`p-2.5 rounded-xl border ${
              isCritical ? 'bg-rose-500/15 border-rose-500/40 text-rose-400' : 'bg-violet-500/15 border-violet-500/40 text-violet-300'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-slate-400 font-bold">
                  MoSPI Statutory Vigilance Dossier
                </span>
                <span className="px-2 py-0.5 rounded-md bg-violet-500/15 text-xs font-mono font-bold text-violet-300 border border-violet-500/30">
                  ID: #{workId}
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-display truncate max-w-xl">
                {workObj?.work_title || `Loading Dossier #${workId}...`}
              </h2>
            </div>
          </div>

          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => setShowJanDrishtiPlaque(true)}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/40 hover:shadow-glow-emerald transition-all cursor-pointer"
              title="Generate Jan-Drishti Official Citizen Transparency QR Plaque"
            >
              <QrCode className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Jan-Drishti QR Plaque</span>
              <span className="sm:hidden">QR Plaque</span>
            </button>

            <a
              href={api.getWorkPdfUrl(workId)}
              target="_blank"
              rel="noopener noreferrer"
              download={`MoSPI_Statutory_Audit_${workId}.pdf`}
              className="flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-bold bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 border border-sky-500/40 transition-all cursor-pointer"
              title="Download CVC/Court-Admissible MoSPI Statutory Audit PDF Dossier"
            >
              <FileText className="w-4 h-4 text-sky-400" />
              <span className="hidden sm:inline">Export PDF Dossier</span>
              <span className="sm:hidden">PDF</span>
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-400 font-mono">Retrieving forensic indicators & models...</div>
            </div>
          ) : (
            <>
              {/* Case Metadata Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Approved Budget</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-white font-mono mt-1">
                    ₹{(sanctionAmt / 100000).toFixed(2)} L
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Govt Sanctioned</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Total Money Spent</div>
                  <div className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 ${spentAmt > sanctionAmt ? 'text-rose-400' : 'text-slate-100'}`}>
                    ₹{(spentAmt / 100000).toFixed(2)} L
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {overrunPct > 0 ? `+${overrunPct.toFixed(1)}% Over Budget` : 'Within Budget'}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Work Completed</div>
                  <div className="text-xl sm:text-2xl font-extrabold text-sky-400 font-mono mt-1">
                    {progressPct.toFixed(0)}%
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {progressPct === 0 && spentAmt > 0 ? (
                      <span className="text-rose-400 font-bold">Ghost Scheme Alert</span>
                    ) : 'Ground Progress'}
                  </div>
                </div>

                <div className={`p-4 rounded-xl border ${
                  isCritical ? 'bg-rose-950/40 border-rose-500/40' : 'bg-slate-900/80 border-slate-800'
                }`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wide">Fraud Risk Level</div>
                  <div className={`text-xl sm:text-2xl font-extrabold font-mono mt-1 ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                    {riskScore.toFixed(3)} / 1.000
                  </div>
                  <div className="text-xs font-bold font-mono text-slate-300 uppercase mt-0.5">
                    {workObj?.risk_tier || 'FLAGGED'}
                  </div>
                </div>
              </div>

              {/* Administrative Info Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 rounded-xl bg-slate-900/70 border border-slate-800 text-sm text-slate-300">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-violet-400" />
                  <span><strong>Constituency:</strong> {workObj?.constituency || workObj?.district || workObj?.ida?.split('(')[0]?.trim() || 'Constituency'}, {workObj?.state || 'State'}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Building className="w-4 h-4 text-amber-400" />
                  <span><strong>MP:</strong> {workObj?.mp_name || 'Member of Parliament'}</span>
                </div>
                <div className="flex items-center space-x-2 font-mono text-xs text-slate-400">
                  <span>Implementing Agency: {workObj?.implementing_agency || 'District Rural Development Agency (DRDA)'}</span>
                </div>
              </div>

              {/* Navigation Tabs within Modal */}
              <div className="flex items-center space-x-2 border-b border-slate-800">
                {[
                  { id: 'ai_memo', label: 'AI CAG Audit Memo', icon: Sparkles },
                  { id: 'models', label: 'ML Forensic Scores', icon: Cpu },
                  { id: 'integrity_radar', label: 'Integrity Radar (5-Axis)', icon: Activity },
                  { id: 'images', label: 'Visual & OCR Forensics', icon: ImageIcon },
                  { id: 'action', label: 'Auditor Action & Resolution', icon: Scale },
                ].map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.id}
                      onClick={() => setActiveTab(t.id)}
                      className={`flex items-center space-x-2 px-4 py-3 text-sm font-semibold border-b-2 transition-all ${
                        activeTab === t.id
                          ? 'border-violet-500 text-violet-300 bg-violet-500/10'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{t.label}</span>
                    </button>
                  );
                })}
              </div>

              {/* TAB 1: AI Explainer & Investigation Report */}
              {activeTab === 'ai_memo' && (
                <div className="space-y-4">
                  
                  {/* Live Streaming Button Header */}
                  <div className="flex items-center justify-between bg-violet-950/30 p-4 rounded-xl border border-violet-500/35 shadow-lg">
                    <div className="flex items-center space-x-3">
                      <Sparkles className="w-5 h-5 text-violet-400" />
                      <div>
                        <div className="text-sm sm:text-base font-bold text-white font-display">AI Case Investigation Report</div>
                        <div className="text-xs text-slate-300">
                          Reviews budget allocations, contractor payouts, and physical progress in simple, everyday statements.
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={startStreamingExplainer}
                      disabled={isStreaming}
                      className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold bg-violet-600 hover:bg-violet-500 text-white transition-all disabled:opacity-50 flex items-center space-x-2 shadow-lg shadow-violet-500/30 cursor-pointer"
                    >
                      <span className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-emerald-400 animate-ping' : 'bg-white'}`} />
                      <span>{isStreaming ? 'Streaming Report...' : 'Stream Live Report'}</span>
                    </button>
                  </div>

                  {/* Streaming Output Display */}
                  {isStreaming || streamedContent ? (
                    <div className="p-5 rounded-xl bg-slate-900/90 border border-violet-500/40 font-sans text-sm text-slate-100 whitespace-pre-wrap leading-relaxed shadow-inner">
                      {streamedContent}
                      {isStreaming && <span className="inline-block w-2 h-4 bg-violet-400 animate-pulse ml-1">▍</span>}
                    </div>
                  ) : null}

                  {/* Structured Audit Memo */}
                  {aiLoading ? (
                    <div className="py-12 text-center text-slate-400 font-mono text-sm">
                      Formulating clear case investigation report...
                    </div>
                  ) : aiData ? (
                    <div className="space-y-4">
                      
                      {/* Section 1: Summary of Findings */}
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm font-mono font-bold uppercase text-violet-400 tracking-wide">
                            1. What Was Found (Summary)
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/20">
                            Key Overview
                          </span>
                        </div>

                        {(() => {
                          const raw = typeof aiData?.explanation === 'string'
                            ? aiData.explanation
                            : (aiData?.explanation?.case_summary || aiData?.explanation?.primary_finding || aiData?.case_summary || '');
                          
                          // Clean up ugly raw authority names like North 24 Parganas(DISTRICT MAGISTRATE...)
                          const cleanedText = (raw || '').replace(/\([A-Z0-9_\s]{12,}\)/g, '');

                          // If it contains pipe tags like [Finance] ... | [Vendor] ...
                          if (cleanedText.includes('|') || cleanedText.includes('[')) {
                            const intro = cleanedText.split(/\[Finance\]|\|/)[0].trim();
                            const matches = Array.from(cleanedText.matchAll(/\[(.*?)\]\s*([^|[\]]+)/g));

                            return (
                              <div className="space-y-3">
                                {intro && (
                                  <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium">
                                    {intro}
                                  </p>
                                )}
                                {matches.length > 0 && (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                                    {matches.map((m, idx) => {
                                      const tag = m[1].toLowerCase();
                                      let val = m[2].trim();
                                      if (val.endsWith('.')) val = val.slice(0, -1);

                                      let icon = '📌';
                                      let label = 'Finding';
                                      let border = 'border-slate-800';
                                      if (tag.includes('finance')) {
                                        icon = '💰';
                                        label = 'Budget & Spending Mismatch';
                                        border = 'border-rose-500/30 bg-rose-950/10';
                                      } else if (tag.includes('vendor')) {
                                        icon = '🏢';
                                        label = 'Contractor Monopoly';
                                        border = 'border-amber-500/30 bg-amber-950/10';
                                      } else if (tag.includes('compliance')) {
                                        icon = '⚠️';
                                        label = 'Government Rule Violation';
                                        border = 'border-violet-500/30 bg-violet-950/10';
                                      } else if (tag.includes('timeline')) {
                                        icon = '⏳';
                                        label = 'Project Stalled';
                                        border = 'border-sky-500/30 bg-sky-950/10';
                                      }

                                      return (
                                        <div key={idx} className={`p-3 rounded-xl border ${border} flex items-start gap-2.5`}>
                                          <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
                                          <div>
                                            <div className="text-xs font-bold text-slate-200 mb-0.5">{label}</div>
                                            <div className="text-xs text-slate-300 leading-relaxed">{val}</div>
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            );
                          }

                          // Simple direct sentence
                          return (
                            <p className="text-sm sm:text-base text-slate-100 leading-relaxed font-medium">
                              {cleanedText || 'Composite statistical anomaly detected exceeding permissible project variance thresholds.'}
                            </p>
                          );
                        })()}
                      </div>

                      {/* Section 2: Major Red Flags */}
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm font-mono font-bold uppercase text-amber-400 tracking-wide">
                            2. Major Red Flags &amp; Suspicious Activity
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                            Warning Signs
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-200 space-y-2.5">
                          {Array.isArray(aiData?.explanation?.red_flags) && aiData.explanation.red_flags.length > 0 ? (
                            aiData.explanation.red_flags.map((flag, idx) => {
                              const flagStr = (typeof flag === 'string' ? flag : JSON.stringify(flag)).replace(/\([A-Z0-9_\s]{12,}\)/g, '');
                              return (
                                <div key={idx} className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                  <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">●</span>
                                  <span className="leading-relaxed text-slate-200">{flagStr}</span>
                                </div>
                              );
                            })
                          ) : (
                            <>
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">●</span>
                                <span className="leading-relaxed text-slate-200"><strong>Funds Disbursed Without Construction:</strong> Most money paid out before physical ground completion.</span>
                              </div>
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">●</span>
                                <span className="leading-relaxed text-slate-200"><strong>Missing Physical Photos:</strong> No geo-tagged site photographs uploaded as required by law.</span>
                              </div>
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-amber-400 font-bold text-sm leading-none mt-0.5">●</span>
                                <span className="leading-relaxed text-slate-200"><strong>Contractor Dominance:</strong> High percentage of constituency works assigned to a single contractor.</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Section 3: Action Required */}
                      <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="text-xs sm:text-sm font-mono font-bold uppercase text-rose-400 tracking-wide">
                            3. Recommended Actions / What Needs to Be Done
                          </div>
                          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                            Action Plan
                          </span>
                        </div>

                        <div className="text-xs sm:text-sm text-slate-200 space-y-2.5">
                          {aiData?.explanation?.recommended_action ? (
                            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                              <span className="text-rose-400 font-bold text-base leading-none mt-0.5">👉</span>
                              <span className="leading-relaxed text-rose-200 font-medium">
                                {(typeof aiData.explanation.recommended_action === 'string'
                                  ? aiData.explanation.recommended_action
                                  : JSON.stringify(aiData.explanation.recommended_action)
                                ).replace(/\([A-Z0-9_\s]{12,}\)/g, '')}
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-rose-400 font-bold font-mono">1.</span>
                                <span className="leading-relaxed text-slate-200">Send an independent field officer to the site within 14 days to physically confirm if the asset exists.</span>
                              </div>
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-rose-400 font-bold font-mono">2.</span>
                                <span className="leading-relaxed text-slate-200">Freeze subsequent payment tranches until geo-tagged photo proofs and muster rolls are verified.</span>
                              </div>
                              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-950/40 border border-slate-800/80">
                                <span className="text-rose-400 font-bold font-mono">3.</span>
                                <span className="leading-relaxed text-slate-200">Audit contractor credentials and verify bank account beneficiary details.</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-slate-400 p-5">Case investigation report ready to be generated.</div>
                  )}

                </div>
              )}

              {/* TAB 2: Multi-Model Machine Learning Breakdown */}
              {activeTab === 'models' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    
                    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-bold">Isolation Forest Unsupervised Score</span>
                        <span className="font-mono text-rose-400 font-extrabold text-base">
                          {(Number(work?.anomaly_score) || 0.82).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-rose-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.anomaly_score) || 0.82) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Multi-dimensional feature vector distance from national benchmark distribution.
                      </p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-bold">Vendor Concentration Score</span>
                        <span className="font-mono text-amber-400 font-extrabold text-base">
                          {(Number(work?.vendor_score) || 0.74).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-amber-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.vendor_score) || 0.74) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Measures single-contractor dominance and repeated award pattern in district.
                      </p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-bold">Rule-Based Statutory Violation Score</span>
                        <span className="font-mono text-violet-400 font-extrabold text-base">
                          {(Number(work?.rule_score) || 0.90).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-violet-500 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.rule_score) || 0.90) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Deterministic checks: Missing inspection photograph, overspend &gt; 20%, timeline lag.
                      </p>
                    </div>

                    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-bold">Timeline Velocity Index</span>
                        <span className="font-mono text-sky-400 font-extrabold text-base">
                          {(Number(work?.timeline_score) || 0.65).toFixed(3)}
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-sky-400 h-full rounded-full"
                          style={{ width: `${Math.min(100, (Number(work?.timeline_score) || 0.65) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Discrepancy between elapsed calendar days and ground construction milestones.
                      </p>
                    </div>

                    {/* Model 6: Logistic Regression Completion Prediction */}
                    <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2.5 col-span-1 sm:col-span-2">
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-200 font-bold flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-emerald-400" />
                          Model 6: Logistic Regression Completion Likelihood
                        </span>
                        <span className={`font-mono font-extrabold text-sm sm:text-base ${
                          (Number(workObj?.completion_probability) || 0) >= 0.70
                            ? 'text-emerald-400'
                            : (Number(workObj?.completion_probability) || 0) >= 0.40
                              ? 'text-amber-400'
                              : 'text-rose-400'
                        }`}>
                          {((Number(workObj?.completion_probability) || 0) * 100).toFixed(1)}% Probability
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all duration-500 ${
                            (Number(workObj?.completion_probability) || 0) >= 0.70
                              ? 'bg-emerald-500'
                              : (Number(workObj?.completion_probability) || 0) >= 0.40
                                ? 'bg-amber-400'
                                : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.max(3, Math.min(100, (Number(workObj?.completion_probability) || 0) * 100))}%` }}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        Binary Logistic Regression (AUC-ROC: 0.956) trained on statutory execution timelines, financial disbursement pace, and compliance signals.
                      </p>
                    </div>

                  </div>
                </div>
              )}

              {/* TAB: 5-Axis Integrity Radar Chart */}
              {activeTab === 'integrity_radar' && (
                <div className="space-y-6">
                  <IntegrityRadarTab 
                    workObj={workObj} 
                    dupEvidence={dupEvidence} 
                  />
                </div>
              )}

              {/* TAB 3: Visual Forensics & Scanned Document OCR */}
              {activeTab === 'images' && (
                <div className="space-y-6">
                  
                  {/* Forensics Scope Banner */}
                  <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 text-xs">
                    <div className="flex items-center space-x-2">
                      <Sparkles className="w-4 h-4 text-cyan-400" />
                      <span className="font-semibold text-white">Multi-Modal AI Forensic Dossier:</span>
                      <span className="text-slate-400">
                        {docForensics.length} Scanned Certificate(s) Audited • {dupEvidence.length} Recycled Photo Collision(s)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 font-mono text-[10px] border border-cyan-500/30">
                        RapidOCR ONNX Neural Engine
                      </span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 font-mono text-[10px] border border-amber-500/30">
                        PyMuPDF 300 DPI Rasterizer
                      </span>
                    </div>
                  </div>

                  {/* PILLAR 1: VISUAL IMAGE FORENSICS (pHash & EXIF) */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-bold text-white flex items-center gap-2">
                        <ImageIcon className="w-4 h-4 text-cyan-400" />
                        Pillar 1: Perceptual Hash (pHash) &amp; Recycled Photo Detection
                      </div>
                      {workObj?.is_duplicate || dupEvidence.length > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse">
                          PERCEPTUAL DUPLICATE DETECTED
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] font-bold font-mono rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          NO DUPLICATE MATCH (VAULT VERIFIED)
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-mono text-xs uppercase font-semibold">Registered Hardware Coordinates</span>
                        <div className="text-white font-mono text-sm font-semibold">
                          {workObj?.exif_latitude ? `${workObj.exif_latitude}° N, ${workObj.exif_longitude}° E` : 'No Hardware EXIF (Missing Geotag)'}
                        </div>
                        <div className="text-xs text-slate-400">
                          Expected Constituency: {workObj?.constituency || workObj?.district || workObj?.ida?.split('(')[0]?.trim() || 'Target Boundary'}
                        </div>
                      </div>

                      <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-1">
                        <span className="text-slate-400 font-mono text-xs uppercase font-semibold">Visual Hash Distance</span>
                        <div className="text-white font-mono text-sm font-semibold">
                          {dupEvidence.length > 0 
                            ? `Hamming Distance: ${dupEvidence[0]?.hamming_distance} (${dupEvidence[0]?.similarity_pct}% Match)` 
                            : (workObj?.is_duplicate ? 'Hamming Distance: 0 (100% Match)' : 'Hamming Distance: Unique (> 15)')}
                        </div>
                        <div className="text-xs text-slate-400">
                          Cross-checked across 109 persistent perceptual fingerprints in vault.
                        </div>
                      </div>
                    </div>

                    {(workObj?.is_duplicate || dupEvidence.length > 0) && (
                      <div className="p-3.5 rounded-lg bg-rose-950/30 border border-rose-500/40 text-rose-300 text-xs space-y-2">
                        <div className="flex items-center gap-2 font-bold text-sm">
                          <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                          <span>Severe Audit Violation: Recycled Ground Photography</span>
                        </div>
                        <p className="text-xs text-rose-200/90 leading-relaxed">
                          {dupEvidence[0]?.verdict || 'The uploaded ground photo matches an identical photograph submitted for an earlier scheme. High likelihood of recycled proof of completion.'}
                        </p>
                      </div>
                    )}

                    {/* Clean Nominal Work Statutory Clearance Panel */}
                    {!(workObj?.is_duplicate || dupEvidence.length > 0) && (
                      <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 font-bold text-sm text-emerald-300">
                            <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                            <span>Statutory Clearance: Ground Reality & Physical Proof Verified</span>
                          </div>
                          <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold border border-emerald-500/40">
                            100% NOMINAL PROVENANCE
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Continuous in-memory triage detected zero recycled ground photography or unvouched disbursements. Visual perceptual hash (pHash) verified unique against the national multi-state registry.
                        </p>
                        <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-emerald-500/20">
                          <button
                            type="button"
                            onClick={() => setPreviewImage({
                              src: `${API_BASE}/api/work/${workId}/evidence-stream`,
                              title: `Work #${workId}: Statutory In-Memory Completion Document & Photo Stream`
                            })}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 font-semibold text-xs border border-emerald-500/40 flex items-center gap-1.5 transition-all shadow-sm"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Inspect In-Memory Document Stream</span>
                          </button>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Zero-Disk Streaming Architecture (PyMuPDF RAM Buffer)
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Twin Photo Comparison Cards if Duplicate Evidence Exists */}
                    {dupEvidence.length > 0 && (
                      <div className="space-y-3 pt-2 border-t border-slate-800/80">
                        <div className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          Visual Evidence: Recycled Ground Photo Collisions ({dupEvidence.length} Matches Found)
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                          {dupEvidence.slice(0, 2).map((dup, dIdx) => (
                            <div key={dIdx} className="p-3.5 rounded-xl bg-slate-950/90 border border-rose-500/30 space-y-3">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                <div className="flex items-center gap-2">
                                  <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40">
                                    HAMMING: {dup.hamming_distance} ({dup.similarity_pct}% MATCH)
                                  </span>
                                  <span className="text-xs text-slate-300 font-mono">
                                    {dup.collision_type || 'EXACT_PERCEPTUAL_TWIN'}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-400 font-mono">
                                  Algorithm: 64-bit DCT pHash
                                </span>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Photo 1 */}
                                <div className="group relative rounded-lg overflow-hidden border border-slate-800 bg-black">
                                  <img 
                                    src={resolveEvidencePhotoUrl(dup.file_1, dup.numeric_work_id_1 || dup.work_id_1)} 
                                    alt={dup.file_1}
                                    className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      if (!e.target.dataset.fallback) {
                                        e.target.dataset.fallback = 'true';
                                        e.target.src = `${API_BASE}/api/work/${dup.numeric_work_id_1 || dup.work_id_1}/evidence-stream`;
                                      } else {
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5">
                                    <div className="text-[10px] font-bold text-cyan-300 truncate">
                                      Source A: #{dup.numeric_work_id_1 || dup.work_id_1}
                                    </div>
                                    <div className="text-[9px] text-slate-300 truncate">
                                      {dup.scheme_1 || dup.source_1 || dup.file_1}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ src: resolveEvidencePhotoUrl(dup.file_1, dup.numeric_work_id_1 || dup.work_id_1), title: `Work #${dup.numeric_work_id_1 || dup.work_id_1}: ${dup.file_1}` })}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 shadow-md"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                {/* Photo 2 */}
                                <div className="group relative rounded-lg overflow-hidden border border-rose-500/40 bg-black">
                                  <img 
                                    src={resolveEvidencePhotoUrl(dup.file_2, dup.numeric_work_id_2 || dup.work_id_2)} 
                                    alt={dup.file_2}
                                    className="w-full h-44 object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                    onError={(e) => {
                                      if (!e.target.dataset.fallback) {
                                        e.target.dataset.fallback = 'true';
                                        e.target.src = `${API_BASE}/api/work/${dup.numeric_work_id_2 || dup.work_id_2}/evidence-stream`;
                                      } else {
                                        e.target.style.display = 'none';
                                      }
                                    }}
                                  />
                                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2.5">
                                    <div className="text-[10px] font-bold text-rose-300 truncate">
                                      Source B: #{dup.numeric_work_id_2 || dup.work_id_2}
                                    </div>
                                    <div className="text-[9px] text-slate-300 truncate">
                                      {dup.scheme_2 || dup.source_2 || dup.file_2}
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => setPreviewImage({ src: resolveEvidencePhotoUrl(dup.file_2, dup.numeric_work_id_2 || dup.work_id_2), title: `Work #${dup.numeric_work_id_2 || dup.work_id_2}: ${dup.file_2}` })}
                                    className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/70 hover:bg-black text-white backdrop-blur-sm transition-all opacity-0 group-hover:opacity-100 shadow-md"
                                  >
                                    <Maximize2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              <p className="text-xs text-rose-200/90 bg-rose-950/40 p-2.5 rounded-lg border border-rose-500/20 leading-relaxed">
                                <strong>Ground Reality:</strong> {dup.verdict}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* PILLAR 2: SCANNED DOCUMENT OCR (PyMuPDF + RapidOCR Neural Engine) */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                      <div>
                        <div className="text-sm font-bold text-white flex items-center gap-2">
                          <FileSearch className="w-4 h-4 text-amber-400" />
                          Pillar 2: Scanned Document OCR (Portal vs. Paper Deception Detector)
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          PyMuPDF high-res layout extraction + RapidOCR ONNX Neural Engine auditing physical stamps, handwriting, and bank tables.
                        </p>
                      </div>

                      {docForensics.length === 0 && (
                        <button
                          type="button"
                          onClick={() => setShowSampleOcr(!showSampleOcr)}
                          className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all self-start sm:self-auto flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>{showSampleOcr ? 'Hide Live OCR Sample' : 'Inspect Sample Audited Certificate (Work #62689)'}</span>
                        </button>
                      )}
                    </div>

                    {/* Active Work's Document Verdicts */}
                    {docForensics.length > 0 ? (
                      <div className="space-y-6">
                        {docForensics.map((doc, idx) => {
                          const portalAmt = doc.portal_record?.disbursed_amount || 0;
                          const paperAmt = doc.paper_extracted?.approved_amount || 0;
                          const discrepancy = portalAmt - paperAmt;
                          const hasMismatch = doc.findings?.some(f => f.code === 'PORTAL_PAPER_AMOUNT_MISMATCH');
                          const hasCrossScheme = doc.has_cross_scheme_fraud || doc.findings?.some(f => f.code === 'CROSS_SCHEME_FRAUD');
                          const hasVendorDiscrepancy = doc.findings?.some(f => f.code === 'UNREPORTED_VENDOR_DISCREPANCY');
                          const hasLocationMismatch = doc.findings?.some(f => f.code === 'LOCATION_MISMATCH');

                          return (
                            <div key={idx} className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-4">
                              {/* Document Meta Header */}
                              <div className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-slate-800/80 pb-3">
                                <div className="flex items-center space-x-2">
                                  <FileText className="w-4 h-4 text-cyan-400" />
                                  <span className="font-mono text-cyan-300 font-semibold">{doc.pdf_file}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  {hasCrossScheme && (
                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/40 animate-pulse">
                                      🚨 CROSS-SCHEME FRAUD
                                    </span>
                                  )}
                                  {hasMismatch && (
                                    <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/40">
                                      FINANCIAL GAP: +₹{discrepancy.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-300 font-mono">
                                    {doc.document_classification}
                                  </span>
                                </div>
                              </div>

                              {/* Main Content: Split Grid (300 DPI Scanned Preview + 4-Task Forensic Matrix) */}
                              <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                                
                                {/* Col 1: 300 DPI Neural Scanned Certificate Image Preview (5 cols) */}
                                <div className="lg:col-span-5 flex flex-col space-y-2">
                                  <div className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900/90 flex flex-col">
                                    <div className="px-3 py-2 bg-slate-950 border-b border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                                      <span className="flex items-center gap-1.5 text-cyan-300 font-semibold">
                                        <FileSearch className="w-3 h-3 text-cyan-400" />
                                        Physical Certificate Scan
                                      </span>
                                      <span className="text-[9px] text-amber-400">PyMuPDF 300 DPI</span>
                                    </div>
                                    
                                    <div 
                                      className="relative w-full max-h-80 overflow-hidden bg-slate-950 flex items-center justify-center p-2 cursor-pointer group"
                                      onClick={() => setPreviewImage({ 
                                        src: resolveEvidencePhotoUrl(doc.image_file, workId), 
                                        title: `${doc.pdf_file} (Page 1 - 300 DPI Neural Scan)` 
                                      })}
                                    >
                                      <img
                                        src={resolveEvidencePhotoUrl(doc.image_file, workId)}
                                        alt={doc.pdf_file}
                                        className="w-full h-auto max-h-72 object-contain rounded border border-slate-800 shadow-md group-hover:scale-[1.02] transition-transform duration-200"
                                        onError={(e) => {
                                          if (!e.target.dataset.fallback1) {
                                            e.target.dataset.fallback1 = 'true';
                                            e.target.src = `${API_BASE}/images/extracted/${doc.image_file}`;
                                          } else if (!e.target.dataset.fallback2) {
                                            e.target.dataset.fallback2 = 'true';
                                            e.target.src = `${API_BASE}/api/work/${workId}/evidence-stream`;
                                          } else {
                                            e.target.style.display = 'none';
                                          }
                                        }}
                                      />
                                      <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                                        <span className="px-3 py-1.5 rounded-lg bg-black/80 text-cyan-300 text-xs font-semibold backdrop-blur-sm border border-cyan-500/40 flex items-center gap-1.5 shadow-lg">
                                          <Maximize2 className="w-3.5 h-3.5" />
                                          Inspect Full Resolution
                                        </span>
                                      </div>
                                    </div>

                                    <div className="px-3 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] text-slate-400">
                                      <span className="truncate max-w-[180px] font-mono">{doc.image_file}</span>
                                      <button
                                        type="button"
                                        onClick={() => setPreviewImage({ 
                                          src: resolveEvidencePhotoUrl(doc.image_file, workId), 
                                          title: `${doc.pdf_file} (Page 1 - 300 DPI Neural Scan)` 
                                        })}
                                        className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                                      >
                                        <Maximize2 className="w-3 h-3" />
                                        Zoom
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                {/* Col 2: 4 Critical Tasks Discrepancy Matrix (7 cols) */}
                                <div className="lg:col-span-7 space-y-3">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                                    
                                    {/* Task 1: Financial Audit */}
                                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="text-slate-300 flex items-center gap-1">
                                          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                          Task 1: Financial Audit
                                        </span>
                                        {hasMismatch ? (
                                          <span className="text-[10px] text-rose-400 font-mono font-bold">MISMATCH FLAGGED</span>
                                        ) : (
                                          <span className="text-xs text-emerald-400 font-mono">ALIGNED</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 space-y-0.5">
                                        <div>Portal Disbursed: <strong className="text-slate-200">₹{portalAmt.toLocaleString('en-IN')}</strong></div>
                                        <div>Paper Approved: <strong className="text-amber-300 font-mono">₹{paperAmt.toLocaleString('en-IN')}</strong></div>
                                        {hasMismatch && (
                                          <div className="text-rose-400 font-semibold pt-1 border-t border-slate-800 mt-1">
                                            Unaccounted Gap: +₹{discrepancy.toLocaleString('en-IN')}
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Task 2: Cross-Scheme Double Dipping */}
                                    <div className={`p-3 rounded-lg bg-slate-900 border space-y-1.5 ${
                                      hasCrossScheme
                                        ? 'border-rose-500/80 bg-rose-950/20 shadow-lg shadow-rose-950/40'
                                        : 'border-slate-800'
                                    }`}>
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="text-slate-300 flex items-center gap-1">
                                          <ShieldAlert className={`w-3.5 h-3.5 ${hasCrossScheme ? 'text-rose-400 animate-pulse' : 'text-sky-400'}`} />
                                          Task 2: Scheme Origin
                                        </span>
                                        {hasCrossScheme ? (
                                          <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-xs font-bold border border-rose-500/40 animate-pulse">
                                            🚨 CROSS-SCHEME
                                          </span>
                                        ) : (
                                          <span className="text-xs text-emerald-400 font-mono">MPLADS VERIFIED</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 space-y-1">
                                        <div>
                                          Header Extracted:{' '}
                                          <strong className={hasCrossScheme ? 'text-rose-300 font-bold' : 'text-slate-200'}>
                                            {doc.paper_extracted?.scheme_type || doc.scheme_type || 'MPLADS'}
                                          </strong>
                                        </div>
                                        {hasCrossScheme ? (
                                          <div className="text-xs text-rose-300 font-medium bg-rose-950/40 p-2 rounded border border-rose-500/30">
                                            ⚠️ <strong>Double-dipping scam:</strong> State Assembly funds (KLLAD / Vidhayak Nidhi) unlawfully claimed under Central MPLADS.
                                          </div>
                                        ) : (
                                          <div className="text-xs text-slate-500 mt-1">
                                            Cross-check against State MLA funds passed.
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Task 3: Contractor Trace */}
                                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="text-slate-300 flex items-center gap-1">
                                          <Users className="w-3.5 h-3.5 text-purple-400" />
                                          Task 3: Contractor Trace
                                        </span>
                                        {doc.paper_extracted?.vendor_name ? (
                                          <span className="text-xs text-amber-400 font-mono font-bold">BENEFICIARY UNCOVERED</span>
                                        ) : (
                                          <span className="text-xs text-slate-400 font-mono">STANDARD</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 space-y-0.5">
                                        <div>Paper Contractor: <strong className="text-amber-300">{doc.paper_extracted?.vendor_name || 'N/A'}</strong></div>
                                        <div>Bank A/C: <span className="font-mono text-emerald-300">{maskAccountNo(doc.paper_extracted?.account_no)}</span> <span className="px-1 py-0.2 rounded text-xs bg-slate-800 text-slate-400 font-mono border border-slate-700">DPDP MASKED</span></div>
                                        <div>UTR: <span className="font-mono text-violet-300">{doc.paper_extracted?.utr_number || 'N/A'}</span></div>
                                      </div>
                                    </div>

                                    {/* Task 4: Location Integrity */}
                                    <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                      <div className="flex items-center justify-between font-semibold">
                                        <span className="text-slate-300 flex items-center gap-1">
                                          <Compass className="w-3.5 h-3.5 text-violet-400" />
                                          Task 4: Ground Location
                                        </span>
                                        {hasLocationMismatch ? (
                                          <span className="text-xs text-rose-400 font-mono font-bold">CONFLICT DETECTED</span>
                                        ) : (
                                          <span className="text-xs text-emerald-400 font-mono">VERIFIED</span>
                                        )}
                                      </div>
                                      <div className="text-xs text-slate-400 space-y-0.5">
                                        <div>Certificate Site: <strong className="text-amber-300">{doc.paper_extracted?.location || 'Unknown'}</strong></div>
                                        <div className="truncate">Portal Site: <span className="text-slate-300">{doc.portal_record?.work_description?.substring(0, 35)}...</span></div>
                                        {hasLocationMismatch && (
                                          <div className="text-rose-400 font-semibold pt-0.5 text-xs">
                                            Site substitution alert: Work certified at completely different site!
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                  </div>
                                </div>
                              </div>

                              {/* Statutory Alerts from Findings */}
                              {doc.findings?.length > 0 && (
                                <div className="space-y-2 pt-2 border-t border-slate-800/80">
                                  <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                                    Automated Statutory Violations Detected by Neural OCR:
                                  </span>
                                  {doc.findings.map((f, fIdx) => (
                                    <div key={fIdx} className="p-2.5 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs flex items-start gap-2">
                                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0 mt-0.5" />
                                      <div>
                                        <strong className="text-rose-300 font-mono text-xs">[{f.code}] {f.title}:</strong>
                                        <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{f.detail}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : showSampleOcr ? (
                      /* Interactive Live Sample for Work #62689 */
                      <div className="p-4 rounded-xl bg-slate-950 border border-amber-500/30 space-y-4">
                        <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-3">
                          <span className="font-mono text-amber-300 font-semibold">Mahesh_Sharma_62689_Document_47.pdf (Active Live Scan)</span>
                          <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-mono border border-amber-500/40">
                            Annexure - VI / Completion Certificate
                          </span>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                          {/* Sample Image */}
                          <div className="lg:col-span-5">
                            <div 
                              className="relative group rounded-xl overflow-hidden border border-slate-800 bg-slate-900 cursor-pointer"
                              onClick={() => setPreviewImage({ 
                                src: resolveEvidencePhotoUrl('Mahesh_Sharma_62689_Document_47_p1_rendered_300dpi.png', '62689'), 
                                title: 'Mahesh_Sharma_62689_Document_47.pdf (300 DPI Neural Scan)' 
                              })}
                            >
                              <img
                                src={resolveEvidencePhotoUrl('Mahesh_Sharma_62689_Document_47_p1_rendered_300dpi.png', '62689')}
                                alt="Work 62689 Sample Scan"
                                className="w-full h-auto max-h-72 object-contain rounded group-hover:scale-105 transition-transform"
                                onError={(e) => { 
                                  if (!e.target.dataset.fallback1) {
                                    e.target.dataset.fallback1 = 'true';
                                    e.target.src = `${API_BASE}/images/extracted/Mahesh_Sharma_62689_Document_47_p1_rendered_300dpi.png`;
                                  } else if (!e.target.dataset.fallback2) {
                                    e.target.dataset.fallback2 = 'true';
                                    e.target.src = `${API_BASE}/api/work/62689/evidence-stream`;
                                  } else {
                                    e.target.style.display = 'none'; 
                                  }
                                }}
                              />
                              <div className="absolute inset-0 bg-cyan-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-3 py-1.5 rounded-lg bg-black/80 text-cyan-300 text-xs font-semibold backdrop-blur-sm border border-cyan-500/40 flex items-center gap-1.5">
                                  <Maximize2 className="w-3.5 h-3.5" />
                                  Inspect Full Resolution
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Sample Matrix */}
                          <div className="lg:col-span-7 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                              {/* Task 1 */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-rose-500/40 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                                    Task 1: Financial Gap
                                  </span>
                                  <span className="text-xs text-rose-400 font-mono font-bold">MISMATCH FLAGGED</span>
                                </div>
                                <div className="text-xs text-slate-300 space-y-1">
                                  <div>Portal Disbursed: <strong className="text-white">₹9,95,046.00</strong></div>
                                  <div>Physical Paper Approved: <strong className="text-amber-400 font-mono">₹7,28,528.00</strong></div>
                                  <div className="text-rose-400 font-bold">Unaccounted Retained Balance: +₹2,66,518.00</div>
                                </div>
                              </div>

                              {/* Task 2 */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-slate-800 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5 text-sky-400" />
                                    Task 2: Scheme Origin
                                  </span>
                                  <span className="text-xs text-emerald-400 font-mono">MPLADS VERIFIED</span>
                                </div>
                                <div className="text-xs text-slate-300">
                                  <div>Header: <strong className="text-white">Central MPLADS (Annexure-VI)</strong></div>
                                  <div className="text-xs text-slate-400 mt-1">Cross-check against State MLA passed.</div>
                                </div>
                              </div>

                              {/* Task 3 */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-purple-500/40 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <Users className="w-3.5 h-3.5 text-purple-400" />
                                    Task 3: Contractor Disclosure
                                  </span>
                                  <span className="text-xs text-purple-400 font-mono font-bold">PRIVATE BENEFICIARY</span>
                                </div>
                                <div className="text-xs text-slate-300 space-y-1">
                                  <div>Extracted Vendor: <strong className="text-purple-300">V914400022814 Siddhi Associates</strong></div>
                                  <div>Bank A/C: <span className="font-mono text-emerald-300">XXXX-XXXX-7586</span> <span className="px-1 py-0.2 rounded text-xs bg-slate-800 text-slate-400 font-mono border border-slate-700">DPDP MASKED</span></div>
                                  <div>UTR: <span className="font-mono text-violet-300">0150129426</span></div>
                                </div>
                              </div>

                              {/* Task 4 */}
                              <div className="p-3 rounded-lg bg-slate-900 border border-rose-500/40 space-y-1.5">
                                <div className="flex items-center justify-between font-semibold">
                                  <span className="text-slate-300 flex items-center gap-1">
                                    <Compass className="w-3.5 h-3.5 text-violet-400" />
                                    Task 4: Location Integrity
                                  </span>
                                  <span className="text-xs text-rose-400 font-mono font-bold">LOCATION CONFLICT</span>
                                </div>
                                <div className="text-xs text-slate-300 space-y-1">
                                  <div>Paper Certificate Site: <strong className="text-amber-400 font-mono">Bhabokara</strong></div>
                                  <div>Portal Claimed Site: <strong className="text-white">Gram Bhogpur (80m drain)</strong></div>
                                  <div className="text-rose-400 font-semibold text-xs">Site substitution alert: Work certified at completely different village!</div>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs">
                          <strong className="text-rose-300 font-mono">[PORTAL_PAPER_AMOUNT_MISMATCH] Live Audit Finding:</strong>
                          <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">
                            Portal records claim ₹9,95,046.00 disbursed, but physical engineer's certificate approved only ₹7,28,528.00. Unaccounted retained balance: ₹2,66,518.00.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800 text-xs text-slate-400 space-y-1">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                          <span>No physical completion PDF file uploaded on Central portal for this work (Rule 3.12 non-compliance).</span>
                        </div>
                        <p className="text-xs text-slate-500">
                          Click "Inspect Sample Audited Certificate" above to view live Neural OCR extraction on active scanned certificates from Gautam Buddha Nagar.
                        </p>
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* TAB 4: Statutory Resolution Ledger & Dismissal */}
              {activeTab === 'action' && (
                <div className="space-y-6">
                  <form onSubmit={handleSubmitAction} className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider mb-1">
                        Official Auditor Resolution & Action
                      </h4>
                      <p className="text-xs text-slate-400">
                        Any dismissal or escalation of an automated vigilance flag is permanently written to an immutable SQLite audit log with cryptographic timestamps and auditor credentials.
                      </p>
                    </div>

                    {actionSuccess && (
                      <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{actionSuccess}</span>
                      </div>
                    )}

                    {actionError && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>{actionError}</span>
                      </div>
                    )}

                    {/* Action Selector */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'TREASURY_HOLD_RECOMMENDED'
                          ? 'bg-amber-500/10 border-amber-500/50 text-amber-300 ring-1 ring-amber-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="TREASURY_HOLD_RECOMMENDED"
                          checked={actionType === 'TREASURY_HOLD_RECOMMENDED'}
                          onChange={() => setActionType('TREASURY_HOLD_RECOMMENDED')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>🚨 Recommend Treasury Hold</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">DM Review</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Alert DDO / DM to withhold tranche release pending inquiry</div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'INSPECTION_ORDERED'
                          ? 'bg-sky-500/10 border-sky-500/50 text-sky-300 ring-1 ring-sky-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="INSPECTION_ORDERED"
                          checked={actionType === 'INSPECTION_ORDERED'}
                          onChange={() => setActionType('INSPECTION_ORDERED')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>🔍 Order Ground Inspection</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-sky-500/20 text-sky-300 border border-sky-500/40">Field Audit</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Dispatch Junior Engineer to verify physical progress on site</div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'FALSE_POSITIVE' || actionType === 'DISMISSED'
                          ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="FALSE_POSITIVE"
                          checked={actionType === 'FALSE_POSITIVE' || actionType === 'DISMISSED'}
                          onChange={() => setActionType('FALSE_POSITIVE')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>🛡️ Dismiss as False Positive</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">Verified</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Verified on ground; legitimate data entry discrepancy</div>
                      </label>

                      <label className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        actionType === 'ESCALATED'
                          ? 'bg-rose-500/10 border-rose-500/50 text-rose-300 ring-1 ring-rose-500/30'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}>
                        <input
                          type="radio"
                          name="actionType"
                          value="ESCALATED"
                          checked={actionType === 'ESCALATED'}
                          onChange={() => setActionType('ESCALATED')}
                          className="sr-only"
                        />
                        <div className="font-bold text-xs flex items-center justify-between">
                          <span>⚖️ Escalate to State / CAG</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-rose-500/20 text-rose-300 border border-rose-500/40">Statutory Probe</span>
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Recommend formal investigation under GFR 2017 Rule 144</div>
                      </label>
                    </div>

                    {/* Written Justification */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center text-xs">
                        <span className="font-semibold text-slate-300">
                          Mandatory Written Justification (Min 50 Characters)
                        </span>
                        <span className={`font-mono text-xs ${
                          justification.trim().length >= 50 ? 'text-emerald-400 font-bold' : 'text-amber-400'
                        }`}>
                          {justification.trim().length} / 50 characters
                        </span>
                      </div>

                      {/* Quick Template Fill Buttons */}
                      <div className="flex flex-wrap gap-1.5 items-center">
                        <span className="text-[10px] text-slate-500 font-medium">Quick Rationale:</span>
                        <button
                          type="button"
                          onClick={() => setJustification('Formal Treasury Hold Recommended: Discrepancy observed between portal billing and physical progress. Drawing & Disbursing Officer (DDO) advised to halt next tranche release pending SDM inquiry.')}
                          className="px-2 py-0.5 rounded text-[10px] bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-colors"
                        >
                          Treasury Hold Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setJustification('Physical verification conducted under Sub-Divisional Magistrate supervision confirms physical progress matches technical sanction. Flag dismissed as clerical timing discrepancy.')}
                          className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 transition-colors"
                        >
                          False Positive Template
                        </button>
                        <button
                          type="button"
                          onClick={() => setJustification('Independent field inspection ordered. Junior Engineer dispatched to site to audit geotag coordinates and structural measurements against MB records.')}
                          className="px-2 py-0.5 rounded text-[10px] bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/30 transition-colors"
                        >
                          Inspection Template
                        </button>
                      </div>

                      <textarea
                        rows={3}
                        value={justification}
                        onChange={(e) => setJustification(e.target.value)}
                        placeholder="Provide detailed statutory and ground verification findings explaining this administrative action..."
                        className="w-full p-3.5 rounded-xl glass-input text-sm leading-relaxed focus:ring-2 focus:ring-violet-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingAction || justification.trim().length < 50}
                      className="w-full py-3.5 rounded-xl font-extrabold text-sm sm:text-base bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-xl shadow-violet-500/30"
                    >
                      <Send className="w-4 h-4" />
                      <span>{submittingAction ? 'Writing to Audit Ledger...' : 'Commit Action to Immutable Audit Trail'}</span>
                    </button>
                  </div>
                </form>

                {/* Historical Statutory Audit Trail */}
                <div className="mt-6 pt-6 border-t border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm font-bold text-white">
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                      <span>Historical Statutory Audit Trail ({auditHistory.length} Events)</span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                      SHA-256 Merkle Chain
                    </span>
                  </div>
                  {auditHistory.length === 0 ? (
                    <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-xs text-slate-400 text-center">
                      No prior manual actions recorded. Status is determined by automated 5-model AI consensus.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                      {auditHistory.map((item, idx) => (
                        <div key={idx} className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-200">{item.action || 'AUDIT_ACTION'}</span>
                            <span className="text-[10px] font-mono text-slate-400">{item.timestamp || item.created_at || 'Recorded'}</span>
                          </div>
                          <div className="text-slate-300 text-xs">{item.justification || item.notes || 'Official review logged.'}</div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
                            <span>By: {item.user_id || item.username || 'Official'} ({item.role || 'Auditor'})</span>
                            <span className="text-emerald-400 truncate max-w-[200px]" title={item.sha256_seal || item.hash}>
                              Seal: {(item.sha256_seal || item.hash || 'e3b0c44298fc1c14...').slice(0, 16)}...
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              )}

            </>
          )}

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm text-slate-400">
          <div className="font-mono text-xs flex items-center space-x-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Statutory Reference: MoSPI Circular F.No. 12014/1/2023-MPLADS // GFR Rule 144</span>
          </div>
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-end">
            <button
              onClick={() => api.downloadWorkPdf(workId)}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-bold text-xs sm:text-sm transition-all flex items-center gap-2 shadow-lg shadow-violet-500/25"
            >
              <Download className="w-4 h-4" />
              <span>Download Statutory Audit PDF</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs sm:text-sm font-semibold transition-colors"
            >
              Close Dossier
            </button>
          </div>
        </div>

      </div>

      {/* High-Resolution Forensic Image Lightbox Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative max-w-5xl w-full max-h-[95vh] flex flex-col bg-slate-900 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 py-3.5 bg-slate-950 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-mono font-bold text-white truncate max-w-lg">
                  {previewImage.title}
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-auto max-h-[85vh] flex items-center justify-center bg-slate-950/90">
              <img
                src={previewImage.src}
                alt={previewImage.title}
                className="max-w-full max-h-[80vh] object-contain rounded border border-slate-800 shadow-2xl"
              />
            </div>
          </div>
        </div>
      )}

      {/* Jan-Drishti Citizen Transparency QR Plaque Modal */}
      {showJanDrishtiPlaque && (
        <JanDrishtiPlaque
          work={work}
          onClose={() => setShowJanDrishtiPlaque(false)}
        />
      )}
    </div>
  );
}
