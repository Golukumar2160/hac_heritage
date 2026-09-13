import React, { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  FileText, 
  Users, 
  Sparkles, 
  CheckCircle2, 
  RefreshCw,
  ChevronDown,
  LogIn,
  UserPlus,
  LogOut,
  Landmark,
  Building2,
  MapPin,
  Vote,
  ShieldCheck,
  Sun,
  Moon,
  UploadCloud
} from 'lucide-react';
import { api } from '../services/api';

export default function Header({ 
  activeRole, 
  onRoleChange, 
  onOpenSecretaryBriefing, 
  activeTab, 
  setActiveTab,
  currentUser,
  onOpenAuthModal,
  onLogout,
  theme = 'dark',
  onToggleTheme
}) {
  const [ping, setPing] = useState(null);
  const [isOnline, setIsOnline] = useState(true);
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  useEffect(() => {
    // Health check ping
    const checkStatus = async () => {
      try {
        const { ok, ping: ms } = await api.checkHealth();
        setIsOnline(ok);
        setPing(ms);
      } catch {
        setIsOnline(false);
      }
    };
    checkStatus();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);

  const demoRoles = [
    { 
      id: 'ministry', 
      name: 'MoSPI Ministry Official', 
      subtitle: 'National Directorate & Central Vigilance',
      icon: Landmark,
      color: 'bg-violet-950 border-violet-700 text-violet-300'
    },
    { 
      id: 'state', 
      name: 'State Nodal Authority (UP)', 
      subtitle: 'State-Level Fund & Scheme Compliance',
      icon: Building2,
      color: 'bg-cyan-950 border-cyan-700 text-cyan-300'
    },
    { 
      id: 'district', 
      name: 'District Authority (Pilibhit)', 
      subtitle: 'Implementing Agency & Ground Verification',
      icon: MapPin,
      color: 'bg-emerald-950 border-emerald-700 text-emerald-300'
    },
    { 
      id: 'mp', 
      name: 'Shri Javed Ali Khan (MP)', 
      subtitle: 'Parliamentary Constituency Watchdog',
      icon: Vote,
      color: 'bg-amber-950 border-amber-700 text-amber-300'
    },
    { 
      id: 'citizen', 
      name: 'Shri Rajesh Verma (Citizen)', 
      subtitle: 'Jan-Drishti Public Watchdog (Pilibhit)',
      icon: ShieldCheck,
      color: 'bg-emerald-950 border-emerald-700 text-emerald-300'
    }
  ];

  const currentRoleConfig = demoRoles.find(r => r.id === (currentUser?.role || activeRole)) || demoRoles[0];
  const CurrentRoleIcon = currentRoleConfig.icon;

  const getRoleBadgeStyle = (role) => {
    switch (role) {
      case 'ministry':
        return 'bg-violet-500/20 text-violet-300 border-violet-500/40';
      case 'state':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'district':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'mp':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'citizen':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/40';
    }
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-800/80 bg-navy-950/90 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & National Directorate */}
          <div className="flex items-center space-x-4">
            <div className="relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-cyan-500/20 to-sky-600/10 border border-cyan-500/30 shadow-glow-cyan">
              <ShieldAlert className="w-7 h-7 text-cyan-400 animate-pulse-slow" />
              <span className="absolute -top-1 -right-1 flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
              </span>
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                  भारत सरकार // MoSPI Vigilance
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-white font-display flex items-center gap-2">
                BHARAT-DRISHTI
                <span className="text-xs font-mono font-normal text-cyan-300/80 px-2 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-800/50">
                  AI Forensic Engine v2.2
                </span>
              </h1>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 bg-slate-900/80 p-1.5 rounded-xl border border-slate-800">
            {[
              { id: 'overview', label: 'War Room' },
              { id: 'alerts', label: 'Live Flags' },
              { id: 'validation', label: '🎯 Model Accuracy' },
              { id: 'visual_forensics', label: '🖼️ Visual Forensics' },
              { id: 'vendors', label: 'Vendor Rings' },
              { id: 'map', label: '🗺️ India Risk Map' },
              { id: 'audit', label: 'Audit Ledger' },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Actions & User Profile / Role Control */}
          <div className="flex items-center space-x-3">
            {/* Live System Status Pill */}
            <div className="hidden sm:flex items-center space-x-2 px-2.5 py-1 rounded-full bg-slate-900/90 border border-slate-800 text-xs font-mono">
              <span className={`h-2 w-2 rounded-full ${isOnline ? 'bg-emerald-400 shadow-glow-emerald' : 'bg-rose-500'}`} />
              <span className="text-slate-300">{isOnline ? 'CONNECTED' : 'OFFLINE'}</span>
            </div>

            {/* Theme Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className="p-2 rounded-xl border transition-all cursor-pointer flex items-center justify-center hover:scale-105"
                style={{
                  background: theme === 'light' ? 'rgba(255,255,255,0.9)' : 'rgba(15,23,42,0.8)',
                  border: theme === 'light' ? '1px solid rgba(203,213,225,0.9)' : '1px solid rgba(139,92,246,0.3)',
                  color: theme === 'light' ? '#0f172a' : '#ffffff'
                }}
                title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                aria-label="Toggle Theme"
              >
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-violet-600" />
                )}
              </button>
            )}

            {/* Upload CSV Quick Action */}
            <button
              onClick={() => setActiveTab && setActiveTab('batch_audit')}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                activeTab === 'batch_audit'
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-600/30'
                  : 'bg-violet-500/15 hover:bg-violet-500/25 text-violet-300 border border-violet-500/40 hover:border-violet-300'
              }`}
              title="Upload CSV & Live Multi-Model Audit"
            >
              <UploadCloud className="w-4 h-4 text-violet-400" />
              <span className="hidden sm:inline">Upload CSV</span>
            </button>

            {/* AI Secretary Briefing Button */}
            <button
              onClick={onOpenSecretaryBriefing}
              className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-gradient-to-r from-violet-600/30 to-fuchsia-600/20 text-violet-200 border border-violet-500/40 hover:border-violet-400 hover:shadow-glow-violet transition-all active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-violet-300 animate-spin-slow" />
              <span className="hidden md:inline">Secretary AI Briefing</span>
              <span className="md:hidden">AI Brief</span>
            </button>

            {/* User Profile & Role Controller */}
            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700/80 hover:border-slate-600 text-left transition-all"
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-bold text-xs ${currentRoleConfig.color}`}>
                    <CurrentRoleIcon className="w-4 h-4" />
                  </div>
                  <div className="hidden xl:block text-left">
                    <div className="text-xs font-semibold text-white leading-tight flex items-center gap-1.5">
                      {currentUser.name || currentRoleConfig.name}
                      <span className={`px-1.5 py-0.2 text-[9px] uppercase font-mono rounded border ${getRoleBadgeStyle(currentUser.role)}`}>
                        {currentUser.role}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-400 truncate max-w-[140px]">
                      {currentUser.designation || (currentUser.state ? `State: ${currentUser.state}` : currentRoleConfig.subtitle)}
                    </div>
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                </button>

                {showRoleMenu && (
                  <div className="absolute right-0 mt-2 w-72 rounded-2xl bg-slate-900 border border-slate-700 p-2.5 shadow-2xl z-50 animate-in fade-in zoom-in-95">
                    
                    {/* Active User Card */}
                    <div className="p-3 mb-2 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div className="flex items-center space-x-2.5">
                        <div className={`p-2 rounded-lg border ${currentRoleConfig.color}`}>
                          <CurrentRoleIcon className="w-4 h-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold text-white truncate">{currentUser.name}</div>
                          <div className="text-[10px] text-cyan-400 font-mono">@{currentUser.username || 'official'}</div>
                          <div className="text-[10px] text-slate-400 truncate mt-0.5">
                            {currentUser.designation || currentRoleConfig.subtitle}
                          </div>
                          {currentUser.state && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Jurisdiction: {currentUser.ida ? `${currentUser.ida}, ` : ''}{currentUser.state}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Quick Role Switcher Simulation */}
                    <div className="px-2.5 py-1 text-[10px] uppercase font-mono font-semibold text-slate-400 tracking-wider">
                      Switch Evaluation Role
                    </div>
                    {demoRoles.map(r => {
                      const Icon = r.icon;
                      const isActive = (currentUser.role || activeRole) === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => {
                            onRoleChange(r.id);
                            setShowRoleMenu(false);
                          }}
                          className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-between mb-1 ${
                            isActive
                              ? 'bg-cyan-500/20 text-cyan-300 font-medium border border-cyan-500/30'
                              : 'text-slate-300 hover:bg-slate-800/60'
                          }`}
                        >
                          <div className="flex items-center space-x-2 min-w-0">
                            <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                            <div className="truncate">
                              <div className="font-semibold truncate">{r.name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{r.subtitle}</div>
                            </div>
                          </div>
                          {isActive && <CheckCircle2 className="w-4 h-4 text-cyan-400 flex-shrink-0 ml-1.5" />}
                        </button>
                      );
                    })}

                    <div className="border-t border-slate-800 my-2" />

                    {/* Register New User Action */}
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        if (onOpenAuthModal) onOpenAuthModal('signup');
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-cyan-300 hover:bg-cyan-500/10 transition-colors flex items-center space-x-2"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      <span>Register New Official Account</span>
                    </button>

                    {/* Sign Out Action */}
                    <button
                      onClick={() => {
                        setShowRoleMenu(false);
                        if (onLogout) onLogout();
                      }}
                      className="w-full text-left px-3 py-2 rounded-xl text-xs text-rose-400 hover:bg-rose-500/10 transition-colors flex items-center space-x-2 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>

                  </div>
                )}
              </div>
            ) : (
              /* If Not Authenticated / Guest Mode */
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => onOpenAuthModal && onOpenAuthModal('login')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 transition-all"
                >
                  <LogIn className="w-3.5 h-3.5 text-slate-400" />
                  <span>Sign In</span>
                </button>
                <button
                  onClick={() => onOpenAuthModal && onOpenAuthModal('signup')}
                  className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-glow-cyan"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Register</span>
                </button>
              </div>
            )}

          </div>

        </div>

        {/* Mobile Navigation Tabs */}
        <div className="flex lg:hidden overflow-x-auto py-2 space-x-1 border-t border-slate-800/60 no-scrollbar">
          {[
            { id: 'overview', label: 'War Room' },
            { id: 'alerts', label: 'Live Flags' },
            { id: 'validation', label: 'Accuracy' },
            { id: 'visual_forensics', label: 'Visual Forensics' },
            { id: 'vendors', label: 'Vendors' },
            { id: 'map', label: '🗺️ India Map' },
            { id: 'audit', label: 'Audit Log' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1 text-xs font-medium rounded-lg whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:bg-slate-800'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  );
}
