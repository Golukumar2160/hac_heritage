import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  IndianRupee, 
  TrendingUp, 
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle2
} from 'lucide-react';
import { api } from '../services/api';

export default function VendorNetworkView({ onSelectWork }) {
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [search, setSearch] = useState('');

  const handleSelectVendor = (vendorName) => {
    if (!vendorName) return;
    setSelectedVendor(vendorName);
    setLoadingProfile(true);
    api.getVendorProfile(vendorName)
      .then((data) => setVendorProfile(data))
      .catch((err) => console.error('Error fetching vendor profile:', err))
      .finally(() => setLoadingProfile(false));
  };

  useEffect(() => {
    setLoading(true);
    api.getVendorLeaderboard(60)
      .then((data) => {
        setVendors(Array.isArray(data) ? data : []);
        if (Array.isArray(data) && data.length > 0) {
          handleSelectVendor(data[0].work_top_vendor);
        }
      })
      .catch((err) => console.error('Error fetching vendors:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = vendors.filter((v) =>
    (v.work_top_vendor || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 border border-violet-500/25">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-400 font-bold">
              Cartel &amp; Monopoly Detection Engine
            </span>
            <span className="px-2 py-0.5 text-xs font-mono font-semibold rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
              Graph Analytics
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display">
            Contractor Concentration &amp; Shell Entity Networks
          </h2>
          <p className="text-sm text-slate-300 mt-1 leading-relaxed">
            Surfaces contractor monopoly in parliamentary constituencies, repeated sole-bidder awards, and alias entity rings.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
            <span className="text-slate-400">Total Tracked Contractors: </span>
            <span className="text-white font-mono font-extrabold">{vendors.length}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Contractor Monopoly Leaderboard */}
        <div className="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
              <Building2 className="w-4 h-4 text-violet-400" />
              Contractor Monopoly Ranking
            </h3>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/80 font-bold">
              HIGH VULNERABILITY
            </span>
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contractor or firm..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl glass-input text-sm"
            />
          </div>

          {/* List of Vendors */}
          <div className="overflow-y-auto max-h-[600px] space-y-2.5 pr-1">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-900/60 animate-pulse" />
              ))
            ) : filteredVendors.length === 0 ? (
              <div className="py-12 text-center text-sm text-slate-400">
                No contractors found.
              </div>
            ) : (
              filteredVendors.map((v, idx) => {
                const isSelected = selectedVendor === v.work_top_vendor;
                const totalAmt = Number(v.total_sanctioned || 0);
                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectVendor(v.work_top_vendor)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-violet-500/15 border-violet-500/50 shadow-lg shadow-violet-500/20'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold text-white truncate">
                          {v.work_top_vendor}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-1">
                          <span>{v.total_contracts} Contracts</span>
                          <span>•</span>
                          <span>{v.unique_mps || 1} MP Portfolios</span>
                        </div>
                      </div>

                      <div className="text-right flex-shrink-0 font-mono">
                        <div className="text-sm font-extrabold text-violet-300">
                          ₹{(totalAmt / 10000000).toFixed(2)} Cr
                        </div>
                        {v.monopoly_flags > 0 && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            {v.monopoly_flags} Monopoly Flags
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Selected Contractor Deep-Dive Dossier */}
        <div className="lg:col-span-7 glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
          {loadingProfile ? (
            <div className="py-24 text-center space-y-3">
              <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
              <div className="text-sm text-slate-400 font-mono">Extracting contractor entity network &amp; contracts...</div>
            </div>
          ) : !vendorProfile ? (
            <div className="py-24 text-center text-slate-400 text-sm">
              Select a contractor from the leaderboard to view forensic intelligence.
            </div>
          ) : (
            <>
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
                <div>
                  <span className="text-xs font-mono text-violet-400 uppercase tracking-wider font-bold">
                    Contractor Forensic Identity
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-white font-display mt-0.5">
                    {vendorProfile.vendor_name}
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="px-3 py-1.5 rounded-xl text-xs sm:text-sm font-mono font-bold bg-slate-900 border border-slate-700 text-violet-200">
                    Risk Score: {vendorProfile.avg_risk_score} / 100
                  </span>
                </div>
              </div>

              {/* Aggregated KPI Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Total Public Funds</div>
                  <div className="text-lg sm:text-xl font-extrabold text-white font-mono mt-1">
                    ₹{((vendorProfile.total_amount || 0) / 10000000).toFixed(2)} Cr
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Total Sanctioned</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Awarded Schemes</div>
                  <div className="text-lg sm:text-xl font-extrabold text-violet-300 font-mono mt-1">
                    {vendorProfile.total_works} Schemes
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">Constituency Footprint</div>
                </div>

                <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30">
                  <div className="text-xs text-slate-400 uppercase font-semibold">Monopoly Flagged</div>
                  <div className="text-lg sm:text-xl font-extrabold text-rose-400 font-mono mt-1">
                    {vendorProfile.monopoly_flags_count} Violations
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">&gt;60% District Concentration</div>
                </div>
              </div>

              {/* Linked MPs & Geography */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <Users className="w-4 h-4 text-amber-400" />
                  Associated Parliamentary Constituencies &amp; MPs
                </div>
                <div className="flex flex-wrap gap-2">
                  {(vendorProfile.mps_associated || []).map((mp, i) => (
                    <span key={i} className="px-2.5 py-1 rounded-lg text-xs sm:text-sm bg-slate-850 border border-slate-700 text-slate-200">
                      {mp}
                    </span>
                  ))}
                </div>
              </div>

              {/* Shell Entity / Alias Clusters */}
              <div className="p-5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Identified Alias Firms &amp; Collusion Clusters
                  </div>
                  <span className="text-xs font-mono text-slate-400 font-semibold">
                    {(vendorProfile.associated_aliases || []).length} Linked Entities
                  </span>
                </div>
                {(vendorProfile.associated_aliases || []).length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {vendorProfile.associated_aliases.map((alias, i) => (
                      <span key={i} className="px-2.5 py-1 rounded-lg text-xs font-mono font-semibold bg-rose-950/40 border border-rose-800/60 text-rose-300">
                        {alias}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-slate-400">No alias entities detected for this contractor.</div>
                )}
              </div>

              {/* Awarded Schemes Table */}
              <div className="space-y-2.5">
                <div className="text-sm font-bold text-white">Awarded Public Schemes Sample</div>
                <div className="overflow-x-auto max-h-60 rounded-xl border border-slate-800">
                  <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-slate-900 text-xs font-mono font-bold text-slate-300 uppercase border-b border-slate-800">
                      <tr>
                        <th className="py-2.5 px-3.5">Work ID</th>
                        <th className="py-2.5 px-3.5">Category</th>
                        <th className="py-2.5 px-3.5">Sanctioned</th>
                        <th className="py-2.5 px-3.5">Risk Tier</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {(vendorProfile.works || []).slice(0, 5).map((w, idx) => (
                        <tr 
                          key={idx} 
                          onClick={() => onSelectWork && onSelectWork(w.work_id)}
                          className="hover:bg-slate-800/40 cursor-pointer transition-colors"
                        >
                          <td className="py-2.5 px-3.5 text-violet-400 font-bold">#{w.work_id}</td>
                          <td className="py-2.5 px-3.5 text-slate-200 font-sans truncate max-w-xs">{w.work_category || 'Infrastructure'}</td>
                          <td className="py-2.5 px-3.5 font-bold text-white">₹{((Number(w.sanction_amount || 0)) / 100000).toFixed(2)} L</td>
                          <td className="py-2.5 px-3.5">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                              {w.risk_label || 'HIGH'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </>
          )}
        </div>

      </div>

    </div>
  );
}
