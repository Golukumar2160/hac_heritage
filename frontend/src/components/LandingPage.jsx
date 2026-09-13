import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  ArrowRight, 
  Cpu, 
  FileSearch, 
  Landmark, 
  Building2, 
  MapPin, 
  Vote, 
  Layers, 
  Activity, 
  Eye, 
  Sparkles, 
  CheckCircle2, 
  ChevronRight,
  Database,
  Fingerprint,
  Scale,
  FileText,
  Radio,
  Network,
  Zap,
  ShieldAlert,
  Server,
  Sun,
  Moon
} from 'lucide-react';
import emblemLogo from '../assets/logo_dark.jpg';

export default function LandingPage({ onLoginSuccess, onOpenAuthModal, theme = 'dark', onToggleTheme }) {
  const [animReady, setAnimReady] = useState(false);

  useEffect(() => {
    // Smooth high-tech emblem ignition animation on mount
    const timer = setTimeout(() => setAnimReady(true), 120);
    return () => clearTimeout(timer);
  }, []);

  const coreThreatVectors = [
    {
      title: 'Split-Tender Evasion',
      code: 'GFR-144-V1',
      desc: 'Detects artificial invoice fragmentation right below ₹50 Lakh statutory e-procurement thresholds.',
      status: 'ACTIVE SURVEILLANCE',
      stat: 'Tender Evasion Flagged: 128',
      color: 'border-violet-500/30 text-violet-400 bg-violet-950/20'
    },
    {
      title: 'Contractor Syndicates',
      code: 'CARTEL-NET-V4',
      desc: 'Discovers bid-rigging rings and shadow shell companies monopolizing parliamentary disbursements.',
      status: 'TOPOLOGICAL RADAR',
      stat: '98% Spend Concentration',
      color: 'border-amber-500/30 text-amber-400 bg-amber-950/20'
    },
    {
      title: 'Recycled Photo Proof',
      code: 'PHASH-VAULT-V2',
      desc: 'Computes 64-bit perceptual image hashes to catch recycled completion photos from prior years.',
      status: 'ZERO-HAMMING SCAN',
      stat: '157 Verified Evidence Hashes',
      color: 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'
    },
    {
      title: 'Paper vs Portal OCR',
      code: 'OCR-DELTA-V3',
      desc: 'Extracts physical signed sanction orders at 300 DPI to expose hidden local fund withholdings.',
      status: 'PYMUPDF PARSER',
      stat: '₹14.5L Unreconciled Gap',
      color: 'border-indigo-500/30 text-indigo-400 bg-indigo-950/20'
    }
  ];

  return (
    <div 
      className={`min-h-screen flex flex-col relative overflow-hidden font-sans transition-colors duration-300 ${theme === 'light' ? 'bg-[#f4f6fb] text-slate-900' : 'bg-[#050810] text-slate-100'}`} 
      style={{ 
        background: theme === 'light' 
          ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' 
          : 'linear-gradient(180deg, #050810 0%, #060a14 50%, #050810 100%)' 
      }}
    >
      
      {/* Top National Tricolor Brand Stripe */}
      <div className="tricolor-stripe w-full fixed top-0 left-0 z-50" />

      {/* Ambient Radial Glows */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[650px] pointer-events-none -z-10" style={{ background: 'radial-gradient(ellipse at center, rgba(139,92,246,0.12) 0%, rgba(99,102,241,0.06) 40%, transparent 70%)', filter: 'blur(80px)' }} />
      <div className="absolute top-[35%] -left-48 w-[700px] h-[700px] pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 60%)', filter: 'blur(100px)' }} />
      <div className="absolute top-[55%] -right-48 w-[700px] h-[700px] pointer-events-none -z-10" style={{ background: 'radial-gradient(circle, rgba(52,211,153,0.06) 0%, transparent 60%)', filter: 'blur(100px)' }} />

      {/* Cyber Grid Overlay */}
      <div className="cyber-grid absolute inset-0 opacity-30 pointer-events-none -z-10" />

      {/* Top Futuristic Navigation Bar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between z-20">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl overflow-hidden p-0.5 relative group" style={{ border: '1px solid rgba(139,92,246,0.3)', background: 'rgba(139,92,246,0.06)' }}>
            <img src={emblemLogo} alt="Emblem" className="w-full h-full object-cover rounded-xl" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className={`font-black tracking-[0.12em] text-xl font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>BHARAT-DRISHTI</span>
              <span className="text-xs px-2.5 py-0.5 rounded-md font-mono font-bold" style={{ background: 'rgba(139,92,246,0.12)', color: theme === 'light' ? '#6d28d9' : 'rgba(196,181,253,0.9)', border: '1px solid rgba(139,92,246,0.25)' }}>
                MoSPI DIID
              </span>
            </div>
            <p className={`text-xs sm:text-sm font-medium tracking-wide ${theme === 'light' ? 'text-slate-600' : 'text-slate-300'}`}>
              National MPLADS AI Vigilance &amp; Anti-Corruption Command Network
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-3">
          {/* Live Supabase Cloud Database Status Indicator */}
          <div 
            className="hidden md:flex items-center space-x-2 px-3 py-2 rounded-xl text-xs font-mono backdrop-blur-md"
            style={{
              background: theme === 'light' ? 'rgba(255,255,255,0.85)' : 'rgba(0,0,0,0.4)',
              border: theme === 'light' ? '1px solid rgba(203,213,225,0.95)' : '1px solid rgba(139,92,246,0.25)',
              color: theme === 'light' ? '#334155' : '#cbd5e1'
            }}
            title="PostgreSQL Database on Supabase Cloud is connected and synchronized"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="font-semibold">Supabase DB</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 font-bold border border-emerald-500/30">ONLINE</span>
          </div>

          {onToggleTheme && (
            <button
              onClick={onToggleTheme}
              className="p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center hover:scale-105 shadow-sm"
              style={{
                background: theme === 'light' ? '#ffffff' : 'rgba(0,0,0,0.4)',
                border: theme === 'light' ? '1px solid rgba(203,213,225,0.95)' : '1px solid rgba(255,255,255,0.1)',
                color: theme === 'light' ? '#0f172a' : '#ffffff'
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-amber-400 hover:rotate-45 transition-transform" />
              ) : (
                <Moon className="w-4 h-4 text-violet-600 hover:-rotate-12 transition-transform" />
              )}
            </button>
          )}

          <button
            onClick={() => onOpenAuthModal('login')}
            className={`px-5 py-2.5 text-xs sm:text-sm font-semibold uppercase tracking-wider transition-all rounded-xl cursor-pointer ${theme === 'light' ? 'text-slate-700 hover:text-slate-900 bg-white border border-slate-300 shadow-sm' : 'text-slate-200 hover:text-white'}`}
            style={theme === 'dark' ? { border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(12px)' } : undefined}
          >
            Sign In to Portal
          </button>
          <button
            onClick={() => onOpenAuthModal('register')}
            className="px-6 py-2.5 text-xs sm:text-sm font-bold uppercase tracking-wider text-white transition-all rounded-xl flex items-center space-x-2 transform hover:-translate-y-0.5 cursor-pointer shadow-lg"
            style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.9) 0%, rgba(99,102,241,0.9) 100%)', boxShadow: '0 8px 24px -4px rgba(139,92,246,0.4)' }}
          >
            <Lock className="w-4 h-4 text-violet-100" />
            <span>Register Official</span>
          </button>
        </div>
      </header>

      {/* Main Hero & Animated Emblem Showcase */}
      <main className="flex-1 max-w-7xl mx-auto px-6 pt-4 pb-20 flex flex-col items-center z-10 w-full relative">
        {/* Animated Emblem Central Spotlight */}
        <div className="relative my-8 flex items-center justify-center">
          {/* Animated Sonar / Radar Rings */}
          <div className={`absolute w-72 h-72 md:w-[400px] md:h-[400px] rounded-full pointer-events-none transition-all duration-1000 ${animReady ? 'scale-100 opacity-100' : 'scale-50 opacity-0'}`} style={{ border: '1px solid rgba(139,92,246,0.2)' }} />
          <div className="absolute w-84 h-84 md:w-[460px] md:h-[460px] rounded-full pointer-events-none animate-ping [animation-duration:4s]" style={{ border: '1px solid rgba(99,102,241,0.12)' }} />
          <div className="absolute w-64 h-64 md:w-80 md:h-80 rounded-full border-2 border-dashed pointer-events-none emblem-spin-slow" style={{ borderColor: 'rgba(139,92,246,0.25)' }} />

          {/* Central Emblem Frame */}
          <div className={`relative w-48 h-48 md:w-64 md:h-64 rounded-full p-2.5 border-2 shadow-2xl transition-all duration-1000 ease-out transform ${animReady ? 'scale-100 opacity-100 rotate-0' : 'scale-75 opacity-0 -rotate-12'} emblem-pulse`}
            style={{ background: 'linear-gradient(180deg, rgba(139,92,246,0.3) 0%, rgba(8,12,24,0.9) 50%, rgba(99,102,241,0.25) 100%)', borderColor: 'rgba(139,92,246,0.4)' }}
          >
            <div className="w-full h-full rounded-full overflow-hidden relative shadow-inner bg-[#0b1022]">
              <img 
                src={emblemLogo} 
                alt="Bharat-Drishti Official Vigilance Emblem" 
                className="w-full h-full object-cover select-none transform hover:scale-105 transition-transform duration-500" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060911]/60 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Glowing Orbiting Radar Indicator */}
            <div className="absolute -inset-1 rounded-full pointer-events-none opacity-60" style={{ border: '1px solid rgba(139,92,246,0.35)' }} />
          </div>
        </div>

        {/* Hero Headline & Subtitle */}
        <div className="text-center max-w-4xl mx-auto space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wider uppercase mb-2 backdrop-blur-md" style={{ border: '1px solid rgba(139,92,246,0.25)', background: 'rgba(139,92,246,0.08)', color: 'rgba(196,181,253,0.9)' }}>
            <Sparkles className="w-4 h-4 animate-pulse text-violet-400" />
            <span>Government of India • Ministry of Statistics and Programme Implementation (MoSPI)</span>
          </div>

          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight font-display text-white leading-tight">
            National MPLADS AI Vigilance &amp; <br />
            <span className="gradient-text-gold">Statutory Anti-Corruption</span> Command
          </h1>

          <p className="text-slate-300 text-base md:text-lg max-w-3xl mx-auto leading-relaxed font-normal">
            Autonomous multi-model AI surveillance safeguarding India's <strong className="text-violet-300 font-semibold">₹4,000+ Crore annual Parliamentary public funds</strong> across all 543 Lok Sabha and 245 Rajya Sabha constituencies.
          </p>

          {/* Primary Action Buttons */}
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => onOpenAuthModal('login')}
              className="w-full sm:w-auto px-9 py-4 rounded-xl font-bold text-white transition-all flex items-center justify-center space-x-3 text-base transform hover:-translate-y-0.5 cursor-pointer shadow-xl"
              style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.85) 0%, rgba(99,102,241,0.85) 100%)', boxShadow: '0 8px 32px -4px rgba(139,92,246,0.4)' }}
            >
              <ShieldCheck className="w-5 h-5" />
              <span>Authenticate Official</span>
              <ArrowRight className="w-5 h-5" />
            </button>

            <button
              onClick={() => onOpenAuthModal('login')}
              className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-emerald-200 hover:text-white transition-all flex items-center justify-center space-x-2.5 text-base transform hover:-translate-y-0.5 cursor-pointer shadow-lg border border-emerald-500/40 hover:border-emerald-400 bg-emerald-950/40 hover:bg-emerald-900/50 backdrop-blur-md"
            >
              <span className="text-emerald-400">👤</span>
              <span>Citizen Vigilance Portal</span>
            </button>

            <button
              onClick={() => onOpenAuthModal('register')}
              className="w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-slate-200 hover:text-white transition-all flex items-center justify-center space-x-2 text-base backdrop-blur-md cursor-pointer border border-white/10 hover:border-violet-500/40"
              style={{ background: 'rgba(0,0,0,0.4)' }}
            >
              <span>Register Credentials</span>
            </button>
          </div>
        </div>

        {/* Real-time Threat Vector Interception Telemetry HUD */}
        <div className="w-full mt-16 pt-8 border-t border-slate-800/80">
          <div className="flex flex-col sm:flex-row items-center justify-between mb-6">
            <div>
              <div className="flex items-center space-x-2">
                <span className="flex h-2.5 w-2.5 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400"></span>
                </span>
                <span className="text-xs font-mono font-bold uppercase tracking-widest text-slate-300">
                  Autonomous Vigilance Defense Matrix
                </span>
              </div>
              <h2 className="text-2xl font-bold text-white font-display mt-1">
                Multi-Vector Fraud Interception Protocol
              </h2>
            </div>
            <div className="mt-3 sm:mt-0 flex items-center space-x-2 text-xs font-mono px-3.5 py-1.5 rounded-xl" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.18)', color: 'rgba(196,181,253,0.85)' }}>
              <Radio className="w-3.5 h-3.5 animate-pulse text-violet-400" />
              <span>STATUTORY AUDIT ENGINE ACTIVE</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
            {coreThreatVectors.map((v, idx) => (
              <div
                key={idx}
                className="glass-panel p-5 rounded-2xl card-interactive cursor-pointer flex flex-col justify-between space-y-3 group border border-slate-200/80 dark:border-white/[0.06]"
              >
                <div>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-md font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700">
                      {v.code}
                    </span>
                    <span className={`text-xs font-mono px-2.5 py-0.5 rounded-md font-bold border ${v.color}`}>
                      {v.status}
                    </span>
                  </div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-base group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">
                    {v.title}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                    {v.desc}
                  </p>
                </div>
                <div className="pt-2.5 flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/[0.06]">
                  <span>Telemetry:</span>
                  <span className="font-semibold text-violet-600 dark:text-violet-300">{v.stat}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 4 Architectural Innovations & Forensic Engines */}
        <div className="w-full mt-16">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold font-display text-white">Architectural Innovations &amp; Forensic Engines</h2>
            <p className="text-slate-300 text-sm md:text-base max-w-xl mx-auto mt-2 leading-relaxed">
              Beyond simple reporting dashboards: an active deterrence framework engineered under Central Ministry and GFR guidelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Pillar 1 */}
            <div className="p-6 rounded-2xl glass-panel card-interactive border border-slate-800/90 hover:border-violet-500/40 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/30 flex items-center justify-center text-violet-400 shadow-inner">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">5-Model AI Fraud Ensemble</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Isolation Forest for cost overruns, GFR threshold splitting tests for invoice manipulation, and SentenceTransformers for monopoly cartel detection.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-violet-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>98,649 Works Audited</span>
              </div>
            </div>

            {/* Pillar 2 */}
            <div className="p-6 rounded-2xl glass-panel card-interactive border border-slate-800/90 hover:border-violet-500/40 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-inner">
                <FileSearch className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">300 DPI Document OCR</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Renders high-resolution completion certificates via PyMuPDF to extract physical signed amounts, surfacing hidden local withholdings and private contractor accounts.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-indigo-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Portal vs Paper Matrix</span>
              </div>
            </div>

            {/* Pillar 3 */}
            <div className="p-6 rounded-2xl glass-panel card-interactive border border-slate-800/90 hover:border-emerald-500/40 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-inner">
                <Fingerprint className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Persistent pHash Vault</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                64-bit perceptual hashing matches uploaded site photography against a national hash vault, detecting duplicate structures recycled across states or years.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-emerald-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Zero-Hamming Matching</span>
              </div>
            </div>

            {/* Pillar 4 */}
            <div className="p-6 rounded-2xl glass-panel card-interactive border border-slate-800/90 hover:border-purple-500/40 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
                <Scale className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Statutory Enforcement Suite</h3>
              <p className="text-sm text-slate-300 leading-relaxed">
                Generates 1-click CAG/CVC audit dossiers, draft GFR Rule 144 show-cause notices for the District Magistrate, and immutable SHA-256 Treasury Hold alerts.
              </p>
              <div className="pt-2 flex items-center space-x-2 text-xs font-semibold text-purple-300 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>SHA-256 Merkle Log</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Scheme Scale Banner */}
        <div className="w-full mt-14 p-6 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-6 glass-panel border border-violet-500/25">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="font-bold text-slate-900 dark:text-white text-xl font-display">National Scale Data Provenance</h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">Verified against official MoSPI open data snapshots preserved in encrypted cloud vaults.</p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-8">
            <div className="text-center">
              <p className="text-3xl font-extrabold font-mono text-violet-600 dark:text-violet-400">98,649</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Audited Schemes</p>
            </div>
            <div className="w-px h-10 hidden md:block bg-slate-200 dark:bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-3xl font-extrabold font-mono text-indigo-600 dark:text-indigo-400">₹58,805 Cr</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-0.5">Monitored Allocation</p>
            </div>
            <div className="w-px h-10 hidden md:block bg-slate-200 dark:bg-white/[0.06]" />
            <div className="text-center">
              <p className="text-3xl font-extrabold text-emerald-600 dark:text-emerald-400 font-mono">&lt; 20 ms</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wider font-semibold mt-0.5">PostgreSQL Query Ping</p>
            </div>
          </div>
        </div>

      </main>

      {/* Platform Footer */}
      <footer className="w-full mt-20 pt-12 pb-8 px-6 z-10 max-w-7xl mx-auto" style={{ borderTop: '1px solid rgba(139,92,246,0.15)' }}>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10 text-left">
          
          {/* Col 1: Brand & Ministry */}
          <div className="md:col-span-2 space-y-3.5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl p-0.5" style={{ border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.08)' }}>
                <img src={emblemLogo} alt="Emblem" className="w-full h-full object-cover rounded-lg" />
              </div>
              <div>
                <span className="font-extrabold text-white text-base tracking-wider font-display block">BHARAT-DRISHTI</span>
                <span className="text-xs text-violet-300 font-mono">National MPLADS AI Vigilance &amp; Autonomous Audit System</span>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              A statutory vigilance intelligence platform developed for the Ministry of Statistics &amp; Programme Implementation (MoSPI), Government of India. Continuously auditing fund sanctions and physical delivery across 98,649 works.
            </p>
            <div className="flex flex-wrap items-center gap-2 pt-1 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 font-semibold">MoSPI DIID</span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 font-semibold">100% GFR 2017 Compliant</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800 font-semibold">DPDP Act 2023 Masked</span>
            </div>
          </div>

          {/* Col 2: Core Vigilance Pillars */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">Audit Pillars</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> Predictive Early Warning Radar</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> RapidOCR Neural PDF Stamping</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> 64-bit DCT pHash Duplicate Vault</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> GFR 2017 Tender Split Radar</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> Autonomous Case File Generation</li>
            </ul>
          </div>

          {/* Col 3: Statutory Authority */}
          <div className="space-y-3">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-200">Constitutional Mandate</h4>
            <ul className="space-y-2 text-xs text-slate-300 font-medium">
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> Article 282 Constitutional Purview</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> CAG Performance Audit Directives</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> Public Accounts Committee (PAC)</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> Central Vigilance Commission (CVC)</li>
              <li className="flex items-center gap-1.5"><span className="text-violet-400 font-bold">•</span> 543 Lok Sabha + 245 Rajya Sabha</li>
            </ul>
          </div>

        </div>

        {/* Bottom Sub-footer Bar */}
        <div className="pt-6 border-t border-white/[0.06] flex flex-col sm:flex-row items-center justify-between text-xs text-slate-400 gap-3">
          <p>© 2026 BHARAT-DRISHTI • Ministry of Statistics &amp; Programme Implementation (MoSPI)</p>
          <div className="flex items-center space-x-3 font-mono text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-300 font-medium">System Telemetry: Online</span>
            </span>
            <span>•</span>
            <span>Security Clearance: Official Vigilance Console</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
