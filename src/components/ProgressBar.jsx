import React from 'react';

export function ProgressBar({ current = 0, total = 0, label = '' }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      {label && <div className="tech-label text-muted mb-1">{label}</div>}
      <div className="w-full bg-surface-3 rounded h-2 border border-line overflow-hidden">
        <div
          className="bg-yellow h-2 rounded-none shadow-neon-yellow transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
