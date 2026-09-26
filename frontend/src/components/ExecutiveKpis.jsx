import React from 'react';
import { 
  AlertTriangle, 
  Layers, 
  TrendingUp, 
  Flame,
  ArrowUpRight
} from 'lucide-react';

export default function ExecutiveKpis({ kpis, onFilterTier, activeRole = 'ministry' }) {
  const safeKpis = kpis || {};

  const total_works = safeKpis.total_works ?? 98649;
  const total_sanctioned_cr = safeKpis.total_sanctioned_cr ?? (safeKpis.total_sanctioned_amount ? (safeKpis.total_sanctioned_amount / 1e7) : 5880.56);
  const total_spent_cr = safeKpis.total_spent_cr ?? (safeKpis.total_spent_amount ? (safeKpis.total_spent_amount / 1e7) : 4013.82);
  const total_at_risk_cr = safeKpis.total_at_risk_cr ?? (safeKpis.total_funds_at_risk ? (safeKpis.total_funds_at_risk / 1e7) : 1664.37);
  const critical_count = safeKpis.critical_count ?? 15731;
  const high_count = safeKpis.high_count ?? 6053;
  const medium_count = safeKpis.medium_count ?? 14867;
  const low_count = safeKpis.low_count ?? 61998;
  const duplicate_photos_count = safeKpis.duplicate_photos_count ?? 18;

  const roleTitles = {
    ministry: { outlay: 'Total National Outlay', absorption: 'national fund absorption', worksSubtitle: 'total audited works' },
    state: { outlay: 'Total State Outlay (UP)', absorption: 'state fund absorption', worksSubtitle: 'state audited works' },
    district: { outlay: 'District Outlay (Pilibhit)', absorption: 'district fund absorption', worksSubtitle: 'district works under audit' },
    mp: { outlay: 'Constituency Allocation', absorption: 'constituency fund absorption', worksSubtitle: 'constituency works' },
    citizen: { outlay: 'Local District Outlay', absorption: 'local fund absorption', worksSubtitle: 'public monitored works' }
  };
  const roleCfg = roleTitles[activeRole] || roleTitles.ministry;

  const cards = [
    {
      title: roleCfg.outlay,
      value: `₹${Number(total_sanctioned_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: `${Number(total_works).toLocaleString('en-IN')} ${roleCfg.worksSubtitle}`,
      icon: Layers,
      accentColor: 'rgba(139, 92, 246, 0.9)',
      glowColor: 'rgba(139, 92, 246, 0.22)',
      borderColor: 'rgba(139, 92, 246, 0.35)',
      topBorderColor: 'linear-gradient(90deg, #c4b5fd, #8b5cf6)',
      iconColor: 'text-violet-500 dark:text-violet-400',
    },
    {
      title: 'Disbursed Expenditure',
      value: `₹${Number(total_spent_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: `${((total_spent_cr / (total_sanctioned_cr || 1)) * 100).toFixed(1)}% ${roleCfg.absorption}`,
      icon: TrendingUp,
      accentColor: 'rgba(99, 102, 241, 0.9)',
      glowColor: 'rgba(99, 102, 241, 0.22)',
      borderColor: 'rgba(99, 102, 241, 0.35)',
      topBorderColor: 'linear-gradient(90deg, #a5b4fc, #6366f1)',
      iconColor: 'text-indigo-500 dark:text-indigo-400',
    },
    {
      title: 'Capital at Risk (Medium+)',
      value: `₹${Number(total_at_risk_cr).toLocaleString('en-IN', { maximumFractionDigits: 2 })} Cr`,
      subtitle: 'Funds flagged for statutory inquiry',
      icon: Flame,
      accentColor: 'rgba(244, 63, 94, 0.9)',
      glowColor: 'rgba(244, 63, 94, 0.25)',
      borderColor: 'rgba(244, 63, 94, 0.35)',
      topBorderColor: 'linear-gradient(90deg, #fda4af, #f43f5e)',
      iconColor: 'text-rose-500 dark:text-rose-400',
      isDanger: true,
      onClick: () => onFilterTier && onFilterTier('critical'),
    },
    {
      title: 'Critical Anomaly Schemes',
      value: Number(critical_count).toLocaleString('en-IN'),
      subtitle: 'Immediate administrative freeze advised',
      icon: AlertTriangle,
      accentColor: 'rgba(245, 158, 11, 0.9)',
      glowColor: 'rgba(245, 158, 11, 0.25)',
      borderColor: 'rgba(245, 158, 11, 0.35)',
      topBorderColor: 'linear-gradient(90deg, #fde047, #f59e0b)',
      iconColor: 'text-amber-500 dark:text-amber-400',
      onClick: () => onFilterTier && onFilterTier('critical'),
    },
  ];

  return (
    <section className="space-y-4">
      {/* Primary Outlay KPI Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              onClick={card.onClick}
              className={`glass-panel relative overflow-hidden rounded-2xl p-5 card-interactive ${card.onClick ? 'cursor-pointer' : ''}`}
              style={{
                borderColor: card.borderColor,
              }}
            >
              {/* Subtle accent bar at top */}
              <div className="absolute top-0 left-0 right-0 h-[3px]" style={{ background: card.topBorderColor }} />

              {/* Background ambient glow */}
              <div
                className="absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl pointer-events-none opacity-40 dark:opacity-100"
                style={{ background: card.glowColor }}
              />

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-300">
                  {card.title}
                </span>
                {card.badge && (
                  <span className={`px-2 py-0.5 text-xs font-mono font-bold rounded-md border ${card.badgeClass}`}>
                    {card.badge}
                  </span>
                )}
              </div>

              <div className="flex items-baseline justify-between">
                <h3 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                  {card.value}
                </h3>
                {card.onClick && (
                  <ArrowUpRight className="w-4 h-4 text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors" />
                )}
              </div>

              <div className="mt-3 pt-2.5 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 font-medium border-t border-slate-200/80 dark:border-white/[0.06]">
                <span className="truncate">{card.subtitle}</span>
                <Icon className={`w-4 h-4 flex-shrink-0 ml-2 ${card.iconColor}`} style={{ opacity: 0.9 }} />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
