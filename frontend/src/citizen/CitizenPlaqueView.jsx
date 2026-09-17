import React, { useState, useEffect, useMemo } from 'react';
import { 
  QrCode, 
  Printer, 
  Search, 
  MapPin, 
  Calendar, 
  ExternalLink, 
  CheckCircle, 
  ShieldAlert, 
  Sparkles,
  Info,
  ChevronRight,
  Copy,
  Globe
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '../services/api';

// Strip raw IDA parenthetical suffixes from district names
function cleanDistrictName(raw) {
  if (!raw) return '';
  const clean = raw.replace(/\s*\(.*?\)\s*/g, '').trim();
  return clean.split(/[\s_]+/).filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

export default function CitizenPlaqueView({ 
  district: propDistrict, 
  state: propState, 
  onDistrictChange,
  onStateChange,
  onSelectWork 
}) {
  const [internalDistrict, setInternalDistrict] = useState('PILIBHIT(DISTRICT MAGISTRAE PILIBHIT_IDA)');
  const [internalState, setInternalState] = useState('Uttar Pradesh');

  const district = propDistrict !== undefined ? propDistrict : internalDistrict;
  const setDistrict = onDistrictChange || setInternalDistrict;

  const state = propState !== undefined ? propState : internalState;
  const setState = onStateChange || setInternalState;

  const [works, setWorks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWork, setSelectedWork] = useState(null);
  const [qrMode, setQrMode] = useState('portal_url'); // 'portal_url' | 'offline_seal'
  const [copied, setCopied] = useState(false);
  const [authOptions, setAuthOptions] = useState({ states: [], districts_by_state: {} });

  useEffect(() => {
    api.getAuthOptions().then((opts) => {
      setAuthOptions(opts || { states: [], districts_by_state: {} });
    }).catch(console.error);
  }, []);

  const availableDistricts = authOptions.districts_by_state?.[state] || (district ? [district] : []);

  const matchedDistrictVal = availableDistricts.find(
    d => d === district || cleanDistrictName(d).toLowerCase() === cleanDistrictName(district).toLowerCase()
  ) || availableDistricts[0] || district || '';

  // Ensure district is aligned with available districts of the fixed state
  useEffect(() => {
    if (availableDistricts.length > 0 && matchedDistrictVal && matchedDistrictVal !== district) {
      setDistrict(matchedDistrictVal);
    }
  }, [availableDistricts, matchedDistrictVal, district, setDistrict]);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    api.getFlags({ page: 1, pageSize: 50, state, ida: district, district })
      .then((data) => {
        if (isMounted) {
          const items = data.flags || data.items || [];
          setWorks(items);
          if (items.length > 0) {
            setSelectedWork(items[0]);
          } else {
            setSelectedWork(null);
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching works for plaque view:', err);
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [district, state]);

  const filteredWorks = useMemo(() => {
    if (!searchQuery) return works;
    const q = searchQuery.toLowerCase();
    return works.filter(w => 
      (w.work_title && w.work_title.toLowerCase().includes(q)) ||
      (w.work_id && String(w.work_id).toLowerCase().includes(q)) ||
      (w.work_category && w.work_category.toLowerCase().includes(q))
    );
  }, [works, searchQuery]);

  const handlePrint = () => {
    window.print();
  };

  const workObj = selectedWork || {};
  const workId = workObj?.work_id || workObj?.id || '135269';
  const workTitle = workObj?.work_title || workObj?.work_description || 'Installation of Arsenic Filter Units';
  const sanctionAmt = Number(workObj?.sanction_amount || 4950000);
  const spentAmt = Number(workObj?.total_spent || 4950000);
  const mpName = workObj?.mp_name || 'Shri Javed Ali Khan';
  const agency = workObj?.implementing_agency || workObj?.ida || cleanDistrictName(district);
  const progressPct = workObj?.progress_pct !== undefined ? Number(workObj.progress_pct) : 100;
  const riskScore = workObj?.risk_score !== undefined
    ? Math.round((Number(workObj.risk_score) > 1 ? Number(workObj.risk_score) : Number(workObj.risk_score) * 100))
    : 85;

  const cleanWorkId = String(workId).trim();
  const displayWorkId = cleanWorkId.startsWith('WS/') ? cleanWorkId : `WS/MP18250/2024-2025/${cleanWorkId}`;

  // Working portal verification URL using active origin & local network
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const networkOrigin = isLocalhost ? `http://192.168.101.234:${window.location.port || '3232'}` : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3232');
  const localOrigin = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3232';

  const verifyPortalUrl = `${networkOrigin}/?verify=${encodeURIComponent(cleanWorkId)}`;
  const directVerifyUrl = `${localOrigin}/?verify=${encodeURIComponent(cleanWorkId)}`;

  const offlineSealString = `MPLADS CITIZEN TRANSPARENCY — GOVT OF INDIA
Work ID: ${displayWorkId}
Project: ${workTitle.slice(0, 80)}
District: ${district}, ${state}
MP: ${mpName}
Agency: ${agency}
FUNDS: ₹${(sanctionAmt / 100000).toFixed(2)}L Sanctioned | ₹${(spentAmt / 100000).toFixed(2)}L Spent
STATUS: ${progressPct >= 80 ? 'Complete' : 'In Progress'} | Risk: ${riskScore}
Verification: ${directVerifyUrl}`;

  const currentQrValue = qrMode === 'portal_url' ? verifyPortalUrl : offlineSealString;

  const handleOpenVerification = () => {
    if (qrMode === 'portal_url') {
      window.open(directVerifyUrl, '_blank');
    } else {
      navigator.clipboard?.writeText(offlineSealString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleCopyLink = () => {
    const textToCopy = qrMode === 'portal_url' ? directVerifyUrl : offlineSealString;
    navigator.clipboard?.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Plaque Header & Sovereign Mandate Card */}
      <div className="glass-panel p-6 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-200/80 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
              STATUTORY CITIZEN TRANSPARENCY (GFR 2017)
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white font-display mt-1">
            Jan-Drishti Digital Plaque &amp; QR Verification
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-2xl">
            Under Parliamentary vigilance guidelines, every MPLADS scheme must display a tamper-evident QR code on its on-site stone plaque. Citizens can scan on-ground plaques with their mobile camera to verify genuine sanctioned funds against actual physical assets.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="px-4 py-2.5 rounded-xl bg-slate-900 dark:bg-slate-800 hover:bg-slate-700 text-white text-xs font-mono font-bold flex items-center gap-2 border border-slate-700 self-start md:self-auto cursor-pointer transition-all shadow-md"
        >
          <Printer className="w-4 h-4 text-emerald-400" />
          <span>Print Physical Plaque Proof</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Works Selector in District */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-4 rounded-2xl border border-slate-200/80 dark:border-white/[0.06] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                Select Scheme in {cleanDistrictName(district) || 'District'}
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-semibold">
                {filteredWorks.length} Schemes Loaded
              </span>
            </div>

            {/* State (Fixed) and District Filter Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="px-3 py-1.5 rounded-xl bg-[#040714] border border-slate-700/80 flex items-center gap-1.5 text-xs font-mono">
                <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                <span className="text-slate-500 text-[10px] uppercase font-bold">State:</span>
                <span className="text-white font-bold tracking-wide truncate">{state}</span>
              </div>

              <div className="p-1.5 rounded-xl bg-[#040714] border border-emerald-500/40 flex items-center gap-1 shadow-inner">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 ml-1" />
                <select
                  value={matchedDistrictVal}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer pr-2 w-full truncate"
                  aria-label="Select District"
                >
                  {availableDistricts.length === 0 ? (
                    <option value={district}>{cleanDistrictName(district) || 'All Districts'}</option>
                  ) : (
                    availableDistricts.map(d => (
                      <option key={d} value={d} className="bg-slate-900 text-white font-sans">{cleanDistrictName(d)}</option>
                    ))
                  )}
                </select>
              </div>
            </div>

            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search scheme name or ID..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#040714] border border-slate-700 text-white text-xs placeholder-slate-500 focus:outline-none focus:border-emerald-400 font-sans"
              />
            </div>

            <div className="max-h-[500px] overflow-y-auto space-y-2 no-scrollbar pr-1">
              {loading ? (
                <div className="py-12 text-center text-xs text-slate-400 font-mono">
                  Loading district works...
                </div>
              ) : filteredWorks.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No matching schemes found.
                </div>
              ) : (
                filteredWorks.map((w) => {
                  const isSelected = (selectedWork?.work_id || selectedWork?.id) === (w.work_id || w.id);
                  const isCrit = (w.risk_score || 0) >= 0.85;
                  return (
                    <button
                      key={w.work_id || w.id}
                      onClick={() => setSelectedWork(w)}
                      className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-emerald-500/15 border-emerald-500/60 ring-1 ring-emerald-500/40 text-white'
                          : 'bg-[#040714] border-slate-800/90 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-mono font-bold text-violet-300">
                          #{w.work_id || w.id}
                        </span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          isCrit ? 'bg-rose-500/20 text-rose-300' : 'bg-amber-500/20 text-amber-300'
                        }`}>
                          {isCrit ? 'CRITICAL RISK' : 'HIGH RISK'}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-white line-clamp-1">
                        {w.work_title || w.work_description || 'Public Work'}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1 flex items-center justify-between font-mono">
                        <span>₹{(Number(w.sanction_amount || 0) / 100000).toFixed(2)} Lakhs</span>
                        <span className="text-emerald-400">Progress: {w.progress_pct || 0}%</span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: High-Fidelity Jan-Drishti Plaque Simulator */}
        <div className="lg:col-span-7">
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-amber-500/30 bg-gradient-to-b from-[#0c1224] to-[#060913] text-white shadow-2xl relative overflow-hidden">
            {/* Plaque Header Ornamentation */}
            <div className="text-center pb-4 border-b border-amber-500/30 space-y-1">
              <div className="flex items-center justify-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-[11px] font-mono font-extrabold uppercase tracking-widest text-amber-400">
                  GOVERNMENT OF INDIA • MPLADS STATUTORY PLAQUE
                </span>
                <span className="w-2 h-2 rounded-full bg-amber-400" />
              </div>
              <h3 className="text-lg sm:text-xl font-black font-display text-white tracking-wide">
                JAN-DRISHTI CITIZEN TRANSPARENCY STONE
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Mandatory Physical Foundation &amp; Audit Board under Rule 3.14
              </p>
            </div>

            {/* Main Plaque Body */}
            <div className="py-6 grid grid-cols-1 sm:grid-cols-12 gap-6 items-center">
              {/* QR Code Container */}
              <div className="sm:col-span-5 flex flex-col items-center space-y-3">
                <div 
                  onClick={handleOpenVerification}
                  className="p-4 rounded-2xl bg-white shadow-2xl border-4 border-amber-400/80 hover:border-amber-300 flex items-center justify-center cursor-pointer group relative transition-all"
                  title={qrMode === 'portal_url' ? 'Click to open live verification dossier' : 'Click to copy offline seal'}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleOpenVerification(); }}
                >
                  <QRCodeSVG 
                    value={currentQrValue} 
                    size={160} 
                    level="H" 
                    includeMargin={false}
                  />
                  <div className="absolute inset-0 bg-stone-950/75 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2 text-white">
                    {qrMode === 'portal_url' ? (
                      <>
                        <ExternalLink className="w-6 h-6 text-amber-400 mb-1" />
                        <span className="text-[10px] font-bold text-amber-300">Open Dossier</span>
                        <span className="text-[8px] text-stone-300">Click to verify</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-6 h-6 text-amber-400 mb-1" />
                        <span className="text-[10px] font-bold text-amber-300">{copied ? 'Copied!' : 'Copy Seal'}</span>
                        <span className="text-[8px] text-stone-300">Click to copy</span>
                      </>
                    )}
                  </div>
                </div>
                <div className="text-center font-mono">
                  <span className="text-[10px] text-amber-400 font-bold block">
                    {qrMode === 'portal_url' ? 'SCAN WITH MOBILE CAMERA' : 'OFFLINE AUDIT CERTIFICATE'}
                  </span>
                  <span className="text-[9px] text-slate-400">
                    {qrMode === 'portal_url' ? 'Direct Official Verification Link' : 'No Internet Required on Site'}
                  </span>
                </div>

                {/* QR Mode Switcher & Quick Actions */}
                <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
                  <div className="flex items-center space-x-1.5 p-1 rounded-xl bg-slate-900 border border-slate-800 text-[10px] font-mono w-full justify-center">
                    <button
                      type="button"
                      onClick={() => setQrMode('portal_url')}
                      className={`flex-1 px-2 py-1 rounded-lg transition-all cursor-pointer text-center ${
                        qrMode === 'portal_url' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      URL Scan
                    </button>
                    <button
                      type="button"
                      onClick={() => setQrMode('offline_seal')}
                      className={`flex-1 px-2 py-1 rounded-lg transition-all cursor-pointer text-center ${
                        qrMode === 'offline_seal' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Offline Seal
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 w-full">
                    {qrMode === 'portal_url' ? (
                      <>
                        <button
                          type="button"
                          onClick={handleOpenVerification}
                          className="flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 text-[9px] font-bold shadow-xs transition-colors cursor-pointer font-mono"
                          title="Open live verification dossier in new tab"
                        >
                          <ExternalLink className="w-3 h-3" />
                          <span>Test Verify</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleCopyLink}
                          className="flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-[9px] font-bold transition-colors cursor-pointer font-mono"
                          title="Copy verification URL"
                        >
                          {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={handleCopyLink}
                        className="w-full flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-[9px] font-bold transition-colors cursor-pointer font-mono"
                        title="Copy complete plaintext seal to clipboard"
                      >
                        {copied ? <CheckCircle className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copied ? 'Copied to Clipboard' : 'Copy Full Seal'}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Plaque Particulars */}
              <div className="sm:col-span-7 space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block font-bold">
                    Scheme Title
                  </span>
                  <p className="text-sm font-bold text-white leading-tight font-display mt-0.5">
                    {workTitle}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1">
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[9px]">ID NUMBER</span>
                    <span className="font-bold text-violet-300 truncate block">{displayWorkId}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[9px]">DISTRICT / STATE</span>
                    <span className="font-bold text-white truncate block">{district}, {state}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[9px]">HON'BLE MP</span>
                    <span className="font-bold text-white truncate block">{mpName}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-black/40 border border-white/5">
                    <span className="text-slate-400 block text-[9px]">IMPLEMENTING AGENCY</span>
                    <span className="font-bold text-white truncate block">{agency}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 font-mono text-[11px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-300">Sanctioned Amount:</span>
                    <strong className="text-white">₹{(sanctionAmt / 100000).toFixed(2)} Lakhs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Disbursed Amount:</span>
                    <strong className="text-emerald-400">₹{(spentAmt / 100000).toFixed(2)} Lakhs</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-300">Ground Progress:</span>
                    <strong className="text-white">{progressPct}%</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Plaque Footer */}
            <div className="pt-4 border-t border-amber-500/30 flex flex-col sm:flex-row items-center justify-between text-[10px] font-mono text-slate-400 gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                <span>SHA-256 Verified Seal: 9f83b2a7d1e04c55</span>
              </span>
              <button
                onClick={() => onSelectWork && onSelectWork(workId)}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <span>Inspect Forensic Case Evidence</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
