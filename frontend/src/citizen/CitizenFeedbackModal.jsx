import React, { useState } from 'react';
import { 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Send, 
  ShieldAlert, 
  Camera, 
  MapPin, 
  FileWarning, 
  User, 
  Phone
} from 'lucide-react';
import { api } from '../services/api';

export default function CitizenFeedbackModal({ work, onClose, onFeedbackSubmitted }) {
  const workObj = work?.work || work || {};
  const workId = workObj?.work_id || workObj?.id || '';
  const workTitle = workObj?.work_title || workObj?.work_description || `Project #${workId}`;
  const district = workObj?.district || workObj?.ida || 'District';
  const state = workObj?.state || '';

  const [reportType, setReportType] = useState('ghost_asset');
  const [description, setDescription] = useState('');
  const [citizenName, setCitizenName] = useState('');
  const [citizenContact, setCitizenContact] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);

  const reportCategories = [
    {
      id: 'ghost_asset',
      label: 'Ghost Infrastructure / Asset Does Not Exist',
      desc: 'No physical asset or construction was ever built at the declared village / GPS site.',
      icon: ShieldAlert,
      badge: 'GHOST ASSET'
    },
    {
      id: 'incomplete_work',
      label: 'Stalled / Incomplete Construction',
      desc: 'Funds claim 100% completion, but work was abandoned midway without functioning.',
      icon: FileWarning,
      badge: 'STALLED WORK'
    },
    {
      id: 'substandard_quality',
      label: 'Substandard / Defective Construction',
      desc: 'Low-quality cement, crumbling brickwork, or broken machinery within days of installation.',
      icon: AlertTriangle,
      badge: 'DEFECTIVE'
    },
    {
      id: 'mislocated_asset',
      label: 'Mislocated / Built on Private Property',
      desc: 'Public tax funds used to build private property or asset diverted to another village.',
      icon: MapPin,
      badge: 'DIVERSION'
    },
    {
      id: 'repainted_old',
      label: 'Old Project Repainted as New',
      desc: 'An old pre-existing government scheme repainted with a new MPLADS plaque.',
      icon: Camera,
      badge: 'DUPLICATE'
    }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!description.trim() || description.trim().length < 15) {
      setError('Please provide a brief description with at least 15 characters of ground details.');
      return;
    }

    setError('');
    setSubmitting(true);
    try {
      const payload = {
        report_type: reportType,
        description: description.trim(),
        citizen_name: isAnonymous ? 'Anonymous Citizen Whistleblower' : (citizenName.trim() || 'Citizen Vigilance Watchdog'),
        citizen_contact: isAnonymous ? '' : citizenContact.trim(),
      };

      const res = await api.submitCitizenFeedback(workId, payload);
      setSuccessReceipt({
        reportId: res?.report_id || Math.floor(100000 + Math.random() * 900000),
        message: res?.message || 'Ground reality feedback registered in the official vigilance ledger.',
        timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
      });
      if (onFeedbackSubmitted) {
        onFeedbackSubmitted();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit citizen feedback. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200 font-sans">
      <div 
        className="relative w-full max-w-2xl overflow-hidden rounded-3xl bg-[#060913] border border-emerald-500/30 text-slate-100 flex flex-col shadow-2xl shadow-emerald-950/40"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tricolor top border */}
        <div className="tricolor-stripe w-full h-[3px]" />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800/90 bg-[#080d1e]/90 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 font-bold">
                  JAN-DRISHTI CITIZEN VIGILANCE
                </span>
                <span className="text-slate-500 text-xs">•</span>
                <span className="text-[10px] font-mono text-slate-400 font-semibold uppercase">
                  {district}{state ? `, ${state}` : ''}
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display">
                Report Ground Reality / Fraud
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body or Success Confirmation */}
        <div className="p-6 max-h-[82vh] overflow-y-auto no-scrollbar space-y-4">
          {successReceipt ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
                <CheckCircle className="w-9 h-9" />
              </div>
              <div>
                <h4 className="text-lg font-bold text-white font-display">
                  Citizen Vigilance Report Lodged
                </h4>
                <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto mt-1">
                  {successReceipt.message}
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#040714] border border-emerald-500/20 max-w-md mx-auto text-left font-mono text-xs space-y-2">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Tracking Ref ID:</span>
                  <span className="font-bold text-emerald-300">#JD-VIG-{successReceipt.reportId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Target Work:</span>
                  <span className="text-white truncate max-w-[200px]">#{workId}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Timestamp:</span>
                  <span className="text-slate-300">{successReceipt.timestamp}</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Status:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    QUEUED FOR DISTRICT AUDIT
                  </span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 max-w-md mx-auto leading-relaxed">
                Your report has been logged into the public vigilance register. It will be surfaced to the State Nodal Authority and the District Collector for mandatory site re-inspection.
              </p>

              <button
                onClick={onClose}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 cursor-pointer"
              >
                Close Window
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Target Project Summary Banner */}
              <div className="p-3.5 rounded-2xl bg-[#040714] border border-slate-800 space-y-1">
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold">
                  Reporting on Public Work
                </div>
                <div className="text-sm font-bold text-white leading-tight">
                  {workTitle}
                </div>
                <div className="text-xs text-slate-400 font-mono flex items-center gap-3 pt-0.5">
                  <span>ID: <strong className="text-violet-300">#{workId}</strong></span>
                  <span>•</span>
                  <span>District: <strong className="text-slate-200">{district}</strong></span>
                  {workObj?.sanction_amount && (
                    <>
                      <span>•</span>
                      <span>Sanction: <strong className="text-emerald-400">₹{(Number(workObj.sanction_amount) / 100000).toFixed(2)} L</strong></span>
                    </>
                  )}
                </div>
              </div>

              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span>{error}</span>
                </div>
              )}

              {/* Step 1: Select Discrepancy Category */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-2 font-mono">
                  1. Nature of Ground Discrepancy <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {reportCategories.map((cat) => {
                    const Icon = cat.icon;
                    const isSelected = reportType === cat.id;
                    return (
                      <button
                        type="button"
                        key={cat.id}
                        onClick={() => setReportType(cat.id)}
                        className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                            : 'bg-[#040714] border-slate-800/90 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-bold mb-1">
                          <span className="flex items-center gap-1.5 truncate">
                            <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isSelected ? 'text-emerald-400' : 'text-slate-500'}`} />
                            <span className="truncate">{cat.badge}</span>
                          </span>
                          {isSelected && (
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-tight">
                          {cat.desc}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Step 2: Ground Reality Description */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-200 mb-1.5 font-mono flex items-center justify-between">
                  <span>2. Ground Reality Description <span className="text-rose-400">*</span></span>
                  <span className="text-[10px] text-slate-400 font-mono">Min 15 chars</span>
                </label>
                <textarea
                  required
                  rows={3}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Describe what you observed on ground. For example: 'I visited the site in village Bhogpur. No solar street lights have been installed even though the portal shows completed. The funds have been withdrawn.'"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-xs sm:text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-500/20 placeholder-slate-500 font-sans"
                />
              </div>

              {/* Step 3: Citizen Contact / Anonymous Whistleblower Option */}
              <div className="p-3.5 rounded-2xl bg-[#040714]/80 border border-slate-800/90 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 font-mono uppercase tracking-wider">
                    3. Whistleblower Identity
                  </span>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isAnonymous}
                      onChange={(e) => setIsAnonymous(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                    <span className="text-xs text-emerald-400 font-mono font-semibold">
                      Submit Anonymously
                    </span>
                  </label>
                </div>

                {!isAnonymous && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Your Full Name (Optional)
                      </label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={citizenName}
                          onChange={(e) => setCitizenName(e.target.value)}
                          placeholder="e.g. Ramesh Chandra"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-mono text-slate-300 mb-1">
                        Phone / Contact (Optional)
                      </label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                          type="text"
                          value={citizenContact}
                          onChange={(e) => setCitizenContact(e.target.value)}
                          placeholder="e.g. 9876543210"
                          className="w-full pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                        />
                      </div>
                    </div>
                  </div>
                )}
                <p className="text-[10px] text-slate-400 leading-normal">
                  Citizen whistleblower submissions are protected under the Right to Information &amp; Jan-Drishti Vigilance protocols.
                </p>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold font-display text-sm uppercase tracking-wider transition-all shadow-xl shadow-emerald-500/25 active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {submitting ? (
                  <span>Recording Whistleblower Report...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Citizen Report to District Vigilance</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
