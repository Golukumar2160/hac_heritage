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
    label: 'MoSPI Ministry',
    designation: 'Central Vigilance Directorate (Level-5)',
    username: 'ministry_admin',
    password: 'Ministry@2026',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    icon: Landmark
  },
  {
    role: 'state',
    label: 'State Nodal (UP)',
    designation: 'Principal Secretary (Planning)',
    username: 'state_nodal_up',
    password: 'StateUP@2026',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: Building2
  },
  {
    role: 'district',
    label: 'District Magistrate',
    designation: 'DM & Collector (Pilibhit IDA)',
    username: 'district_pilibhit',
    password: 'District@2026',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: MapPin
  },
  {
    role: 'mp',
    label: 'Hon\'ble MP',
    designation: 'Shri Javed Ali Khan (Parliament)',
    username: 'mp_javed',
    password: 'MP@2026',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Vote
  },
  {
    role: 'citizen',
    label: 'Citizen Watchdog',
    designation: 'Jan-Drishti Public Oversight',
    username: 'citizen_pilibhit',
    password: 'Citizen@2026',
    badge: 'bg-teal-500/20 text-teal-300 border-teal-500/40',
    icon: UserCheck
  }
];

export default function QuickDemoLogins({ onSelectCredential, activeUsername }) {
  return (
    <div className="p-3.5 rounded-2xl bg-[#040714]/90 border border-violet-500/20 space-y-2">
      <div className="flex items-center justify-between text-xs">
        <span className="font-mono text-violet-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-violet-400" />
          Evaluator Quick Credentials (1-Click Fill)
        </span>
        <span className="text-[10px] text-slate-400 font-mono">PS 26102 Demo</span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pt-0.5">
        {DEMO_CREDENTIALS.map((cred) => {
          const Icon = cred.icon;
          const isSelected = activeUsername === cred.username;
          return (
            <button
              key={cred.username}
              type="button"
              onClick={() => onSelectCredential(cred.username, cred.password)}
              title={`${cred.designation} (${cred.username})`}
              className={`p-2 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
                isSelected
                  ? 'bg-violet-600/20 border-violet-500/60 shadow-md shadow-violet-500/10'
                  : 'bg-slate-900/70 border-slate-800 hover:border-violet-500/40 hover:bg-slate-800/80'
              }`}
            >
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3 text-violet-400 group-hover:scale-110 transition-transform" />
                <span className="text-[11px] font-bold text-white truncate font-display">
                  {cred.label}
                </span>
              </div>
              <div className="flex items-center justify-between gap-1">
                <span className="text-[9px] font-mono text-slate-400 truncate">
                  {cred.username}
                </span>
                <span className={`text-[8px] px-1 py-0.2 rounded border font-mono font-bold ${cred.badge}`}>
                  Fill
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
