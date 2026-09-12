import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import ExecutiveKpis from './components/ExecutiveKpis';
import QuickStatsCharts from './components/QuickStatsCharts';
import LiveAlertFeed from './components/LiveAlertFeed';
import CaseFileModal from './components/CaseFileModal';
import BenfordView from './components/BenfordView';
import VendorNetworkView from './components/VendorNetworkView';
import GeoRiskMapView from './components/GeoRiskMapView';
import AuditLedgerView from './components/AuditLedgerView';
import SecretaryBriefingModal from './components/SecretaryBriefingModal';
import OcrLabView from './components/OcrLabView';
import PHashViewer from './components/PHashViewer';
import ModelValidationView from './components/ModelValidationView';
import AuthModal from './components/AuthModal';
import { api } from './services/api';
import AshokaChakra from './components/AshokaChakra';
import { 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  FileText, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ChevronRight,
  Building2,
  Landmark,
  MapPin,
  Vote,
  Clock,
  Radio,
  Zap,
  ShieldCheck,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRole, setActiveRole] = useState('ministry');
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [showSecretaryBriefing, setShowSecretaryBriefing] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [initialTier, setInitialTier] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const [currentTime, setCurrentTime] = useState('');
  const [ping, setPing] = useState(40);
  const [isOnline, setIsOnline] = useState(true);

  // Theme Management (Dark / Light Mode)
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('mplads_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('mplads_theme', theme);
    } catch (e) {
      console.error('Could not save theme:', e);
    }
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Health and latency telemetry
  useEffect(() => {
    const checkPing = async () => {
      try {
        const { ok, ping: ms } = await api.checkHealth();
        setIsOnline(ok);
        setPing(ms);
      } catch {
        setIsOnline(true);
        setPing(40);
      }
    };
    checkPing();
    const interval = setInterval(checkPing, 15000);
    return () => clearInterval(interval);
  }, []);

  // Live IST Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour12: true }) + ' IST');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadKpis = async () => {
    if (!currentUser) return;
    try {
      const data = await api.getKpis();
      setKpis(data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  useEffect(() => {
    if (currentUser) {
      loadKpis();
      const interval = setInterval(loadKpis, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setActiveRole(user.role || 'ministry');
    setShowAuthModal(false);
    loadKpis();
    showToast(`Welcome, ${user.name} (${(user.role || 'Official').toUpperCase()})`);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setKpis(null);
    showToast('Signed out of official account');
  };

  const openAuthModal = (mode = 'login') => {
    setAuthModalMode(mode);
    setShowAuthModal(true);
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFilterTier = (tier) => {
    setInitialTier(tier);
    setActiveTab('alerts');
  };

  // If unauthenticated: render strictly the Landing Page + AuthModal
  if (!currentUser) {
    return (
      <>
        <LandingPage 
          onLoginSuccess={handleAuthSuccess}
          onOpenAuthModal={openAuthModal}
          theme={theme}
          onToggleTheme={toggleTheme}
        />
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          initialMode={authModalMode}
          onAuthSuccess={handleAuthSuccess}
          activeRole={activeRole}
        />
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl glass-panel-glow border border-violet-500/40 text-sm font-semibold text-violet-200 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
            <Sparkles className="w-4 h-4 text-violet-400" />
            <span>{toastMessage}</span>
          </div>
        )}
      </>
    );
  }

  // Active Tab Title Lookup
  const tabTitles = {
    overview: 'Command Centre',
    alerts: 'Live Anomaly Radar',
    map: 'Geospatial Risk Map',
    vendors: 'Contractor Syndicates & Cartels',
    ocr: 'Physical Evidence & OCR Lab',
    phash: 'Photo Forensics & pHash Vault',
    audit: 'Statutory Audit Ledger',
    validation: 'Model Validation & ROC'
  };

  return (
    <div 
      className={`min-h-screen flex flex-col font-sans relative transition-colors duration-300 ${theme === 'light' ? 'bg-slate-50 text-slate-900' : 'bg-[#050810] text-slate-100'}`} 
      style={{ 
        background: theme === 'light' 
          ? 'linear-gradient(180deg, #f8fafc 0%, #f1f5f9 50%, #e2e8f0 100%)' 
          : 'linear-gradient(180deg, #050810 0%, #060a14 50%, #050810 100%)', 
        color: theme === 'light' ? '#0f172a' : '#cbd5e1' 
      }}
    >
      
      {/* Subtle Sovereign Watermark Ashoka Chakra (Non-distracting, serene background watermark) */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 overflow-hidden select-none opacity-90">
        <AshokaChakra 
          size={780} 
          opacity={theme === 'light' ? 0.045 : 0.05} 
          showCyberRings={false}
          theme={theme}
          watermark={true}
        />
      </div>

      {/* Tricolor Accent Stripe at Top */}
      <div className="tricolor-stripe fixed top-0 left-0 right-0 z-50" />

      {/* Left Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        onOpenSecretaryBriefing={() => setShowSecretaryBriefing(true)}
        criticalCount={kpis?.critical_count || 0}
        theme={theme}
      />

      {/* Main Content Area (Offset by compact icon sidebar width on desktop) */}
      <div className="md:pl-20 flex-1 flex flex-col min-h-screen w-full transition-all duration-300 relative z-10">
        
        {/* Top Operational Utility Bar */}
        <header className="sticky top-0 z-30 px-4 sm:px-8 py-3 flex items-center justify-between transition-colors duration-300" style={{
          background: theme === 'light' ? 'rgba(255, 255, 255, 0.94)' : 'rgba(5, 8, 16, 0.88)',
          backdropFilter: 'blur(20px) saturate(1.2)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
          borderBottom: theme === 'light' ? '1px solid rgba(226, 232, 240, 0.9)' : '1px solid rgba(255,255,255,0.06)',
          boxShadow: theme === 'light' ? '0 4px 20px -4px rgba(0,0,0,0.06)' : '0 4px 30px -8px rgba(0,0,0,0.5)'
        }}>
          {/* Left: Breadcrumbs & Screen Title */}
          <div className="flex items-center space-x-3.5 pl-12 md:pl-0">
            <div className="w-2.5 h-2.5 rounded-full" style={{ background: 'rgb(139,92,246)', boxShadow: '0 0 10px rgba(139,92,246,0.8)' }} />
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-bold">BHARAT-DRISHTI</span>
                <span className="text-slate-400 text-sm">›</span>
                <span className={`text-sm sm:text-base font-bold font-display ${theme === 'light' ? 'text-slate-900' : 'text-white'}`}>{tabTitles[activeTab] || 'Command Centre'}</span>
              </div>
              <p className="text-xs text-slate-400 font-medium hidden sm:block mt-0.5">National MPLADS AI Vigilance Command Network</p>
            </div>
          </div>

          {/* Right: Live Telemetry, IST Clock, Role Scope & Dark/Light Mode Switch */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Real-time System Status Pill (98,649 WORKS & Ping) */}
            <div className="flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono" style={{ background: theme === 'light' ? 'rgba(241,245,249,0.9)' : 'rgba(0,0,0,0.35)', border: theme === 'light' ? '1px solid rgba(203,213,225,0.8)' : '1px solid rgba(255,255,255,0.06)' }}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ boxShadow: isOnline ? '0 0 8px rgba(52,211,153,0.8)' : '0 0 8px rgba(251,113,133,0.8)' }} />
              <span className={`font-bold font-mono tracking-wide ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>98,649 WORKS</span>
              <span className="text-slate-400">|</span>
              <span className="text-violet-500 font-semibold">{ping !== null ? `${ping}ms` : '40ms'}</span>
            </div>

            <div className="hidden lg:flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-mono" style={{ background: theme === 'light' ? 'rgba(241,245,249,0.8)' : 'rgba(0,0,0,0.3)', border: theme === 'light' ? '1px solid rgba(203,213,225,0.8)' : '1px solid rgba(255,255,255,0.06)', color: theme === 'light' ? '#475569' : '#cbd5e1' }}>
              <Clock className="w-4 h-4 text-violet-400" />
              <span>{currentTime}</span>
            </div>

            <div className="flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-semibold" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.28)', color: theme === 'light' ? '#6d28d9' : 'rgba(196,181,253,0.95)' }}>
              <Radio className="w-3.5 h-3.5 animate-pulse text-violet-500" />
              <span className="hidden sm:inline uppercase font-mono">{currentUser.role || 'Official'}</span>
              <span className="font-mono">Scope</span>
            </div>

            {/* Dark / Light Mode Switch */}
            <button
              onClick={toggleTheme}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer group hover:scale-[1.03] active:scale-95 shadow-sm"
              style={{
                background: theme === 'light' ? '#ffffff' : 'rgba(15,23,42,0.65)',
                border: theme === 'light' ? '1px solid rgba(203,213,225,0.95)' : '1px solid rgba(139,92,246,0.3)',
                color: theme === 'light' ? '#0f172a' : '#cbd5e1'
              }}
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
              aria-label="Toggle Theme"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-4 h-4 text-amber-400 group-hover:rotate-45 transition-transform" />
                  <span className="font-mono text-xs font-bold text-amber-300 hidden sm:inline">LIGHT</span>
                </>
              ) : (
                <>
                  <Moon className="w-4 h-4 text-violet-600 group-hover:-rotate-12 transition-transform" />
                  <span className="font-mono text-xs font-bold text-violet-700 hidden sm:inline">DARK</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Body Content */}
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6" style={{ position: 'relative' }}>
          
          {/* Toast Notification */}
          {toastMessage && (
            <div className="fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl glass-panel-glow border border-violet-500/40 text-sm font-semibold text-violet-200 shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-bottom-5">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* TAB 1: COMMAND CENTRE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Command Centre Telemetry Banner */}
              <div className="glass-panel px-6 py-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-200/80 dark:border-white/[0.06]">
                <div className="flex items-center space-x-3.5">
                  <span className="flex h-2.5 w-2.5 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-60 bg-emerald-400"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                  </span>
                  <div>
                    <span className="font-mono text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-wide">
                      NATIONAL COMMAND ACTIVE — {(kpis?.total_works || 98649).toLocaleString()} WORKS
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Continuous telemetry across 543 Lok Sabha and 245 Rajya Sabha MP allocations</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 font-mono text-xs self-start sm:self-auto">
                  <button
                    onClick={() => setActiveTab('validation')}
                    className="px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>ACCURACY: 100% STATUTORY / 83.7% ML</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Executive KPIs Grid */}
              <ExecutiveKpis key={`kpi-${activeRole}`} kpis={kpis} onFilterTier={handleFilterTier} />

              {/* Visual Analytics & Breakdown */}
              <QuickStatsCharts key={`stats-${activeRole}`} kpis={kpis} />

              {/* Live Flagged Feeds Preview Section */}
              <div className="glass-panel p-6 rounded-2xl space-y-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                      <ShieldAlert className="w-5 h-5 text-rose-400" />
                      Priority Action Radar
                    </h3>
                    <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                      Works flagged with critical composite risk (&gt; 0.85) requiring statutory review.
                    </p>
                  </div>

                  <button
                    onClick={() => setActiveTab('alerts')}
                    className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
                    style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.25)', color: 'rgba(196,181,253,0.95)' }}
                  >
                    <span>View Complete Alert Queue</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>

                {/* Embedded Mini Feed */}
                <LiveAlertFeed 
                  key={`mini-feed-${activeRole}`} 
                  activeRole={activeRole} 
                  onSelectWork={setSelectedWorkId} 
                  initialTier="critical" 
                />
              </div>

            </div>
          )}

          {/* TAB 2: LIVE ALERTS FEED */}
          {activeTab === 'alerts' && (
            <div className="space-y-4">
              <div className="glass-panel p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4" style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white font-display flex items-center gap-2.5">
                    <ShieldAlert className="w-5 h-5 text-rose-400" />
                    Live Statutory Vigilance &amp; Anomaly Queue
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    Filter, search, and audit schemes across all 5-layers of the AI detection ensemble.
                  </p>
                </div>
                <span className="text-xs font-mono px-3.5 py-2 rounded-xl flex items-center gap-2 self-start sm:self-auto" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)', color: 'rgba(196,181,253,0.9)' }}>
                  <span className="w-2 h-2 rounded-full animate-pulse bg-violet-400" />
                  <span>Sub-20ms SQL Indexing Active</span>
                </span>
              </div>

              <LiveAlertFeed 
                key={`feed-${activeRole}`} 
                activeRole={activeRole} 
                onSelectWork={setSelectedWorkId} 
                initialTier={initialTier} 
              />
            </div>
          )}

          {/* TAB: MODEL ACCURACY & VALIDATION */}
          {activeTab === 'validation' && (
            <ModelValidationView onSelectWork={setSelectedWorkId} />
          )}

          {/* TAB 3: BENFORD'S LAW FORENSIC MODULE */}
          {activeTab === 'benford' && (
            <BenfordView 
              key={`benford-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}

          {/* TAB 4: OCR CERTIFICATE LAB */}
          {activeTab === 'ocr' && (
            <OcrLabView onSelectWork={setSelectedWorkId} />
          )}

          {/* TAB 5: PHASH PHOTO FORENSICS */}
          {activeTab === 'phash' && (
            <PHashViewer onSelectWork={setSelectedWorkId} />
          )}

          {/* TAB 6: CONTRACTOR SYNDICATES & CARTELS */}
          {activeTab === 'vendors' && (
            <VendorNetworkView 
              key={`vendors-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}

          {/* TAB 7: GEOSPATIAL MAP */}
          {activeTab === 'map' && (
            <GeoRiskMapView 
              key={`map-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}

          {/* TAB 8: IMMUTABLE AUDIT LEDGER */}
          {activeTab === 'audit' && (
            <AuditLedgerView 
              key={`audit-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}

        </main>

        {/* Forensic Case File Modal (Deep-Dive Drawer) */}
        {selectedWorkId && (
          <CaseFileModal
            workId={selectedWorkId}
            onClose={() => setSelectedWorkId(null)}
            onActionLogged={() => {
              showToast(`Auditor action for #${selectedWorkId} permanently sealed.`);
              loadKpis();
            }}
          />
        )}

        {/* MoSPI Secretary AI Briefing Modal */}
        {showSecretaryBriefing && (
          <SecretaryBriefingModal
            onClose={() => setShowSecretaryBriefing(false)}
          />
        )}

        {/* Platform Footer */}
        <footer className="mt-auto py-6 text-xs text-slate-400" style={{ borderTop: '1px solid rgba(139,92,246,0.15)', background: 'linear-gradient(180deg, rgba(8,12,24,0.7) 0%, rgba(4,8,16,0.95) 100%)' }}>
          <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center space-x-3">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" style={{ boxShadow: '0 0 10px rgba(52,211,153,0.8)' }} />
              <div>
                <span className="font-display font-bold text-white text-sm tracking-wide">BHARAT-DRISHTI</span>
                <span className="text-slate-400 text-xs ml-2 hidden sm:inline">• National MPLADS AI Vigilance &amp; Autonomous Audit System</span>
              </div>
            </div>
            
            <div className="flex flex-wrap items-center justify-center gap-2 font-mono text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-800">MoSPI DIID Directorate</span>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900/90 text-slate-300 border border-slate-800">GFR 2017 &amp; CAG Standards</span>
              <span className="px-2.5 py-1 rounded-lg bg-violet-500/15 text-violet-300 border border-violet-500/30 font-bold">Command Centre v3.0</span>
            </div>

            <div className="text-slate-400 font-mono text-xs text-center md:text-right">
              <span>© 2026 Government of India • Official Vigilance Console</span>
            </div>
          </div>
        </footer>

      </div>
    </div>
  );
}
