import React, { useState } from 'react';
import { 
  User, 
  Lock, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { api } from '../../services/api';
import QuickDemoLogins from './QuickDemoLogins';

export default function LoginForm({ onAuthSuccess, onSwitchToSignup, onError, onClose }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSelectCredential = (user, pass) => {
    setUsername(user);
    setPassword(pass);
    if (onError) onError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      if (onError) onError('Please enter your official username, email, or MP name along with your password.');
      return;
    }
    if (onError) onError(null);
    setLoading(true);

    try {
      const user = await api.login(username.trim(), password);
      if (onAuthSuccess) onAuthSuccess(user);
      if (onClose) onClose();
    } catch (err) {
      if (onError) onError(err.message || 'Invalid official credentials. Please verify your identity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Evaluator 1-Click Fast Credentials Strip */}
      <QuickDemoLogins 
        onSelectCredential={handleSelectCredential} 
        activeUsername={username} 
      />

      {/* Official Identifier Input */}
      <div>
        <label className="block text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 font-mono">
          Official Username, Email or MP Name <span className="text-rose-400">*</span>
        </label>
        <div className="relative">
          <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            required
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              if (onError) onError(null);
            }}
            placeholder="Enter registered official username, email, or MP name"
            className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#040714] border border-slate-700/90 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all font-sans"
          />
        </div>
      </div>

      {/* Password Input */}
      <div>
        <label className="block text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 font-mono flex items-center justify-between">
          <span>Secure Password <span className="text-rose-400">*</span></span>
          <span className="text-xs text-slate-400 font-mono">Confidential</span>
        </label>
        <div className="relative">
          <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type={showPassword ? 'text' : 'password'}
            required
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (onError) onError(null);
            }}
            placeholder="Enter official credentials password"
            className="w-full pl-11 pr-11 py-3.5 rounded-xl bg-[#040714] border border-slate-700/90 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all font-sans"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Statutory Information Card */}
      <div className="statutory-card p-4 rounded-2xl bg-violet-50/90 dark:bg-[#040714]/90 border border-violet-200 dark:border-violet-500/30 flex items-start space-x-3 selection:bg-indigo-600 selection:text-white">
        <ShieldCheck className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
        <div className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 font-semibold leading-relaxed font-sans selection:bg-indigo-600 selection:text-white">
          Access to Bharat-Drishti is restricted to authorized MoSPI officers, State Nodal Authorities, District Magistrates, and Members of Parliament under GFR 2017 &amp; statutory vigilance protocols.
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-2 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold font-display text-sm sm:text-base uppercase tracking-wider transition-all shadow-xl shadow-violet-500/30 active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <span>Authenticating Official...</span>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5 text-white" />
            <span>Authorize &amp; Enter Command Centre</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </>
        )}
      </button>

      {/* Switch to Signup */}
      <div className="pt-2 text-center text-sm text-slate-400 font-sans">
        Don't have an official account?{' '}
        <button
          type="button"
          onClick={onSwitchToSignup}
          className="text-violet-400 hover:text-violet-300 hover:underline font-bold font-mono cursor-pointer ml-1"
        >
          Register Official Credentials
        </button>
      </div>
    </form>
  );
}
