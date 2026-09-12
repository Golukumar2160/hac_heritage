import React, { useState, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Maximize2,
  X,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  Split,
  Copy,
  Hash,
  FileText,
  Building2,
  MapPin,
  TrendingDown,
  Info
} from 'lucide-react';
import { api, API_BASE } from '../services/api';

export default function PHashViewer({ onSelectWork }) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedPair, setSelectedPair] = useState(null);
  const [selectedCluster, setSelectedCluster] = useState('ALL'); // 'ALL', 'MAHESH_SHARMA', 'KAMLESH_JANGDE'
  const [searchQuery, setSearchQuery] = useState('');
  const [similarityThreshold, setSimilarityThreshold] = useState(90); // minimum similarity %
  const [previewImage, setPreviewImage] = useState(null);
  const [compareMode, setCompareMode] = useState('side_by_side'); // 'side_by_side', 'toggle'
  const [toggleActive, setToggleActive] = useState('A');
  const [copiedHash, setCopiedHash] = useState(null);

  const fetchDuplicates = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getForensicsDuplicates();
      if (Array.isArray(data) && data.length > 0) {
        setDuplicates(data);
        // Default select the real Mahesh Sharma 100% clone pair
        const maheshClone = data.find(
          (d) =>
            (d.numeric_work_id_1 === '62689' || d.work_id_1?.includes('62689')) &&
            (d.numeric_work_id_2 === '62692' || d.work_id_2?.includes('62692')) &&
            d.hamming_distance === 0
        );
        setSelectedPair(maheshClone || data[0]);
      } else {
        throw new Error('No duplicate photo data available.');
      }
    } catch (err) {
      console.error('Error fetching pHash duplicates:', err);
      setError(err.message || 'Failed to load duplicate photos.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDuplicates();
  }, []);

  // Filter pairs based on cluster, search query, and similarity threshold
  const filteredPairs = duplicates.filter((pair) => {
    // Cluster filter
    const isMahesh =
      (pair.numeric_work_id_1 === '62689' && pair.numeric_work_id_2 === '62692') ||
      (pair.numeric_work_id_1 === '62692' && pair.numeric_work_id_2 === '62689') ||
      pair.mp_name_1?.toLowerCase().includes('mahesh') ||
      pair.mp_name_2?.toLowerCase().includes('mahesh');

    const isKamlesh =
      (pair.numeric_work_id_1 === '59786' && pair.numeric_work_id_2 === '61364') ||
      (pair.numeric_work_id_1 === '61364' && pair.numeric_work_id_2 === '59786') ||
      pair.mp_name_1?.toLowerCase().includes('kamlesh') ||
      pair.mp_name_2?.toLowerCase().includes('kamlesh');

    if (selectedCluster === 'MAHESH_SHARMA' && !isMahesh) return false;
    if (selectedCluster === 'KAMLESH_JANGDE' && !isKamlesh) return false;

    // Similarity threshold filter
    if (Number(pair.similarity_pct || 0) < similarityThreshold) return false;

    // Text search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const w1 = String(pair.numeric_work_id_1 || pair.work_id_1 || '').toLowerCase();
      const w2 = String(pair.numeric_work_id_2 || pair.work_id_2 || '').toLowerCase();
      const mp1 = String(pair.mp_name_1 || '').toLowerCase();
      const mp2 = String(pair.mp_name_2 || '').toLowerCase();
      const f1 = String(pair.file_1 || '').toLowerCase();
      const f2 = String(pair.file_2 || '').toLowerCase();
      const d1 = String(pair.description_1 || '').toLowerCase();
      const d2 = String(pair.description_2 || '').toLowerCase();
      return (
        w1.includes(q) ||
        w2.includes(q) ||
        mp1.includes(q) ||
        mp2.includes(q) ||
        f1.includes(q) ||
        f2.includes(q) ||
        d1.includes(q) ||
        d2.includes(q)
      );
    }
    return true;
  });

  // Calculate cluster stats
  const totalCollisions = duplicates.length;
  const exactClonesCount = duplicates.filter((d) => d.hamming_distance === 0).length;
  const maheshCollisions = duplicates.filter(
    (d) =>
      (d.numeric_work_id_1 === '62689' && d.numeric_work_id_2 === '62692') ||
      (d.numeric_work_id_1 === '62692' && d.numeric_work_id_2 === '62689')
  ).length;
  const kamleshCollisions = duplicates.filter(
    (d) =>
      (d.numeric_work_id_1 === '59786' && d.numeric_work_id_2 === '61364') ||
      (d.numeric_work_id_1 === '61364' && d.numeric_work_id_2 === '59786')
  ).length;

  // Copy hash utility
  const copyToClipboard = (text) => {
    navigator.clipboard?.writeText(text);
    setCopiedHash(text);
    setTimeout(() => setCopiedHash(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Hero Forensics Header */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-16 -top-16 w-64 h-64 bg-violet-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center space-x-2 flex-wrap">
              <span className="px-2.5 py-1 text-xs font-mono font-semibold uppercase tracking-wider rounded-md bg-violet-500/15 text-violet-300 border border-violet-500/30 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-violet-400" />
                PILLAR 3 FORENSICS // 64-BIT DCT PERCEPTUAL HASH
              </span>
              <span className="px-2.5 py-1 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
                Hamming Distance d ≤ 5 Threshold
              </span>
              <span className="px-2.5 py-1 text-xs font-mono rounded bg-rose-950/60 text-rose-300 border border-rose-800/80">
                Cross-Sanction Collision Engine
              </span>
            </div>

            <h1 className="text-xl sm:text-2xl font-bold text-white font-display flex items-center gap-3">
              <Layers className="w-7 h-7 text-violet-400" />
              Perceptual Hash (pHash) Duplicate Photo & Document Collision Lab
            </h1>
            <p className="text-sm text-slate-400 max-w-3xl leading-relaxed">
              Cross-comparing 64-bit DCT visual fingerprints across all uploaded project evidence galleries.
              Unmasks multi-project fraud where identical site completion photography or scanned certificates were recycled across different works to claim duplicate disbursements.
            </p>
          </div>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            <button
              onClick={fetchDuplicates}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-700 hover:border-violet-500 text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-medium"
              title="Refresh Duplicate Vault"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-violet-400' : ''}`} />
              <span className="hidden sm:inline">Refresh Vault</span>
            </button>
          </div>
        </div>
      </div>

      {/* Forensics KPI Telemetry Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Collisions</span>
            <Layers className="w-4 h-4 text-violet-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white">{totalCollisions}</div>
          <div className="text-xs text-violet-400 font-mono">Pairs with d ≤ 2</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-900/40 bg-rose-950/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-rose-300">Exact Clones (100%)</span>
            <Copy className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-rose-400">{exactClonesCount}</div>
          <div className="text-xs text-rose-400 font-mono">Hamming Distance = 0</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-amber-900/40 bg-amber-950/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-amber-300">Fraud Clusters</span>
            <AlertOctagon className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-400">2</div>
          <div className="text-xs text-amber-300 font-mono">UP & CG Multi-Sanction</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-indigo-900/40 bg-indigo-950/10 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-indigo-300">Public Funds at Risk</span>
            <TrendingDown className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-indigo-400">₹39.81 L</div>
          <div className="text-xs text-indigo-300 font-mono">4 Colliding Projects</div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-900/40 bg-emerald-950/10 space-y-1 col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-300">Evidence Vault</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400">120</div>
          <div className="text-xs text-emerald-300 font-mono">Photos Analyzed</div>
        </div>
      </div>

      {/* Cluster Quick Switcher & Interactive Filter Bar */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800 space-y-3">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
          
          {/* Preset Cluster Pills */}
          <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1 lg:pb-0 no-scrollbar">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
              <Filter className="w-3.5 h-3.5 text-violet-400" />
              Fraud Clusters:
            </span>

            <button
              onClick={() => setSelectedCluster('MAHESH_SHARMA')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCluster === 'MAHESH_SHARMA'
                  ? 'bg-rose-500/25 text-rose-200 border border-rose-500/60 shadow-lg shadow-rose-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
              }`}
            >
              <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
              <span>🚨 Mahesh Sharma: Work 62689 vs 62692 (UP)</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-800">
                100% Clone ({maheshCollisions})
              </span>
            </button>

            <button
              onClick={() => setSelectedCluster('KAMLESH_JANGDE')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                selectedCluster === 'KAMLESH_JANGDE'
                  ? 'bg-amber-500/25 text-amber-200 border border-amber-500/60 shadow-lg shadow-amber-950/50'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Kamlesh Jangde: Work 59786 vs 61364 (CG)</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-800">
                {kamleshCollisions} pairs
              </span>
            </button>

            <button
              onClick={() => setSelectedCluster('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCluster === 'ALL'
                  ? 'bg-violet-500/20 text-violet-300 border border-violet-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-slate-800'
              }`}
            >
              All Collisions ({totalCollisions})
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full lg:w-72">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Work ID, MP, Village..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-700/80 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/50"
            />
          </div>

        </div>

        {/* Similarity Threshold Slider */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-3">
            <span>Minimum Similarity Threshold:</span>
            <input
              type="range"
              min="90"
              max="100"
              step="1"
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
              className="w-32 accent-violet-500 cursor-pointer"
            />
            <span className="font-mono text-violet-300 font-bold">{similarityThreshold}%+</span>
          </div>

          <div className="text-xs font-mono text-slate-400 hidden sm:block">
            Showing {filteredPairs.length} of {duplicates.length} matching photo pairs
          </div>
        </div>
      </div>

      {/* CORE FEATURE: Side-by-Side Dual Photo Comparator */}
      {selectedPair && (
        <div className="glass-panel p-5 rounded-2xl border border-violet-500/40 space-y-4 shadow-2xl relative overflow-hidden bg-navy-950/90">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40 flex items-center gap-1.5">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                COLLISION DETECTED
              </span>
              <span className="text-base font-bold text-white font-display">
                Work #{selectedPair.numeric_work_id_1 || selectedPair.work_id_1} vs Work #{selectedPair.numeric_work_id_2 || selectedPair.work_id_2}
              </span>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800 text-xs">
                <button
                  onClick={() => setCompareMode('side_by_side')}
                  className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                    compareMode === 'side_by_side'
                      ? 'bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Side-by-Side
                </button>
                <button
                  onClick={() => setCompareMode('toggle')}
                  className={`px-3 py-1.5 rounded-md transition-all font-medium ${
                    compareMode === 'toggle'
                      ? 'bg-violet-500/20 text-violet-300 font-semibold border border-violet-500/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Quick Toggle Diff
                </button>
              </div>
            </div>
          </div>

          {/* Central Fraud Alert Callout */}
          <div className="p-3.5 rounded-xl bg-gradient-to-r from-rose-950/50 via-slate-900/60 to-rose-950/50 border border-rose-800/80 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-inner">
            <div className="space-y-1">
              <div className="font-bold text-rose-200 flex items-center gap-2">
                <AlertOctagon className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="text-sm">CROSS-PROJECT ASSET RECYCLING IDENTIFIED</span>
                <span className="px-2.5 py-0.5 rounded bg-rose-500/30 text-rose-200 font-mono text-xs border border-rose-500/50 font-bold">
                  {selectedPair.similarity_pct}% VISUAL MATCH (HAMMING d = {selectedPair.hamming_distance})
                </span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed max-w-4xl">
                {selectedPair.verdict}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => onSelectWork && onSelectWork(selectedPair.numeric_work_id_1 || selectedPair.work_id_1)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-300 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span>Dossier #{selectedPair.numeric_work_id_1 || 'A'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onSelectWork && onSelectWork(selectedPair.numeric_work_id_2 || selectedPair.work_id_2)}
                className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-700 text-violet-300 text-xs font-semibold flex items-center gap-1 transition-all"
              >
                <span>Dossier #{selectedPair.numeric_work_id_2 || 'B'}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Mode 1: Side-by-Side Dual Cards */}
          {compareMode === 'side_by_side' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Photo: Work 1 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 relative group">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-violet-500/15 text-violet-300 border border-violet-500/30">
                      WORK A // SANCTION #{selectedPair.numeric_work_id_1 || selectedPair.work_id_1}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5 font-display">
                      {selectedPair.mp_name_1}
                    </h4>
                    <div className="text-xs text-slate-400">
                      {selectedPair.constituency_1}, {selectedPair.state_1}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Sanction Disbursed</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      ₹{Number(selectedPair.amount_1 || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Image Container */}
                <div
                  onClick={() => setPreviewImage(`${API_BASE}/images/extracted/${selectedPair.file_1}`)}
                  className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/80 aspect-video sm:h-64 flex items-center justify-center cursor-pointer group-hover:border-violet-500/50 transition-all"
                >
                  <img
                    src={`${API_BASE}/images/extracted/${selectedPair.file_1}`}
                    alt="Work A Evidence"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      if (e.target && e.target.parentElement) {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'p-6 text-center text-xs text-slate-500 font-mono';
                        fallback.innerText = 'Image Asset: ' + (selectedPair.file_1 || '');
                        e.target.parentElement.appendChild(fallback);
                      }
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-black/70 border border-slate-700 text-xs font-mono text-violet-300 flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-xs font-mono text-slate-300 truncate max-w-[85%]">
                    {selectedPair.file_1}
                  </div>
                </div>

                {/* Metadata & pHash */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Location / Work Description</div>
                    <div className="text-slate-300 text-xs line-clamp-2 mt-1">
                      "{selectedPair.description_1 || 'Civil development work'}"
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Hash className="w-3.5 h-3.5 text-violet-400" />
                      <span>64-bit DCT pHash:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-violet-300 font-bold">{selectedPair.phash_1}</span>
                      <button
                        onClick={() => copyToClipboard(selectedPair.phash_1)}
                        className="text-slate-400 hover:text-slate-200"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Photo: Work 2 */}
              <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-3 relative group">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2.5 py-1 rounded text-xs font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                      WORK B // SANCTION #{selectedPair.numeric_work_id_2 || selectedPair.work_id_2}
                    </span>
                    <h4 className="text-base font-bold text-white mt-1.5 font-display">
                      {selectedPair.mp_name_2}
                    </h4>
                    <div className="text-xs text-slate-400">
                      {selectedPair.constituency_2}, {selectedPair.state_2}
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Sanction Disbursed</div>
                    <div className="text-base font-bold text-emerald-400 mt-0.5">
                      ₹{Number(selectedPair.amount_2 || 0).toLocaleString('en-IN')}
                    </div>
                  </div>
                </div>

                {/* Image Container */}
                <div
                  onClick={() => setPreviewImage(`${API_BASE}/images/extracted/${selectedPair.file_2}`)}
                  className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/80 aspect-video sm:h-64 flex items-center justify-center cursor-pointer group-hover:border-rose-500/50 transition-all"
                >
                  <img
                    src={`${API_BASE}/images/extracted/${selectedPair.file_2}`}
                    alt="Work B Evidence"
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.target.onerror = null;
                      if (e.target && e.target.parentElement) {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'p-6 text-center text-xs text-slate-500 font-mono';
                        fallback.innerText = 'Image Asset: ' + (selectedPair.file_2 || '');
                        e.target.parentElement.appendChild(fallback);
                      }
                    }}
                  />
                  <div className="absolute top-2 right-2 px-2.5 py-1 rounded bg-black/70 border border-slate-700 text-xs font-mono text-violet-300 flex items-center gap-1">
                    <Maximize2 className="w-3.5 h-3.5" />
                    <span>Zoom</span>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 border border-slate-700 text-xs font-mono text-slate-300 truncate max-w-[85%]">
                    {selectedPair.file_2}
                  </div>
                </div>

                {/* Metadata & pHash */}
                <div className="space-y-2 text-xs">
                  <div className="p-3 rounded-lg bg-slate-900/90 border border-slate-800/80">
                    <div className="text-xs text-slate-400 uppercase font-semibold">Location / Work Description</div>
                    <div className="text-slate-300 text-xs line-clamp-2 mt-1">
                      "{selectedPair.description_2 || 'Civil development work'}"
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Hash className="w-3.5 h-3.5 text-violet-400" />
                      <span>64-bit DCT pHash:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-violet-300 font-bold">{selectedPair.phash_2}</span>
                      <button
                        onClick={() => copyToClipboard(selectedPair.phash_2)}
                        className="text-slate-400 hover:text-slate-200"
                        title="Copy hash"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Mode 2: Quick Toggle Diff View */}
          {compareMode === 'toggle' && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-4">
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setToggleActive('A')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    toggleActive === 'A'
                      ? 'bg-violet-500/30 text-violet-200 border border-violet-500 shadow-glow-violet'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Work A: #{selectedPair.numeric_work_id_1} ({selectedPair.file_1})
                </button>
                <button
                  onClick={() => setToggleActive('B')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all ${
                    toggleActive === 'B'
                      ? 'bg-rose-500/30 text-rose-200 border border-rose-500 shadow-glow-rose'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Work B: #{selectedPair.numeric_work_id_2} ({selectedPair.file_2})
                </button>
              </div>

              <div className="relative rounded-xl overflow-hidden border border-slate-800 bg-black/90 max-h-[420px] flex items-center justify-center">
                <img
                  src={`${API_BASE}/images/extracted/${toggleActive === 'A' ? selectedPair.file_1 : selectedPair.file_2}`}
                  alt="Toggled Evidence"
                  className="max-h-[400px] w-auto object-contain transition-all"
                />
                <div className="absolute top-3 left-3 px-3 py-1 rounded-lg bg-black/80 border border-slate-700 text-xs font-mono font-bold text-white">
                  Displaying: Work {toggleActive} (Similarity: {selectedPair.similarity_pct}%)
                </div>
              </div>
            </div>
          )}

          {copiedHash && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-2 rounded-xl glass-panel-glow border border-violet-500 text-xs font-semibold text-violet-200 shadow-2xl animate-in fade-in">
              Copied 64-bit pHash to clipboard!
            </div>
          )}
        </div>
      )}

      {/* Browseable Collisions Gallery & Table */}
      <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Layers className="w-5 h-5 text-violet-400" />
              Evidentiary Collisions Directory ({filteredPairs.length} pairs)
            </h3>
            <p className="text-xs text-slate-400">
              Select any collision pair to populate the dual-photo comparator above.
            </p>
          </div>

          <span className="text-xs font-mono text-violet-300 bg-violet-950/60 px-3 py-1 rounded-lg border border-violet-800">
            Hamming Dist ≤ 2
          </span>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-violet-400 animate-spin" />
            <span className="text-xs font-mono text-slate-400">Querying 64-bit DCT Hash Collision Vault...</span>
          </div>
        ) : filteredPairs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            No matching collision pairs found for the active filter.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredPairs.slice(0, 30).map((pair, idx) => {
              const isSelected =
                selectedPair?.file_1 === pair.file_1 && selectedPair?.file_2 === pair.file_2;
              const is100Percent = pair.hamming_distance === 0;

              return (
                <div
                  key={idx}
                  onClick={() => setSelectedPair(pair)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer relative space-y-2.5 ${
                    isSelected
                      ? 'bg-slate-900 border-violet-500/70 shadow-lg shadow-violet-950/40 ring-1 ring-violet-500/40'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40'
                  } ${
                    is100Percent ? 'border-l-4 border-l-rose-500' : 'border-l-4 border-l-amber-500'
                  }`}
                >
                  {/* Top Badges */}
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="font-bold text-white">
                      #{pair.numeric_work_id_1 || 'A'} ⇄ #{pair.numeric_work_id_2 || 'B'}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded font-bold ${
                        is100Percent
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      }`}
                    >
                      {pair.similarity_pct}% MATCH (d={pair.hamming_distance})
                    </span>
                  </div>

                  {/* Dual Thumbnails */}
                  <div className="grid grid-cols-2 gap-2 h-24 bg-black/60 rounded-lg p-1 border border-slate-800 overflow-hidden">
                    <div className="h-full w-full flex items-center justify-center bg-black/40 rounded overflow-hidden">
                      <img
                        src={`${API_BASE}/images/extracted/${pair.file_1}`}
                        alt="Photo 1"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          if (e.target) e.target.style.display = 'none';
                        }}
                      />
                    </div>
                    <div className="h-full w-full flex items-center justify-center bg-black/40 rounded overflow-hidden">
                      <img
                        src={`${API_BASE}/images/extracted/${pair.file_2}`}
                        alt="Photo 2"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          if (e.target) e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Descriptions */}
                  <div className="text-xs text-slate-300">
                    <div className="font-semibold truncate text-white">{pair.mp_name_1}</div>
                    <div className="text-xs text-slate-400 truncate">
                      {pair.constituency_1 || pair.state_1}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-violet-400 font-semibold pt-1 border-t border-slate-800/60">
                    <span>Inspect Collision</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filteredPairs.length > 30 && (
          <div className="p-3 text-center text-xs font-mono text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
            Showing top 30 collision pairs out of {filteredPairs.length} matches. Use filters or search to refine results.
          </div>
        )}
      </div>

      {/* Lightbox Zoom Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-5xl flex items-center justify-between text-slate-200 mb-3 px-2">
            <span className="text-sm font-mono font-semibold flex items-center gap-2">
              <Eye className="w-4 h-4 text-cyan-400" />
              Full Resolution Evidentiary Photo Inspection
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
              alt="High Resolution Evidence"
              className="w-full h-auto object-contain mx-auto"
            />
          </div>
        </div>
      )}
    </div>
  );
}
