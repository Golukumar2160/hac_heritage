import React, { useState } from "react";
import {
  BarChart3, Brain, FileText, Users, ArrowRight, AlertTriangle,
  CheckCircle2, Database, Settings, Search, X, Mail, MapPin,
  Building2, Layers, TrendingUp,
} from "lucide-react";
import indiaMapHero from "../assets/india_map_hero.jpg";

export default function LandingPage({ onLoginSuccess, onOpenAuthModal, theme = "light", onToggleTheme }) {
  const [activeNav, setActiveNav] = useState("Home");
  const [searchQuery, setSearchQuery] = useState("");
  const [showContactModal, setShowContactModal] = useState(false);
  const [showHowItWorksModal, setShowHowItWorksModal] = useState(false);
  const [showDashboardModal, setShowDashboardModal] = useState(false);
  const [contactSubmitted, setContactSubmitted] = useState(false);
  const [contactForm, setContactForm] = useState({ name: "", email: "", message: "" });

  const handleNavClick = (item) => {
    setActiveNav(item);
    if (item === "Home") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else if (item === "About") {
      document.getElementById("stats-bar")?.scrollIntoView({ behavior: "smooth" });
    } else if (item === "Dashboard" || item === "Insights" || item === "Reports") {
      setShowDashboardModal(true);
    } else if (item === "Contact") {
      setShowContactModal(true);
    }
  };

  const handleContactSubmit = (e) => {
    e.preventDefault();
    setContactSubmitted(true);
    setTimeout(() => {
      setContactSubmitted(false);
      setShowContactModal(false);
      setContactForm({ name: "", email: "", message: "" });
    }, 2000);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) onOpenAuthModal("login");
  };

  return (
    <div className="min-h-screen bg-white text-slate-800 font-sans flex flex-col">

      {/* NAV */}
      <header className="w-full bg-white border-b border-slate-100 sticky top-0 z-40">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 h-[68px] flex items-center justify-between gap-4">
          <div onClick={() => handleNavClick("Home")} className="flex items-center space-x-2.5 cursor-pointer shrink-0">
            <div className="w-9 h-9 rounded-full flex items-center justify-center overflow-hidden bg-white border-2 border-slate-100 shadow-sm">
              <svg viewBox="0 0 36 36" className="w-full h-full">
                <path d="M 7 18 A 11 11 0 0 1 29 18" fill="none" stroke="#FF9933" strokeWidth="5" strokeLinecap="round" />
                <path d="M 29 18 A 11 11 0 0 1 7 18" fill="none" stroke="#138808" strokeWidth="5" strokeLinecap="round" />
                <circle cx="18" cy="18" r="3" fill="#000080" />
              </svg>
            </div>
            <span className="font-extrabold text-xl text-slate-900 tracking-tight">Bharat Drishti</span>
          </div>

          <nav className="hidden lg:flex items-center space-x-7 text-sm font-medium text-slate-600">
            {["Home", "About", "Dashboard", "Insights", "Reports", "Contact"].map((item) => (
              <button key={item} onClick={() => handleNavClick(item)}
                className={`relative py-0.5 transition-colors cursor-pointer ${activeNav === item ? "text-slate-900 font-bold" : "hover:text-slate-900"}`}>
                {item}
                {activeNav === item && <span className="absolute -bottom-0.5 left-0 right-0 h-[2px] bg-[#054631] rounded-full" />}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <form onSubmit={handleSearch} className="hidden md:flex items-center bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 gap-2 w-52">
              <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <input type="text" placeholder="Search constituency, MP, district..."
                value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs text-slate-600 placeholder-slate-400 focus:outline-none w-full" />
            </form>
            <button onClick={() => onOpenAuthModal("login")}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-[#054631] hover:bg-[#033424] transition-all shadow-sm cursor-pointer whitespace-nowrap">
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <main className="flex-1">
        <section className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start min-h-[480px]">

            {/* LEFT */}
            <div className="lg:col-span-5 flex flex-col justify-center py-6 space-y-5">
              <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#065f46] bg-[#ecfdf5] border border-[#a7f3d0] rounded-full px-3 py-1 self-start">
                <span>Transparent MPLADS</span>
                <span className="text-emerald-400">•</span>
                <span>Data-Driven Governance</span>
                <span className="text-emerald-400">•</span>
                <span>Stronger Bharat</span>
              </div>

              <h1 className="text-4xl sm:text-[2.7rem] lg:text-5xl font-black text-slate-900 leading-[1.1] tracking-tight">
                A Clearer View<br />
                for a Stronger <span className="text-[#ea580c]">Bharat</span>
              </h1>

              <p className="text-slate-600 text-sm sm:text-[0.95rem] leading-relaxed max-w-lg">
                Bharat Drishti brings transparency to MPLADS implementation through data, AI and visual insights — helping citizens, researchers and policymakers track, analyze and ensure accountable development across India.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <button onClick={() => onOpenAuthModal("login")}
                  className="flex items-center gap-2 px-7 py-3 rounded-lg text-sm font-bold text-white bg-[#054631] hover:bg-[#033424] transition-all shadow-sm hover:shadow-md cursor-pointer">
                  <span>Explore Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={() => document.getElementById("features-section")?.scrollIntoView({ behavior: "smooth" })}
                  className="px-7 py-3 rounded-lg text-sm font-semibold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 transition-all shadow-sm cursor-pointer">
                  Learn More
                </button>
              </div>
            </div>

            {/* RIGHT: Map + stat cards */}
            <div className="lg:col-span-7 relative flex items-center justify-center pt-2 min-h-[420px]">
              <div className="absolute inset-0 bg-gradient-to-br from-amber-50/60 via-emerald-50/40 to-blue-50/30 rounded-3xl blur-2xl pointer-events-none" />
              <div className="relative z-10 w-full max-w-[520px] drop-shadow-xl">
                <img src={indiaMapHero} alt="India MPLADS Map" className="w-full h-auto object-contain select-none" />
              </div>

              {/* Card 1: Total MPLADS Funds - top left */}
              <div className="absolute top-4 left-2 sm:left-8 z-20 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-3 min-w-[160px]">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-[#054631]" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium leading-none">Total MPLADS Funds</div>
                  <div className="text-lg font-extrabold text-slate-900 leading-tight">₹5,369 Cr</div>
                  <div className="flex items-center gap-1 mt-0.5">
                    <TrendingUp className="w-3 h-3 text-emerald-500" />
                    <span className="text-[10px] text-emerald-600 font-semibold">↑ 12% from last year</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Works Completed - top right */}
              <div className="absolute top-4 right-2 sm:right-4 z-20 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-3 min-w-[160px]">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 relative">
                  <svg className="w-8 h-8 absolute" viewBox="0 0 32 32">
                    <circle cx="16" cy="16" r="12" fill="none" stroke="#e2e8f0" strokeWidth="3.5" />
                    <circle cx="16" cy="16" r="12" fill="none" stroke="#2563eb" strokeWidth="3.5"
                      strokeDasharray={`${0.684 * 75.4} 75.4`} strokeLinecap="round" transform="rotate(-90 16 16)" />
                  </svg>
                  <span className="text-[9px] font-bold text-blue-600 z-10">68%</span>
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium leading-none">Works Completed</div>
                  <div className="text-lg font-extrabold text-slate-900 leading-tight">68.4%</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">1.12 Lakh of 1.64 Lakh</div>
                </div>
              </div>

              {/* Card 3: Risk Analysis - bottom left */}
              <div className="absolute bottom-16 left-2 sm:left-6 z-20 bg-white rounded-2xl shadow-lg border border-rose-100 px-4 py-3 flex items-center gap-3 min-w-[160px]">
                <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-500" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium leading-none">Risk Analysis</div>
                  <div className="text-lg font-extrabold text-rose-600 leading-tight">214</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Potential Irregularities</div>
                </div>
              </div>

              {/* Card 4: Total Works - bottom right */}
              <div className="absolute bottom-16 right-2 sm:right-4 z-20 bg-white rounded-2xl shadow-lg border border-slate-100 px-4 py-3 flex items-center gap-3 min-w-[160px]">
                <div className="w-9 h-9 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <div className="text-xs text-slate-500 font-medium leading-none">Total Works</div>
                  <div className="text-lg font-extrabold text-slate-900 leading-tight">1.64 Lakh</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Across 543 Constituencies</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* KEY FEATURES */}
        <section id="features-section" className="bg-white border-t border-slate-100 py-14">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">Key Features</h2>
              <p className="text-slate-500 text-sm mt-1.5">A comprehensive platform to enhance transparency and accountability in MPLADS.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                { icon: BarChart3, color: "#054631", bg: "#eaf7f0", label: "Interactive Dashboard", desc: "Explore MPLADS data with dynamic visualizations across India." },
                { icon: Brain, color: "#ea580c", bg: "#fff4eb", label: "AI-Powered Analysis", desc: "Detect anomalies, fraud and inefficiencies using advanced AI/ML models." },
                { icon: FileText, color: "#2563eb", bg: "#eef6ff", label: "Detailed Reports", desc: "Access project-wise details, status, cost and implementation history." },
                { icon: Users, color: "#7c3aed", bg: "#f5f0ff", label: "Constituency Insights", desc: "Compare performance across MPs, states and districts." },
              ].map(({ icon: Icon, color, bg, label, desc }) => (
                <div key={label} onClick={() => onOpenAuthModal("login")}
                  className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer group flex flex-col justify-between min-h-[180px]">
                  <div>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform"
                      style={{ background: bg, color }}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <h3 className="font-bold text-slate-900 text-sm mb-1.5">{label}</h3>
                    <p className="text-xs text-slate-500 leading-relaxed">{desc}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-slate-100">
                    <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 transition-colors" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* BOTTOM STATS BAR */}
        <section id="stats-bar" className="bg-[#f0fdf6] border-t border-[#bbf7d0] py-10">
          <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              {[
                { icon: Settings, bg: "#eaf7f0", color: "#054631", val: "1.64 Lakh", label: "Total MPLADS Works" },
                { icon: Database, bg: "#fff7ed", color: "#f97316", val: "₹5,369 Cr", label: "Total Sanctioned Funds" },
                { icon: CheckCircle2, bg: "#eff6ff", color: "#3b82f6", val: "68.4%", label: "Works Completed" },
                { icon: AlertTriangle, bg: "#fef2f2", color: "#ef4444", val: "214", label: "Potential Irregularities (AI)" },
              ].map(({ icon: Icon, bg, color, val, label }) => (
                <div key={label} className="flex items-center gap-4 bg-white rounded-2xl px-5 py-4 border border-slate-100 shadow-sm">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: bg, color }}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-2xl font-extrabold text-slate-900 leading-none">{val}</div>
                    <div className="text-xs text-slate-500 font-medium mt-0.5">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="w-full bg-white border-t border-slate-100 py-7">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
          <p>© 2026 Bharat Drishti • Ministry of Statistics &amp; Programme Implementation (MoSPI)</p>
          <div className="flex items-center gap-5">
            <button onClick={() => setShowHowItWorksModal(true)} className="hover:text-slate-900 transition-colors">How It Works</button>
            <button onClick={() => setShowContactModal(true)} className="hover:text-slate-900 transition-colors">Contact</button>
            <button onClick={() => onOpenAuthModal("login")} className="font-semibold text-[#054631] hover:underline">Official Access</button>
          </div>
        </div>
      </footer>

      {/* DASHBOARD ACCESS MODAL */}
      {showDashboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-100 relative text-center">
            <button onClick={() => setShowDashboardModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="w-12 h-12 rounded-xl bg-[#eaf7f0] text-[#054631] flex items-center justify-center mx-auto mb-4"><BarChart3 className="w-6 h-6" /></div>
            <h3 className="font-bold text-slate-900 text-base mb-1.5">Access Required</h3>
            <p className="text-xs text-slate-500 mb-5">Sign in with your official credentials to access the dashboard, insights, and reports.</p>
            <div className="flex flex-col gap-2">
              <button onClick={() => { setShowDashboardModal(false); onOpenAuthModal("login"); }}
                className="w-full py-2.5 rounded-lg font-bold text-white bg-[#054631] hover:bg-[#033424] transition-all cursor-pointer text-sm">Sign In to Platform</button>
              <button onClick={() => { setShowDashboardModal(false); onOpenAuthModal("signup"); }}
                className="w-full py-2.5 rounded-lg font-semibold text-slate-700 border border-slate-200 hover:bg-slate-50 transition-all cursor-pointer text-sm">Create New Account</button>
            </div>
          </div>
        </div>
      )}

      {/* CONTACT MODAL */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 relative">
            <button onClick={() => setShowContactModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#054631] flex items-center justify-center"><Building2 className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Contact Bharat Drishti Desk</h3>
                <p className="text-[11px] text-slate-500">Ministry of Statistics &amp; Programme Implementation</p>
              </div>
            </div>
            {contactSubmitted ? (
              <div className="py-8 text-center space-y-2">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">Message Received</h4>
                <p className="text-xs text-slate-500">Thank you. Your inquiry has been dispatched to the MoSPI helpdesk.</p>
              </div>
            ) : (
              <form onSubmit={handleContactSubmit} className="space-y-3 text-xs">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Your Name</label>
                  <input type="text" required placeholder="e.g. Ramesh Kumar" value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Email</label>
                  <input type="email" required placeholder="official@gov.in" value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs" />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Message</label>
                  <textarea rows={3} required placeholder="Your inquiry regarding MPLADS works or platform access..." value={contactForm.message}
                    onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-xs" />
                </div>
                <button type="submit" className="w-full py-2.5 rounded-lg font-bold text-white bg-[#054631] hover:bg-[#033424] transition-all cursor-pointer">Send Inquiry</button>
              </form>
            )}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> support-mplads@mospi.gov.in</span>
              <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> New Delhi, India</span>
            </div>
          </div>
        </div>
      )}

      {/* HOW IT WORKS MODAL */}
      {showHowItWorksModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 relative">
            <button onClick={() => setShowHowItWorksModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-[#054631] flex items-center justify-center"><Layers className="w-5 h-5" /></div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm">How Bharat Drishti Works</h3>
                <p className="text-[11px] text-slate-500">Autonomous 3-Step Monitoring Pipeline</p>
              </div>
            </div>
            <div className="space-y-3 text-xs">
              {[
                { step: "1", title: "Data Ingestion & Digitization", body: "Captures transaction records, sanctions, physical milestones, and completion certificates from the official MoSPI portal." },
                { step: "2", title: "5-Layer Forensic Triangulation", body: "Applies ML models, Benford's Law, GFR statutory rules, OCR, and perceptual image hashing to detect fraud and fund overruns." },
                { step: "3", title: "Multi-Tier Governance Alerts", body: "Surfaces tailored dashboards for Ministry, State Nodal Authorities, District Magistrates, MPs and public citizens." },
              ].map(({ step, title, body }) => (
                <div key={step} className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="w-6 h-6 rounded-full bg-[#054631] text-white text-xs font-bold flex items-center justify-center shrink-0">{step}</span>
                  <div>
                    <div className="font-bold text-slate-800 text-sm">{title}</div>
                    <div className="text-slate-500 mt-0.5">{body}</div>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400">Ready to explore?</span>
              <button onClick={() => { setShowHowItWorksModal(false); onOpenAuthModal("login"); }}
                className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-[#054631] hover:bg-[#033424] cursor-pointer transition-all">
                Access Platform →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
