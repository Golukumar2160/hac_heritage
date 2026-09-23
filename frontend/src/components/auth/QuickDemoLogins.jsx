import React from 'react';
import { 
  Landmark, 
  Building2, 
  MapPin, 
  Vote, 
  UserCheck, 
  Sparkles 
} from 'lucide-react';

export const DEMO_CREDENTIALS = [
  {
    role: 'ministry',
    label: 'MoSPI Central Ministry',
    designation: 'Central Vigilance Directorate (Level-5)',
    username: 'ministry_admin',
    password: 'Ministry@2026',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    icon: Landmark
  }
];

export default function QuickDemoLogins({ onSelectCredential, activeUsername }) {
  const centralCred = DEMO_CREDENTIALS[0];
  const Icon = centralCred.icon;
  const isSelected = activeUsername === centralCred.username;

  return (
    <div className="p-3.5 rounded-2xl bg-[#040714]/90 border border-violet-500/20 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Central Sovereign Access (1-Click Fill)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">Central MoSPI</span>
      </div>

      <button
        type="button"
        onClick={() => onSelectCredential(centralCred.username, centralCred.password)}
        title={`${centralCred.designation} (${centralCred.username})`}
        className={`w-full p-2.5 rounded-xl text-left border transition-all cursor-pointer flex items-center justify-between group ${
          isSelected
            ? 'bg-violet-600/20 border-violet-500/60 shadow-md shadow-violet-500/10'
            : 'bg-slate-900/70 border-slate-800 hover:border-violet-500/40 hover:bg-slate-800/80'
        }`}
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-violet-500/20 text-violet-400 group-hover:scale-110 transition-transform">
            <Icon className="w-4 h-4" />
          </div>
          <div>
            <div className="text-xs font-bold text-white font-display">
              {centralCred.label}
            </div>
            <div className="text-[10px] font-mono text-slate-400">
              {centralCred.designation} • <span className="text-violet-300 font-semibold">{centralCred.username}</span>
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2 py-0.5 rounded border font-mono font-bold bg-violet-500/20 text-violet-300 border-violet-500/40">
          Auto-Fill
        </span>
      </button>
    </div>
  );
}
