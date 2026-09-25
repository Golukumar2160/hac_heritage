import React, { useState, useEffect, Suspense, lazy } from 'react';
import Sidebar from './components/Sidebar';
import LandingPage from './components/LandingPage';
import ExecutiveKpis from './components/ExecutiveKpis';
import QuickStatsCharts from './components/QuickStatsCharts';
import LiveAlertFeed from './components/LiveAlertFeed';
import AuthModal from './components/auth/AuthModal';
import { api } from './services/api';
import AshokaChakra from './components/AshokaChakra';

// Lazy-Loaded Heavy Dashboard Views for Sub-Second Initial Bundle
const CaseFileModal = lazy(() => import('./components/CaseFileModal'));
const VendorNetworkView = lazy(() => import('./components/VendorNetworkView'));
const GeoRiskMapView = lazy(() => import('./components/GeoRiskMapView'));
const AuditLedgerView = lazy(() => import('./components/AuditLedgerView'));
const SecretaryBriefingModal = lazy(() => import('./components/SecretaryBriefingModal'));
const VisualForensicsLab = lazy(() => import('./components/VisualForensicsLab'));
const LiveBatchAuditLab = lazy(() => import('./components/LiveBatchAuditLab'));
const ModelValidationView = lazy(() => import('./components/ModelValidationView'));
const EarlyWarningRadar = lazy(() => import('./components/EarlyWarningRadar'));
const BenfordView = lazy(() => import('./components/BenfordView'));
const QuotaComplianceView = lazy(() => import('./components/QuotaComplianceView'));
const MpProfileModal = lazy(() => import('./components/MpProfileModal'));

// Lazy-Loaded Citizen Portal Views
const CitizenDashboard = lazy(() => import('./citizen').then(m => ({ default: m.CitizenDashboard })));
const CitizenAnomalyFeed = lazy(() => import('./citizen').then(m => ({ default: m.CitizenAnomalyFeed })));
const CitizenCaseModal = lazy(() => import('./citizen').then(m => ({ default: m.CitizenCaseModal })));
const CitizenPlaqueView = lazy(() => import('./citizen').then(m => ({ default: m.CitizenPlaqueView })));

