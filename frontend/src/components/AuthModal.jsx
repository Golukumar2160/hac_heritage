import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Lock, 
  User, 
  Building2, 
  MapPin, 
  Landmark, 
  Vote, 
  X, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Search,
  Mail,
  HelpCircle,
  Radio,
  Cpu,
  Sparkles,
  KeyRound,
  ChevronDown,
  Layers,
  Database,
  UserCheck
} from 'lucide-react';
import { api } from '../services/api';
import emblemLogo from '../assets/logo_dark.jpg';
export default function AuthModal({ isOpen, onClose, initialMode = 'login', onAuthSuccess }) {
  const [mode, setMode] = useState(() => initialMode === 'register' ? 'signup' : (initialMode || 'login'));
  const [selectedRole, setSelectedRole] = useState('ministry');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  // Dynamic Options from backend dataset
  const [authOptions, setAuthOptions] = useState({
    states: [],
    districts_by_state: {},
    mps: []
  });

  // Login form state
  const [loginForm, setLoginForm] = useState({
    username: '',
    password: ''
  });

  // Sign up form state
  const [signupForm, setSignupForm] = useState({
    username: '',
    password: '',
    confirmPassword: '',
    name: '',
    email: '',
    designation: '',
    state: '',
    ida: '',
    mp_name: '',
    house: '',
    clearance_code: ''
  });

  // MP filters for signup
  const [mpSearch, setMpSearch] = useState('');

  // Live Supabase Database Connection Status
  const [supabaseStatus, setSupabaseStatus] = useState({
    connected: true,
    count: null
  });

  useEffect(() => {
    setMode(initialMode === 'register' ? 'signup' : (initialMode || 'login'));
    setError(null);
  }, [initialMode, isOpen]);

  // Load dynamic states, districts, all 774+ MPs, and Supabase DB health
  useEffect(() => {
    if (isOpen) {
      api.checkHealth().then(h => {
        setSupabaseStatus({
          connected: h.supabase_connected !== false,
          count: h.registered_officials || null
        });
      }).catch(() => {
        setSupabaseStatus({ connected: true, count: null });
      });

      api.getAuthOptions().then(opts => {
        setAuthOptions(opts);
        if (opts.states && opts.states.length > 0 && !signupForm.state) {
          const defaultState = opts.states.includes('Uttar Pradesh') ? 'Uttar Pradesh' : opts.states[0];
          setSignupForm(prev => ({
            ...prev,
            state: defaultState,
            ida: (opts.districts_by_state[defaultState] || [])[0] || ''
          }));
        }
      }).catch(err => console.error('Failed to load auth options', err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Available districts for chosen state
  const currentDistricts = (authOptions.districts_by_state && signupForm.state)
    ? (authOptions.districts_by_state[signupForm.state] || [])
    : [];

  // Filtered MPs for Signup
  const filteredMps = (authOptions.mps || []).filter(m => {
    const matchState = !signupForm.state || m.state.toLowerCase() === signupForm.state.toLowerCase();
    const matchHouse = !signupForm.house || m.house.toLowerCase() === signupForm.house.toLowerCase();
    const matchQuery = !mpSearch || m.name.toLowerCase().includes(mpSearch.toLowerCase()) || (m.constituency && m.constituency.toLowerCase().includes(mpSearch.toLowerCase()));
    return matchState && matchHouse && matchQuery;
  });

  const handleStateChange = (newState) => {
    const districts = authOptions.districts_by_state[newState] || [];
    setSignupForm(prev => ({
      ...prev,
      state: newState,
      ida: districts[0] || ''
    }));
  };

  // Sign In submit
  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!loginForm.username.trim() || !loginForm.password) {
      setError('Please enter your official username, email, or MP name along with your password.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(loginForm.username.trim(), loginForm.password);
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Invalid official credentials. Please verify your identity.');
    } finally {
      setLoading(false);
    }
  };


  // Sign Up submit with validation
  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!signupForm.name.trim()) {
      setError('Official full name is required');
      return;
    }
    if (!signupForm.username.trim() || signupForm.username.trim().length < 3) {
      setError('Username must be at least 3 characters long');
      return;
    }

    const cleanEmail = signupForm.email.trim();
    if (!cleanEmail) {
      setError('Official email address is mandatory for registration');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      setError('Please enter a valid official email address (e.g. official@mospi.gov.in or @nic.in)');
      return;
    }

    const pwd = signupForm.password;
    if (pwd.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }
    if (!/[A-Za-z]/.test(pwd)) {
      setError('Password must contain at least one letter');
      return;
    }
    if (!/\d/.test(pwd)) {
      setError('Password must contain at least one number');
      return;
    }
    if (!/[^A-Za-z0-9]/.test(pwd)) {
      setError('Password must contain at least one special character (e.g. @, #, $, %, !, &, *)');
      return;
    }

    if (pwd !== signupForm.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if ((selectedRole === 'state' || selectedRole === 'district' || selectedRole === 'citizen') && !signupForm.state) {
      setError('Please select your designated State / Union Territory');
      return;
    }
    if ((selectedRole === 'district' || selectedRole === 'citizen') && (!signupForm.state || !signupForm.ida)) {
      setError('Please select both State and Implementing District Authority (IDA)');
      return;
    }
    if (selectedRole === 'mp' && !signupForm.mp_name) {
      setError('Please select your Member of Parliament designation from the official directory');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        username: signupForm.username.trim().toLowerCase(),
        password: signupForm.password,
        role: selectedRole,
        name: signupForm.name.trim(),
        email: cleanEmail.toLowerCase(),
        designation: selectedRole === 'citizen' ? 'Jan-Drishti Public Watchdog' : (signupForm.designation.trim() || undefined),
        state: selectedRole !== 'ministry' ? signupForm.state : undefined,
        ida: (selectedRole === 'district' || selectedRole === 'citizen') ? signupForm.ida : undefined,
        mp_name: selectedRole === 'mp' ? signupForm.mp_name : undefined,
        clearance_code: selectedRole === 'citizen' ? 'CITIZEN-PUBLIC' : (signupForm.clearance_code || undefined),
      };

      const user = await api.register(payload);
      if (onAuthSuccess) onAuthSuccess(user);
      onClose();
    } catch (err) {
      setError(err.message || 'Registration failed. Please check form values.');
    } finally {
      setLoading(false);
    }
  };

  // Metadata for the tier dropdown selector
  const roleDescriptions = {
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

  const currentRoleMeta = roleDescriptions[selectedRole] || roleDescriptions.ministry;
  const RoleIcon = currentRoleMeta.icon;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-[#03050c]/85 backdrop-blur-2xl animate-in fade-in duration-200 font-sans">
      
      {/* Modal Card Styled with Landing Page Violet Theme */}
      <div 
        className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#060913] border border-violet-500/30 shadow-2xl shadow-violet-950/40 text-slate-100 flex flex-col no-scrollbar selection:bg-indigo-600 selection:text-white"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* National Tricolor Top Line */}
        <div className="tricolor-stripe w-full h-[3px]" />

        {/* Ambient Holographic Glows matching Landing Page */}
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
            /* ─────────────────────────────────────────────────────────────
               AUTHENTIC SIGN IN FORM (Clean, Theme of Landing Page)
            ───────────────────────────────────────────────────────────── */
            <>
              <form onSubmit={handleLoginSubmit} className="space-y-4">
              
              <div>
                <label className="block text-sm font-bold uppercase tracking-wider text-slate-200 mb-2 font-mono">
                  Official Username, Email or MP Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={loginForm.username}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, username: e.target.value });
                      if (error) setError(null);
                    }}
                    placeholder="Enter registered official username, email, or MP name"
                    className="w-full pl-11 pr-4 py-3.5 rounded-xl bg-[#040714] border border-slate-700/90 text-white placeholder-slate-500 text-sm sm:text-base focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-500/20 transition-all font-sans"
                  />
                </div>
              </div>

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
                    value={loginForm.password}
                    onChange={(e) => {
                      setLoginForm({ ...loginForm, password: e.target.value });
                      if (error) setError(null);
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

              {/* Submit Button styled as Landing Page Primary Button */}
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

              <div className="pt-2 text-center text-sm text-slate-400 font-sans">
                Don't have an official account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); }}
                  className="text-violet-400 hover:text-violet-300 hover:underline font-bold font-mono cursor-pointer ml-1"
                >
                  Register Official Credentials
                </button>
              </div>
            </form>
          </>
          ) : (
            /* ─────────────────────────────────────────────────────────────
               SIGN UP FORM (With Government Tier DROPDOWN)
            ───────────────────────────────────────────────────────────── */
            <form onSubmit={handleSignupSubmit} className="space-y-4">
              
              {/* Step 1: User Role Selection — As a Sleek DROPDOWN */}
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
                        value={signupForm.state}
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
                        value={signupForm.ida}
                        onChange={(e) => setSignupForm({ ...signupForm, ida: e.target.value })}
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
                            value={signupForm.state}
                            onChange={(e) => setSignupForm({ ...signupForm, state: e.target.value })}
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
                            value={signupForm.house}
                            onChange={(e) => setSignupForm({ ...signupForm, house: e.target.value })}
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
                          value={signupForm.mp_name}
                          onChange={(e) => {
                            const mName = e.target.value;
                            const mpObj = authOptions.mps.find(m => m.name === mName);
                            setSignupForm({
                              ...signupForm,
                              mp_name: mName,
                              name: mName,
                              state: mpObj && mpObj.state ? mpObj.state : signupForm.state
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
                    value={signupForm.name}
                    onChange={(e) => setSignupForm({ ...signupForm, name: e.target.value })}
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
                    value={signupForm.username}
                    onChange={(e) => setSignupForm({ ...signupForm, username: e.target.value })}
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
                    value={signupForm.email}
                    onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
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
                      value={signupForm.password}
                      onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
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
                      value={signupForm.confirmPassword}
                      onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
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

              {/* Submit Button styled as Landing Page Primary Button */}
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

              <div className="pt-2 text-center text-sm text-slate-400 font-sans">
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-violet-400 hover:text-violet-300 hover:underline font-bold font-mono cursor-pointer ml-1"
                >
                  Sign In to Account
                </button>
              </div>

            </form>
          )}
        </div>

      </div>
    </div>
  );
}
