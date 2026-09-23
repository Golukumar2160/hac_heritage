import React, { useState } from 'react';
import { 
  Landmark, 
  Mail, 
  HelpCircle, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { api } from '../../services/api';

export default function SignupForm({ 
  onAuthSuccess, 
  onSwitchToLogin, 
  onError, 
  onClose 
}) {
  const [loading, setLoading] = useState(false);

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    designation: 'MoSPI Central Vigilance Officer'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (onError) onError(null);

    if (!form.name.trim()) {
      if (onError) onError('Official full name is required');
      return;
    }
    if (!form.username.trim() || form.username.trim().length < 3) {
      if (onError) onError('Username must be at least 3 characters long');
      return;
    }

    const cleanEmail = form.email.trim();
    if (!cleanEmail) {
      if (onError) onError('Official email address is mandatory for registration');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      if (onError) onError('Please enter a valid official email address (e.g. official@mospi.gov.in or @nic.in)');
      return;
    }

    const pwd = form.password;
    if (pwd.length < 8) {
      if (onError) onError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(pwd)) {
      if (onError) onError('Password must contain at least one letter');
      return;
    }
    if (!/\d/.test(pwd)) {
      if (onError) onError('Password must contain at least one number');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      if (onError) onError('Password must contain at least one special character (e.g. @, #, $, %, !, &, *)');
      return;
    }

    if (pwd !== form.confirmPassword) {
      if (onError) onError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: 'ministry',
        name: form.name.trim(),
        email: cleanEmail.toLowerCase(),
        designation: form.designation?.trim() || 'MoSPI Central Vigilance Officer'
      };

      const user = await api.register(payload);
      if (onAuthSuccess) onAuthSuccess(user);
      if (onClose) onClose();
    } catch (err) {
      if (onError) onError(err.message || 'Registration failed. Please check form values.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Central MoSPI Official Tier Lock */}
      <div className="p-3.5 rounded-2xl bg-[#040714]/90 border border-violet-500/30 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/20 text-violet-400">
            <Landmark className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs sm:text-sm font-bold text-white font-display">
              MoSPI Central Directorate
            </div>
            <div className="text-[11px] text-slate-400 font-sans">
              Central Vigilance Directorate (Level-5 Pan-India Oversight)
            </div>
          </div>
        </div>
        <span className="text-[10px] px-2.5 py-1 rounded-md font-mono font-bold bg-violet-500/20 text-violet-300 border border-violet-500/40">
          CENTRAL ONLY
        </span>
      </div>

      {/* Step 2: Identity & Credentials */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
            Official Full Name <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. Dr. Arvind Sharma"
            className="w-full px-4 py-3 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans placeholder-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
            Username <span className="text-rose-400">*</span>
          </label>
          <input
            type="text"
            required
            value={form.username}
            onChange={(e) => setForm({ ...form, username: e.target.value })}
            placeholder="e.g. arvind_sharma"
            className="w-full px-4 py-3 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans placeholder-slate-500"
          />
        </div>
      </div>

      {/* Official Email */}
      <div>
        <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono flex items-center justify-between">
          <span>Official Email Address <span className="text-rose-400">*</span></span>
          <span className="text-xs text-violet-400 font-mono">Mandatory</span>
        </label>
        <div className="relative">
          <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="email"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="e.g. official.name@mospi.gov.in or @nic.in"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans placeholder-slate-500"
          />
        </div>
      </div>

      {/* Passwords */}
      <div className="space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
              Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Min 8 chars, letter, num, symbol"
              className="w-full px-4 py-3 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans placeholder-slate-500"
            />
          </div>

          <div>
            <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
              Confirm Password <span className="text-rose-400">*</span>
            </label>
            <input
              type="password"
              required
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              placeholder="Re-enter password"
              className="w-full px-4 py-3 rounded-xl bg-[#040714] border border-slate-700/80 text-white text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans placeholder-slate-500"
            />
          </div>
        </div>
        <div className="text-xs text-slate-400 flex items-center gap-2 pl-1 font-sans">
          <HelpCircle className="w-3.5 h-3.5 text-violet-400 flex-shrink-0" />
          <span>Policy: Minimum 8 characters with at least one letter, number, and special character.</span>
        </div>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        disabled={loading}
        className="w-full mt-3 py-4 rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white font-extrabold font-display text-sm sm:text-base uppercase tracking-wider transition-all shadow-xl shadow-violet-500/30 active:scale-[0.99] flex items-center justify-center gap-2.5 disabled:opacity-50 cursor-pointer"
      >
        {loading ? (
          <span>Registering Credentials...</span>
        ) : (
          <>
            <ShieldCheck className="w-5 h-5 text-white" />
            <span>Register &amp; Access Vigilance Network</span>
            <ArrowRight className="w-5 h-5 text-white" />
          </>
        )}
      </button>

      {/* Switch to Sign In */}
      <div className="pt-2 text-center text-sm text-slate-400 font-sans">
        Already registered?{' '}
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-violet-400 hover:text-violet-300 hover:underline font-bold font-mono cursor-pointer ml-1"
        >
          Sign In to Account
        </button>
      </div>
    </form>
  );
}
