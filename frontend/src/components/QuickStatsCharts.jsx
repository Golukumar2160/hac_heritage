import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from 'recharts';
import { ShieldAlert, AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

function QuickStatsCharts({ kpis }) {
  const critical_count = kpis?.critical_count ?? 15731;
  const high_count = kpis?.high_count ?? 6053;
  const medium_count = kpis?.medium_count ?? 14867;
  const low_count = kpis?.low_count ?? 61998;
  const total_works = kpis?.total_works || (critical_count + high_count + medium_count + low_count) || 98649;

  const pieData = useMemo(() => [
    { 
      name: 'Critical Risk', 
      value: critical_count, 
      color: '#f43f5e',
      badgeBg: 'bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/20',
      icon: ShieldAlert,
      tag: 'Immediate freeze advisory'
    },
    { 
      name: 'High Risk', 
      value: high_count, 
      color: '#f59e0b',
      badgeBg: 'bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20',
      icon: AlertTriangle,
      tag: 'Escalated for site inspection'
    },
    { 
      name: 'Medium Alert', 
      value: medium_count, 
      color: '#8b5cf6',
      badgeBg: 'bg-violet-500/10 text-violet-700 dark:text-violet-400 border-violet-500/20',
      icon: AlertCircle,
      tag: 'Algorithmic surveillance'
    },
    { 
      name: 'Low / Verified', 
      value: low_count, 
      color: '#10b981',
      badgeBg: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20',
      icon: CheckCircle2,
      tag: 'Statutorily compliant'
    },
  ], [critical_count, high_count, medium_count, low_count]);

  if (!kpis) return null;

  const CustomPieTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0];
      const pct = ((data.value / total_works) * 100).toFixed(1);
      return (
        <div className="glass-panel rounded-xl p-3 text-xs shadow-2xl border border-slate-200 dark:border-violet-500/20 bg-white/95 dark:bg-[#060913]/95 backdrop-blur-md">
          <div className="font-semibold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: data.payload.color }} />
            <span>{data.name}</span>
          </div>
          <div className="text-slate-700 dark:text-slate-200 font-mono text-xs font-bold">
            {Number(data.value).toLocaleString('en-IN')} Schemes ({pct}%)
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {data.payload.tag}
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full glass-panel p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-white/[0.06]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <div className="flex items-center gap-2.5">
            <h4 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white font-display">
              Vigilance Risk Stratification
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">
            Distribution of public works categorized by multi-factor algorithmic fraud risk scores
          </p>
        </div>
        <div className="flex items-center gap-2 font-mono text-xs">
          <span className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-white/[0.06]">
            Total: <strong className="text-slate-900 dark:text-white">{Number(total_works).toLocaleString('en-IN')}</strong> Works
          </span>
        </div>
      </div>

      {/* Main Content: Balanced Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        
        {/* Left / Center Donut Chart */}
        <div className="lg:col-span-5 flex items-center justify-center">
          <div className="h-64 sm:h-72 w-full max-w-[300px] relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={70}
                  outerRadius={105}
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
                    <Cell key={`cell-${index}`} fill={entry.color} fillOpacity={0.9} />
                  ))}
                </Pie>
                <Tooltip content={<CustomPieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Inner Center Stat */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tracking-tight">
                {Number(total_works).toLocaleString('en-IN')}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1 font-mono">
                Total Audited
              </span>
            </div>
          </div>
        </div>

        {/* Right: 4 Balanced Risk Cards */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {pieData.map((item, idx) => {
            const Icon = item.icon;
            const pct = ((item.value / total_works) * 100).toFixed(1);
            return (
              <div 
                key={idx}
                className="p-4 rounded-xl border border-slate-200/80 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] hover:border-slate-300 dark:hover:border-white/[0.12] transition-all flex flex-col justify-between"
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: `${item.color}15`, color: item.color }}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.name}
                    </span>
                  </div>
                  <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${item.badgeBg}`}>
                    {pct}%
                  </span>
                </div>

                <div className="flex items-baseline justify-between mt-1">
                  <span className="text-lg sm:text-xl font-black font-mono text-slate-900 dark:text-white">
                    {Number(item.value).toLocaleString('en-IN')}
                  </span>
                  <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400">
                    schemes
                  </span>
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-white/[0.04] text-[11px] text-slate-500 dark:text-slate-400 truncate">
                  {item.tag}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Note */}
      <div className="mt-5 pt-3 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400 border-t border-slate-200/80 dark:border-white/[0.06]">
        <span>*Continuous statutory ML evaluation across 543 Lok Sabha and 245 Rajya Sabha MP allocations</span>
        <span className="font-mono text-violet-600 dark:text-violet-400 font-semibold flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          Live Audit Sync
        </span>
      </div>
    </div>
  );
}

export default React.memo(QuickStatsCharts);
