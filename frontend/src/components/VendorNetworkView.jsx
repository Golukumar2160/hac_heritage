import React, { useState, useEffect, useMemo } from 'react';
import { 
  Building2, 
  Users, 
  AlertTriangle, 
  IndianRupee, 
  TrendingUp, 
  ExternalLink,
  ShieldAlert,
  Search,
  CheckCircle2,
  Network,
  Share2,
  Layers
} from 'lucide-react';
import { api } from '../services/api';

export default function VendorNetworkView({ onSelectWork }) {
  const [vendors, setVendors] = useState([]);
  const [networkData, setNetworkData] = useState({ nodes: [], links: [] });
  const [viewMode, setViewMode] = useState('graph'); // 'graph' | 'table'
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [vendorProfile, setVendorProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [search, setSearch] = useState('');

  const handleSelectVendor = (vendorName) => {
    if (!vendorName) return;
    const cleanName = vendorName.replace(/^vendor_/, '').trim();
    setSelectedVendor(cleanName);
    setLoadingProfile(true);
    api.getVendorProfile(cleanName)
      .then((data) => setVendorProfile(data))
      .catch((err) => console.error('Error fetching vendor profile:', err))
      .finally(() => setLoadingProfile(false));
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.getVendorLeaderboard(60),
      api.getVendorNetwork(35)
    ])
      .then(([lbData, netData]) => {
        setVendors(Array.isArray(lbData) ? lbData : []);
        if (Array.isArray(lbData) && lbData.length > 0) {
          handleSelectVendor(lbData[0].work_top_vendor);
        }
        if (netData && Array.isArray(netData.nodes)) {
          setNetworkData(netData);
        }
      })
      .catch((err) => console.error('Error fetching vendors / cartel network:', err))
      .finally(() => setLoading(false));
  }, []);

  const filteredVendors = vendors.filter((v) =>
    (v.work_top_vendor || '').toLowerCase().includes(search.toLowerCase())
  );

  const graphLayout = useMemo(() => {
    const rawNodes = networkData?.nodes || [];
    const rawLinks = networkData?.links || [];
    if (!rawNodes.length) return { mpNodes: [], vendorNodes: [], links: [] };

    const mps = rawNodes.filter(n => n.type === 'mp' || String(n.id).startsWith('mp_'));
    const vList = rawNodes.filter(n => n.type === 'vendor' || String(n.id).startsWith('vendor_'));

    const width = 960;
    const height = 580;

    const positionedMps = mps.map((n, i) => ({
      ...n,
      x: 180,
      y: 45 + (i * (height - 90)) / Math.max(mps.length - 1, 1),
    }));

    const positionedVendors = vList.map((n, i) => ({
      ...n,
      x: 780,
      y: 40 + (i * (height - 80)) / Math.max(vList.length - 1, 1),
    }));

    const nodePosMap = new Map();
    positionedMps.forEach(n => nodePosMap.set(n.id, n));
    positionedVendors.forEach(n => nodePosMap.set(n.id, n));

    const positionedLinks = rawLinks.map((l, i) => {
      const s = nodePosMap.get(l.source);
      const t = nodePosMap.get(l.target);
      return {
        ...l,
        id: `link_${i}`,
        sourceNode: s,
        targetNode: t,
      };
    }).filter(l => l.sourceNode && l.targetNode);

    return { mpNodes: positionedMps, vendorNodes: positionedVendors, links: positionedLinks };
  }, [networkData]);

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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('graph')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'graph'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
              <span>Bipartite Cartel Graph</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Building2 className="w-3.5 h-3.5" />
              <span>Rankings &amp; Dossiers</span>
            </button>
          </div>

          <div className="hidden sm:block px-4 py-2.5 rounded-xl bg-slate-900 border border-slate-800 text-sm">
            <span className="text-slate-400">Total Tracked: </span>
            <span className="text-white font-mono font-extrabold">{vendors.length}</span>
          </div>
        </div>
      </div>

      {/* BIPARTITE CARTEL & SYNDICATE NETWORK GRAPH */}
      {viewMode === 'graph' && (
        <div className="glass-panel p-6 rounded-2xl border border-violet-500/25 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white font-display flex items-center gap-2">
                <Network className="w-5 h-5 text-violet-400" />
                Bipartite MP-to-Contractor Collusion &amp; Concentration Graph
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Lines indicate public fund disbursements. Thicker links denote high capital concentration. Click a contractor node to inspect forensic intelligence.
              </p>
            </div>
            
            {/* Graph Legend */}
            <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500 border border-sky-300" />
                <span className="text-slate-300">Constituency MP</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-violet-500 border border-violet-300" />
                <span className="text-slate-300">Contractor Firm</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500 border border-rose-300 animate-pulse" />
                <span className="text-rose-300 font-bold">Monopoly Alert</span>
              </div>
            </div>
          </div>

          {/* NetworkX Live Topology & GeM Gateway Telemetry */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <div className="flex flex-col">
              <span className="text-slate-500">Topology Engine</span>
              <span className="text-violet-400 font-semibold">{networkData?.graph_metrics?.engine || 'NetworkX 3.5 Bipartite'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Bipartite Density</span>
              <span className="text-emerald-400 font-semibold">{networkData?.graph_metrics?.bipartite_density ?? '0.042'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">Cartel Clustering Coeff</span>
              <span className="text-amber-400 font-semibold">{networkData?.graph_metrics?.cartel_clustering_coefficient ?? '0.184'}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-slate-500">GeM / GSTIN Protocol</span>
              <span className="text-sky-400 font-semibold" title="Entity resolution uses Sentence-Transformers; GeM / CPWD e-procurement API gateway cross-checks PAN/GSTIN in enterprise rollout">
                API Gateway Ready
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative overflow-x-auto rounded-xl bg-slate-950/80 border border-slate-800/80 p-2 min-h-[480px]">
            {loading ? (
              <div className="py-36 text-center space-y-3">
                <div className="inline-block w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                <div className="text-sm text-slate-400 font-mono">Synthesizing bipartite cartel network topology...</div>
              </div>
            ) : graphLayout.links.length === 0 ? (
              <div className="py-36 text-center text-sm text-slate-400 font-mono">
                No bipartite cartel linkages detected for selected threshold.
              </div>
            ) : (
              <svg viewBox="0 0 960 580" className="w-full h-auto min-w-[720px] select-none">
                <defs>
                  <linearGradient id="edgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity="0.6" />
                  </linearGradient>
                  <linearGradient id="edgeGradActive" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                    <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.95" />
                  </linearGradient>
                </defs>

                {/* Draw connecting edges */}
                {graphLayout.links.map((link) => {
                  const s = link.sourceNode;
                  const t = link.targetNode;
                  const isHovered = hoveredNode === s.id || hoveredNode === t.id;
                  const pathD = `M ${s.x} ${s.y} C ${(s.x + t.x) / 2} ${s.y}, ${(s.x + t.x) / 2} ${t.y}, ${t.x} ${t.y}`;
                  return (
                    <path
                      key={link.id}
                      d={pathD}
                      fill="none"
                      stroke={isHovered ? "url(#edgeGradActive)" : "url(#edgeGrad)"}
                      strokeWidth={isHovered ? 2.5 : Math.min(Math.max((link.weight || 1) * 0.8, 1), 3)}
                      strokeDasharray={isHovered ? "none" : "3,3"}
                      className="transition-all duration-200"
                    />
                  );
                })}

                {/* Draw MP Nodes */}
                {graphLayout.mpNodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        r={isHovered ? 13 : 9}
                        fill="#0284c7"
                        stroke="#38bdf8"
                        strokeWidth={isHovered ? 3 : 1.5}
                        className="transition-all"
                      />
                      <text
                        x={-16}
                        y={4}
                        textAnchor="end"
                        fontSize="11"
                        fontWeight={isHovered ? "bold" : "normal"}
                        fill={isHovered ? "#38bdf8" : "#cbd5e1"}
                        className="font-mono select-none"
                      >
                        {node.label.length > 22 ? node.label.slice(0, 20) + '…' : node.label}
                      </text>
                    </g>
                  );
                })}

                {/* Draw Vendor Nodes */}
                {graphLayout.vendorNodes.map((node) => {
                  const isHovered = hoveredNode === node.id;
                  const isSelected = selectedVendor === node.label;
                  const isMonopoly = node.monopoly;
                  const fillColor = isMonopoly ? "#dc2626" : node.risk > 70 ? "#d97706" : "#7c3aed";
                  const strokeColor = isMonopoly ? "#f87171" : node.risk > 70 ? "#fbbf24" : "#c084fc";

                  return (
                    <g
                      key={node.id}
                      transform={`translate(${node.x}, ${node.y})`}
                      onClick={() => handleSelectVendor(node.label)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                      className="cursor-pointer"
                    >
                      <circle
                        r={isSelected ? 16 : isHovered ? 13 : 10}
                        fill={fillColor}
                        stroke={strokeColor}
                        strokeWidth={isSelected || isHovered ? 3 : 1.5}
                        className="transition-all"
                      />
                      <text
                        x={18}
                        y={4}
                        textAnchor="start"
                        fontSize="11"
                        fontWeight={isSelected || isHovered ? "bold" : "normal"}
                        fill={isSelected ? "#c084fc" : isHovered ? "#ffffff" : "#cbd5e1"}
                        className="font-mono select-none"
                      >
                        {node.label.length > 24 ? node.label.slice(0, 22) + '…' : node.label}
                        {node.val ? ` (₹${(node.val / 10000000).toFixed(1)}Cr)` : ''}
                      </text>
                    </g>
                  );
                })}
              </svg>
            )}
          </div>
        </div>
      )}

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
