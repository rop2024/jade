import React from 'react';

export function StatusBadge({ status }) {
  const map = {
    idle: 'bg-gray-600',
    running: 'bg-blue-600',
    complete: 'bg-green-600',
    error: 'bg-red-600',
  };
  const label = (status || 'idle').toUpperCase();
  return (
    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${map[status] || 'bg-gray-600'}`}>
      {label}
    </span>
  );
}
