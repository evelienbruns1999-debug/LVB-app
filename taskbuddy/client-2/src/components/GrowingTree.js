import React from 'react';

// Tree grows based on total steps done today
// 1 step = leaf, 3 = small branch, 5 = flower, 10+ = bigger tree / new earth layer

export default function GrowingTree({ steps = 0 }) {
  const level = steps >= 10 ? 4 : steps >= 5 ? 3 : steps >= 3 ? 2 : steps >= 1 ? 1 : 0;
  const label = steps >= 10 ? '🌳 Grote boom!' : steps >= 5 ? '🌸 Bloem!' : steps >= 3 ? '🌿 Tak!' : steps >= 1 ? '🍃 Blaadje!' : '🌱 Begin!';
  const color = steps >= 10 ? '#145A32' : steps >= 5 ? '#1E8449' : steps >= 3 ? '#27AE60' : '#58D68D';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg viewBox="0 0 120 130" width="120" height="130" style={{ overflow: 'visible' }}>
        {/* Ground layers */}
        <ellipse cx="60" cy="118" rx="44" ry="10" fill="#8B4513" opacity="0.3"/>
        {level >= 4 && <ellipse cx="60" cy="122" rx="50" ry="8" fill="#6B3410" opacity="0.25"/>}

        {/* Trunk */}
        {level >= 1 && (
          <rect x="54" y={level >= 4 ? 68 : level >= 3 ? 74 : 82} width="12" height={level >= 4 ? 50 : level >= 3 ? 44 : 36} rx="5" fill="#8B4513" style={{ animation: 'grow 0.5s ease' }}/>
        )}

        {/* Base canopy */}
        {level >= 1 && (
          <ellipse cx="60" cy={level >= 4 ? 58 : level >= 3 ? 64 : 72} rx={level >= 4 ? 34 : level >= 3 ? 28 : 20} ry={level >= 4 ? 38 : level >= 3 ? 32 : 24} fill={color} style={{ animation: 'pop 0.4s ease' }}/>
        )}

        {/* Side canopies (level 3+) */}
        {level >= 2 && (
          <>
            <ellipse cx="38" cy={level >= 4 ? 72 : 78} rx="18" ry="22" fill={color} opacity="0.85" style={{ animation: 'pop 0.4s 0.1s ease both' }}/>
            <ellipse cx="82" cy={level >= 4 ? 72 : 78} rx="18" ry="22" fill={color} opacity="0.85" style={{ animation: 'pop 0.4s 0.2s ease both' }}/>
          </>
        )}

        {/* Flowers (level 3+) */}
        {level >= 3 && (
          <>
            {[{x:48,y:38},{x:68,y:34},{x:58,y:26},{x:36,y:58},{x:80,y:58}].map((p,i) => (
              <g key={i} style={{ animation: `pop 0.3s ${0.1*i}s ease both` }}>
                <circle cx={p.x} cy={p.y} r="6" fill="#FF6B9D"/>
                <circle cx={p.x} cy={p.y} r="3" fill="#FFD23F"/>
              </g>
            ))}
          </>
        )}

        {/* Single leaf (level 1 only) */}
        {level === 1 && (
          <ellipse cx="60" cy="68" rx="10" ry="14" fill="#58D68D" style={{ animation: 'pop 0.4s ease' }}/>
        )}

        {/* Extra top layer (level 4) */}
        {level >= 4 && (
          <ellipse cx="60" cy="30" rx="24" ry="28" fill="#145A32" style={{ animation: 'pop 0.4s 0.3s ease both' }}/>
        )}

        {/* Stars for level 4 */}
        {level >= 4 && (
          <>
            {[{x:22,y:20},{x:96,y:16},{x:106,y:40},{x:14,y:44}].map((p,i)=>(
              <text key={i} x={p.x} y={p.y} fontSize="12" textAnchor="middle" style={{ animation: `pop 0.3s ${0.1*i+0.4}s ease both` }}>⭐</text>
            ))}
          </>
        )}

        {/* Seedling if no steps */}
        {level === 0 && (
          <g>
            <rect x="57" y="96" width="6" height="22" rx="3" fill="#8B4513" opacity="0.5"/>
            <ellipse cx="60" cy="93" rx="8" ry="10" fill="#A8E6A3" opacity="0.7"/>
          </g>
        )}
      </svg>

      {/* Step count */}
      <div style={{ fontFamily: 'var(--font-head)', fontSize: 16, fontWeight: 600, color }}>
        {label}
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-soft)' }}>
        {steps} {steps === 1 ? 'stap' : 'stappen'} vandaag
      </div>
    </div>
  );
}
