import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  KeyRound, 
  X, 
  AlertTriangle 
} from 'lucide-react';
import { api } from '../../services/api';
import emblemLogo from '../../assets/logo_dark.jpg';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';

export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(() => initialMode === 'register' ? 'signup' : (initialMode || 'login'));
  const [error, setError] = useState(null);

  // Dynamic Options from backend dataset
  const [authOptions, setAuthOptions] = useState({
    states: [],
    districts_by_state: {},
    mps: []
  });

  useEffect(() => {
    setMode(initialMode === 'register' ? 'signup' : (initialMode || 'login'));
    setError(null);
  }, [initialMode, isOpen]);

  // Load dynamic states, districts, all 774+ MPs, and Supabase DB health
  useEffect(() => {
    if (isOpen) {
      api.getAuthOptions()
        .then(opts => setAuthOptions(opts))
        .catch(err => console.error('Failed to load auth options', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#03050c]/85 backdrop-blur-2xl animate-in fade-in duration-200 font-sans">
      
      {/* Modal Card Styled with Sovereign Violet/Indigo Theme */}
      <div 
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#060913] border border-violet-500/30 shadow-2xl shadow-violet-950/40 text-slate-100 flex flex-col no-scrollbar selection:bg-indigo-600 selection:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* National Tricolor Top Line */}
        <div className="tricolor-stripe w-full h-[3px]" />

        {/* Ambient Holographic Glows */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-36 bg-gradient-to-b from-violet-600/25 via-indigo-600/15 to-transparent blur-3xl pointer-events-none -z-10" />
        <div className="cyber-grid absolute inset-0 opacity-20 pointer-events-none -z-10" />

        {/* Top Header Section */}
        <div className="sticky top-0 z-20 px-6 py-4 bg-[#060913]/95 border-b border-slate-800/90 backdrop-blur-xl flex items-center justify-between">
          <div className="flex items-center space-x-3.5">
            <div className="relative w-12 h-12 rounded-2xl overflow-hidden p-0.5 border border-violet-500/40 bg-[#0b1022] flex-shrink-0 shadow-lg shadow-violet-500/20">
              <img src={emblemLogo} alt="Emblem" className="w-full h-full object-cover rounded-xl" />
              <div className="absolute inset-0 bg-violet-400/10 pointer-events-none" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-xs font-mono tracking-widest text-slate-400 uppercase font-semibold">
                  भारत सरकार // MoSPI DIID
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight font-display mt-0.5">
                BHARAT-DRISHTI Command Access
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors border border-transparent hover:border-slate-700 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Toggle Styled as Landing Page Tabs */}
        <div className="px-6 pt-5 pb-2 bg-[#060913]">
          <div className="p-1 rounded-2xl bg-[#04060d] border border-slate-800/90 grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => { setMode('login'); setError(null); }}
              className={`py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider font-display transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'login'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <KeyRound className="w-4 h-4" />
              <span>Authenticate Official</span>
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); }}
              className={`py-3 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider font-display transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mode === 'signup'
                  ? 'bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 text-white shadow-lg shadow-violet-500/30'
                  : 'text-slate-400 hover:text-slate-200 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Register New Official</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="mx-6 mt-3 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm flex items-center gap-3 animate-in fade-in">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <span className="font-medium font-sans">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-6">
          {mode === 'login' ? (
            <LoginForm 
              onAuthSuccess={onAuthSuccess} 
              onSwitchToSignup={() => { setMode('signup'); setError(null); }} 
              onError={setError}
              onClose={onClose}
            />
          ) : (
            <SignupForm 
              authOptions={authOptions}
              onAuthSuccess={onAuthSuccess} 
              onSwitchToLogin={() => { setMode('login'); setError(null); }} 
              onError={setError}
              onClose={onClose}
            />
          )}
        </div>

      </div>
    </div>
  );
}
