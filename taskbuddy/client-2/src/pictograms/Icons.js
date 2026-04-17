import React from 'react';

// AAC-style bold black & white pictograms — high contrast, symbol-based
const S = { width: '100%', height: '100%', display: 'block' };

// Shared fill colours driven by parent
const F = 'currentColor';

export const Icons = {
  // ── TASKS ──
  ochtend: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <circle cx="40" cy="38" r="16" fill={F}/>
      <rect x="37" y="6" width="6" height="12" rx="3" fill={F}/>
      <rect x="37" y="62" width="6" height="12" rx="3" fill={F}/>
      <rect x="6" y="35" width="12" height="6" rx="3" fill={F}/>
      <rect x="62" y="35" width="12" height="6" rx="3" fill={F}/>
      <rect x="15" y="13" width="6" height="12" rx="3" fill={F} transform="rotate(-45 18 19)"/>
      <rect x="59" y="13" width="6" height="12" rx="3" fill={F} transform="rotate(45 62 19)"/>
    </svg>
  ),
  opruimen: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* broom */}
      <rect x="38" y="10" width="6" height="42" rx="3" fill={F}/>
      <ellipse cx="41" cy="58" rx="18" ry="10" fill={F}/>
      <rect x="24" y="52" width="34" height="6" rx="2" fill={F}/>
    </svg>
  ),
  douchen: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* shower head + drops */}
      <path d="M18 28 Q18 14 30 14 Q42 14 42 28 L42 36" stroke={F} strokeWidth="6" fill="none" strokeLinecap="round"/>
      <rect x="38" y="32" width="28" height="8" rx="4" fill={F}/>
      <circle cx="46" cy="52" r="4" fill={F}/>
      <circle cx="58" cy="52" r="4" fill={F}/>
      <circle cx="70" cy="52" r="4" fill={F}/>
      <circle cx="46" cy="64" r="3" fill={F} opacity="0.6"/>
      <circle cx="58" cy="64" r="3" fill={F} opacity="0.6"/>
      <circle cx="70" cy="64" r="3" fill={F} opacity="0.6"/>
    </svg>
  ),
  eten: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* plate + fork + knife */}
      <circle cx="40" cy="48" r="22" stroke={F} strokeWidth="6" fill="none"/>
      <circle cx="40" cy="48" r="12" fill={F} opacity="0.25"/>
      <rect x="14" y="14" width="5" height="28" rx="2.5" fill={F}/>
      <rect x="12" y="14" width="9" height="12" rx="3" fill={F}/>
      <rect x="63" y="14" width="5" height="28" rx="2.5" fill={F}/>
      <path d="M63 14 L68 22 L65.5 42" stroke={F} strokeWidth="5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  medicijnen: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* pill capsule */}
      <rect x="16" y="28" width="48" height="24" rx="12" fill={F}/>
      <rect x="40" y="28" width="24" height="24" rx="0" fill="white" opacity="0.5"/>
      <rect x="40" y="28" width="24" height="24" rx="12" fill={F} opacity="0"/>
      <path d="M40 28 Q52 28 52 40 Q52 52 40 52 Z" fill="white" opacity="0.45"/>
      {/* cross */}
      <rect x="35" y="37" width="10" height="6" rx="2" fill="white"/>
      <rect x="37" y="35" width="6" height="10" rx="2" fill="white"/>
    </svg>
  ),
  pauze: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* cup with steam */}
      <path d="M18 32 L62 32 L58 62 Q57 68 50 68 L30 68 Q23 68 22 62 Z" fill={F}/>
      <path d="M62 38 Q74 38 74 48 Q74 58 62 58" stroke={F} strokeWidth="6" fill="none" strokeLinecap="round"/>
      <path d="M28 22 Q28 14 34 14 Q34 22 28 22" stroke={F} strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M40 20 Q40 12 46 12 Q46 20 40 20" stroke={F} strokeWidth="4" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  buiten: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* walking person */}
      <circle cx="40" cy="14" r="9" fill={F}/>
      <path d="M40 23 L32 50 L24 68" stroke={F} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M40 23 L48 50 L56 68" stroke={F} strokeWidth="6" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M30 36 L50 36" stroke={F} strokeWidth="5" strokeLinecap="round"/>
    </svg>
  ),
  slapen: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* moon + zzz */}
      <path d="M34 12 Q14 20 14 40 Q14 62 40 66 Q20 60 20 40 Q20 20 40 14 Z" fill={F}/>
      <text x="46" y="34" fontSize="20" fontWeight="900" fill={F} fontFamily="Arial">Z</text>
      <text x="54" y="24" fontSize="14" fontWeight="900" fill={F} fontFamily="Arial">z</text>
    </svg>
  ),
  stemming: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <circle cx="40" cy="40" r="28" stroke={F} strokeWidth="6" fill="none"/>
      <circle cx="30" cy="34" r="5" fill={F}/>
      <circle cx="50" cy="34" r="5" fill={F}/>
      <path d="M26 52 Q40 64 54 52" stroke={F} strokeWidth="5" fill="none" strokeLinecap="round"/>
    </svg>
  ),

  // ── ACTIONS / UI ──
  volHoofd: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* person with speech bubble and swirls */}
      <circle cx="28" cy="28" r="12" fill={F}/>
      <rect x="22" y="40" width="12" height="20" rx="4" fill={F}/>
      <rect x="14" y="44" width="10" height="5" rx="2.5" fill={F}/>
      <rect x="34" y="44" width="10" height="5" rx="2.5" fill={F}/>
      {/* speech bubble */}
      <ellipse cx="56" cy="22" rx="18" ry="14" fill={F}/>
      <path d="M42 32 L38 42 L50 34 Z" fill={F}/>
      {/* swirl lines in bubble */}
      <path d="M46 18 Q52 14 58 18 Q64 22 58 26" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
      <path d="M48 24 Q53 21 58 24" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round"/>
    </svg>
  ),
  hulpNodig: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* hand raised + bell */}
      <path d="M28 62 L28 28 Q28 22 34 22 Q40 22 40 28 L40 42 Q40 36 46 36 Q52 36 52 42 L52 44 Q52 38 57 38 Q62 38 62 44 L62 54 Q62 68 48 68 L28 68 Z" fill={F}/>
      {/* bell top right */}
      <path d="M58 14 Q58 8 64 8 Q70 8 70 14 L72 26 L56 26 Z" fill={F}/>
      <rect x="60" y="26" width="8" height="4" rx="2" fill={F}/>
      <ellipse cx="64" cy="31" rx="3" ry="2" fill={F}/>
    </svg>
  ),
  medicijnReminder: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* alarm clock + pill */}
      <circle cx="40" cy="42" r="26" stroke={F} strokeWidth="6" fill="none"/>
      <circle cx="40" cy="42" r="3" fill={F}/>
      <rect x="38" y="22" width="4" height="14" rx="2" fill={F}/>
      <rect x="40" y="34" width="12" height="4" rx="2" fill={F}/>
      <path d="M18 24 L26 32" stroke={F} strokeWidth="5" strokeLinecap="round"/>
      <path d="M62 24 L54 32" stroke={F} strokeWidth="5" strokeLinecap="round"/>
      <rect x="32" y="70" width="16" height="6" rx="3" fill={F}/>
    </svg>
  ),
  boom: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <rect x="35" y="50" width="10" height="24" rx="3" fill={F}/>
      <ellipse cx="40" cy="40" rx="20" ry="26" fill={F}/>
      <ellipse cx="26" cy="46" rx="14" ry="18" fill={F}/>
      <ellipse cx="54" cy="46" rx="14" ry="18" fill={F}/>
    </svg>
  ),
  checkmark: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <circle cx="40" cy="40" r="34" fill={F}/>
      <polyline points="22,40 34,54 58,26" stroke="white" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  spreken: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      {/* same as uploaded: speaking person */}
      <circle cx="26" cy="26" r="14" fill={F}/>
      {/* mouth open */}
      <path d="M19 26 Q26 34 33 26" fill="white"/>
      <rect x="20" y="40" width="12" height="22" rx="4" fill={F}/>
      <rect x="12" y="46" width="10" height="5" rx="2.5" fill={F}/>
      <rect x="30" y="46" width="10" height="5" rx="2.5" fill={F}/>
      {/* speech bubble */}
      <ellipse cx="56" cy="26" rx="18" ry="14" fill={F}/>
      <path d="M42 36 L36 48 L50 38 Z" fill={F}/>
    </svg>
  ),
  terug: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <circle cx="40" cy="40" r="34" stroke={F} strokeWidth="6" fill="none"/>
      <polyline points="46,24 28,40 46,56" stroke={F} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    </svg>
  ),
  aiAssist: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <rect x="10" y="16" width="60" height="44" rx="10" fill={F}/>
      <rect x="34" y="60" width="12" height="12" rx="2" fill={F}/>
      <rect x="22" y="70" width="36" height="6" rx="3" fill={F}/>
      <circle cx="28" cy="34" r="5" fill="white"/>
      <circle cx="52" cy="34" r="5" fill="white"/>
      <path d="M26 48 Q40 56 54 48" stroke="white" strokeWidth="4" fill="none" strokeLinecap="round"/>
      <path d="M56 10 L62 4 M62 10 L56 4" stroke={F} strokeWidth="3" strokeLinecap="round"/>
    </svg>
  ),
  streakFire: () => (
    <svg viewBox="0 0 80 80" fill="none" style={S}>
      <path d="M40 10 Q50 26 46 36 Q56 28 52 44 Q58 38 56 50 Q56 68 40 72 Q24 68 24 50 Q22 38 28 44 Q24 28 34 36 Q30 26 40 10Z" fill={F}/>
      <path d="M40 40 Q46 48 40 58 Q34 48 40 40Z" fill="white" opacity="0.5"/>
    </svg>
  ),
};

// Mapping task id → icon component
export function getIcon(id) {
  if (!id) return Icons.checkmark;
  const map = {
    ochtend: Icons.ochtend, opruimen: Icons.opruimen, douchen: Icons.douchen,
    eten: Icons.eten, medicijnen: Icons.medicijnen, pauze: Icons.pauze,
    buiten: Icons.buiten, slapen: Icons.slapen, stemming: Icons.stemming,
  };
  const base = id.replace(/^custom_\d+$/, '').replace(/_?\d+$/, '') || id;
  return map[base] || Icons.checkmark;
}
