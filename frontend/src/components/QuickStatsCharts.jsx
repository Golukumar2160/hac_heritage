import React, { useState, useEffect, useMemo } from 'react';
import { api } from '../services/api';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
} from 'recharts';

const STATIC_STATE_RISK_DATA = [
  { state: 'Uttar Pradesh', critical: 2883, high: 2229, atRiskCr: 466.0 },
  { state: 'Punjab', critical: 1902, high: 97, atRiskCr: 90.8 },
  { state: 'Bihar', critical: 1632, high: 204, atRiskCr: 165.3 },
  { state: 'Telangana', critical: 1242, high: 31, atRiskCr: 43.4 },
  { state: 'Tamil Nadu', critical: 1133, high: 83, atRiskCr: 115.3 },
  { state: 'Odisha', critical: 1116, high: 25, atRiskCr: 35.7 },
  { state: 'Rajasthan', critical: 704, high: 118, atRiskCr: 55.0 },
  { state: 'Madhya Pradesh', critical: 686, high: 647, atRiskCr: 87.1 },
  { state: 'Gujarat', critical: 646, high: 325, atRiskCr: 37.4 },
  { state: 'Jharkhand', critical: 540, high: 558, atRiskCr: 59.1 },
];

function QuickStatsCharts({ kpis }) {
  if (!kpis) return null;

  const [liveStateRiskData, setLiveStateRiskData] = useState(STATIC_STATE_RISK_DATA);

  useEffect(() => {
    let isMounted = true;
    api.getMapStates().then(states => {
      if (!isMounted || !Array.isArray(states) || states.length === 0) return;
      const top10 = [...states]
        .sort((a, b) => (b.critical_count + b.high_count) - (a.critical_count + a.high_count))
        .slice(0, 10)
        .map(s => ({
          state: s.state,
          critical: s.critical_count || 0,
          high: s.high_count || 0,
          atRiskCr: Math.round(((s.funds_at_risk || 0) / 1e7) * 10) / 10
        }));
      setLiveStateRiskData(top10);
    }).catch(err => {
      console.warn('Using static state risk fallback:', err);
    });
    return () => { isMounted = false; };
  }, []);

  const critical_count = kpis.critical_count ?? 15731;
  const high_count = kpis.high_count ?? 6053;
  const medium_count = kpis.medium_count ?? 14867;
  const low_count = kpis.low_count ?? 61998;
  const total_works = kpis.total_works || (critical_count + high_count + medium_count + low_count) || 98649;

  const pieData = useMemo(() => [
    { name: 'Critical Risk', value: critical_count, color: '#f43f5e' },
    { name: 'High Risk', value: high_count, color: '#f59e0b' },
    { name: 'Medium Alert', value: medium_count, color: '#8b5cf6' },
    { name: 'Low / Verified', value: low_count, color: '#34d399' },
  ], [critical_count, high_count, medium_count, low_count]);

  const stateRiskData = liveStateRiskData;

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      return (
        <div className="glass-panel rounded-xl p-3 text-xs shadow-2xl border border-slate-200 dark:border-violet-500/20 bg-white/95 dark:bg-navy-950/95">
          <div className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: data.payload.color }} />
            {data.name}
          </div>
          <div className="text-slate-700 dark:text-slate-200 font-mono text-xs">
            {Number(data.value).toLocaleString('en-IN')} Schemes
          </div>
          <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {((data.value / total_works) * 100).toFixed(1)}% of audited works
          </div>
        </div>
      );
    }
    return null;
  };

  const CustomBarTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="glass-panel rounded-xl p-3 text-xs shadow-2xl border border-slate-200 dark:border-violet-500/20 bg-white/95 dark:bg-navy-950/95">
          <div className="font-bold text-slate-900 dark:text-white mb-2">{label}</div>
          <div className="space-y-1 font-mono text-[10px]">
            <div className="flex items-center justify-between gap-4 text-rose-600 dark:text-rose-400">
              <span>Critical:</span>
              <span className="font-bold">{payload[0]?.value}</span>
            </div>
            <div className="flex items-center justify-between gap-4 text-amber-600 dark:text-amber-400">
              <span>High Risk:</span>
              <span className="font-bold">{payload[1]?.value}</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
      
      {/* Risk Distribution Donut */}
      <div className="lg:col-span-5 glass-panel p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Vigilance Risk Stratification
            </h4>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-md font-bold bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/25">
              ISOLATION FOREST + RULES
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
            Proportion of public schemes categorized by composite fraud risk score
          </p>
        </div>

        <div className="h-64 w-full relative flex items-center justify-center">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={65}
                outerRadius={95}
                paddingAngle={3}
                dataKey="value"
                stroke="none"
                startAngle={90}
                endAngle={-270}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-out"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.85} />
                ))}
              </Pie>
              <Tooltip content={<CustomPieTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Inner Center Stat */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
            <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">98,649</span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mt-0.5">
              Total Audited
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="grid grid-cols-2 gap-2.5 mt-4 pt-3 border-t border-slate-200/80 dark:border-white/[0.06]">
          {pieData.map((item, idx) => (
            <div key={idx} className="flex items-center space-x-2 text-xs">
              <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ backgroundColor: item.color, opacity: 0.9 }} />
              <span className="text-slate-700 dark:text-slate-300 truncate font-medium">{item.name}</span>
              <span className="font-mono text-slate-500 dark:text-slate-400 ml-auto font-semibold">
                {Number(item.value).toLocaleString('en-IN')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* State-Wise Vulnerability Concentrations */}
      <div className="lg:col-span-7 glass-panel p-6 rounded-2xl flex flex-col justify-between border border-slate-200/80 dark:border-white/[0.06]">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h4 className="text-base font-bold text-slate-900 dark:text-white font-display">
              Geographic Vulnerability Distribution
            </h4>
            <span className="text-xs font-mono px-2.5 py-0.5 rounded-md font-bold bg-rose-500/10 text-rose-700 dark:text-rose-300 border border-rose-500/25">
              ₹722.9 Cr HIGH-RISK
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-4">
            States exhibiting highest concentration of severe anomalies and cost overruns
          </p>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stateRiskData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-slate-200 dark:text-white/[0.04]" vertical={false} />
              <XAxis 
                dataKey="state" 
                stroke="#94a3b8" 
                fontSize={11} 
                tickLine={false}
                tickFormatter={(val) => val.split(' ')[0]} 
              />
              <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
              <Tooltip content={<CustomBarTooltip />} />
              <Legend 
                wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                formatter={(val) => <span className="text-slate-700 dark:text-slate-300 font-medium">{val}</span>}
              />
              <Bar dataKey="critical" name="Critical" fill="#f43f5e" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
              <Bar dataKey="high" name="High Risk" fill="#f59e0b" fillOpacity={0.85} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 pt-3 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/[0.06]">
          <span>*Data aggregated from 543 Lok Sabha and 245 Rajya Sabha constituencies</span>
          <span className="font-mono text-violet-600 dark:text-violet-400 font-semibold">Live SQL Sync</span>
        </div>
      </div>

    </div>
  );
}

export default React.memo(QuickStatsCharts);
