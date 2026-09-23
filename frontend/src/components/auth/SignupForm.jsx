import React, { useState } from 'react';
import { 
  Building2, 
  MapPin, 
  Landmark, 
  Vote, 
  UserCheck, 
  Mail, 
  HelpCircle, 
  ChevronDown, 
  Search, 
  ShieldCheck, 
  ArrowRight 
} from 'lucide-react';
import { api } from '../../services/api';

const ROLE_DESCRIPTIONS = {
  ministry: {
    title: 'MoSPI Ministry Directorate',
    badgeText: 'CENTRAL VIGILANCE • LEVEL-5',
    badge: 'bg-violet-500/20 text-violet-300 border-violet-500/40',
    icon: Landmark,
    desc: 'Central Ministry Directorate with Pan-India statutory oversight across all 36 States and Union Territories.'
  },
  state: {
    title: 'State Nodal Authority',
    badgeText: 'STATE JURISDICTION • LEVEL-4',
    badge: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    icon: Building2,
    desc: 'State-level executive authority managing milestone fund releases, compliance, and district vigilance.'
  },
  district: {
    title: 'District Authority / Magistrate (IDA)',
    badgeText: 'GROUND SANCTION • LEVEL-3',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: MapPin,
    desc: 'Ground execution, contractor vetting, site photo evidence verification, and treasury disbursement warrants.'
  },
  mp: {
    title: 'Member of Parliament (Lok Sabha / Rajya Sabha)',
    badgeText: 'PARLIAMENTARY WATCHDOG',
    badge: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    icon: Vote,
    desc: 'Parliamentary constituency recommendations, contractor syndicate watch, and public expenditure monitoring.'
  },
  citizen: {
    title: 'Citizen Vigilance / Jan-Drishti Oversight',
    badgeText: 'PUBLIC WATCHDOG • DISTRICT LEVEL',
    badge: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    icon: UserCheck,
    desc: 'Ground reality public verification, monitoring district project fraud, and reporting stalled or ghost infrastructure.'
  }
};

