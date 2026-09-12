import React from 'react';

/**
 * High-Precision Ashoka Chakra (24 Spokes)
 * Authentic Dharmachakra geometry with dignified 24 precision spokes, outer petal beads, 
 * hub rings, and gentle sovereign rotation.
 * Fully theme-adaptive (dark / light mode) with non-distracting watermark display.
 */
export default function AshokaChakra({ 
  size = 680, 
  className = '',
  opacity = 0.05,
  showCyberRings = false,
  theme = 'dark',
  watermark = true
}) {
  // Generate 24 spokes at 15-degree intervals (360 / 24 = 15)
  const spokes = Array.from({ length: 24 }, (_, i) => i * 15);
  const beads = Array.from({ length: 24 }, (_, i) => i * 15 + 7.5);

  const cx = 300;
  const cy = 300;
  const outerRadius = 190;
  const innerRadius = 38;

  const isLight = theme === 'light';

  return (
    <div 
      className={`pointer-events-none select-none flex items-center justify-center relative ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {/* Ambient Pulsing Radial Aura (subtle in watermark mode) */}
      <div 
        className="absolute inset-0 rounded-full blur-3xl chakra-glow pointer-events-none"
        style={{
          background: isLight 
            ? 'radial-gradient(circle, rgba(37,99,235,0.06) 0%, rgba(99,102,241,0.04) 40%, transparent 70%)'
            : 'radial-gradient(circle, rgba(139,92,246,0.18) 0%, rgba(99,102,241,0.1) 40%, rgba(56,189,248,0.05) 65%, transparent 80%)',
          opacity: watermark ? 0.7 : 1
        }}
      />

      {/* Cybernetic Outer Orbital Rings (Optional) */}
      {showCyberRings && (
        <svg 
          viewBox="0 0 600 600" 
          className="absolute inset-0 w-full h-full chakra-reverse pointer-events-none"
          style={{ opacity: opacity * 0.8 }}
        >
          <defs>
            <linearGradient id="cyberRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? '#2563EB' : '#8B5CF6'} stopOpacity="0.7" />
              <stop offset="50%" stopColor={isLight ? '#4F46E5' : '#6366F1'} stopOpacity="0.4" />
              <stop offset="100%" stopColor={isLight ? '#0284C7' : '#38BDF8'} stopOpacity="0.7" />
            </linearGradient>
          </defs>

          {/* Outer dashed radar telemetry ring */}
          <circle 
            cx={cx} 
            cy={cy} 
            r="270" 
            fill="none" 
            stroke="url(#cyberRingGrad)" 
            strokeWidth="1.5" 
            strokeDasharray="4 8"
          />

          {/* Outer segmented precision ticks */}
          <circle 
            cx={cx} 
            cy={cy} 
            r="250" 
            fill="none" 
            stroke={isLight ? 'rgba(37,99,235,0.25)' : 'rgba(196,181,253,0.3)'} 
            strokeWidth="1" 
            strokeDasharray="16 32"
          />

          {/* 4 Cardinal Crosshair Ticks */}
          <line x1={cx} y1="15" x2={cx} y2="40" stroke={isLight ? '#3B82F6' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" />
          <line x1={cx} y1="560" x2={cx} y2="585" stroke={isLight ? '#3B82F6' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" />
          <line x1="15" y1={cy} x2="40" y2={cy} stroke={isLight ? '#3B82F6' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" />
          <line x1="560" y1={cy} x2="585" y2={cy} stroke={isLight ? '#3B82F6' : '#A78BFA'} strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}

      {/* Main Authentic 24-Spoke Ashoka Chakra (Rotating serenely) */}
      <svg 
        viewBox="0 0 600 600" 
        className="w-full h-full chakra-rotating pointer-events-none"
        style={{ opacity }}
      >
        <defs>
          {/* Main Royal Chakra Gradient */}
          <linearGradient id={`chakraBlueGrad-${theme}`} x1="0%" y1="0%" x2="100%" y2="100%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#1E3A8A" />
                <stop offset="35%" stopColor="#2563EB" />
                <stop offset="70%" stopColor="#1D4ED8" />
                <stop offset="100%" stopColor="#0284C7" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#C4B5FD" />
                <stop offset="30%" stopColor="#8B5CF6" />
                <stop offset="70%" stopColor="#6366F1" />
                <stop offset="100%" stopColor="#38BDF8" />
              </>
            )}
          </linearGradient>

          {/* Center Hub Gradient */}
          <radialGradient id={`hubGrad-${theme}`} cx="50%" cy="50%" r="50%">
            {isLight ? (
              <>
                <stop offset="0%" stopColor="#DBEAFE" />
                <stop offset="40%" stopColor="#2563EB" />
                <stop offset="85%" stopColor="#1E3A8A" />
                <stop offset="100%" stopColor="#0F172A" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#DDD6FE" />
                <stop offset="40%" stopColor="#8B5CF6" />
                <stop offset="85%" stopColor="#4C1D95" />
                <stop offset="100%" stopColor="#0B1020" />
              </>
            )}
          </radialGradient>

          {/* Glowing Filter */}
          <filter id="neonChakraGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation={watermark ? "1.5" : "3"} result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <g filter="url(#neonChakraGlow)">
          {/* Outer Decorative Rim Rings */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={outerRadius + 12} 
            fill="none" 
            stroke={`url(#chakraBlueGrad-${theme})`} 
            strokeWidth="2.5" 
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r={outerRadius + 3} 
            fill="none" 
            stroke={isLight ? 'rgba(37,99,235,0.5)' : 'rgba(196,181,253,0.6)'} 
            strokeWidth="1.5" 
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r={outerRadius - 3} 
            fill="none" 
            stroke={`url(#chakraBlueGrad-${theme})`} 
            strokeWidth="4" 
          />

          {/* 24 Outer Petal / Bead Embellishments */}
          {beads.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            const bx = cx + (outerRadius + 7.5) * Math.cos(rad);
            const by = cy + (outerRadius + 7.5) * Math.sin(rad);
            return (
              <circle
                key={`bead-${i}`}
                cx={bx}
                cy={by}
                r="3"
                fill={isLight ? "#BFDBFE" : "#DDD6FE"}
                stroke={isLight ? "#2563EB" : "#8B5CF6"}
                strokeWidth="1"
              />
            );
          })}

          {/* 24 Architectural Spokes */}
          {spokes.map((angle, i) => {
            const rad = (angle * Math.PI) / 180;
            // Point at outer rim
            const xOuter = cx + outerRadius * Math.cos(rad);
            const yOuter = cy + outerRadius * Math.sin(rad);
            
            // Perpendicular vector for wedge taper base at inner hub
            const perpRad = rad + Math.PI / 2;
            const halfBase = 3.5;
            const xBase1 = cx + innerRadius * Math.cos(rad) + halfBase * Math.cos(perpRad);
            const yBase1 = cy + innerRadius * Math.sin(rad) + halfBase * Math.sin(perpRad);
            const xBase2 = cx + innerRadius * Math.cos(rad) - halfBase * Math.cos(perpRad);
            const yBase2 = cy + innerRadius * Math.sin(rad) - halfBase * Math.sin(perpRad);

            return (
              <g key={`spoke-${i}`}>
                {/* Tapered Spoke Polygon */}
                <polygon
                  points={`${xBase1},${yBase1} ${xOuter},${yOuter} ${xBase2},${yBase2}`}
                  fill={`url(#chakraBlueGrad-${theme})`}
                  opacity="0.9"
                />
                {/* Central Fine Spine Line for crispness */}
                <line
                  x1={cx + innerRadius * Math.cos(rad)}
                  y1={cy + innerRadius * Math.sin(rad)}
                  x2={xOuter}
                  y2={yOuter}
                  stroke={isLight ? '#EFF6FF' : '#EDE9FE'}
                  strokeWidth="1"
                  opacity="0.8"
                />
              </g>
            );
          })}

          {/* Inner Hub Rings */}
          <circle 
            cx={cx} 
            cy={cy} 
            r={innerRadius + 4} 
            fill="none" 
            stroke={`url(#chakraBlueGrad-${theme})`} 
            strokeWidth="3" 
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r={innerRadius} 
            fill={`url(#hubGrad-${theme})`} 
            stroke={isLight ? '#93C5FD' : '#C4B5FD'} 
            strokeWidth="2" 
          />

          {/* Very Center Navel / Hub Center Dot */}
          <circle 
            cx={cx} 
            cy={cy} 
            r="12" 
            fill={isLight ? "#DBEAFE" : "#EDE9FE"} 
            stroke={isLight ? "#1D4ED8" : "#8B5CF6"} 
            strokeWidth="2.5" 
          />
          <circle 
            cx={cx} 
            cy={cy} 
            r="4.5" 
            fill={isLight ? "#1E3A8A" : "#6366F1"} 
          />
        </g>
      </svg>
    </div>
  );
}
