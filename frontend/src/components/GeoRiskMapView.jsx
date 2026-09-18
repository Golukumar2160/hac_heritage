import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Layers, 
  ShieldAlert, 
  TrendingUp, 
  ChevronRight,
  Filter,
  Flame,
  Globe,
  Crosshair,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Info,
  ExternalLink,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Search,
  Building2,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { 
  SVG_MAP_CONFIG, 
  INDIA_STATE_PATHS,
  projectGeoPoint
} from '../data/indiaMapData';

export default function GeoRiskMapView({ onSelectWork, activeRole = 'ministry' }) {
  const [states, setStates] = useState([]);
  const [selectedState, setSelectedState] = useState('Uttar Pradesh');
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [gpsPoints, setGpsPoints] = useState([]);
  const [showGpsPins, setShowGpsPins] = useState(true);
  const [selectedGpsPoint, setSelectedGpsPoint] = useState(null);
  
  // Interactive Controls
  const [activeMetric, setActiveMetric] = useState('risk'); // 'risk' | 'critical' | 'funds' | 'monopoly'
  const [hoveredState, setHoveredState] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState(1);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const svgRef = useRef(null);

  // Dynamic Role Configuration
  const roleConfig = useMemo(() => {
    if (activeRole === 'mp') {
      return {
        badge: 'Parliamentary Constituency Scope',
        title: 'Constituency Vulnerability & Risk Radar — Shri Javed Ali Khan (MP)',
        desc: 'Scoped oversight of 178 parliamentary schemes recommended by Hon\'ble MP Shri Javed Ali Khan in Uttar Pradesh. Highlighting 14 statutory audit exceptions.',
        jurisdictionLabel: 'Constituency Scope',
        jurisdictionVal: '1 MP (Sambhal, UP)',
        scopeBannerText: 'Viewing Scoped Constituency Data for Hon\'ble MP Shri Javed Ali Khan (178 Schemes Monitored)'
      };
    }
    if (activeRole === 'district') {
      return {
        badge: 'District Authority Scope',
        title: 'District Vigilance & Sanctions Console — Pilibhit Jurisdiction',
        desc: 'Ground verification and milestone monitoring of 293 sanctioned works in Pilibhit district, Uttar Pradesh.',
        jurisdictionLabel: 'District Scope',
        jurisdictionVal: 'Pilibhit, UP',
        scopeBannerText: 'Viewing Scoped District Authority Data for District Magistrate, Pilibhit (293 Schemes Monitored)'
      };
    }
    if (activeRole === 'state') {
      return {
        badge: 'State Nodal Authority Scope',
        title: 'State Project Monitoring Grid — Uttar Pradesh Directorate',
        desc: 'State-level oversight across 19,892 MPLADS developmental works across all 75 districts of Uttar Pradesh.',
        jurisdictionLabel: 'State Jurisdiction',
        jurisdictionVal: 'Uttar Pradesh (75 Districts)',
        scopeBannerText: 'Viewing State-Wide Monitored Data for State Nodal Authority, Uttar Pradesh (19,892 Schemes)'
      };
    }
    return {
      badge: 'National Geospatial Vigilance Grid',
      title: 'Geographic Vulnerability Distribution & Risk Clusters',
      desc: 'Interactive multi-tier vector map of India mapping 98,649 MPLADS schemes across all 36 States & Union Territories.',
      jurisdictionLabel: 'Audited States',
      jurisdictionVal: `${states.length || 36} Jurisdictions`,
      scopeBannerText: null
    };
  }, [activeRole, states.length]);

  const handleSelectState = (stateName) => {
    setSelectedState(stateName);
    setLoadingDistricts(true);
    api.getMapDistricts(stateName)
      .then((data) => setDistricts(Array.isArray(data) ? data : []))
      .catch((err) => console.error('Error loading district map data:', err))
      .finally(() => setLoadingDistricts(false));
  };

  // Load States Aggregates (Re-fetches on activeRole switch)
  useEffect(() => {
    setLoading(true);
    api.getMapStates()
      .then((data) => {
        if (Array.isArray(data)) {
          setStates(data);
          if (data.length > 0) {
            const upExists = data.find(s => s.state === 'Uttar Pradesh');
            const defaultState = upExists ? 'Uttar Pradesh' : data[0].state;
            setSelectedState(defaultState);
            handleSelectState(defaultState);
          }
        }
      })
      .catch((err) => {
        console.error('Error loading geospatial map data:', err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [activeRole]);

  // Load Ground-Truthed GPS Pins (Vision AI & Certificate OCR Extraction)
  useEffect(() => {
    api.getMapGpsPoints(150)
      .then((data) => {
        if (Array.isArray(data)) setGpsPoints(data);
      })
      .catch((err) => console.error('Error loading GPS points:', err));
  }, []);

  // Create state lookup dictionary by db_name
  const stateDataMap = useMemo(() => {
    const map = {};
    states.forEach(s => {
      map[s.state] = s;
    });
    return map;
  }, [states]);

  // Metric color scale generator
  const getStateColor = (dbName) => {
    const data = stateDataMap[dbName];
    if (!data) return '#1e293b'; // Slate-800 default

    if (activeMetric === 'risk') {
      const score = Number(data.avg_risk_score || 0);
      if (score >= 48) return '#e11d48'; // Rose-600 Critical
      if (score >= 42) return '#f97316'; // Orange-500 High
      if (score >= 35) return '#eab308'; // Amber-500 Medium
      return '#10b981'; // Emerald-500 Compliant
    }

    if (activeMetric === 'critical') {
      const crit = Number(data.critical_count || 0);
      if (crit >= 1500) return '#e11d48';
      if (crit >= 700) return '#f97316';
      if (crit >= 200) return '#eab308';
      return '#10b981';
    }

    if (activeMetric === 'funds') {
      const fundsCr = Number(data.funds_at_risk || 0) / 10000000;
      if (fundsCr >= 100) return '#e11d48';
      if (fundsCr >= 30) return '#f97316';
      if (fundsCr >= 10) return '#eab308';
      return '#10b981';
    }

    if (activeMetric === 'monopoly') {
      const mono = Number(data.monopoly_works || 0);
      if (mono >= 40) return '#e11d48';
      if (mono >= 15) return '#f97316';
      if (mono >= 5) return '#eab308';
      return '#10b981';
    }

    return '#06b6d4';
  };

  const currentStateObj = stateDataMap[selectedState] || states.find(s => s.state === selectedState) || states[0] || {};

  // Filtered states list for sidebar
  const filteredStates = useMemo(() => {
    if (!searchQuery.trim()) return states;
    const q = searchQuery.toLowerCase();
    return states.filter(s => s.state && s.state.toLowerCase().includes(q));
  }, [states, searchQuery]);

  // Scoped aggregates for the header quick cards
  const nationalKpis = useMemo(() => {
    const totalWorks = states.reduce((acc, s) => acc + Number(s.total_works || 0), 0);
    const totalCrit = states.reduce((acc, s) => acc + Number(s.critical_count || 0), 0);
    const totalFundsCr = states.reduce((acc, s) => acc + (Number(s.funds_at_risk || 0) / 10000000), 0);
    return {
      totalStates: activeRole === 'ministry' ? (states.length || 36) : states.length,
      totalWorks,
      totalCrit,
      totalFundsCr: totalFundsCr.toFixed(1)
    };
  }, [states, activeRole]);

  // Handle SVG Mouse Move for Tooltip
  const handleSvgMouseMove = (e) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    setTooltipPos({
      x: e.clientX - rect.left + 15,
      y: e.clientY - rect.top + 15
    });
  };

  return (
    <div className="space-y-6">
      
      {/* ── TOP HEADER & SUMMARY BADGES ──────────────────────────────────── */}
      <div className="glass-panel p-6 sm:p-7 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-4 border border-violet-500/25">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-mono uppercase tracking-widest text-violet-300 font-bold px-2.5 py-0.5 rounded bg-violet-950/60 border border-violet-800/80">
              {roleConfig.badge}
            </span>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-slate-800 text-slate-300 border border-slate-700">
              Official Survey of India Boundary
            </span>
            <span className="px-2 py-0.5 text-xs font-mono rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              100% Offline Vector Projection
            </span>
            {roleConfig.scopeBannerText && (
              <span className="px-2.5 py-0.5 text-xs font-mono rounded bg-violet-900/40 text-violet-200 border border-violet-700 font-semibold">
                {roleConfig.scopeBannerText}
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-white font-display flex items-center gap-2.5">
            <Globe className="w-5 h-5 text-violet-400" />
            {roleConfig.title}
          </h2>
          <p className="text-sm text-slate-300 mt-1 max-w-3xl leading-relaxed">
            {roleConfig.desc}
          </p>
        </div>

        {/* National / Scoped Stats Quick Strip */}
        <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-mono">
          <div className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-xs text-slate-400 uppercase font-semibold">{roleConfig.jurisdictionLabel}</div>
            <div className="text-base font-extrabold text-white mt-0.5">{roleConfig.jurisdictionVal}</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-rose-950/40 border border-rose-800/60">
            <div className="text-xs text-rose-300 uppercase font-semibold">Critical Schemes</div>
            <div className="text-base font-extrabold text-rose-400 mt-0.5">{nationalKpis.totalCrit.toLocaleString()} Flags</div>
          </div>
          <div className="px-4 py-2 rounded-xl bg-amber-950/40 border border-amber-800/60">
            <div className="text-xs text-amber-300 uppercase font-semibold">Capital at Risk</div>
            <div className="text-base font-extrabold text-amber-400 mt-0.5">₹{nationalKpis.totalFundsCr} Cr</div>
          </div>
        </div>
      </div>

      {/* ── MAIN TWO-COLUMN WORKBENCH (SIDEBAR + INTERACTIVE MAP) ────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: RANKED STATES LIST SIDEBAR (4 COLS) */}
        <div className="lg:col-span-4 glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col space-y-3.5 h-[680px]">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div>
              <h3 className="text-base font-bold text-white font-display flex items-center gap-2">
                <Building2 className="w-4 h-4 text-violet-400" />
                State Vulnerability Index
              </h3>
              <div className="text-xs text-slate-400 mt-0.5">
                Ranked by Composite AI Risk Score
              </div>
            </div>
            <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-violet-500/10 text-violet-300 border border-violet-500/30">
              {filteredStates.length} Active
            </span>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search State or UT..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-violet-500/60 font-sans"
            />
          </div>

          {/* Scrollable Ranked States */}
          <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 custom-scrollbar">
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-16 rounded-xl bg-slate-900/60 animate-pulse border border-slate-800/40" />
              ))
            ) : filteredStates.length === 0 ? (
              <div className="py-10 text-center text-sm text-slate-500">
                No states matching "{searchQuery}"
              </div>
            ) : (
              filteredStates.map((s, idx) => {
                const isSelected = selectedState === s.state;
                const critCount = Number(s.critical_count || 0);
                const fundsRiskCr = (Number(s.funds_at_risk || 0) / 10000000).toFixed(1);
                const stateColor = getStateColor(s.state);

                return (
                  <div
                    key={idx}
                    onClick={() => handleSelectState(s.state)}
                    onMouseEnter={() => setHoveredState(s)}
                    onMouseLeave={() => setHoveredState(null)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                      isSelected
                        ? 'bg-violet-500/15 border-violet-500/80 shadow-lg shadow-violet-950/50'
                        : 'bg-slate-900/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div 
                          className="w-2.5 h-2.5 rounded-full mt-1 flex-shrink-0"
                          style={{ backgroundColor: stateColor }}
                        />
                        <div>
                          <div className="text-sm font-bold text-white flex items-center gap-1.5">
                            {s.state}
                            {critCount > 200 && (
                              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                            )}
                          </div>
                          <div className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                            <span>{s.total_works.toLocaleString()} Works</span>
                            <span>•</span>
                            <span className="text-rose-400 font-semibold">{critCount} Critical</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right font-mono flex-shrink-0">
                        <div className="text-sm font-bold text-amber-400">
                          ₹{fundsRiskCr} Cr
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Score: <span className="font-bold text-violet-300">{s.avg_risk_score}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Quick Guidance Note */}
          <div className="pt-2.5 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-violet-400 flex-shrink-0" />
            <span>Click any state polygon on map or list to trigger district drilldown.</span>
          </div>
        </div>

        {/* RIGHT COLUMN: INTERACTIVE INDIA VECTOR CHOROPLETH (8 COLS) */}
        <div className="lg:col-span-8 glass-panel p-5 sm:p-6 rounded-2xl border border-slate-800 flex flex-col space-y-4 h-[680px] relative">
          
          {/* Map Controls Top Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
            
            {/* Metric Mode Selector */}
            <div className="flex items-center space-x-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs sm:text-sm">
              {[
                { id: 'risk', label: 'AI Risk Score' },
                { id: 'critical', label: 'Critical Works' },
                { id: 'funds', label: 'Capital at Risk' },
                { id: 'monopoly', label: 'Monopoly Rings' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveMetric(tab.id)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                    activeMetric === tab.id
                      ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-500/25'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setZoomLevel(prev => Math.min(prev + 0.25, 2))}
                title="Zoom In"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setZoomLevel(prev => Math.max(prev - 0.25, 1))}
                title="Zoom Out"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setZoomLevel(1)}
                title="Reset View"
                className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>

              {/* GPS Ground Pin Toggle */}
              <button
                onClick={() => setShowGpsPins(!showGpsPins)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  showGpsPins
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                }`}
                title="Toggle Vision AI & OCR verified physical GPS project coordinates"
              >
                <MapPin className="w-3.5 h-3.5 text-emerald-400" />
                <span>{showGpsPins ? `GPS Pins (${gpsPoints.length})` : 'Show Pins'}</span>
              </button>
            </div>

          </div>

          {/* SVG Canvas Container */}
          <div 
            className="flex-1 w-full relative overflow-hidden flex items-center justify-center rounded-xl bg-slate-950/60 border border-slate-900/80"
            onMouseMove={handleSvgMouseMove}
          >
            {/* Background Grid Accent */}
            <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

            <svg
              ref={svgRef}
              viewBox={SVG_MAP_CONFIG.viewBox}
              className="w-full h-full max-h-[560px] select-none transition-transform duration-200 ease-out"
              style={{
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'center center'
              }}
            >
              <defs>
                {/* Glow Filter for Selected State */}
                <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#06b6d4" floodOpacity="0.8" />
                </filter>
                {/* Glow Filter for Critical State */}
                <filter id="glow-rose" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="0" stdDeviation="5" floodColor="#f43f5e" floodOpacity="0.7" />
                </filter>
              </defs>

              {/* 1. Base India State Polygons */}
              <g className="states-group">
                {INDIA_STATE_PATHS.map((item) => {
                  const dbName = item.db_name;
                  const isSelected = selectedState === dbName;
                  const isHovered = hoveredState && (hoveredState.state === dbName || hoveredState.db_name === dbName);
                  const fillColor = getStateColor(dbName);
                  const stateData = stateDataMap[dbName];
                  const hasCritical = stateData && Number(stateData.critical_count || 0) > 1500;

                  const inScope = activeRole === 'ministry' || !!stateDataMap[dbName];

                  return (
                    <path
                      key={item.id}
                      d={item.path}
                      fill={inScope ? fillColor : '#0f172a'}
                      fillOpacity={!inScope ? 0.2 : isSelected ? 0.95 : isHovered ? 0.85 : 0.65}
                      stroke={isSelected ? '#06b6d4' : isHovered ? '#ffffff' : !inScope ? '#1e293b' : '#334155'}
                      strokeWidth={isSelected ? 3 : isHovered ? 2 : inScope ? 1 : 0.5}
                      strokeLinejoin="round"
                      fillRule="evenodd"
                      filter={isSelected ? 'url(#glow-cyan)' : hasCritical ? 'url(#glow-rose)' : undefined}
                      className="cursor-pointer transition-all duration-150"
                      onClick={() => inScope && handleSelectState(dbName)}
                      onMouseEnter={() => inScope && setHoveredState(stateData || { state: dbName, total_works: 0 })}
                      onMouseLeave={() => setHoveredState(null)}
                    >
                      <title>{item.name} ({dbName})</title>
                    </path>
                  );
                })}
              </g>

              {/* 2. State Name Label Nodes (Key States) */}
              <g className="state-labels pointer-events-none">
                {INDIA_STATE_PATHS.filter(s => [
                  'Ladakh', 'Jammu And Kashmir',
                  'Uttar Pradesh', 'Rajasthan', 'Madhya Pradesh', 'Maharashtra', 
                  'Gujarat', 'Bihar', 'Tamil Nadu', 'Karnataka', 'West Bengal', 
                  'Odisha', 'Punjab', 'Telangana', 'Assam'
                ].includes(s.db_name)).map((s) => {
                  const [cx, cy] = s.center;
                  const isSelected = selectedState === s.db_name;
                  return (
                    <text
                      key={s.id}
                      x={cx}
                      y={cy}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className={`text-[9px] font-mono font-bold tracking-tight ${
                        isSelected ? 'fill-cyan-200' : 'fill-slate-300'
                      }`}
                      style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9)' }}
                    >
                      {s.db_name.length > 12 ? s.db_name.substring(0, 10) + '..' : s.db_name}
                    </text>
                  );
                })}
              </g>

              {/* 3. Physical GPS Ground-Truth Pin Overlay (Vision AI & OCR Verified Coordinates) */}
              {showGpsPins && (
                <g className="gps-points-layer">
                  {gpsPoints.map((pt, idx) => {
                    const lat = parseFloat(pt.latitude);
                    const lon = parseFloat(pt.longitude);
                    if (isNaN(lat) || isNaN(lon)) return null;
                    const [px, py] = projectGeoPoint(lat, lon);
                    const isCrit = (pt.risk_score || 0) >= 80 || pt.risk_tier === 'CRITICAL';
                    const isSelected = selectedGpsPoint?.work_id === pt.work_id;
                    const color = isCrit ? '#f43f5e' : '#10b981';

                    return (
                      <g
                        key={`gps-${idx}-${pt.work_id}`}
                        transform={`translate(${px}, ${py})`}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedGpsPoint(pt);
                          if (onSelectWork && pt.work_id) onSelectWork(pt.work_id);
                        }}
                        className="cursor-pointer"
                      >
                        {/* Ping animation for high-risk physical locations */}
                        {isCrit && (
                          <circle r="7" fill="none" stroke={color} strokeWidth="1.2" opacity="0.7">
                            <animate attributeName="r" values="3;12" dur="2s" repeatCount="indefinite" />
                            <animate attributeName="opacity" values="0.8;0" dur="2s" repeatCount="indefinite" />
                          </circle>
                        )}
                        <circle
                          r={isSelected ? 5.5 : 3.5}
                          fill={color}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? 1.5 : 0.75}
                        />
                      </g>
                    );
                  })}
                </g>
              )}

            </svg>

            {/* Hover Floating Tooltip */}
            {hoveredState && (
              <div 
                className="absolute pointer-events-none z-30 p-3 rounded-xl bg-slate-900/95 border border-cyan-500/50 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[200px]"
                style={{
                  left: Math.min(tooltipPos.x, 380),
                  top: Math.min(tooltipPos.y, 400)
                }}
              >
                <div className="font-bold text-white flex items-center justify-between border-b border-slate-800 pb-1.5">
                  <span className="text-sm">{hoveredState.state}</span>
                  <span className="text-xs font-mono text-violet-300 px-2 py-0.5 rounded bg-violet-950/80 border border-violet-800">
                    Score: {hoveredState.avg_risk_score || 'N/A'}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-slate-400">Total Works:</span>
                    <div className="text-white font-semibold">{Number(hoveredState.total_works || 0).toLocaleString()}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Critical Flags:</span>
                    <div className="text-rose-400 font-semibold">{Number(hoveredState.critical_count || 0)}</div>
                  </div>
                  <div>
                    <span className="text-slate-400">Capital at Risk:</span>
                    <div className="text-amber-400 font-semibold">
                      ₹{((Number(hoveredState.funds_at_risk || 0)) / 10000000).toFixed(2)} Cr
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400">Monopoly Works:</span>
                    <div className="text-violet-300 font-semibold">{Number(hoveredState.monopoly_works || 0)}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom-Right Legend Card */}
            <div className="absolute bottom-3 right-3 p-3 rounded-xl bg-slate-900/90 border border-slate-800 backdrop-blur-md text-xs space-y-1.5">
              <div className="text-xs font-mono uppercase text-slate-400 font-bold">
                {activeMetric === 'risk' && 'AI Risk Severity'}
                {activeMetric === 'critical' && 'Critical Flag Density'}
                {activeMetric === 'funds' && 'Capital at Risk Outlay'}
                {activeMetric === 'monopoly' && 'Monopoly Rings'}
              </div>
              <div className="flex items-center space-x-2 text-[10px] font-mono">
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300">Low</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <span className="text-slate-300">Med</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  <span className="text-slate-300">High</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                  <span className="text-slate-300">Critical</span>
                </span>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* ── DISTRICT BREAKDOWN TABLE BELOW MAP (AS CONFIRMED IN A2) ──────── */}
      <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-5">
        
        {/* State Overview Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-wider font-bold">
                State Audit Focus & Administrative Authorities
              </span>
              <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-800 text-slate-300">
                {currentStateObj.total_works || 0} Total Works
              </span>
            </div>
            <h3 className="text-lg font-bold text-white font-display mt-0.5">
              {currentStateObj.state || selectedState}
            </h3>
          </div>

          <div className="flex items-center space-x-2">
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800">
              {currentStateObj.critical_pct || 0}% Critical Schemes Ratio
            </span>
            <span className="px-3 py-1 rounded-lg text-xs font-mono font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800">
              Avg Risk: {currentStateObj.avg_risk_score || 0}
            </span>
          </div>
        </div>

        {/* State Aggregated Figures 4-Pill Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Total Sanctioned Outlay</div>
            <div className="text-base font-bold text-white font-mono mt-0.5">
              ₹{((currentStateObj.total_sanctioned || 0) / 10000000).toFixed(1)} Cr
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Capital at Risk (High + Crit)</div>
            <div className="text-base font-bold text-rose-400 font-mono mt-0.5">
              ₹{((currentStateObj.funds_at_risk || 0) / 10000000).toFixed(1)} Cr
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Critical Schemes</div>
            <div className="text-base font-bold text-amber-400 font-mono mt-0.5">
              {(currentStateObj.critical_count || 0).toLocaleString()} Works
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
            <div className="text-[10px] text-slate-400 uppercase font-medium">Monopoly Awards</div>
            <div className="text-base font-bold text-cyan-300 font-mono mt-0.5">
              {currentStateObj.monopoly_works || 0} Flags
            </div>
          </div>
        </div>

        {/* Districts Table */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-white font-display flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-cyan-400" />
              District Implementing Authorities in {currentStateObj.state || selectedState} ({districts.length} Authorities)
            </h4>
            <span className="text-[10px] font-mono text-slate-400">
              Sorted by Critical Schemes Volume
            </span>
          </div>

          <div className="overflow-x-auto max-h-[420px] rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-[10px] font-mono text-slate-400 border-b border-slate-800 sticky top-0">
                <tr>
                  <th className="py-2.5 px-3">District Authority (IDA)</th>
                  <th className="py-2.5 px-3">Total Works</th>
                  <th className="py-2.5 px-3">Critical Flags</th>
                  <th className="py-2.5 px-3">Sanctioned Outlay</th>
                  <th className="py-2.5 px-3 text-right">Composite AI Risk</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {loadingDistricts ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="py-3 px-3">
                        <div className="h-4 bg-slate-800/40 rounded w-full" />
                      </td>
                    </tr>
                  ))
                ) : districts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 font-mono text-xs">
                      No district breakdown data found for this jurisdiction.
                    </td>
                  </tr>
                ) : (
                  districts.map((d, idx) => {
                    const crit = Number(d.critical_count || 0);
                    const amt = Number(d.total_sanctioned || 0);
                    return (
                      <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                        <td className="py-2.5 px-3 font-semibold text-white flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          {d.ida || d.district || 'District Authority'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-300">
                          {Number(d.total_works || 0).toLocaleString()}
                        </td>
                        <td className="py-2.5 px-3 font-mono">
                          {crit > 0 ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                              {crit} Critical
                            </span>
                          ) : (
                            <span className="text-emerald-400 text-xs flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Compliant
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-200">
                          ₹{(amt / 10000000).toFixed(2)} Cr
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-cyan-400">
                          {d.avg_risk_score}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── METHODOLOGY BRIEFING ────────────────────────── */}
        <div className="pt-4 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-violet-400" />
              Choropleth Boundary Intelligence
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Bharat-Drishti utilizes an administrative boundary choropleth aggregating all 98,649 works across 36 states and union territories, calibrated against official CAG expenditure schedules.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
            <h5 className="text-sm font-bold text-white flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-400" />
              Sovereign District &amp; State Audit Protocol
            </h5>
            <p className="text-xs text-slate-400 leading-relaxed">
              Multi-tier vigilance scoring correlates district-level allocations against execution timelines and contractor concentration, enabling senior administrators and citizens to pinpoint irregularities instantly.
            </p>
          </div>
        </div>

      </div>

    </div>
  );
}