export default function SignupForm({ 
  authOptions = { states: [], districts_by_state: {}, mps: [] }, 
  onAuthSuccess, 
  onSwitchToLogin, 
  onError, 
  onClose 
}) {
  const [selectedRole, setSelectedRole] = useState('ministry');
  const [loading, setLoading] = useState(false);
  const [mpSearch, setMpSearch] = useState('');

  const [form, setForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    designation: '',
    state: authOptions.states?.[0] || 'Uttar Pradesh',
    ida: (authOptions.districts_by_state?.['Uttar Pradesh'] || [])[0] || '',
    mp_name: '',
    house: ''
  });

  const currentRoleMeta = ROLE_DESCRIPTIONS[selectedRole] || ROLE_DESCRIPTIONS.ministry;
  const RoleIcon = currentRoleMeta.icon;

  const currentDistricts = (authOptions.districts_by_state && form.state)
    ? (authOptions.districts_by_state[form.state] || [])
    : [];

  const filteredMps = (authOptions.mps || []).filter(m => {
    const matchState = !form.state || m.state.toLowerCase() === form.state.toLowerCase();
    const matchHouse = !form.house || m.house.toLowerCase() === form.house.toLowerCase();
    const matchQuery = !mpSearch || m.name.toLowerCase().includes(mpSearch.toLowerCase()) || (m.constituency && m.constituency.toLowerCase().includes(mpSearch.toLowerCase()));
    return matchState && matchHouse && matchQuery;
  });

  const handleStateChange = (newState) => {
    const districts = authOptions.districts_by_state[newState] || [];
    setForm(prev => ({
      ...prev,
      state: newState,
      ida: districts[0] || ''
    }));
  };

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

    if ((selectedRole === 'state' || selectedRole === 'district' || selectedRole === 'citizen') && !form.state) {
      if (onError) onError('Please select your designated State / Union Territory');
      return;
    }
    if ((selectedRole === 'district' || selectedRole === 'citizen') && (!form.state || !form.ida)) {
      if (onError) onError('Please select both State and Implementing District Authority (IDA)');
      return;
    }
    if (selectedRole === 'mp' && !form.mp_name) {
      if (onError) onError('Please select your Member of Parliament designation from the official directory');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: form.username.trim().toLowerCase(),
        password: form.password,
        role: selectedRole,
        name: form.name.trim(),
        email: cleanEmail.toLowerCase(),
        designation: selectedRole === 'citizen' ? 'Jan-Drishti Public Watchdog' : (form.designation.trim() || undefined),
        state: selectedRole !== 'ministry' ? form.state : undefined,
        ida: (selectedRole === 'district' || selectedRole === 'citizen') ? form.ida : undefined,
        mp_name: selectedRole === 'mp' ? form.mp_name : undefined
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
      {/* Step 1: User Role Selection */}
      <div>
        <label className="block text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 font-mono flex items-center justify-between">
          <span>Select Official Government Tier <span className="text-rose-400">*</span></span>
          <span className="text-xs text-violet-400 font-mono">Role Clearance</span>
        </label>
        
        <div className="relative">
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-violet-400 pointer-events-none">
            <RoleIcon className="w-4 h-4" />
          </div>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 rounded-xl bg-[#040714] border border-slate-700/90 text-white font-medium text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 appearance-none cursor-pointer font-sans"
          >
            <option value="ministry">MoSPI Ministry Directorate (Pan-India Central Oversight)</option>
            <option value="state">State Nodal Authority (State Jurisdiction &amp; Planning)</option>
            <option value="district">District Authority (District Magistrate / IDA)</option>
            <option value="mp">Member of Parliament (Lok Sabha / Rajya Sabha)</option>
            <option value="citizen">Citizen (Jan-Drishti Public Oversight &amp; District Vigilance)</option>
          </select>
          <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>

        {/* Active Role Description Pill */}
        <div className="mt-2.5 p-3 rounded-xl bg-[#040714]/80 border border-violet-500/20 flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border flex-shrink-0 ${currentRoleMeta.badge}`}>
            {currentRoleMeta.badgeText}
          </span>
          <span className="text-slate-300 text-xs sm:text-sm truncate font-sans">
            {currentRoleMeta.desc}
          </span>
        </div>
      </div>

      {/* Step 2: Role-Specific Jurisdiction Dropdowns */}
      {selectedRole !== 'ministry' && (
        <div className="p-4 rounded-2xl bg-[#040714]/90 border border-violet-500/20 space-y-3.5">
          <div className="text-xs sm:text-sm font-mono uppercase tracking-wider text-violet-400 font-bold flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            {selectedRole === 'citizen' ? 'Home Jurisdiction & District Oversight' : 'Official Assignment & Jurisdiction'}
          </div>

          {/* State Nodal, District Authority & Citizen: State Select */}
          {(selectedRole === 'state' || selectedRole === 'district' || selectedRole === 'citizen') && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
                {selectedRole === 'citizen' ? 'Select Your State / Union Territory' : 'Designated State / Union Territory'} ({authOptions.states.length} States &amp; UTs) <span className="text-rose-400">*</span>
              </label>
              <select
                value={form.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans cursor-pointer"
              >
                <option value="">-- Choose State / UT ({authOptions.states.length} Available) --</option>
                {authOptions.states.map(st => {
                  const dCount = (authOptions.districts_by_state[st] || []).length;
                  return (
                    <option key={st} value={st}>
                      {st} ({dCount} Districts)
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          {/* District Authority & Citizen: IDA District Select */}
          {(selectedRole === 'district' || selectedRole === 'citizen') && (
            <div>
              <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
                {selectedRole === 'citizen' ? 'Select Your District to Monitor' : 'Implementing District Authority (IDA)'} ({currentDistricts.length} Official Districts) <span className="text-rose-400">*</span>
              </label>
              <select
                value={form.ida}
                onChange={(e) => setForm({ ...form, ida: e.target.value })}
                className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans cursor-pointer"
              >
                <option value="">-- Choose Implementing District Authority ({currentDistricts.length} Available) --</option>
                {currentDistricts.map(dist => (
                  <option key={dist} value={dist}>{dist}</option>
                ))}
              </select>
            </div>
          )}

          {/* MP: House + State + Search + Member Selector */}
          {selectedRole === 'mp' && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1 font-mono">
                    State / UT
                  </label>
                  <select
                    value={form.state}
                    onChange={(e) => setForm({ ...form, state: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs sm:text-sm font-sans cursor-pointer"
                  >
                    <option value="">-- All States (Pan-India) --</option>
                    {authOptions.states.map(st => (
                      <option key={st} value={st}>{st}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1 font-mono">
                    House
                  </label>
                  <select
                    value={form.house}
                    onChange={(e) => setForm({ ...form, house: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs sm:text-sm font-sans cursor-pointer"
                  >
                    <option value="">All Houses (LS &amp; RS)</option>
                    <option value="LS">Lok Sabha (LS)</option>
                    <option value="RS">Rajya Sabha (RS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1 font-mono">
                    Filter Name
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={mpSearch}
                      onChange={(e) => setMpSearch(e.target.value)}
                      placeholder="Search MP..."
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-xs sm:text-sm font-sans placeholder:text-slate-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs sm:text-sm font-bold text-slate-200 mb-1.5 font-mono">
                  Select Member of Parliament <span className="text-rose-400">*</span>
                </label>
                <select
                  value={form.mp_name}
                  onChange={(e) => {
                    const mName = e.target.value;
                    const mpObj = authOptions.mps.find(m => m.name === mName);
                    setForm({
                      ...form,
                      mp_name: mName,
                      name: mName,
                      state: mpObj && mpObj.state ? mpObj.state : form.state
                    });
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700/80 text-white text-sm focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 font-sans cursor-pointer"
                >
                  <option value="">-- Choose Member of Parliament ({filteredMps.length} Available) --</option>
                  {filteredMps.map(m => (
                    <option key={m.name} value={m.name}>
                      {m.name} — {m.constituency ? `${m.constituency}, ` : ''}{m.state} ({m.house})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Identity & Credentials */}
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
