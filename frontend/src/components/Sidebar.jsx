import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Map, 
  Network, 
  Image as ImageIcon, 
  History, 
  CheckCircle, 
  Sparkles, 
  LogOut, 
  ChevronRight, 
  Zap, 
  Menu, 
  X,
  Clock,
  QrCode,
  UploadCloud,
  Scale,
  Award
} from 'lucide-react';
import emblemLogo from '../assets/logo_dark.jpg';

export default function Sidebar({
  activeTab,
  setActiveTab,
  currentUser,
  onLogout,
  onOpenSecretaryBriefing,
  criticalCount = 0,
  theme = 'dark'
}) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Desktop hover expansion or mobile drawer toggle
  const isExpanded = isHovered || isMobileOpen;
  const isCitizen = false;

  const citizenNavItems = [
    {
      id: 'citizen_overview',
      label: 'District Fraud Watch',
      icon: Zap,
    },
    {
      id: 'citizen_alerts',
      label: 'District Anomaly Radar',
      icon: ShieldAlert,
    },
    {
      id: 'map',
      label: 'Geospatial Risk Map',
      icon: Map,
    },
    {
      id: 'citizen_plaques',
      label: 'Jan-Drishti Plaque & QR',
      icon: QrCode,
    },
    {
      id: 'visual_forensics',
      label: 'Visual & Media Forensics',
      icon: ImageIcon,
    },
    {
      id: 'batch_audit',
      label: 'Jan-Audit: CSV Lab (जन-ऑडिट)',
      icon: UploadCloud,
    },
  ];

  const officialNavItems = [
    {
      id: 'overview',
      label: 'Command Centre',
      icon: Zap,
    },
    {
      id: 'alerts',
      label: 'Live Anomaly Radar',
      icon: ShieldAlert,
    },
    {
      id: 'batch_audit',
      label: 'Batch CSV Audit Lab',
      icon: UploadCloud,
    },
    {
      id: 'early_warning',
      label: 'Early Warning Radar',
      icon: Clock,
    },
    {
      id: 'map',
      label: 'Geospatial Risk Map',
      icon: Map,
    },
    {
      id: 'vendors',
      label: 'Contractor Syndicates',
      icon: Network,
    },
    {
      id: 'visual_forensics',
      label: 'Visual & Media Forensics',
      icon: ImageIcon,
    },
    {
      id: 'audit',
      label: 'Statutory Audit Ledger',
      icon: History,
    },
    {
      id: 'validation',
      label: 'Model Accuracy & ROC',
      icon: CheckCircle,
    },
    {
      id: 'benford',
      label: "Benford's Law Forensics",
      icon: Scale,
    },
    {
      id: 'quotas',
      label: 'Clause 3.2 Quota Monitor',
      icon: Award,
    },
  ];

  const navItems = isCitizen ? citizenNavItems : officialNavItems;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-3 left-3 z-50 p-2.5 rounded-2xl bg-[#0a0f1e]/95 border border-white/[0.06] text-white shadow-xl backdrop-blur-xl"
        aria-label="Toggle Navigation Sidebar"
      >
        {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Backdrop for mobile */}
      {isMobileOpen && (
        <div 
          onClick={() => setIsMobileOpen(false)}
          className="md:hidden fixed inset-0 bg-black/70 backdrop-blur-md z-40"
        />
      )}

      {/* Main Collapsible Hover-Expanding Sidebar Container */}
      <aside 
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`fixed top-0 left-0 h-screen flex flex-col z-50 transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] select-none ${
          isMobileOpen 
            ? 'translate-x-0 w-72' 
            : '-translate-x-full md:translate-x-0'
        } ${
          isHovered 
            ? 'md:w-72 shadow-2xl shadow-violet-950/70 border-r border-violet-500/25' 
            : 'md:w-20 border-r border-white/[0.05]'
        }`}
        style={{
          background: theme === 'light' 
            ? 'linear-gradient(180deg, #ffffff 0%, #f8fafc 40%, #f1f5f9 100%)' 
            : 'linear-gradient(180deg, #080c1a 0%, #060a14 40%, #04080f 100%)',
          backdropFilter: 'blur(20px)',
          borderColor: theme === 'light' ? '#e2e8f0' : undefined
        }}
      >
        
        {/* Top Brand Identity */}
        <div className={`p-2.5 sm:p-3 border-b border-white/[0.04] transition-all duration-300 ${
          isExpanded ? 'px-3.5' : 'px-2'
        }`} 
        style={{ background: 'linear-gradient(135deg, rgba(99,102,241,0.04) 0%, transparent 100%)' }}
        >
          <div className={`flex items-center transition-all duration-300 ${
            isExpanded ? 'justify-start space-x-2.5' : 'justify-center'
          }`}>
            <div className="relative w-9 h-9 rounded-xl p-0.5 flex-shrink-0" style={{ border: '1px solid rgba(139,92,246,0.35)', background: 'rgba(139,92,246,0.08)' }}>
              <img 
                src={emblemLogo} 
                alt="Emblem" 
                className="w-full h-full object-cover rounded-lg" 
              />
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#080c1a]" style={{ boxShadow: '0 0 6px rgba(52,211,153,0.7)' }} />
            </div>

            {/* Title & Badge (Visible when expanded) */}
            <div className={`overflow-hidden transition-all duration-300 ${
              isExpanded ? 'opacity-100 max-w-[200px] ml-1' : 'opacity-0 max-w-0 pointer-events-none hidden md:block md:w-0'
            }`}>
              <span className="font-extrabold text-white text-[13.5px] tracking-[0.1em] font-display block whitespace-nowrap">BHARAT-DRISHTI</span>
              <div className="flex items-center space-x-1.5 mt-0.5 whitespace-nowrap">
                <span className="text-[9.5px] px-1.5 py-0.25 rounded font-mono font-bold tracking-wider" style={{ background: 'rgba(139,92,246,0.15)', color: 'rgba(196,181,253,0.95)', border: '1px solid rgba(139,92,246,0.25)' }}>MoSPI DIID</span>
                <span className="text-[10px] text-slate-400 font-medium">Vigilance AI</span>
              </div>
            </div>
          </div>
        </div>

        {/* AI Secretary Briefing Button (Visible strictly to official authorities, hidden for citizens) */}
        {!isCitizen && (
          <div className="px-2 py-2 border-b border-white/[0.04]">
            <button
              onClick={() => {
                onOpenSecretaryBriefing();
                setIsMobileOpen(false);
              }}
              title={!isExpanded ? "Secretary Briefing" : undefined}
              className={`rounded-xl transition-all duration-300 flex items-center group cursor-pointer ${
                isExpanded 
                  ? 'w-full px-2.5 py-2 justify-between' 
                  : 'w-10 h-10 mx-auto justify-center p-0'
              }`}
              style={{
                background: 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(99,102,241,0.08) 100%)',
                border: '1px solid rgba(139,92,246,0.22)',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.22) 0%, rgba(99,102,241,0.16) 100%)';
                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.45)';
                e.currentTarget.style.boxShadow = '0 4px 16px -4px rgba(139,92,246,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(139,92,246,0.14) 0%, rgba(99,102,241,0.08) 100%)';
                e.currentTarget.style.borderColor = 'rgba(139,92,246,0.22)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className={`flex items-center ${isExpanded ? 'space-x-2.5' : 'justify-center'}`}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform" style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.35)' }}>
                  <Sparkles className="w-3.5 h-3.5 text-violet-300 animate-pulse" />
                </div>
                
                {isExpanded && (
                  <div className="text-left overflow-hidden transition-all duration-300 whitespace-nowrap animate-in fade-in duration-200">
                    <p className="text-xs font-bold leading-tight text-white group-hover:text-violet-200">Secretary Briefing</p>
                    <p className="text-[10px] text-violet-300 font-mono mt-0.5">AI Intelligence Report</p>
                  </div>
                )}
              </div>

              {isExpanded && (
                <ChevronRight className="w-3.5 h-3.5 text-violet-400 group-hover:text-white group-hover:translate-x-0.5 transition-all flex-shrink-0 ml-1.5" />
              )}
            </button>
          </div>
        )}

        {/* Navigation Items List */}
        <nav className="flex-1 overflow-y-auto min-h-0 px-2.5 py-2.5 space-y-1.5 scrollbar-thin">
          {isExpanded && (
            <div className="px-3 pb-1 pt-0.5 text-[11px] font-bold uppercase tracking-wider text-slate-400 font-mono animate-in fade-in duration-200">
              Modules
            </div>
          )}

          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMobileOpen(false);
                }}
                title={!isExpanded ? item.label : undefined}
                className={`rounded-xl text-xs sm:text-[13px] font-semibold flex items-center transition-all duration-200 cursor-pointer group ${
                  isExpanded 
                    ? 'w-full px-3 py-2 justify-between' 
                    : 'w-10 h-10 mx-auto justify-center p-0'
                } ${
                  isActive
                    ? theme === 'light' ? 'text-violet-700 font-bold' : 'text-white font-bold'
                    : theme === 'light' 
                      ? 'bg-white text-slate-700 border border-slate-200/90 shadow-2xs hover:bg-slate-50 hover:border-violet-300 hover:text-slate-900' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/50 border border-transparent'
                }`}
                style={isActive ? {
                  background: theme === 'light'
                    ? 'linear-gradient(135deg, rgba(237,233,254,0.95) 0%, rgba(224,231,255,0.85) 100%)'
                    : 'linear-gradient(135deg, rgba(139,92,246,0.25) 0%, rgba(99,102,241,0.18) 100%)',
                  border: theme === 'light' ? '1px solid rgba(139,92,246,0.45)' : '1px solid rgba(139,92,246,0.4)',
                  boxShadow: theme === 'light' ? '0 2px 8px -2px rgba(139,92,246,0.2)' : '0 2px 12px -2px rgba(139,92,246,0.25)'
                } : undefined}
              >
                <div className={`flex items-center ${isExpanded ? 'space-x-2.5 min-w-0' : 'justify-center'}`}>
                  <Icon className={`w-4 h-4 flex-shrink-0 transition-all ${
                    isActive 
                      ? 'text-violet-600 dark:text-violet-300 scale-105' 
                      : 'text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-200 group-hover:scale-105'
                  }`} />
                  {isExpanded && (
                    <span className="truncate whitespace-nowrap animate-in fade-in duration-200 text-left">{item.label}</span>
                  )}
                </div>
              </button>
            );
          })}
        </nav>

        {/* Dedicated Bottom Session Logout Button */}
        <div className="p-2.5 sm:p-3 border-t border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.01]">
          {isExpanded ? (
            <button
              onClick={onLogout}
              title="Sign out of current official session"
              className="w-full py-2.5 px-3 rounded-xl flex items-center justify-between text-xs font-bold font-mono tracking-wider transition-all duration-200 cursor-pointer group"
              style={{
                background: 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(225,29,72,0.05) 100%)',
                border: '1px solid rgba(244,63,94,0.25)',
                color: '#fda4af'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(244,63,94,0.2) 0%, rgba(225,29,72,0.12) 100%)';
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.5)';
                e.currentTarget.style.boxShadow = '0 2px 12px -2px rgba(244,63,94,0.3)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(244,63,94,0.1) 0%, rgba(225,29,72,0.05) 100%)';
                e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div className="flex items-center space-x-2.5">
                <div className="w-6 h-6 rounded-lg flex items-center justify-center bg-rose-500/20 text-rose-500 dark:text-rose-400 group-hover:scale-110 transition-transform">
                  <LogOut className="w-3.5 h-3.5" />
                </div>
                <span className="text-rose-700 dark:text-rose-300 group-hover:text-rose-900 dark:group-hover:text-white transition-colors">TERMINATE SESSION</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800/60 text-rose-700 dark:text-rose-300 font-mono font-bold">LOGOUT</span>
            </button>
          ) : (
            <div className="w-full flex items-center justify-center">
              <button
                onClick={onLogout}
                title="Sign out of current official session"
                aria-label="Sign Out"
                className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 group hover:scale-105"
                style={{
                  background: 'rgba(244,63,94,0.1)',
                  border: '1px solid rgba(244,63,94,0.25)'
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'rgba(244,63,94,0.22)';
                  e.currentTarget.style.borderColor = 'rgba(244,63,94,0.6)';
                  e.currentTarget.style.boxShadow = '0 0 12px rgba(244,63,94,0.4)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'rgba(244,63,94,0.1)';
                  e.currentTarget.style.borderColor = 'rgba(244,63,94,0.25)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <LogOut className="w-4 h-4 text-rose-500 dark:text-rose-400 group-hover:text-rose-600 dark:group-hover:text-rose-200 transition-colors" />
              </button>
            </div>
          )}
        </div>

      </aside>
    </>
  );
}
