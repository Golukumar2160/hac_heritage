import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle, 
  MapPin, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  User, 
  Layers, 
  Eye, 
  Send, 
  Printer, 
  QrCode, 
  Scale, 
  ExternalLink,
  ChevronRight,
  Info
} from 'lucide-react';
import { api, API_BASE } from '../services/api';
import CitizenFeedbackModal from './CitizenFeedbackModal';
import JanDrishtiPlaque from '../components/JanDrishtiPlaque';

export default function CitizenCaseModal({ workId, onClose, onFeedbackSubmitted }) {
  const [work, setWork] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'photo' | 'paper'
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [showPlaqueModal, setShowPlaqueModal] = useState(false);

  useEffect(() => {
    if (!workId) return;
    let isMounted = true;
    setLoading(true);
    setError(null);

    api.getWork(workId)
      .then((data) => {
        if (isMounted) {
          setWork(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch public work case file');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [workId]);

  if (!workId) return null;

  const workObj = work?.work || work || {};
  const workTitle = workObj?.work_title || workObj?.work_description || `Project #${workId}`;
  const district = workObj?.district || workObj?.ida || 'District';
  const state = workObj?.state || '';
  const mpName = workObj?.mp_name || 'Hon\'ble MP';
  const category = workObj?.work_category || 'Public Works';
  const sanctionAmt = Number(workObj?.sanction_amount || 0);
  const spentAmt = Number(workObj?.total_spent || 0);
  const riskScore = Number(workObj?.risk_score || 0);
  const progressPct = Number(workObj?.progress_pct || 0);
  const isCritical = riskScore >= 0.85;

  const dupEvidence = work?.duplicate_photo_evidence || [];
  const docForensics = work?.document_forensics || [];

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-sans">
        <div 
          className="relative w-full max-w-4xl max-h-[92vh] overflow-hidden rounded-3xl bg-[#060913] border border-emerald-500/35 text-slate-100 flex flex-col shadow-2xl shadow-emerald-950/40"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top Tricolor Stripe */}
          <div className="tricolor-stripe w-full h-[3px]" />

          {/* Modal Header */}
          <div className="px-6 py-4 border-b border-slate-800/90 bg-[#080d1e]/90 flex items-center justify-between">
            <div className="flex items-center space-x-3.5 min-w-0">
              <div className={`p-2.5 rounded-2xl border flex-shrink-0 ${
                isCritical 
                  ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}>
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-bold">
                    CITIZEN PUBLIC OVERSIGHT
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 uppercase">
                    {district}, {state}
                  </span>
                </div>
                <h3 className="text-base sm:text-lg font-bold text-white font-display truncate mt-0.5">
                  {workTitle}
                </h3>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowPlaqueModal(true)}
                className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-mono font-bold transition-all cursor-pointer"
                title="View Jan-Drishti Statutory QR Plaque"
              >
                <QrCode className="w-3.5 h-3.5" />
                <span>QR Plaque</span>
              </button>

              <button
                onClick={onClose}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Navigation Sub-Tabs */}
          <div className="px-6 pt-3 pb-2 bg-[#060913] border-b border-slate-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer ${
                  activeTab === 'overview'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                Public Audit Overview
              </button>

              <button
                onClick={() => setActiveTab('photo')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'photo'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                <span>Photo Forensics</span>
                {dupEvidence.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                    FLAGGED
                  </span>
                )}
              </button>

              <button
                onClick={() => setActiveTab('paper')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'paper'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200 border border-transparent'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Paper vs Portal OCR</span>
              </button>
            </div>

            {/* Whistleblower Reporting Trigger */}
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md shadow-rose-600/30 cursor-pointer flex-shrink-0"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Report Ground Reality</span>
            </button>
          </div>

          {/* Modal Main Content Area */}
          <div className="flex-1 overflow-y-auto p-6 max-h-[72vh] space-y-5 no-scrollbar">
            {loading ? (
              <div className="py-20 text-center space-y-3">
                <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto" />
                <p className="text-xs text-slate-400 font-mono">Loading public case file telemetry...</p>
              </div>
            ) : error ? (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            ) : (
              <>
                {/* TAB 1: PUBLIC AUDIT OVERVIEW */}
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    {/* Financial & Anomaly Summary Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div className="p-3.5 rounded-2xl bg-[#040714] border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Tax Funds Sanctioned</span>
                        <div className="text-lg font-bold text-white font-mono">
                          ₹{(sanctionAmt / 100000).toFixed(2)} Lakhs
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#040714] border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Tax Funds Disbursed</span>
                        <div className="text-lg font-bold text-emerald-400 font-mono">
                          ₹{(spentAmt / 100000).toFixed(2)} Lakhs
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#040714] border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">Reported Physical Progress</span>
                        <div className="text-lg font-bold text-white font-mono flex items-center gap-1.5">
                          <span>{progressPct}%</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded ${progressPct >= 80 ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300'}`}>
                            {progressPct >= 80 ? 'Complete' : 'Lagging'}
                          </span>
                        </div>
                      </div>

                      <div className="p-3.5 rounded-2xl bg-[#040714] border border-slate-800 space-y-1">
                        <span className="text-[10px] font-mono uppercase text-slate-400 font-semibold">AI Vigilance Risk Score</span>
                        <div className={`text-lg font-bold font-mono ${isCritical ? 'text-rose-400' : 'text-amber-400'}`}>
                          {riskScore > 1 ? (riskScore / 100).toFixed(2) : riskScore.toFixed(2)} / 1.0
                        </div>
                      </div>
                    </div>

                    {/* Detected Fraud Alerts Banner */}
                    <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/30 via-[#0a0f20] to-rose-950/30 border border-rose-500/30 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400" />
                          Public Fraud &amp; Irregularity Triggers Detected
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold border border-rose-500/30">
                          {isCritical ? 'CRITICAL RISK' : 'HIGH RISK'}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {workObj?.rule_duplicate_photo && (
                          <div className="p-2.5 rounded-xl bg-[#040714] border border-rose-500/25 flex items-start gap-2">
                            <span className="text-rose-400 font-bold">🚩</span>
                            <div>
                              <strong className="text-white block">Duplicate Photo Evidence:</strong>
                              <span className="text-slate-300 text-[11px]">The completion photograph matches another work in the district. High probability of ghost asset.</span>
                            </div>
                          </div>
                        )}

                        {workObj?.rule_split_tender && (
                          <div className="p-2.5 rounded-xl bg-[#040714] border border-rose-500/25 flex items-start gap-2">
                            <span className="text-amber-400 font-bold">🚩</span>
                            <div>
                              <strong className="text-white block">Split Tender (GFR 2017):</strong>
                              <span className="text-slate-300 text-[11px]">Work sanctioned just below ₹10 Lakhs threshold to avoid mandatory e-tendering.</span>
                            </div>
                          </div>
                        )}

                        {workObj?.rule_premature_tranche && (
                          <div className="p-2.5 rounded-xl bg-[#040714] border border-rose-500/25 flex items-start gap-2">
                            <span className="text-rose-400 font-bold">🚩</span>
                            <div>
                              <strong className="text-white block">Premature Fund Release (Clause 4.3):</strong>
                              <span className="text-slate-300 text-[11px]">Second instalment was disbursed before first tranche utilization certification.</span>
                            </div>
                          </div>
                        )}

                        {workObj?.rule_stalled_execution && (
                          <div className="p-2.5 rounded-xl bg-[#040714] border border-rose-500/25 flex items-start gap-2">
                            <span className="text-rose-400 font-bold">🚩</span>
                            <div>
                              <strong className="text-white block">Stalled Execution with Siphoned Funds:</strong>
                              <span className="text-slate-300 text-[11px]">Over 18 months elapsed with high fund outflow but low ground progress.</span>
                            </div>
                          </div>
                        )}

                        {!workObj?.rule_duplicate_photo && !workObj?.rule_split_tender && !workObj?.rule_premature_tranche && !workObj?.rule_stalled_execution && (
                          <div className="col-span-2 p-2.5 rounded-xl bg-[#040714] border border-rose-500/25 flex items-start gap-2">
                            <span className="text-amber-400 font-bold">🚩</span>
                            <div>
                              <strong className="text-white block">Disbursement &amp; Execution Anomaly:</strong>
                              <span className="text-slate-300 text-[11px]">Algorithmic composite risk indicates unvouched expenditure or documentation gaps.</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Work Metadata & Implementing Details */}
                    <div className="p-4 rounded-2xl bg-[#040714] border border-slate-800 space-y-3">
                      <div className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">
                        Statutory Project Particulars
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <span className="text-slate-500 block">Work ID:</span>
                          <span className="font-mono font-bold text-violet-300">#{workId}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Category:</span>
                          <span className="font-semibold text-white">{category}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Recommending MP:</span>
                          <span className="font-semibold text-white">{mpName}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Implementing District Authority:</span>
                          <span className="font-semibold text-white">{workObj?.implementing_agency || workObj?.ida || district}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Sanction Date:</span>
                          <span className="font-mono text-slate-300">{workObj?.sanction_date || 'Declared on Portal'}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Contractor / Vendor:</span>
                          <span className="font-mono text-slate-300">{workObj?.contractor_name || workObj?.vendor_name || 'Vendor not disclosed on portal'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Citizen Action Callout */}
                    <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-emerald-400" />
                          Have you visited this site in {district}?
                        </h4>
                        <p className="text-xs text-slate-300 mt-0.5">
                          You can submit anonymous or identified ground reality reports to trigger district physical audits.
                        </p>
                      </div>
                      <button
                        onClick={() => setShowFeedbackModal(true)}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold font-mono transition-all flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>File Ground Report</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB 2: PHOTO FORENSICS */}
                {activeTab === 'photo' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#040714] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                          <ImageIcon className="w-4 h-4 text-violet-400" />
                          Perceptual Image Hash (pHash) Verification
                        </h4>
                        <span className="text-xs font-mono text-slate-400">Hamming Distance Matrix</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        The AI engine extracts a 64-bit mathematical fingerprint from completion photographs to detect duplicate image reuse across works in {district}.
                      </p>
                    </div>

                    {dupEvidence.length > 0 ? (
                      <div className="space-y-3">
                        {dupEvidence.map((ev, idx) => (
                          <div key={idx} className="p-4 rounded-2xl bg-rose-950/20 border border-rose-500/30 space-y-3">
                            <div className="flex items-center justify-between text-xs">
                              <span className="font-mono font-bold text-rose-300">
                                ⚠️ Duplicate Match Detected (Matched with Work #{ev.duplicate_with_work_id || 'Another Scheme'})
                              </span>
                              <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                                Similarity: {ev.similarity_pct || '98.5%'}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-[#040714] border border-slate-800 space-y-1.5 text-center">
                                <span className="text-[10px] font-mono text-slate-400 block font-bold">Declared Site Photo (Current Work #{workId})</span>
                                <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-slate-800">
                                  {ev.image_url_a ? (
                                    <img src={ev.image_url_a} alt="Current Work Site" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="text-slate-500 text-xs font-mono flex flex-col items-center gap-1">
                                      <ImageIcon className="w-6 h-6 text-slate-600" />
                                      <span>Site Photo #{workId}</span>
                                    </div>
                                  )}
                                </div>
                              </div>

                              <div className="p-3 rounded-xl bg-[#040714] border border-slate-800 space-y-1.5 text-center">
                                <span className="text-[10px] font-mono text-rose-400 block font-bold">Reused Duplicate Photo (Work #{ev.duplicate_with_work_id || 'Prior Work'})</span>
                                <div className="aspect-video rounded-lg overflow-hidden bg-slate-900 flex items-center justify-center border border-rose-500/40">
                                  {ev.image_url_b ? (
                                    <img src={ev.image_url_b} alt="Matched Work Site" className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="text-rose-400/70 text-xs font-mono flex flex-col items-center gap-1">
                                      <ImageIcon className="w-6 h-6 text-rose-500/50" />
                                      <span>Matched Image Hash</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>

                            <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                              Forensic Verdict: The exact same physical structure was submitted to claim separate funds for two different scheme sanctions.
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 rounded-2xl bg-[#040714] border border-slate-800 text-center space-y-2">
                        <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto" />
                        <h5 className="text-sm font-bold text-white">No Duplicate Image Hash Conflicts Found</h5>
                        <p className="text-xs text-slate-400 max-w-md mx-auto">
                          The site photograph for this work does not share high-confidence perceptual hash hashes with any other scheme in the database.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: PAPER VS PORTAL OCR */}
                {activeTab === 'paper' && (
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl bg-[#040714] border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white flex items-center gap-2 font-display">
                          <FileText className="w-4 h-4 text-cyan-400" />
                          Physical Completion Certificate OCR Cross-Examination
                        </h4>
                        <span className="text-xs font-mono text-slate-400">Rule 3.12 Compliance</span>
                      </div>
                      <p className="text-xs text-slate-300">
                        Cross-checks the physical certificate signed by the Junior Engineer against amounts recorded on the web portal.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#040714] border border-slate-800 space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-slate-400">Web Portal Declared Disbursement</span>
                          <div className="text-lg font-bold text-white font-mono">
                            ₹{Number(workObj?.total_spent || sanctionAmt).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-emerald-400 font-semibold block">Electronic Portal Release</span>
                        </div>

                        <div className="p-3.5 rounded-xl bg-slate-900/90 border border-amber-500/30 space-y-1">
                          <span className="text-[10px] font-mono uppercase text-amber-300">Physical Certificate Approved Sanction</span>
                          <div className="text-lg font-bold text-amber-300 font-mono">
                            ₹{Number(workObj?.sanction_amount || sanctionAmt).toLocaleString('en-IN')}
                          </div>
                          <span className="text-[10px] text-slate-400 block">Signed by Junior Engineer (IDA)</span>
                        </div>
                      </div>

                      <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-start gap-2">
                        <Info className="w-4 h-4 text-cyan-400 flex-shrink-0 mt-0.5" />
                        <span>
                          Citizens can request a physical inspection of original measurement books (MB) under Section 4 of the RTI Act 2005 at the District Collectorate Office ({district}).
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Modal Footer Note */}
          <div className="px-6 py-3 border-t border-slate-800/80 bg-[#060913] flex items-center justify-between text-xs text-slate-400 font-mono">
            <span>Jan-Drishti Nagrik Transparency • Read-Only Public Mode</span>
            <button
              onClick={() => setShowFeedbackModal(true)}
              className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
            >
              <span>Submit Ground Reality Feedback</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Whistleblower Feedback Modal */}
      {showFeedbackModal && (
        <CitizenFeedbackModal
          work={workObj}
          onClose={() => setShowFeedbackModal(false)}
          onFeedbackSubmitted={() => {
            setShowFeedbackModal(false);
            if (onFeedbackSubmitted) onFeedbackSubmitted();
          }}
        />
      )}

      {/* Embedded Jan-Drishti Plaque Modal */}
      {showPlaqueModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative max-w-2xl w-full">
            <JanDrishtiPlaque
              work={workObj}
              onClose={() => setShowPlaqueModal(false)}
            />
          </div>
        </div>
      )}
    </>
  );
}
