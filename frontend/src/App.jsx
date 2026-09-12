import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import ExecutiveKpis from './components/ExecutiveKpis';
import QuickStatsCharts from './components/QuickStatsCharts';
import LiveAlertFeed from './components/LiveAlertFeed';
import CaseFileModal from './components/CaseFileModal';
import ErrorBoundary from './components/ErrorBoundary';
import BenfordView from './components/BenfordView';
import VendorNetworkView from './components/VendorNetworkView';
import GeoRiskMapView from './components/GeoRiskMapView';
import AuditLedgerView from './components/AuditLedgerView';
import SecretaryBriefingModal from './components/SecretaryBriefingModal';
import OcrLabView from './components/OcrLabView';
import PHashViewer from './components/PHashViewer';
import ModelValidationView from './components/ModelValidationView';
import { api } from './services/api';
import { 
  ShieldAlert, 
  Sparkles, 
  Activity, 
  FileText, 
  Layers, 
  AlertTriangle,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  Building2,
  Landmark,
  MapPin,
  UserCheck
} from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeRole, setActiveRole] = useState('ministry');
  const [selectedWorkId, setSelectedWorkId] = useState(null);
  const [showSecretaryBriefing, setShowSecretaryBriefing] = useState(false);
  const [kpis, setKpis] = useState(null);
  const [initialTier, setInitialTier] = useState('all');
  const [toastMessage, setToastMessage] = useState(null);

  // Auto authenticate with demo accounts if not logged in
  useEffect(() => {
    // Attempt default login as ministry admin
    api.login('ministry_admin', 'Ministry@2026').catch(() => {});
  }, []);

  const loadKpis = async () => {
    try {
      const data = await api.getKpis();
      setKpis(data);
    } catch (err) {
      console.error('Error fetching KPIs:', err);
    }
  };

  useEffect(() => {
    loadKpis();
    const interval = setInterval(loadKpis, 30000);
    return () => clearInterval(interval);
  }, [activeRole]);

  const handleRoleChange = async (newRole) => {
    const roleCredentials = {
      ministry: ['ministry_admin', 'Ministry@2026'],
      state: ['state_nodal_up', 'StateUP@2026'],
      district: ['district_pilibhit', 'District@2026'],
      mp: ['mp_javed', 'MP@2026'],
    };
    const creds = roleCredentials[newRole];
    if (creds) {
      try {
        await api.login(creds[0], creds[1]);
        showToast(`Switched access context to ${newRole.toUpperCase()} level`);
      } catch (err) {
        console.error('Role switch error:', err);
      }
    }
    setActiveRole(newRole);
    loadKpis();
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleFilterTier = (tier) => {
    setInitialTier(tier);
    setActiveTab('alerts');
  };

  return (
    <div className="min-h-screen bg-navy-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      
      {/* Top Ministry Command Header */}
      <Header
        activeRole={activeRole}
        onRoleChange={handleRoleChange}
        onOpenSecretaryBriefing={() => setShowSecretaryBriefing(true)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Persistent Active Persona Scope Banner */}
      <div className="bg-slate-900/95 border-b border-slate-800/90 px-4 sm:px-6 lg:px-8 py-2.5 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-xl border ${
              activeRole === 'ministry' 
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-400 shadow-sm shadow-cyan-500/20'
                : activeRole === 'state'
                  ? 'bg-amber-500/10 border-amber-500/40 text-amber-400 shadow-sm shadow-amber-500/20'
                  : activeRole === 'district'
                    ? 'bg-purple-500/10 border-purple-500/40 text-purple-400 shadow-sm shadow-purple-500/20'
                    : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400 shadow-sm shadow-emerald-500/20'
            }`}>
              {activeRole === 'ministry' && <Building2 className="w-4 h-4" />}
              {activeRole === 'state' && <Landmark className="w-4 h-4" />}
              {activeRole === 'district' && <MapPin className="w-4 h-4" />}
              {activeRole === 'mp' && <UserCheck className="w-4 h-4" />}
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  Active Persona Scope
                </span>
                <span className="font-bold text-white text-xs">
                  {activeRole === 'ministry' && 'MoSPI Central Ministry Official — National Oversight Directorate'}
                  {activeRole === 'state' && 'State Nodal Authority — Uttar Pradesh Directorate'}
                  {activeRole === 'district' && 'District Authority — Pilibhit Jurisdiction (DM Office)'}
                  {activeRole === 'mp' && 'Hon\'ble Member of Parliament — Shri Javed Ali Khan (Sambhal, UP)'}
                </span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 flex flex-wrap items-center gap-2">
                <span>
                  {activeRole === 'ministry' && (
                    kpis 
                      ? `All 36 States & Union Territories // ${kpis.total_works.toLocaleString()} Works // ${kpis.critical_count.toLocaleString()} Critical Flags`
                      : 'All 36 States & Union Territories // Live Telemetry Loading...'
                  )}
                  {activeRole === 'state' && (
                    kpis 
                      ? `State Jurisdiction: Uttar Pradesh (75 Districts) // ${kpis.total_works.toLocaleString()} Works Monitored // ${kpis.critical_count.toLocaleString()} Critical Flags`
                      : 'State Jurisdiction: Uttar Pradesh // Live Telemetry Loading...'
                  )}
                  {activeRole === 'district' && (
                    kpis 
                      ? `District Jurisdiction: Pilibhit, UP // ${kpis.total_works.toLocaleString()} Works Monitored // ${kpis.critical_count.toLocaleString()} Critical Flags`
                      : 'District Jurisdiction: Pilibhit, UP // Live Telemetry Loading...'
                  )}
                  {activeRole === 'mp' && (
                    kpis 
                      ? `Parliamentary Constituency Scope // ${kpis.total_works.toLocaleString()} Works Monitored // ${kpis.critical_count.toLocaleString()} Critical Flags`
                      : 'Parliamentary Constituency Scope // Live Telemetry Loading...'
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Persona Switcher Shortcuts */}
          <div className="flex items-center gap-1.5 self-start md:self-auto font-mono text-[11px]">
            <span className="text-slate-500 mr-1 text-[10px] uppercase">Simulate Role:</span>
            {[
              { id: 'ministry', label: 'Ministry' },
              { id: 'state', label: 'UP State' },
              { id: 'district', label: 'Pilibhit' },
              { id: 'mp', label: 'MP Scope' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => handleRoleChange(p.id)}
                className={`px-2.5 py-1 rounded-md text-[11px] transition-all font-medium border ${
                  activeRole === p.id
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/60 font-bold shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:text-slate-200 hover:bg-slate-700/80'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main War Room Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div className="fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-xl glass-panel-glow border border-cyan-500/40 text-xs font-semibold text-cyan-200 shadow-2xl flex items-center gap-2 animate-in fade-in slide-in-from-bottom-5">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>{toastMessage}</span>
          </div>
        )}

        {/* TAB 1: EXECUTIVE WAR ROOM (OVERVIEW) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            
            {/* Real-time Ticker Banner */}
            <div className="glass-panel px-4 py-2 rounded-xl flex items-center justify-between text-xs border border-slate-800/80">
              <div className="flex items-center space-x-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span className="font-mono text-slate-300">
                  {activeRole === 'ministry' && <>NATIONAL AUDIT ACTIVE: <strong>{Number(kpis?.total_works || 98649).toLocaleString('en-IN')} WORKS MONITORED</strong></>}
                  {activeRole === 'state' && <>STATE AUDIT ACTIVE: <strong>{Number(kpis?.total_works || 19892).toLocaleString('en-IN')} WORKS IN UTTAR PRADESH</strong></>}
                  {activeRole === 'district' && <>DISTRICT AUDIT ACTIVE: <strong>{Number(kpis?.total_works || 293).toLocaleString('en-IN')} WORKS IN PILIBHIT</strong></>}
                  {activeRole === 'mp' && <>CONSTITUENCY AUDIT ACTIVE: <strong>{Number(kpis?.total_works || 178).toLocaleString('en-IN')} WORKS FOR MP JAVED ALI KHAN</strong></>}
                </span>
              </div>
              <div className="hidden sm:flex items-center space-x-4 text-slate-400 font-mono text-[11px]">
                <button
                  onClick={() => setActiveTab('validation')}
                  className="px-2.5 py-1 rounded bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>ACCURACY VALIDATED: 100% STATUTORY / 83.7% ML</span>
                  <ChevronRight className="w-3 h-3 text-emerald-400" />
                </button>
                <span className="text-cyan-400">FASTAPI v2.2</span>
              </div>
            </div>

            {/* Executive KPIs Grid */}
            <ExecutiveKpis key={`kpi-${activeRole}`} kpis={kpis} onFilterTier={handleFilterTier} />

            {/* Visual Analytics & Breakdown */}
            <QuickStatsCharts key={`stats-${activeRole}`} kpis={kpis} />

            {/* Live Flagged Feeds Preview Section */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white font-display flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Priority Action Radar (Immediate Ground Review)
                  </h3>
                  <p className="text-xs text-slate-400">
                    Schemes with composite risk score &gt; 0.85 requiring immediate statutory intervention.
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('alerts')}
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-all flex items-center gap-1 self-start sm:self-auto"
                >
                  <span>Explore Monitored Works</span>
                  <ChevronRight className="w-3.5 h-3.5" />
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
            <div className="glass-panel p-4 rounded-2xl flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white font-display">
                  Live Statutory Vigilance & Flagged Schemes Directory
                </h2>
                <p className="text-xs text-slate-400">
                  Search, filter, and inspect forensic dossiers across active parliamentary constituencies.
                </p>
              </div>
              <span className="text-xs font-mono text-cyan-400 px-3 py-1 rounded-lg bg-cyan-950/60 border border-cyan-800">
                SQL Index Sync Active
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

        {/* TAB: MODEL ACCURACY & TRIANGULATION VALIDATION */}
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

        {/* TAB 4: OCR CERTIFICATE LAB & DISCREPANCY MATRIX */}
        {activeTab === 'ocr' && (
          <OcrLabView onSelectWork={setSelectedWorkId} />
        )}

        {/* TAB 5: PHASH DUPLICATE PHOTO COLLISION VIEWER */}
        {activeTab === 'phash' && (
          <PHashViewer onSelectWork={setSelectedWorkId} />
        )}

        {/* TAB 6: CONTRACTOR MONOPOLY & NETWORKS */}
        {activeTab === 'vendors' && (
          <VendorNetworkView 
            key={`vendors-${activeRole}`} 
            activeRole={activeRole} 
            onSelectWork={setSelectedWorkId} 
          />
        )}

        {/* TAB 5: GEOSPATIAL VIGILANCE */}
        {activeTab === 'map' && (
          <GeoRiskMapView 
            key={`map-${activeRole}`} 
            activeRole={activeRole} 
            onSelectWork={setSelectedWorkId} 
          />
        )}

        {/* TAB 6: IMMUTABLE AUDIT TRAIL LEDGER */}
        {activeTab === 'audit' && (
          <AuditLedgerView 
            key={`audit-${activeRole}`} 
            activeRole={activeRole} 
            onSelectWork={setSelectedWorkId} 
          />
        )}

      </main>

      {/* Forensic Case File Modal (Deep-Dive Drawer with Error Boundary Guard) */}
      {selectedWorkId && (
        <ErrorBoundary 
          title="Forensic Case File Guard" 
          onClose={() => setSelectedWorkId(null)}
          onReset={() => setSelectedWorkId(selectedWorkId)}
        >
          <CaseFileModal
            workId={selectedWorkId}
            onClose={() => setSelectedWorkId(null)}
            onActionLogged={() => {
              showToast(`Auditor action for #${selectedWorkId} recorded.`);
              loadKpis();
            }}
          />
        </ErrorBoundary>
      )}

      {/* MoSPI Secretary AI Briefing Modal */}
      {showSecretaryBriefing && (
        <SecretaryBriefingModal
          onClose={() => setShowSecretaryBriefing(false)}
        />
      )}

      {/* Platform Footer */}
      <footer className="mt-auto border-t border-slate-800/80 bg-navy-950/90 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 shadow-glow-cyan animate-pulse" />
            <span>
              <strong>BHARAT-DRISHTI</strong> — National MPLADS AI Vigilance & Anti-Corruption Audit Platform
            </span>
          </div>
          <div className="flex items-center space-x-4 font-mono text-[11px] text-slate-500">
            <span>MoSPI SIH 2026 // PS-26102</span>
            <span>•</span>
            <span>FastAPI + Vite + React 19 + Tailwind v3.4</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
