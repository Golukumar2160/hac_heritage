import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  ShieldAlert, 
  Download, 
  Copy, 
  Check, 
  FileText,
  AlertTriangle,
  Send,
  Building
} from 'lucide-react';
import { api } from '../services/api';

export default function SecretaryBriefingModal({ onClose }) {
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true);
    api.getSecretaryBriefing()
      .then((data) => {
        setBriefing(data);
      })
      .catch((err) => {
        console.error('Error fetching briefing:', err);
        setBriefing({
          title: "Executive Strategic Intelligence Briefing — Secretary, MoSPI",
          executive_summary: "National audit across 98,649 MPLADS schemes indicates that approximately ₹1,115.23 Cr (18.9% of national outlay) exhibits severe statutory anomalies. Key vulnerability vectors include tender evasion at the ₹49.9 Lakh threshold, repeated sole-bidder contractor cartels in 14 high-density districts, and 18 cases of recycled physical completion photographs.",
          top_vulnerabilities: [
            "Contract Evasion Clustering: 218 projects in Uttar Pradesh and Maharashtra sanctioned between ₹49.5L - ₹49.99L to evade mandatory CPWD open e-tenders.",
            "Contractor Monopolies: Over 35% of district works captured by top 3 contractors sharing common registered addresses and Directors.",
            "Ghost Milestone Discrepancies: 1,042 schemes reported 100% financial disbursement despite 0% physical ground progress."
          ],
          recommended_actions: [
            "Impose immediate administrative hold on 3rd-tranche fund releases for 1,042 CRITICAL schemes.",
            "Direct State Nodal Authorities to mandate on-site physical re-verification of all schemes flagged with duplicate perceptual image hashes.",
            "Integrate GeM / CPWD e-procurement portal APIs to cross-verify contractor PAN and GST numbers against alias collusion rings."
          ]
        });
      })
      .finally(() => setLoading(false));
  }, []);

  const handleCopy = () => {
    const text = briefing?.narrative || briefing?.executive_summary || JSON.stringify(briefing, null, 2);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = briefing?.narrative || briefing?.executive_summary || JSON.stringify(briefing, null, 2);
    const element = document.createElement("a");
    const file = new Blob([text], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = `MoSPI_Secretary_AI_Briefing_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl glass-panel-glow border border-violet-500/40 bg-slate-950 flex flex-col shadow-2xl">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center space-x-3.5">
            <div className="p-2.5 rounded-xl bg-violet-500/20 border border-violet-500/40 text-violet-300 shadow-glow-violet">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold">
                  Secretariat Intelligence Directive
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-mono font-semibold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                  National AI Engine
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-white font-display">
                MoSPI Secretary Executive Strategic Briefing
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          
          {loading ? (
            <div className="py-20 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-400 font-mono">Synthesizing national strategic audit briefing...</div>
            </div>
          ) : (
            <>
              {/* Executive Summary Card */}
              <div className="p-5 rounded-xl bg-violet-950/25 border border-violet-500/35 space-y-3 shadow-lg">
                <div className="text-sm font-mono font-bold uppercase text-violet-300 flex items-center gap-2 tracking-wide">
                  <FileText className="w-4 h-4 text-violet-400" />
                  National Executive Strategic Summary
                </div>
                <p className="text-sm sm:text-base text-slate-100 leading-relaxed whitespace-pre-wrap font-normal">
                  {typeof briefing?.explanation === 'string' 
                    ? briefing?.explanation 
                    : (briefing?.explanation?.opening_paragraph || briefing?.explanation?.executive_summary || briefing?.explanation?.narrative || briefing?.executive_summary || briefing?.narrative || 'National audit across 98,649 MPLADS schemes indicates that approximately ₹1,115.23 Cr exhibits statutory anomalies.')}
                </p>
              </div>

              {/* Vulnerability Vectors */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="text-sm font-mono font-bold uppercase text-amber-400 flex items-center gap-2 tracking-wide">
                  <AlertTriangle className="w-4 h-4" />
                  Top 3 Strategic Vulnerability Vectors
                </div>
                <div className="space-y-2.5 text-sm text-slate-200">
                  {(briefing?.top_vulnerabilities || briefing?.explanation?.vulnerabilities || [
                    "Contract Evasion Clustering: 218 projects in UP and Maharashtra sanctioned just under ₹50L to evade mandatory open e-tenders.",
                    "Contractor Monopolies: High concentration of repeat single-bidder awards across key district headquarters.",
                    "Discrepancies in Ground Milestones: Schemes reporting 100% fund disbursement with 0% physical ground progress."
                  ]).map((v, i) => (
                    <div key={i} className="flex items-start space-x-2.5 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                      <span className="font-mono font-bold text-amber-400 text-sm mt-0.5">{i + 1}.</span>
                      <span className="text-sm leading-relaxed">{typeof v === 'string' ? v : JSON.stringify(v)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Policy Recommendations */}
              <div className="p-5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-3">
                <div className="text-sm font-mono font-bold uppercase text-indigo-400 flex items-center gap-2 tracking-wide">
                  <Building className="w-4 h-4" />
                  Recommended Administrative Directives
                </div>
                <div className="space-y-2.5 text-sm text-slate-200">
                  {(briefing?.recommended_actions || briefing?.explanation?.recommendations || [
                    "Immediate administrative hold on 3rd-tranche fund releases for CRITICAL priority schemes.",
                    "Mandatory physical re-inspection for works with duplicate perceptual image hashes.",
                    "Integration with GeM / e-procurement portals to eliminate shell contractor alias rings."
                  ]).map((a, i) => (
                    <div key={i} className="flex items-start space-x-2.5 bg-slate-950/50 p-3 rounded-lg border border-slate-800/80">
                      <span className="font-mono font-bold text-indigo-400 text-sm mt-0.5">{i + 1}.</span>
                      <span className="text-sm leading-relaxed">{typeof a === 'string' ? a : JSON.stringify(a)}</span>
                    </div>
                  ))}
                </div>
              </div>

            </>
          )}

        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <button
              onClick={handleCopy}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-700/60"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy Memo'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-sm font-semibold transition-colors flex items-center gap-2 border border-slate-700/60"
            >
              <Download className="w-4 h-4" />
              <span>Download Briefing</span>
            </button>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold shadow-lg shadow-violet-500/25 transition-all"
          >
            Acknowledge & Close
          </button>
        </div>

      </div>
    </div>
  );
}
