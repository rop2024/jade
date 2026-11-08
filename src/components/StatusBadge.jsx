import React from 'react';

export function StatusBadge({ status }) {
  const map = {
    idle: 'bg-surface-3 text-muted border border-line',
    running: 'bg-cyan/10 text-cyan border border-cyan/30',
    complete: 'bg-green/10 text-green border border-green/30',
    error: 'bg-pink/10 text-pink border border-pink/30',
  };
  const label = (status || 'idle').toUpperCase();
  return (
    <span className={`px-3 py-1 text-tech font-technical border ${map[status] || map.idle}`}>
      {label}
    </span>
  );
}
