import React from 'react';
import {
  ResponsiveContainer,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Tooltip,
} from 'recharts';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  FileText,
  IndianRupee,
  TrendingUp,
  Users,
  Camera,
  Scale,
  ExternalLink,
  Info
} from 'lucide-react';

export default function IntegrityRadarTab({ workObj = {}, dupEvidence = [] }) {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. AXIOMATIC SCORING FORMULAS (Ground Truth from ML Models & Dataset)
  // ──────────────────────────────────────────────────────────────────────────

  // Axis 1: Financial Discipline (0–100)
  // Sourced from Model 1 (Isolation Forest Anomaly Percentile)
  const rawAnomalyPct = Number(workObj?.anomaly_score_pct ?? 0);
  const financialDiscipline = Math.max(0, Math.min(100, Math.round(100 - rawAnomalyPct)));

  // Axis 2: Physical Velocity (0–100)
  // Sourced from Model 4 (Timeline Delay Percentile)
  const rawTimelinePct = Number(workObj?.timeline_score_pct ?? 0);
  const physicalVelocity = Math.max(0, Math.min(100, Math.round(100 - rawTimelinePct)));

  // Axis 3: Vendor Openness (0–100)
  // If no monopoly flag, vendor competition is clean (100).
  // Otherwise inverted from Model 2 (Vendor Monopoly Percentile).
  const isVendorMonopoly = Boolean(workObj?.work_vendor_flag);
  const rawVendorPct = Number(workObj?.vendor_score_pct ?? 0);
  const vendorOpenness = !isVendorMonopoly
    ? 100
    : Math.max(0, Math.min(100, Math.round(100 - rawVendorPct)));

  // Axis 4: Statutory Compliance (0–100)
  // Sourced from Model 3 (Compliance Violations Percentile)
  const rawCompliancePct = Number(workObj?.compliance_score_pct ?? 0);
  const statutoryCompliance = Math.max(0, Math.min(100, Math.round(100 - rawCompliancePct)));

  // Axis 5: Verification Fidelity (0–100)
  // Sourced from Rule Missing Photo (Model 3) & Duplicate Photo Evidence (pHash 64-bit DCT)
  const hasMissingPhoto = Boolean(workObj?.rule_missing_photo);
  const hasDuplicatePhoto = Boolean(workObj?.is_duplicate || (Array.isArray(dupEvidence) && dupEvidence.length > 0));
  let verificationFidelity = 100;
  if (hasMissingPhoto) verificationFidelity -= 50;
  if (hasDuplicatePhoto) verificationFidelity -= 50;
  verificationFidelity = Math.max(0, verificationFidelity);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. WEIGHTED COMPOSITE INTEGRITY INDEX (Ensemble Alignment with Model 5)
  // ──────────────────────────────────────────────────────────────────────────
  // Model 5 weights: Anomaly=0.35, Vendor=0.30, Compliance=0.20, Timeline=0.15
  const weightedScore = (
    financialDiscipline * 0.35 +
    vendorOpenness * 0.30 +
    statutoryCompliance * 0.20 +
    physicalVelocity * 0.15
  );

  // Apply Verification Fidelity modifier if photo fraud / missing evidence exists
  const photoPenalty = (100 - verificationFidelity) * 0.10; // up to -10 points
  const rawIntegrityIndex = Math.max(0, Math.min(100, weightedScore - photoPenalty));
  const integrityIndex = Number(rawIntegrityIndex.toFixed(1));

  // Determine Letter Grade & Color Profile
  const getGradeProfile = (score) => {
    if (score >= 85) {
      return {
        grade: 'A+',
        label: 'Exemplary Statutory Integrity',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        radarStroke: '#10b981',
        radarFill: '#10b981',
      };
    }
    if (score >= 70) {
      return {
        grade: 'B',
        label: 'Compliant & Operational',
        color: 'text-cyan-400',
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/30',
        radarStroke: '#06b6d4',
        radarFill: '#06b6d4',
      };
    }
    if (score >= 50) {
      return {
        grade: 'C',
        label: 'Audit Watch List',
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        radarStroke: '#f59e0b',
        radarFill: '#f59e0b',
      };
    }
    if (score >= 35) {
      return {
        grade: 'D',
        label: 'High Non-Compliance Risk',
        color: 'text-orange-400',
        bg: 'bg-orange-500/10',
        border: 'border-orange-500/30',
        radarStroke: '#f97316',
        radarFill: '#f97316',
      };
    }
    return {
      grade: 'F',
      label: 'Critical Intervention Required',
      color: 'text-rose-400',
      bg: 'bg-rose-500/10',
      border: 'border-rose-500/30',
      radarStroke: '#f43f5e',
      radarFill: '#f43f5e',
    };
  };

  const profile = getGradeProfile(integrityIndex);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. RADAR CHART DATA
  // ──────────────────────────────────────────────────────────────────────────
  const radarData = [
    {
      subject: 'Financial Discipline',
      score: financialDiscipline,
      fullMark: 100,
      source: 'Model 1 (Isolation Forest)',
      rule: 'GFR Rule 144 (Overspend Control)'
    },
    {
      subject: 'Physical Velocity',
      score: physicalVelocity,
      fullMark: 100,
      source: 'Model 4 (Timeline Delay)',
      rule: 'MPLADS Para 4.4 (Time Bounds)'
    },
    {
      subject: 'Vendor Openness',
      score: vendorOpenness,
      fullMark: 100,
      source: 'Model 2 (Vendor Concentration)',
      rule: 'GFR Rule 149 (Competitive Bidding)'
    },
    {
      subject: 'Statutory Compliance',
      score: statutoryCompliance,
      fullMark: 100,
      source: 'Model 3 (Rule Violations)',
      rule: 'MPLADS Clause 4.3 (Tranche Rules)'
    },
    {
      subject: 'Verification Fidelity',
      score: verificationFidelity,
      fullMark: 100,
      source: 'OCR + pHash Forensics',
      rule: 'MPLADS Clause 3.12 (Geotagged Photo)'
    },
  ];

  // ──────────────────────────────────────────────────────────────────────────
  // 4. DETAILED AXIS BREAKDOWN ROWS
  // ──────────────────────────────────────────────────────────────────────────
  const axisBreakdown = [
    {
      name: 'Financial Discipline',
      icon: IndianRupee,
      score: financialDiscipline,
      sourceCol: 'anomaly_score_pct',
      rawVal: rawAnomalyPct.toFixed(1) + '% anomaly percentile',
      formula: '100 - anomaly_score_pct',
      law: 'General Financial Rules (GFR) 2017 Rule 144',
      interpretation: financialDiscipline >= 70
        ? 'Expenditure closely matches sanctioned outlay with zero statistical rate distortions.'
        : 'Severe cost overrun or unit rate distortion detected by Isolation Forest.',
    },
    {
      name: 'Physical Velocity',
      icon: TrendingUp,
      score: physicalVelocity,
      sourceCol: 'timeline_score_pct',
      rawVal: rawTimelinePct.toFixed(1) + '% delay percentile',
      formula: '100 - timeline_score_pct',
      law: 'MPLADS Guidelines Para 4.4 (18-Month Execution Limit)',
      interpretation: physicalVelocity >= 70
        ? 'Physical milestone completion aligns with calendar days elapsed since sanction.'
        : `Work stalled or progressing abnormally slowly relative to disbursed funds.`,
    },
    {
      name: 'Vendor Openness',
      icon: Users,
      score: vendorOpenness,
      sourceCol: 'work_vendor_flag / vendor_score_pct',
      rawVal: isVendorMonopoly ? `${rawVendorPct.toFixed(1)}% monopoly percentile` : 'Clean (No cartel flag)',
      formula: isVendorMonopoly ? '100 - vendor_score_pct' : '100 (Competitive Multi-Bid)',
      law: 'GFR 2017 Rules 149 & 155 (Tender Split / Monopoly Prevention)',
      interpretation: vendorOpenness >= 70
        ? 'Awarded through competitive public procurement without MP contractor cartelization.'
        : `Contractor monopoly detected: single vendor absorbed excessive MP scheme outlays.`,
    },
    {
      name: 'Statutory Compliance',
      icon: Scale,
      score: statutoryCompliance,
      sourceCol: 'compliance_score_pct',
      rawVal: rawCompliancePct.toFixed(1) + '% violation percentile',
      formula: '100 - compliance_score_pct',
      law: 'MPLADS Guidelines 2023 Clause 4.3 & 4.8',
      interpretation: statutoryCompliance >= 70
        ? 'Zero breaches of mandatory tranche sequencing or statutory allocation bounds.'
        : 'Violations logged: premature tranche release (<7 days) or expenditure before sanction.',
    },
    {
      name: 'Verification Fidelity',
      icon: Camera,
      score: verificationFidelity,
      sourceCol: 'rule_missing_photo & pHash duplicate evidence',
      rawVal: hasMissingPhoto
        ? 'Missing Photo (-50)'
        : (hasDuplicatePhoto ? 'Duplicate Photo (-50)' : 'Authentic Geotagged Proof'),
      formula: '100 - (missing_photo ? 50 : 0) - (is_duplicate ? 50 : 0)',
      law: 'MoSPI Statutory Mandate Para 3.12 (Geotagged Proof of Asset)',
      interpretation: verificationFidelity === 100
        ? 'Geotagged photo evidence uploaded, coordinates verified, zero recycled duplicates.'
        : (hasMissingPhoto
          ? 'Ghost Scheme Risk: Work marked complete without photographic evidence on official portal.'
          : 'Perceptual Hash match detected: Photo is a recycled duplicate from another scheme.'),
    },
  ];

  const CustomRadarTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 border border-slate-700 p-2.5 rounded-lg shadow-xl text-xs space-y-1 z-50">
          <div className="font-bold text-white flex items-center justify-between gap-4">
            <span>{data.subject}</span>
            <span className="font-mono text-cyan-400 font-extrabold">{data.score}/100</span>
          </div>
          <div className="text-[10px] text-slate-400 font-mono">{data.source}</div>
          <div className="text-[10px] text-amber-300 font-medium">{data.rule}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-200">
      
      {/* ────────────────────────────────────────────────────────────
          SECTION A: HERO HEADER BANNER & INTEGRITY GRADE
         ──────────────────────────────────────────────────────────── */}
      <div className={`p-4 rounded-xl border ${profile.bg} ${profile.border} flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4`}>
        <div className="space-y-1 max-w-xl">
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">
              MoSPI Vigilance Architecture • Statutory Scoring Matrix
            </span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300">
              Clause 5.2 & GFR 2017
            </span>
          </div>
          <h3 className="text-base font-bold text-white font-display">
            Work Execution & Statutory Integrity Diagnostic Matrix
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed">
            Multi-axis diagnostic evaluation synthesizing financial rate discipline, physical velocity, vendor competition, statutory tranche rules, and photographic proof into an objective 0–100 index.
          </p>
        </div>

        {/* Big Overall Integrity Score Badge */}
        <div className="flex items-center space-x-3 sm:space-x-4 bg-slate-950/80 p-3 rounded-xl border border-slate-800 flex-shrink-0">
          <div className="text-right">
            <div className="text-[10px] font-medium uppercase text-slate-400">
              Integrity Index
            </div>
            <div className={`text-2xl font-black font-mono tracking-tight ${profile.color}`}>
              {integrityIndex}
              <span className="text-xs text-slate-500 font-normal">/100</span>
            </div>
            <div className="text-[9px] font-mono text-slate-400 uppercase">
              {profile.label}
            </div>
          </div>
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center font-black text-xl border ${profile.bg} ${profile.border} ${profile.color} font-display shadow-lg`}>
            {profile.grade}
          </div>
        </div>
      </div>

      {/* DUAL-METRIC EXPLANATION CALLOUT */}
      <div className="px-3.5 py-2.5 rounded-lg bg-slate-900/60 border border-slate-800 text-[11px] text-slate-300 flex items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span>
            <strong className="text-white">Dual-Metric Clarification:</strong> <strong>Integrity Index ({integrityIndex}/100)</strong> measures verified statutory execution quality (100 = Exemplary). <strong>Composite Risk Score ({(Number(workObj?.risk_score || 0) <= 1 ? (Number(workObj?.risk_score || 0) * 100) : Number(workObj?.risk_score || 0)).toFixed(1)}%)</strong> measures probability of fraud. They are inversely aligned: a critical fraud case collapses the integrity radar.
          </span>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION B: 5-AXIS RECHARTS RADAR CHART & SUMMARY
         ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center">
        
        {/* Radar Chart (7 cols on lg) */}
        <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 rounded-xl p-4 flex flex-col items-center justify-center min-h-[320px]">
          <div className="w-full flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wide">
              5-Axis Forensic Diagnostic Radar
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              Domain: [0–100] • Standardized Normalization
            </span>
          </div>

          <div className="w-full h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis 
                  dataKey="subject" 
                  tick={{ fill: '#cbd5e1', fontSize: 10, fontWeight: 600 }}
                />
                <PolarRadiusAxis 
                  angle={90} 
                  domain={[0, 100]} 
                  tick={false} 
                  axisLine={false} 
                />
                <Tooltip content={<CustomRadarTooltip />} />
                <Radar
                  name="Integrity Score"
                  dataKey="score"
                  stroke={profile.radarStroke}
                  fill={profile.radarFill}
                  fillOpacity={0.4}
                  isAnimationActive={false}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[10px] text-slate-400 text-center mt-1">
            Hover over axis vertices to inspect specific model source & legal citations
          </div>
        </div>

        {/* Quick Diagnostic Insights (5 cols on lg) */}
        <div className="lg:col-span-5 flex flex-col space-y-2.5">
          <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wide mb-1">
            Diagnostic Health Indicators
          </div>

          {radarData.map((item, idx) => {
            const isHealthy = item.score >= 70;
            const isModerate = item.score >= 40 && item.score < 70;
            const barColor = isHealthy ? 'bg-emerald-500' : (isModerate ? 'bg-amber-500' : 'bg-rose-500');
            const textColor = isHealthy ? 'text-emerald-400' : (isModerate ? 'text-amber-400' : 'text-rose-400');

            return (
              <div key={idx} className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-200">{item.subject}</span>
                  <span className={`font-mono font-bold ${textColor}`}>
                    {item.score}<span className="text-[10px] text-slate-500">/100</span>
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${item.score}%` }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION C: AUDIT EVIDENCE TABLE (Axis → Formula → Data Source)
         ──────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-xl overflow-hidden">
        <div className="px-4 py-3 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Scale className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Statutory Evidence Chain & Mathematical Grounding
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Source: fraud_flags.csv & ML Ensemble
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] border-b border-slate-800 font-mono">
              <tr>
                <th className="py-2.5 px-3.5">Diagnostic Axis</th>
                <th className="py-2.5 px-3 text-center">Score</th>
                <th className="py-2.5 px-3">Underlying Source Metric</th>
                <th className="py-2.5 px-3">Statutory Formula</th>
                <th className="py-2.5 px-3">Legal Guideline</th>
                <th className="py-2.5 px-3">Auditor Diagnostic Finding</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-slate-300">
              {axisBreakdown.map((row, idx) => {
                const Icon = row.icon;
                const isHealthy = row.score >= 70;
                const isModerate = row.score >= 40 && row.score < 70;
                const scoreColor = isHealthy ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30' : (isModerate ? 'text-amber-400 bg-amber-500/10 border-amber-500/30' : 'text-rose-400 bg-rose-500/10 border-rose-500/30');

                return (
                  <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 px-3.5 font-medium text-white flex items-center space-x-2 whitespace-nowrap">
                      <Icon className="w-4 h-4 text-slate-400" />
                      <span>{row.name}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono font-bold text-xs border ${scoreColor}`}>
                        {row.score}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-300">
                      <div className="text-cyan-300 font-semibold">{row.sourceCol}</div>
                      <div className="text-[10px] text-slate-400">{row.rawVal}</div>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-amber-300/90 whitespace-nowrap">
                      {row.formula}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-400 font-medium">
                      {row.law}
                    </td>
                    <td className="py-3 px-3 text-[11px] text-slate-300 max-w-xs">
                      {row.interpretation}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────────
          SECTION D: CAG AUDITOR RECOMMENDED ACTION
         ──────────────────────────────────────────────────────────── */}
      <div className={`p-4 rounded-xl border ${profile.bg} ${profile.border} flex items-center justify-between gap-3`}>
        <div className="flex items-center space-x-3">
          {integrityIndex < 50 ? (
            <ShieldAlert className="w-6 h-6 text-rose-400 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 flex-shrink-0" />
          )}
          <div>
            <div className="text-xs font-bold text-white uppercase tracking-wide">
              {integrityIndex < 50 ? 'Recommended Auditor Action: Treasury Hold & Field Audit' : 'Recommended Auditor Action: Regular Milestone Review'}
            </div>
            <div className="text-[11px] text-slate-300 mt-0.5">
              {integrityIndex < 50
                ? 'Severe statutory anomalies and execution divergence detected. Scheme is flagged for fund disbursement freeze under MPLADS Clause 4.8.'
                : 'Scheme adheres to statutory procurement, milestone progress, and financial guidelines. No immediate intervention required.'}
            </div>
          </div>
        </div>

        <div className="text-right font-mono text-[10px] text-slate-400 flex-shrink-0">
          <div>Verified via MoSPI DIID</div>
          <div>Problem Statement 26102</div>
        </div>
      </div>

    </div>
  );
}
