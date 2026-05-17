import React from 'react';
import { getIcon } from '../pictograms/Icons';

export function stepIconFor(task, stepText = '') {
  const text = String(stepText || '').toLowerCase();
  if (text.includes('water') || text.includes('drinken')) return getIcon('eten');
  if (text.includes('buiten') || text.includes('wandelen')) return getIcon('buiten');
  if (text.includes('slapen') || text.includes('bed')) return getIcon('slapen');
  if (text.includes('medic')) return getIcon('medicijnen');
  if (text.includes('douche') || text.includes('wassen')) return getIcon('douchen');
  if (text.includes('opruim')) return getIcon('opruimen');
  return getIcon(task?.id);
}

export default function TaskVisual({ task, size = 64, stepText = '', small = false }) {
  const Icon = stepText ? stepIconFor(task, stepText) : getIcon(task?.id);

  if (task?.icon_image) {
    return (
      <img
        src={task.icon_image}
        alt={task.label || task.task_name || 'Taak'}
        style={{
          width: size,
          height: size,
          objectFit: 'cover',
          borderRadius: small ? 12 : 18,
          border: '2px solid var(--border)',
          background: 'var(--surface)',
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: small ? 12 : 18,
        border: '2px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: small ? 8 : 10,
      }}
    >
      <Icon />
    </div>
  );
}
