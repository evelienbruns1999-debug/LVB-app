import React from 'react';

const STAGES = [
  { min: 0, label: '🌱 Begin', color: '#A8E6A3' },
  { min: 1, label: '🌿 Eerste groei', color: '#58D68D' },
  { min: 3, label: '🍃 Meer blaadjes', color: '#52BE80' },
  { min: 5, label: '🌳 Jonge boom', color: '#27AE60' },
  { min: 8, label: '🌼 Knoppen', color: '#1E8449' },
  { min: 12, label: '🌸 In bloei', color: '#1E8449' },
  { min: 18, label: '✨ Sterke boom', color: '#145A32' },
];

function getStage(steps) {
  let stage = STAGES[0];
  for (const item of STAGES) {
    if (steps >= item.min) stage = item;
  }
  return stage;
}

export default function GrowingTree({ steps = 0, compact = false }) {
  const stage = getStage(steps);
  const stageIndex = STAGES.findIndex((item) => item.min === stage.min);
  const level = stageIndex;
  const color = stage.color;
  const width = compact ? 54 : 120;
  const height = compact ? 58 : 130;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: compact ? 2 : 6 }}>
      <svg viewBox="0 0 120 130" width={width} height={height} style={{ overflow: 'visible' }}>
        <ellipse cx="60" cy="118" rx="44" ry="10" fill="#8B4513" opacity="0.3" />
        {level >= 6 && <ellipse cx="60" cy="122" rx="50" ry="8" fill="#6B3410" opacity="0.25" />}

        {level >= 1 && (
          <rect
            x="54"
            y={level >= 6 ? 64 : level >= 5 ? 68 : level >= 3 ? 74 : 82}
            width="12"
            height={level >= 6 ? 54 : level >= 5 ? 50 : level >= 3 ? 44 : 36}
            rx="5"
            fill="#8B4513"
            style={{ animation: 'grow 0.5s ease' }}
          />
        )}

        {level >= 1 && (
          <ellipse
            cx="60"
            cy={level >= 6 ? 54 : level >= 5 ? 58 : level >= 3 ? 64 : 72}
            rx={level >= 6 ? 36 : level >= 5 ? 32 : level >= 3 ? 28 : 20}
            ry={level >= 6 ? 40 : level >= 5 ? 36 : level >= 3 ? 32 : 24}
            fill={color}
            style={{ animation: 'pop 0.4s ease' }}
          />
        )}

        {level >= 2 && (
          <>
            <ellipse cx="42" cy={level >= 5 ? 72 : 78} rx="14" ry="18" fill={color} opacity="0.82" style={{ animation: 'pop 0.4s 0.1s ease both' }} />
            <ellipse cx="78" cy={level >= 5 ? 72 : 78} rx="14" ry="18" fill={color} opacity="0.82" style={{ animation: 'pop 0.4s 0.2s ease both' }} />
          </>
        )}

        {level >= 3 && (
          <>
            <ellipse cx="34" cy="76" rx="12" ry="15" fill={color} opacity="0.78" style={{ animation: 'pop 0.35s 0.15s ease both' }} />
            <ellipse cx="86" cy="76" rx="12" ry="15" fill={color} opacity="0.78" style={{ animation: 'pop 0.35s 0.22s ease both' }} />
          </>
        )}

        {level >= 4 && (
          <>
            {[{ x: 47, y: 43 }, { x: 70, y: 40 }, { x: 58, y: 34 }].map((p, i) => (
              <g key={i} style={{ animation: `pop 0.3s ${0.1 * i}s ease both` }}>
                <circle cx={p.x} cy={p.y} r="4.5" fill="#FFD23F" />
                <circle cx={p.x} cy={p.y} r="2" fill="#FFF7CC" />
              </g>
            ))}
          </>
        )}

        {level >= 5 && (
          <>
            {[{ x: 48, y: 38 }, { x: 68, y: 34 }, { x: 58, y: 26 }, { x: 36, y: 58 }, { x: 80, y: 58 }].map((p, i) => (
              <g key={i} style={{ animation: `pop 0.3s ${0.1 * i}s ease both` }}>
                <circle cx={p.x} cy={p.y} r="6" fill="#FF6B9D" />
                <circle cx={p.x} cy={p.y} r="3" fill="#FFD23F" />
              </g>
            ))}
          </>
        )}

        {level === 1 && (
          <ellipse cx="60" cy="68" rx="10" ry="14" fill="#58D68D" style={{ animation: 'pop 0.4s ease' }} />
        )}

        {level >= 6 && (
          <ellipse cx="60" cy="30" rx="24" ry="28" fill="#145A32" style={{ animation: 'pop 0.4s 0.3s ease both' }} />
        )}

        {level >= 6 && (
          <>
            {[{ x: 22, y: 20 }, { x: 96, y: 16 }, { x: 106, y: 40 }, { x: 14, y: 44 }].map((p, i) => (
              <text key={i} x={p.x} y={p.y} fontSize="12" textAnchor="middle" style={{ animation: `pop 0.3s ${0.1 * i + 0.4}s ease both` }}>⭐</text>
            ))}
          </>
        )}

        {level === 0 && (
          <g>
            <rect x="57" y="96" width="6" height="22" rx="3" fill="#8B4513" opacity="0.5" />
            <ellipse cx="60" cy="93" rx="8" ry="10" fill="#A8E6A3" opacity="0.7" />
          </g>
        )}
      </svg>

      <div style={{ fontFamily: 'var(--font-head)', fontSize: compact ? 12 : 16, fontWeight: 600, color }}>
        {stage.label}
      </div>
      <div style={{ fontSize: compact ? 11 : 13, fontWeight: 700, color: 'var(--text-soft)' }}>
        {steps} {steps === 1 ? 'stap' : 'stappen'} vandaag
      </div>
    </div>
  );
}