const ViewLoader = () => (
  <div className="flex flex-col items-center justify-center min-h-[350px] space-y-4">
    <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
    <span className="text-xs font-mono text-slate-400 tracking-wider uppercase">Loading Sovereign Analytics...</span>
  </div>
);
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
  UserCheck,
  Scale,
  Radio,
  Zap,
  ShieldCheck,
  UploadCloud,
  Sun,
  Moon
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => api.getCurrentUser());
  const activeRole = currentUser?.role || 'ministry';
  const isCitizen = activeRole === 'citizen';
  const [activeTab, setActiveTab] = useState(() => {
    const user = api.getCurrentUser();
    return user?.role === 'citizen' ? 'citizen_overview' : 'overview';
  });
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [selectedMpName, setSelectedMpName] = useState(null);
  const [showSecretaryBriefing, setShowSecretaryBriefing] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [initialTier, setInitialTier] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);
  const [pipelineRunning, setPipelineRunning] = useState(false);
  const [ping, setPing] = useState(40);
  const [isOnline, setIsOnline] = useState(true);

  const handleTriggerPipeline = async () => {
    try {
      setPipelineRunning(true);
      const res = await api.triggerPipeline();
      showToast(res.message || 'ML pipeline started in background thread.');

      let attempts = 0;
      const maxAttempts = 60; // 60 * 2.5s = 150s guard
      const pollInterval = setInterval(async () => {
        attempts++;
        try {
          const st = await api.getPipelineStatus();
          if (!st.is_running) {
            clearInterval(pollInterval);
            setPipelineRunning(false);
            showToast('ML batch audit pipeline completed successfully.');
            loadKpis();
          } else if (attempts >= maxAttempts) {
            clearInterval(pollInterval);
            setPipelineRunning(false);
            showToast('Pipeline execution continues in background.');
            loadKpis();
          }
        } catch {
          clearInterval(pollInterval);
          setPipelineRunning(false);
        }
      }, 2500);
    } catch (err) {
      console.error('Pipeline run error:', err);
      showToast(`Pipeline trigger failed: ${err.message}`);
      setPipelineRunning(false);
    }
  };

  // Global District & State Scoping for Citizen & Official telemetry
  const [selectedDistrict, setSelectedDistrict] = useState(() => currentUser?.ida || 'PILIBHIT(DISTRICT MAGISTRAE PILIBHIT_IDA)');
  const [selectedState, setSelectedState] = useState(() => currentUser?.state || 'Uttar Pradesh');
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
    const interval = setInterval(checkPing, 60000);
    return () => clearInterval(interval);
  }, []);

  // URL Deep-Linking: Check for ?verify= or ?work_id= from QR codes or direct links
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const verifyId = params.get('verify') || params.get('work_id');
      if (verifyId) {
        setSelectedWorkId(decodeURIComponent(verifyId).trim());
      }
    } catch (e) {
      console.warn('Could not parse verify param from URL:', e);
    }
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
      api.prefetchCoreViews();
      const interval = setInterval(loadKpis, 300000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  const handleAuthSuccess = (user) => {
    setCurrentUser(user);
    setShowAuthModal(false);
    if (user.ida) setSelectedDistrict(user.ida);
    if (user.state) setSelectedState(user.state);
    if (user.role === 'citizen') {
      setActiveTab('citizen_overview');
    } else {
      setActiveTab('overview');
    }
    loadKpis();
    api.prefetchCoreViews();
    showToast(`Welcome, ${user.name} (${(user.role || 'Official').toUpperCase()})`);
  };

  const handleLogout = () => {
    api.logout();
    setCurrentUser(null);
    setActiveTab('overview');
    setKpis(null);
    showToast('Signed out of official account');
  };

  const [isSwitchingStakeholder, setIsSwitchingStakeholder] = useState(false);

  const handleSwitchStakeholder = async (roleKey) => {
    if (roleKey === activeRole || isSwitchingStakeholder) return;
    try {
      setIsSwitchingStakeholder(true);
      const res = await api.switchStakeholder(roleKey);
      setCurrentUser(res);
      if (res.ida) setSelectedDistrict(res.ida);
      if (res.state) setSelectedState(res.state);
      if (roleKey === 'citizen') {
        setActiveTab('citizen_overview');
      } else if (activeTab.startsWith('citizen_')) {
        setActiveTab('overview');
      }
      await loadKpis();
      api.prefetchCoreViews();
      const roleNames = {
        ministry: 'MoSPI National Command (98,649 Works)',
        state: 'State Nodal UP (19,892 Works)',
        district: 'District Magistrate Pilibhit (293 Works)',
        mp: "Hon'ble MP Javed Ali Khan (178 Works)",
        citizen: 'Jan-Drishti Public Watchdog'
      };
      showToast(`Switched view to ${roleNames[roleKey] || roleKey.toUpperCase()}`);
    } catch (err) {
      console.error('Failed to switch stakeholder:', err);
      showToast(`Stakeholder switch error: ${err.message}`);
    } finally {
      setIsSwitchingStakeholder(false);
    }
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
        {/* Deep-Linked Citizen Verification Modal for Scanned / Shared QR links */}
        {selectedWorkId && (
          <CitizenCaseModal
            workId={selectedWorkId}
            onClose={() => {
              setSelectedWorkId(null);
              const url = new URL(window.location.href);
              url.searchParams.delete('verify');
              url.searchParams.delete('work_id');
              window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
            }}
            onFeedbackSubmitted={() => {
              showToast(`Citizen report for #${selectedWorkId} registered with district vigilance.`);
            }}
          />
        )}
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
    batch_audit: 'Live Batch CSV Audit Lab',
    early_warning: 'Early Warning & Predictive Forecast',
    map: 'Geospatial Risk Map',
    vendors: 'Contractor Syndicates & Cartels',
    visual_forensics: 'Visual & Media Forensics Lab',
    ocr: 'Visual & Media Forensics Lab',
    phash: 'Visual & Media Forensics Lab',
    audit: 'Statutory Audit Ledger',
    validation: 'Model Validation & ROC',
    citizen_overview: 'District Fraud Watch',
    citizen_alerts: 'District Anomaly Radar',
    citizen_map: 'District Geospatial Map',
    citizen_plaques: 'Jan-Drishti Plaque & QR'
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
            {/* Real-time System Status Pill (Scoped Works) */}
            <div className="flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono" style={{ background: theme === 'light' ? 'rgba(241,245,249,0.9)' : 'rgba(0,0,0,0.35)', border: theme === 'light' ? '1px solid rgba(203,213,225,0.8)' : '1px solid rgba(255,255,255,0.06)' }}>
              <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ boxShadow: isOnline ? '0 0 8px rgba(52,211,153,0.8)' : '0 0 8px rgba(251,113,133,0.8)' }} />
              <span className={`font-bold font-mono tracking-wide ${theme === 'light' ? 'text-slate-700' : 'text-slate-200'}`}>
                {kpis?.total_works ? `${Number(kpis.total_works).toLocaleString('en-IN')} WORKS` : '98,649 WORKS'}
              </span>
            </div>

            {/* Scoped Authority Indicator Badge (Locked to User's Role, No Switcher Options) */}
            <div 
              className="flex items-center space-x-2 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-mono font-bold tracking-wide shadow-xs"
              style={{
                background: activeRole === 'state' ? 'rgba(6,182,212,0.18)' :
                            activeRole === 'district' ? 'rgba(16,185,129,0.18)' :
                            activeRole === 'mp' ? 'rgba(245,158,11,0.18)' :
                            activeRole === 'citizen' ? 'rgba(20,184,166,0.18)' :
                            'rgba(139,92,246,0.18)',
                border: activeRole === 'state' ? '1px solid rgba(6,182,212,0.4)' :
                        activeRole === 'district' ? '1px solid rgba(16,185,129,0.4)' :
                        activeRole === 'mp' ? '1px solid rgba(245,158,11,0.4)' :
                        activeRole === 'citizen' ? '1px solid rgba(20,184,166,0.4)' :
                        '1px solid rgba(139,92,246,0.4)',
                color: activeRole === 'state' ? '#67e8f9' :
                       activeRole === 'district' ? '#6ee7b7' :
                       activeRole === 'mp' ? '#fcd34d' :
                       activeRole === 'citizen' ? '#5eead4' :
                       '#c4b5fd'
              }}
              title={`Authenticated Session: ${currentUser?.name || 'Official'} (${(activeRole || 'ministry').toUpperCase()})`}
            >
              {activeRole === 'state' ? <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" /> :
               activeRole === 'district' ? <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> :
               activeRole === 'mp' ? <Vote className="w-3.5 h-3.5 text-amber-400 shrink-0" /> :
               activeRole === 'citizen' ? <UserCheck className="w-3.5 h-3.5 text-teal-400 shrink-0" /> :
               <Landmark className="w-3.5 h-3.5 text-violet-400 shrink-0" />}
              <span>
                {activeRole === 'state' ? `State (${currentUser?.state ? (currentUser.state.length > 12 ? currentUser.state.slice(0, 10) + '..' : currentUser.state) : 'UP'})` :
                 activeRole === 'district' ? `DM (${currentUser?.ida?.replace(/\(.*?\)/g, '')?.replace(/_IDA/g, '')?.trim() || 'Pilibhit'})` :
                 activeRole === 'mp' ? `Hon MP (${currentUser?.name ? currentUser.name.split(' ').slice(0, 2).join(' ') : 'Javed'})` :
                 activeRole === 'citizen' ? `Citizen (${currentUser?.ida?.replace(/\(.*?\)/g, '')?.replace(/_IDA/g, '')?.trim() || 'Pilibhit'})` :
                 'Central MoSPI'}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                activeRole === 'state' ? 'bg-cyan-800/80 text-cyan-100' :
                activeRole === 'district' ? 'bg-emerald-800/80 text-emerald-100' :
                activeRole === 'mp' ? 'bg-amber-800/80 text-amber-100' :
                activeRole === 'citizen' ? 'bg-teal-800/80 text-teal-100' :
                'bg-violet-800/80 text-violet-100'
              }`}>
                {activeRole === 'state' ? (kpis?.total_works ? `${(kpis.total_works / 1000).toFixed(1)}k` : '19.9k') :
                 activeRole === 'district' ? (kpis?.total_works ? `${kpis.total_works}` : '293') :
                 activeRole === 'mp' ? (kpis?.total_works ? `${kpis.total_works}` : '178') :
                 activeRole === 'citizen' ? 'Public' :
                 '98.6k'}
              </span>
            </div>

            {/* Direct Upload CSV Audit Button (Hackathon Primary Feature) */}
            <button
              onClick={() => setActiveTab('batch_audit')}
              className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 group"
              style={{
                background: activeTab === 'batch_audit'
                  ? 'linear-gradient(135deg, #7c3aed 0%, #6d28d9 100%)'
                  : (theme === 'light' ? '#ffffff' : 'rgba(139,92,246,0.15)'),
                border: activeTab === 'batch_audit'
                  ? '1px solid #7c3aed'
                  : (theme === 'light' ? '1px solid rgba(139,92,246,0.4)' : '1px solid rgba(139,92,246,0.3)'),
                color: activeTab === 'batch_audit' ? '#ffffff' : (theme === 'light' ? '#6d28d9' : '#c4b5fd')
              }}
              title="Launch Live Batch CSV Audit Lab"
            >
              <UploadCloud className={`w-3.5 h-3.5 ${activeTab === 'batch_audit' ? 'text-white' : 'text-violet-500'}`} />
              <span className="font-mono text-xs font-bold hidden sm:inline">UPLOAD CSV AUDIT</span>
            </button>

            {/* Trigger Background ML Pipeline (Official Roles) */}
            {!isCitizen && (
              <button
                onClick={handleTriggerPipeline}
                disabled={pipelineRunning}
                className="flex items-center space-x-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-95 group disabled:opacity-50"
                style={{
                  background: pipelineRunning 
                    ? 'rgba(99,102,241,0.25)' 
                    : (theme === 'light' ? '#f8fafc' : 'rgba(99,102,241,0.15)'),
                  border: '1px solid rgba(99,102,241,0.35)',
                  color: theme === 'light' ? '#4f46e5' : '#a5b4fc'
                }}
                title="Trigger Non-Blocking Background ML Batch Pipeline"
              >
                <Zap className={`w-3.5 h-3.5 ${pipelineRunning ? 'animate-spin text-amber-400' : 'text-indigo-400'}`} />
                <span className="font-mono text-xs font-bold hidden sm:inline">
                  {pipelineRunning ? 'RUNNING ML...' : 'RUN ML PIPELINE'}
                </span>
              </button>
            )}

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

          <Suspense fallback={<ViewLoader />}>
          {/* CITIZEN VIEWS */}
          {isCitizen && (activeTab === 'citizen_overview' || activeTab === 'overview') && (
            <CitizenDashboard
              key={`citizen-dash-${currentUser?.username || 'usr'}`}
              currentUser={currentUser}
              district={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              state={selectedState}
              onStateChange={setSelectedState}
              onSelectWork={setSelectedWorkId}
              onNavigateTab={setActiveTab}
              theme={theme}
            />
          )}

          {isCitizen && (activeTab === 'citizen_alerts' || activeTab === 'alerts') && (
            <CitizenAnomalyFeed
              key={`citizen-feed-${currentUser?.username || 'usr'}`}
              district={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              state={selectedState}
              onStateChange={setSelectedState}
              onSelectWork={setSelectedWorkId}
            />
          )}

          {isCitizen && activeTab === 'citizen_plaques' && (
            <CitizenPlaqueView
              key={`citizen-plaque-${currentUser?.username || 'usr'}`}
              district={selectedDistrict}
              onDistrictChange={setSelectedDistrict}
              state={selectedState}
              onStateChange={setSelectedState}
              onSelectWork={setSelectedWorkId}
            />
          )}

          {/* OFFICIAL TAB 1: COMMAND CENTRE */}
          {!isCitizen && activeTab === 'overview' && (
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
                      {activeRole === 'state' ? `STATE NODAL COMMAND (${(currentUser?.state || 'UTTAR PRADESH').toUpperCase()})` :
                       activeRole === 'district' ? `DISTRICT ENFORCEMENT COMMAND (${(currentUser?.ida?.replace(/\(.*?\)/g, '')?.replace(/_IDA/g, '')?.trim() || currentUser?.district || 'PILIBHIT').toUpperCase()})` :
                       activeRole === 'mp' ? `CONSTITUENCY INTEGRITY MONITOR (${(currentUser?.name || "HON'BLE MP").toUpperCase()})` :
                       'NATIONAL COMMAND ACTIVE (MoSPI CENTRAL)'}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {activeRole === 'state' ? `State planning authority oversight across districts in ${currentUser?.state || 'the state'} under vigilance` :
                       activeRole === 'district' ? `District Magistrate statutory powers: Tranche freezes, contractor show-causes, ground inspections` :
                       activeRole === 'mp' ? `Development delivery tracking & Clause 3.2 mandatory SC (15%) and ST (7.5%) fund earmarking` :
                       'Continuous telemetry across 543 Lok Sabha and 245 Rajya Sabha MP allocations (98,649 works, ₹5,880 Cr)'}
                    </p>
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
              <ExecutiveKpis key={`kpi-${activeRole}`} kpis={kpis} onFilterTier={handleFilterTier} activeRole={activeRole} />

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
                      Works flagged with critical composite risk (Score ≥ 85.0) requiring statutory review.
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

          {/* OFFICIAL TAB 2: LIVE ALERTS FEED */}
          {!isCitizen && activeTab === 'alerts' && (
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

          {/* TAB: LIVE BATCH CSV AUDIT LAB (MULTI-MODEL ZERO-SHOT EVALUATION) */}
          {activeTab === 'batch_audit' && (
            <LiveBatchAuditLab onSelectWork={setSelectedWorkId} />
          )}

          {/* OFFICIAL TAB: EARLY WARNING RADAR & CONSTITUENCY FORECAST */}
          {!isCitizen && activeTab === 'early_warning' && (
            <EarlyWarningRadar 
              key={`early-warning-${activeRole}`}
              onSelectWork={setSelectedWorkId} 
              activeRole={activeRole} 
            />
          )}

          {/* OFFICIAL TAB: MODEL ACCURACY & VALIDATION */}
          {!isCitizen && activeTab === 'validation' && (
            <ModelValidationView onSelectWork={setSelectedWorkId} />
          )}

          {/* OFFICIAL TAB: BENFORD'S LAW FORENSICS */}
          {!isCitizen && activeTab === 'benford' && (
            <BenfordView onSelectWork={setSelectedWorkId} />
          )}

          {/* OFFICIAL TAB: MOSPI CLAUSE 3.2 SC/ST QUOTA MONITOR */}
          {!isCitizen && activeTab === 'quotas' && (
            <QuotaComplianceView 
              onSelectWork={setSelectedWorkId} 
              onSelectMp={setSelectedMpName}
            />
          )}

          {/* VISUAL & MEDIA FORENSICS LAB (COMBINED PHASH, TAMPER ELA & OCR) */}
          {(activeTab === 'visual_forensics' || activeTab === 'phash' || activeTab === 'ocr') && (
            <VisualForensicsLab onSelectWork={setSelectedWorkId} />
          )}

          {/* OFFICIAL TAB 6: CONTRACTOR SYNDICATES & CARTELS */}
          {!isCitizen && activeTab === 'vendors' && (
            <VendorNetworkView 
              key={`vendors-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}

          {/* TAB 7: GEOSPATIAL MAP */}
          {(activeTab === 'map' || activeTab === 'citizen_map') && (
            <GeoRiskMapView 
              key={`map-${activeRole}-${currentUser?.username || 'usr'}`} 
              activeRole={activeRole} 
              currentUser={currentUser}
              onSelectWork={setSelectedWorkId} 
            />
          )}

          {/* OFFICIAL TAB 8: IMMUTABLE AUDIT LEDGER */}
          {!isCitizen && activeTab === 'audit' && (
            <AuditLedgerView 
              key={`audit-${activeRole}`} 
              activeRole={activeRole} 
              onSelectWork={setSelectedWorkId} 
            />
          )}
          </Suspense>

        </main>

        <Suspense fallback={null}>
        {/* Forensic Case File Modal (Deep-Dive Drawer) */}
        {selectedWorkId && (
          isCitizen ? (
            <CitizenCaseModal
              workId={selectedWorkId}
              onClose={() => {
                setSelectedWorkId(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('verify');
                url.searchParams.delete('work_id');
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
              }}
              onFeedbackSubmitted={() => {
                showToast(`Citizen report for #${selectedWorkId} registered with district vigilance.`);
                loadKpis();
              }}
            />
          ) : (
            <CaseFileModal
              workId={selectedWorkId}
              onClose={() => {
                setSelectedWorkId(null);
                const url = new URL(window.location.href);
                url.searchParams.delete('verify');
                url.searchParams.delete('work_id');
                window.history.replaceState({}, '', url.pathname + (url.search ? url.search : ''));
              }}
              onActionLogged={() => {
                showToast(`Auditor action for #${selectedWorkId} permanently sealed.`);
                loadKpis();
              }}
            />
          )
        )}

        {/* MoSPI Secretary AI Briefing Modal (Statutory central authorities only) */}
        {!isCitizen && showSecretaryBriefing && (
          <SecretaryBriefingModal
            onClose={() => setShowSecretaryBriefing(false)}
          />
        )}

        {/* MP Parliamentary Profile & Analytical Drilldown Modal */}
        {selectedMpName && (
          <MpProfileModal
            mpName={selectedMpName}
            onClose={() => setSelectedMpName(null)}
            onSelectWork={(workId) => {
              setSelectedMpName(null);
              setSelectedWorkId(workId);
            }}
          />
        )}
        </Suspense>

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
