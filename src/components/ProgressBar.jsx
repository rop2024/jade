import React from 'react';

export function ProgressBar({ current = 0, total = 0, label = '' }) {
  const pct = total > 0 ? Math.round((current / total) * 100) : 0;
  return (
    <div>
      {label && <div className="text-sm text-gray-300 mb-1">{label}</div>}
      <div className="w-full bg-gray-700 rounded-full h-2">
        <div
          className="bg-blue-500 h-2 rounded-full transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
